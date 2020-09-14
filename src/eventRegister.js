const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { oauth2Params, error: { InternalServerError, InvalidRequestError } } = require('./_utils')
const { Strategy, SUPPORTED_EVENTS } = require('./_core')

function EventHandler(handler) {
	let _this = this
	this.handlers = handler ? [handler] : []
	
	this.addHandler = handler => _this.handlers.push(handler)

	this.exec = (...args) => catchErrors(co(function *() {
		let result = null
		for (let h of _this.handlers) {
			const intermediateResult = yield Promise.resolve(null).then(() => h(result, ...args))
			if (intermediateResult)
				result = intermediateResult
		}
		
		return result
	}))

	return this
}

const addGenerateAccessOrRefreshTokenHandler = type => eventHandlerStore => {
	const eventName = `generate_${type}`
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, audiences, scopes, state }) => co(function *() {
		const errorMsg = `Failed to generate ${type}`
		if (!eventHandlerStore.generate_token)
			throw new InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
		
		const claims = oauth2Params.convert.toOIDCClaims({ 
			iss: process.env.ISS, 
			client_id, 
			user_id, 
			audiences, 
			scopes
		}) 

		const [errors, result] = yield eventHandlerStore.generate_token.exec({ type, claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return result
	})

	eventHandlerStore[eventName] = new EventHandler(handler)
}

const addGenerateAccessTokenHandler = addGenerateAccessOrRefreshTokenHandler('access_token')
const addGenerateRefreshTokenHandler = addGenerateAccessOrRefreshTokenHandler('refresh_token')
const addGenerateIdTokenHandler = eventHandlerStore => {
	const eventName = 'generate_id_token'
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, audiences, scopes, state }) => co(function *() {
		const errorMsg = 'Failed to generate id_token'
		if (!eventHandlerStore.get_identity_claims)
			throw new InternalServerError(`${errorMsg}. Missing 'get_identity_claims' handler.`)
		if (!eventHandlerStore.generate_token)
			throw new InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
		
		if (!client_id)
			throw new InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
		if (!user_id)
			throw new InvalidRequestError(`${errorMsg}. Missing required 'user_id'.`)

		const [identityClaimsErrors, identityClaims={}] = yield eventHandlerStore.get_identity_claims.exec({ client_id, user_id, scopes, state })
		if (identityClaimsErrors)
			throw wrapErrors(errorMsg, identityClaimsErrors)

		const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id, user_client_ids:identityClaims.client_ids })
		if (clientIdErrors)
			throw wrapErrors(errorMsg, clientIdErrors)
					
		const claims = oauth2Params.convert.toOIDCClaims({ 
			iss: process.env.ISS, 
			client_id, 
			user_id, 
			audiences, 
			scopes,
			extra: identityClaims.claims||{}
		}) 

		const [errors, result] = yield eventHandlerStore.generate_token.exec({ type:'id_token', claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return result
	})

	eventHandlerStore[eventName] = new EventHandler(handler)
}
const addGenerateAuthorizationCodeHandler = eventHandlerStore => {
	const eventName = 'generate_authorization_code'
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, scopes, state }) => co(function *() {
		const errorMsg = 'Failed to generate authorization code'
		if (!eventHandlerStore.generate_token)
			throw new InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
		
		const claims = oauth2Params.convert.toOIDCClaims({ 
			iss: process.env.ISS, 
			client_id, 
			user_id, 
			scopes
		}) 

		const [errors, result] = yield eventHandlerStore.generate_token.exec({ type:'code', claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return result
	})

	eventHandlerStore[eventName] = new EventHandler(handler)
}

const addProcessFIPauthResponseHandler = eventHandlerStore => {
	const eventName = 'process_fip_auth_response'
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { accessToken, refreshToken, profile }) => co(function *() {
		yield Promise.resolve(null)
		
		const id = profile.id
		const { givenName: firstName, middleName, familyName: lastName } = profile.name || {}
		const email = ((profile.emails || [])[0] || {}).value || null
		const profileImg = ((profile.photos || [])[0] || {}).value

		const user = { id, firstName, middleName, lastName, email, profileImg, accessToken, refreshToken }

		return user
	})

	eventHandlerStore[eventName] = new EventHandler(handler)
}

const registerSingleEvent = eventHandlerStore => (eventName, handler) => {
	if (!eventName)
		throw new Error('Missing required \'eventName\'')
	if (!handler)
		throw new Error('Missing required \'handler\'')
	if (typeof(handler) != 'function')
		throw new Error(`Invalid 'handler'. Expect 'handler' to be a function, but found ${typeof(handler)} instead.`)

	const supportedEvents = [...SUPPORTED_EVENTS, 'process_fip_auth_response']

	if (supportedEvents.indexOf(eventName) < 0)
		throw new Error(`Invalid 'eventName'. ${eventName} is not supported. Expect 'eventName' to be equal to one of the following values: ${SUPPORTED_EVENTS.join(', ')}.`)

	if (eventHandlerStore[eventName])
		eventHandlerStore[eventName].addHandler(handler)
	else
		eventHandlerStore[eventName] = new EventHandler(handler)
}

module.exports = eventHandlerStore => {
	if (!eventHandlerStore)
		throw new Error('Missing required \'eventHandlerStore\'')
	if (typeof(eventHandlerStore) != 'object')
		throw new Error(`Invalid 'eventHandlerStore'. Expect 'eventHandlerStore' to be an object, but found ${typeof(eventHandlerStore)} instead.`)

	addGenerateAccessTokenHandler(eventHandlerStore)
	addGenerateRefreshTokenHandler(eventHandlerStore)
	addGenerateIdTokenHandler(eventHandlerStore)
	addGenerateAuthorizationCodeHandler(eventHandlerStore)
	addProcessFIPauthResponseHandler(eventHandlerStore)

	const registerEvent = registerSingleEvent(eventHandlerStore)

	/**
	 * Registers one or many event handlers to the 'eventHandlerStore'. 
	 *
	 * 1st arity:
	 * ==========
	 * @param  {Strategy}	strategyHandler		This object is a concrete implementation of the UserIn Startegy class. It
	 *                                     		defines all handlers. 
	 * @return {Void}
	 *
	 * 2nd arity:
	 * ==========
	 * @param  {String}		eventName			One of the allowed event as defined in SUPPORTED_EVENTS. 
	 * @param  {Function}	handler				(root: Object, input: Object): Object 
	 *                               			where 'root' is the result from previous handler if multiple handlers have been
	 *                               			defined for the same 'eventName'. 
	 * 
	 * @return {Void}
	 */
	const registerEventHandler = (...args) => {
		const strategyHandler = args[0]
		if (strategyHandler && strategyHandler instanceof Strategy)
			SUPPORTED_EVENTS.forEach(eventName => registerEvent(eventName, strategyHandler[eventName]))
		else {
			const [eventName, handler] = args
			registerEvent(eventName, handler)
		}
	}

	return registerEventHandler
}









