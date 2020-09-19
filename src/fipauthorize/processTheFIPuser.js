const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { verifyScopes } = require('./_utils')
const { oauth2Params } = require('../_utils')

/**
 * Processes the user received from the FIP
 * 
 * @param {Object}		user
 * @param {Object}		user.id					String or number
 * @param {String}		client_id				
 * @param {String}		strategy				e.g., 'default', 'facebook'
 * @param {String}		response_type			e.g., 'code+id_token'
 * @param {String}		scopes
 * @param {String}		state
 * @param {Object}		eventHandlerStore
 * @param {Boolean}		verifyClientId		Default true. False is used with flows where no client_id is used (e.g., 'loginsignupfip').
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const processTheFIPuser = ({ user, strategy, client_id, response_type, scopes, state }, eventHandlerStore={}, verifyClientId=true) => catchErrors(co(function *() {
	const errorMsg = `Failed to process ${strategy} user`
	// A. Validates input
	if (verifyClientId && !eventHandlerStore.get_client)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
	if (!eventHandlerStore.get_fip_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_fip_user' handler.`)
	if (!eventHandlerStore.generate_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
	
	if (verifyClientId && !client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id' argument.`)
	if (!user)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user' argument.`)
	if (typeof(user) != 'object')
		throw new userInError.InvalidRequestError(`${errorMsg}. The 'user' argument must be an object.`)
	if (!user.id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'id' property in the 'user' object.`)
	if (!strategy)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'strategy' argument.`)
	
	const [responseTypeErrors, responseTypes] = oauth2Params.convert.responseTypeToTypes(response_type)
	if (responseTypeErrors)
		throw wrapErrors(errorMsg, responseTypeErrors)

	// B. Verifying those scopes are allowed for that client_id
	const audiences = []
	if (verifyClientId) {
		const [serviceAccountErrors, serviceAccount] = yield verifyScopes(eventHandlerStore, { client_id, scopes })
		if (serviceAccountErrors)
			throw wrapErrors(errorMsg, serviceAccountErrors)
		
		audiences.push(...(serviceAccount.audiences||[]))
	}


	// C. Processes user
	const [userErrors, validUser] = yield eventHandlerStore.get_fip_user.exec({ client_id, strategy, user, state })
	if (userErrors)
		throw wrapErrors(errorMsg, userErrors)

	// D. Validate that the client_id is allowed to process this user. 
	if (!validUser)
		throw new userInError.InternalServerError(`${errorMsg}. Corrupted data. Processing the FIP user failed to return any data.`)

	if (verifyClientId) {
		const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id:validUser.id, user_client_ids:validUser.client_ids })
		if (clientIdErrors)
			throw wrapErrors(errorMsg, clientIdErrors)
	}
	
	// E. Generates tokens
	const requestCode = responseTypes.some(t => t == 'code')
	const requestAccessToken = responseTypes.some(t => t == 'token')
	const requestNeedsIdToken = responseTypes.some(t => t == 'id_token')
	const requestIdToken = requestNeedsIdToken && scopes && scopes.indexOf('openid') >= 0
	const emptyPromise = Promise.resolve([null, null])

	const config = { client_id:client_id||null, user_id:validUser.id, audiences, scopes, state }
	
	const [[accessTokenErrors, accessTokenResult], [codeErrors, codeResult], [idTokenErrors, idTokenResult]] = yield [
		requestAccessToken ? eventHandlerStore.generate_access_token.exec(config) : emptyPromise,
		requestCode ? eventHandlerStore.generate_authorization_code.exec(config) : emptyPromise,
		requestIdToken ? eventHandlerStore.generate_id_token.exec(config) : emptyPromise
	]

	if (accessTokenErrors || idTokenErrors || codeErrors)
		throw wrapErrors(errorMsg, accessTokenErrors || idTokenErrors || codeErrors)

	if (!accessTokenResult && !codeResult && !idTokenResult && requestNeedsIdToken)
		throw new userInError.InvalidRequestError(`${errorMsg}. response_type 'id_token' is invalid without the 'openid' scope.`)

	return {
		access_token: accessTokenResult && accessTokenResult.token ? accessTokenResult.token : null,
		token_type: accessTokenResult && accessTokenResult.token ? 'bearer' : null,
		expires_in: accessTokenResult && accessTokenResult.token ? accessTokenResult.expires_in :  null,
		id_token: idTokenResult && idTokenResult.token ? idTokenResult.token : null,
		code: codeResult && codeResult.token ? codeResult.token : null,
		scope: oauth2Params.convert.thingsToThing(scopes)
	}
}))

module.exports = processTheFIPuser



