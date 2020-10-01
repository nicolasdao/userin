const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { verifyScopes } = require('./_utils')
const { oauth2Params } = require('../_utils')

/**
 * Gets a 'processTheFIPuser' that can process the response from an FIP consent page. 
 * 
 * @param  {String}		loginSignupMode			Valid values: 'login'
 * @param  {Boolean}	openIdMode				Default false. When true, the client_id must be verified and and id_token
 *                                 				can be returned. 
 * 
 * @return {Function}	processTheFIPuser
 */
const getFIPuserProcessor = loginSignupMode => openIdMode => {
	if (!loginSignupMode)
		throw new Error('Missing required \'loginSignupMode\'')
	if (loginSignupMode != 'login' && loginSignupMode != 'signup')
		throw new Error(`'${loginSignupMode}' is an unsupported 'loginSignupMode' value. Valid values are: 'login', 'signup'`)

	const signupModeOn = loginSignupMode == 'signup'
	if (signupModeOn && openIdMode)
		throw new Error('OpenID is not designed to create accounts (i.e., signup mode)')

	/**
	 * Processes the user received from the FIP
	 * 
	 * @param {Object}		user
	 * @param {Object}		user.id							String or number
	 * @param {String}		client_id				
	 * @param {String}		strategy						e.g., 'default', 'facebook'
	 * @param {String}		response_type					e.g., 'code+id_token'
	 * @param {String}		scopes
	 * @param {String}		state
	 * @param {String}		code_challenge					Used for PKCE
	 * @param {String}		nonce					
	 * @param {Object}		eventHandlerStore
	 * 
	 * @yield {[Error]}		output[0]
	 * @yield {String}		output[1].access_token
	 * @yield {String}		output[1].token_type
	 * @yield {String}		output[1].expires_in
	 * @yield {String}		output[1].id_token
	 * @yield {String}		output[1].scope
	 * @yield {Boolean}		output[1].user_already_exists	This property is only returned when 'loginSignupMode' equals 'signup'
	 */
	return ({ user, strategy, client_id, response_type, scopes, state, code_challenge, nonce, redirect_uri }, eventHandlerStore={}) => catchErrors(co(function *() {
		const errorMsg = `Failed to process ${strategy} user`
		// A. Validates input
		if (openIdMode && !eventHandlerStore.get_client)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
		if (!eventHandlerStore.get_fip_user)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_fip_user' handler.`)
		if (signupModeOn && !eventHandlerStore.create_fip_user)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'create_fip_user' handler.`)
		
		if (openIdMode && !client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id' argument.`)
		if (!user)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user' argument.`)
		if (typeof(user) != 'object')
			throw new userInError.InvalidRequestError(`${errorMsg}. The 'user' argument must be an object.`)
		if (!user.id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'id' property in the 'user' object.`)
		if (!strategy)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'strategy' argument.`)
		if (!response_type)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'response_type' argument.`)
		
		const [responseTypeErrors, responseTypes] = oauth2Params.convert.responseTypeToTypes(response_type)
		if (responseTypeErrors)
			throw wrapErrors(errorMsg, responseTypeErrors)

		// B. Determines the resource needs based on the response_type values
		const requestCode = responseTypes.some(t => t == 'code')
		const requestAccessToken = responseTypes.some(t => t == 'token')
		const requestNeedsIdToken = responseTypes.some(t => t == 'id_token')
		const requestIdToken = requestNeedsIdToken && scopes && scopes.indexOf('openid') >= 0 && openIdMode

		if (requestCode && !eventHandlerStore.generate_authorization_code)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_authorization_code' handler. This event handler is required when 'response_type' contains 'code'.`)
		if (requestAccessToken && !eventHandlerStore.generate_access_token)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler. This event handler is required when 'response_type' contains 'token'.`)
		if (requestIdToken && !eventHandlerStore.generate_id_token)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler. This event handler is required when 'response_type' contains 'id_token'.`)

		// C. Verifying those scopes are allowed for that client_id
		const audiences = []
		if (openIdMode) {
			const [serviceAccountErrors, serviceAccount] = yield verifyScopes(eventHandlerStore, { client_id, scopes })
			if (serviceAccountErrors)
				throw wrapErrors(errorMsg, serviceAccountErrors)
			
			audiences.push(...(serviceAccount.audiences||[]))
		}

		// D. Processes user
		let canonicalUser
		const [existingUserErrors, existingUser] = yield eventHandlerStore.get_fip_user.exec({ client_id, strategy, user, state })
		if (existingUserErrors)
			throw wrapErrors(errorMsg, existingUserErrors)

		// E. Validates FIP user based on the loginSignupMode
		// In signup mode, this object tracks whether the user had to be greated or if it already existed. This allows the 
		// code consuming this function to decide if an error has to be thrown or not.
		canonicalUser = existingUser
		const userCreationMeta = {} 
		if (signupModeOn) {
			if (existingUser)
				userCreationMeta.user_already_exists = true 
			else {
				userCreationMeta.user_already_exists = false
				// E.1. Creates the user if it does not exist 
				const [newUserErrors, newUser] = yield eventHandlerStore.create_fip_user.exec({ strategy, user, state })
				if (newUserErrors)
					throw wrapErrors(errorMsg, newUserErrors)
				
				if (!newUser || !newUser.id)
					throw new userInError.InternalServerError(`${errorMsg}. The 'create_fip_user' failed to return the new user ID.`)

				canonicalUser = newUser
			}
		}
		// Login flow 
		else if (!existingUser)
			throw new userInError.InternalServerError(`${errorMsg}. ${strategy} user ID ${user.id} not found.`)

		// E. Validates that the client_id is allowed to process this user if the openId flow is toggled 
		if (openIdMode) {
			const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id:canonicalUser.id, user_client_ids:canonicalUser.client_ids })
			if (clientIdErrors)
				throw wrapErrors(errorMsg, clientIdErrors)
		}
		
		// F. Generates tokens
		const emptyPromise = Promise.resolve([null, null])
		const config = { client_id:client_id||null, user_id:canonicalUser.id, audiences, scopes, state }
		const authCodeConfig = { ...config, code_challenge, redirect_uri }
		const idTokenConfig = { ...config, nonce }
		
		const [[accessTokenErrors, accessTokenResult], [codeErrors, codeResult], [idTokenErrors, idTokenResult]] = yield [
			requestAccessToken ? eventHandlerStore.generate_openid_access_token.exec(config) : emptyPromise,
			requestCode ? eventHandlerStore.generate_openid_authorization_code.exec(authCodeConfig) : emptyPromise,
			requestIdToken ? eventHandlerStore.generate_openid_id_token.exec(idTokenConfig) : emptyPromise
		]

		if (accessTokenErrors || idTokenErrors || codeErrors)
			throw wrapErrors(errorMsg, accessTokenErrors || idTokenErrors || codeErrors)

		if (!accessTokenResult && !codeResult && !idTokenResult && requestNeedsIdToken)
			throw new userInError.InvalidRequestError(`${errorMsg}. response_type 'id_token' is invalid without the 'openid' scope.`)

		return {
			...userCreationMeta,
			access_token: accessTokenResult && accessTokenResult.token ? accessTokenResult.token : null,
			token_type: accessTokenResult && accessTokenResult.token ? 'bearer' : null,
			expires_in: accessTokenResult && accessTokenResult.token ? accessTokenResult.expires_in :  null,
			id_token: idTokenResult && idTokenResult.token ? idTokenResult.token : null,
			code: codeResult && codeResult.token ? codeResult.token : null,
			scope: oauth2Params.convert.thingsToThing(scopes)
		}
	}))
}

module.exports = getFIPuserProcessor



