const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { oauth2Params } = require('./_utils')
const { error:userInError, Strategy, verifyStrategy, getEvents } = require('userin-core')

function EventHandler(handler, getContext) {
	let _this = this
	this.handlers = handler ? [handler] : []
	
	this.addHandler = handler => _this.handlers.push(handler)

	this.exec = (payload) => catchErrors(co(function *() {
		let result = null
		const context = getContext ? getContext() : {}
		for (let h of _this.handlers) {
			const intermediateResult = yield Promise.resolve(null).then(() => h(result, payload, context))
			if (intermediateResult)
				result = intermediateResult
		}
		
		return result
	}))

	return this
}

const setEventHandler = (eventHandlerStore, eventName, handler) => {
	const getContext = () => eventHandlerStore.context || {}
	eventHandlerStore[eventName] = new EventHandler(handler, getContext)
	// eventHandlerStore[eventName] = new EventHandler(handler)
}

const addGenerateAccessOrRefreshTokenHandler = type => eventHandlerStore => {
	const eventName = `generate_openid_${type}`
	const underlyingEvent = `generate_${type}`
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, audiences, scopes, state }) => co(function *() {
		const errorMsg = `Failed to generate ${type}`
		if (!eventHandlerStore[underlyingEvent])
			throw new userInError.InternalServerError(`${errorMsg}. Missing '${underlyingEvent}' handler.`)
		
		const getBasicOIDCclaims = oauth2Params.getBasicOIDCclaims(type)
		const [basicOIDCclaimsErrors, basicOIDCclaims] = yield getBasicOIDCclaims(eventHandlerStore)
		if (basicOIDCclaimsErrors)
			throw wrapErrors(errorMsg, basicOIDCclaimsErrors)
		
		const claims = { 
			...oauth2Params.convert.toOIDCClaims({  
				client_id, 
				user_id, 
				audiences, 
				scopes
			}),
			...basicOIDCclaims.claims
		}

		const [errors, token] = yield eventHandlerStore[underlyingEvent].exec({ type, claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return {
				token,
				expires_in: basicOIDCclaims.expires_in
			}
	})

	// eventHandlerStore[eventName] = new EventHandler(handler)
	setEventHandler(eventHandlerStore, eventName, handler)
}

const addGenerateAccessTokenHandler = addGenerateAccessOrRefreshTokenHandler('access_token')
const addGenerateRefreshTokenHandler = addGenerateAccessOrRefreshTokenHandler('refresh_token')
const addGenerateIdTokenHandler = eventHandlerStore => {
	const eventName = 'generate_openid_id_token'
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, audiences, scopes, state, nonce }) => co(function *() {
		const errorMsg = 'Failed to generate id_token'
		if (!eventHandlerStore.get_identity_claims)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_identity_claims' handler.`)
		if (!eventHandlerStore.generate_id_token)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler.`)
		if (!eventHandlerStore.get_config)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)

		const [basicOIDCclaimsErrors, basicOIDCclaims] = yield oauth2Params.getIdTokenBasicClaims(eventHandlerStore)
		if (basicOIDCclaimsErrors)
			throw wrapErrors(errorMsg, basicOIDCclaimsErrors)
		
		if (!client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
		if (!user_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user_id'.`)

		const [identityClaimsErrors, identityClaims={}] = yield eventHandlerStore.get_identity_claims.exec({ client_id, user_id, scopes, state })
		if (identityClaimsErrors)
			throw wrapErrors(errorMsg, identityClaimsErrors)

		const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id, user_client_ids:identityClaims.client_ids })
		if (clientIdErrors)
			throw wrapErrors(errorMsg, clientIdErrors)
					
		const claims = {
			...oauth2Params.convert.toOIDCClaims({  
				client_id, 
				user_id, 
				audiences, 
				scopes,
				extra: identityClaims.claims||{}
			}),
			...basicOIDCclaims.claims,
			nonce
		}

		const [errors, token] = yield eventHandlerStore.generate_id_token.exec({ claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return {
				token,
				expires_in: basicOIDCclaims.expires_in
			}
	})

	// eventHandlerStore[eventName] = new EventHandler(handler)
	setEventHandler(eventHandlerStore, eventName, handler)
}
const addGenerateAuthorizationCodeHandler = eventHandlerStore => {
	const eventName = 'generate_openid_authorization_code'
	if (eventHandlerStore[eventName])
		return
	const handler = (root, { client_id, user_id, scopes, state, code_challenge, nonce }) => co(function *() {
		const errorMsg = 'Failed to generate authorization code'
		if (!eventHandlerStore.generate_authorization_code)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_authorization_code' handler.`)
		if (!eventHandlerStore.get_config)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)
		
		const [basicOIDCclaimsErrors, basicOIDCclaims] = yield oauth2Params.getAuthorizationCodeBasicClaims(eventHandlerStore)
		if (basicOIDCclaimsErrors)
			throw wrapErrors(errorMsg, basicOIDCclaimsErrors)
		
		const claims = {
			...oauth2Params.convert.toOIDCClaims({  
				client_id, 
				user_id, 
				scopes
			}),
			...basicOIDCclaims.claims,
			code_challenge,
			nonce
		}

		const [errors, token] = yield eventHandlerStore.generate_authorization_code.exec({ claims, state })
		if (errors)
			throw wrapErrors(errorMsg, errors)
		else 
			return {
				token,
				expires_in: basicOIDCclaims.expires_in
			}
	})

	// eventHandlerStore[eventName] = new EventHandler(handler)
	setEventHandler(eventHandlerStore, eventName, handler)
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

	// eventHandlerStore[eventName] = new EventHandler(handler)
	setEventHandler(eventHandlerStore, eventName, handler)
}

const registerSingleEvent = eventHandlerStore => (eventName, handler) => {
	if (!eventName)
		throw new Error('Missing required \'eventName\'')
	if (!handler)
		throw new Error(`Missing required ${eventName} 'handler'`)
	if (typeof(handler) != 'function')
		throw new Error(`Invalid ${eventName} handler. Expect 'handler' to be a function, but found ${typeof(handler)} instead.`)

	if (eventHandlerStore[eventName])
		eventHandlerStore[eventName].addHandler(handler)
	else
		// eventHandlerStore[eventName] = new EventHandler(handler)
		setEventHandler(eventHandlerStore, eventName, handler)
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
		if (strategyHandler && strategyHandler instanceof Strategy) {
			// 1. Verify the UserIn strategy
			verifyStrategy(strategyHandler)
			// 2. Set the context on the 'eventHandlerStore'. This helps to bring context to each 
			// handler (e.g., usefull for dependency injection)
			eventHandlerStore.context = strategyHandler.config

			// 3. Register the default 'get_config' event handler
			registerEvent('get_config', () => strategyHandler.config)
			// 4. Regsiter all the strategy's events handler
			const events = getEvents()
			events.forEach(eventName => {
				if (strategyHandler[eventName])
					registerEvent(eventName, strategyHandler[eventName])
			})
		} else {
			const [eventName, handler] = args
			registerEvent(eventName, handler)
		}
	}

	return registerEventHandler
}









