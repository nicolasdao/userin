const { co } = require('core-async')
const { error: { catchErrors, wrapErrors }, url:urlHelp } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')
const { validateConsentPageInput } = require('./_core')

const endpoint = 'authorizeconsent' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Verifies that a token is valid and returns the claims associated with that token if it is valid. 
 * 												
 * @param {String}		payload.consentcode
 * @param {Object}		eventHandlerStore
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')    
 * @param {String}		context.baseUrl
 * @param {Object}		context.tokenExpiry			
 * @param {[String]}	context.modes				Valid values: 'loginsignup', 'loginsignupfip', 'openid'
 * @param {String}		context.version
 *  
 * @yield {[Error]}		output[0]					Array of errors
 * @return {String}		output[1].iss			
 * @return {Object}		output[1].sub				String or number
 * @return {String}		output[1].aud
 * @return {Number}		output[1].exp
 * @return {Number}		output[1].iat
 * @return {Object}		output[1].client_id			String or number
 * @return {String}		output[1].scope
 */
const handler = (payload={}, eventHandlerStore={}, context) => catchErrors(co(function *() {
	const { consentcode } = payload

	if (TRACE_ON)
		console.log('INFO - Response from consent page received')

	const errorMsg = 'Failed to process response from consent page'
	// A. Validates input
	if (!eventHandlerStore.get_auth_consent_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_auth_consent_claims' handler.`)
	if (!eventHandlerStore.get_auth_request_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_auth_request_claims' handler.`)
	if (!eventHandlerStore.generate_id_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler.`)
	if (!eventHandlerStore.generate_access_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler.`)
	if (!eventHandlerStore.generate_authorization_code)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_authorization_code' handler.`)
	if (!eventHandlerStore.get_end_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_end_user' handler.`)

	if (!consentcode)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'consentcode'.`)

	// B. Exchanges the consentcode for a user_id and the code that was sent in the original request.
	const [consentDataErrors, consentData={}] = oauth2Params.convert.get_auth_consent_claims.exec({ token:consentcode })
	if (consentDataErrors)
		throw wrapErrors(errorMsg, consentDataErrors)

	const { user_id, username, code, exp } = consentData

	if (!user_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user_id'. The consentcode failed to be retrieve data containing a user_id property.`)
	if (!username)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'username'. The consentcode failed to be retrieve data containing a username property.`)
	if (!code)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'code'. The consentcode failed to be retrieve data containing a code property.`)
	if (!exp)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'exp'. The consentcode failed to be retrieve data containing a exp property.`)
	if (isNaN(exp*1))
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid number. The 'exp' property is not a number.`)

	if (Date.now() > exp*1000)
		throw new userInError.InvalidTokenError(`${errorMsg}. consentcode is expired.`)

	// C. Exchanges the code for its original claims
	const [codeDataErrors, codeData={}] = yield eventHandlerStore.get_auth_request_claims.exec({ token:code })
	if (codeDataErrors)
		throw wrapErrors(errorMsg, codeDataErrors)

	const { client_id, response_type, scope, state, redirect_uri, code_challenge, code_challenge_method, nonce } = codeData

	const [validationErrors, validationData={}] = yield validateConsentPageInput(eventHandlerStore, { client_id, response_type, scope, redirect_uri, code_challenge, code_challenge_method })
	if (validationErrors)
		throw wrapErrors(errorMsg, validationErrors)

	const { client, scopes, responseTypes } = validationData
	
	// D. Links the user_id with the client_id
	const [linkErrors] = yield eventHandlerStore.link_client_to_user.exec({ user_id, client_id, scopes, state })
	if (linkErrors)
		throw wrapErrors(errorMsg, linkErrors)

	// E. Confirm the linking 
	const [userErrors, doubleCheckUser] = yield eventHandlerStore.get_end_user.exec({ user: { username } })
	if (userErrors)
		throw wrapErrors(errorMsg, userErrors)

	if (!doubleCheckUser)
		throw new userInError.InvalidRequestError(`${errorMsg}. username not found.`)
	if (doubleCheckUser.id != user_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid user.`)
	const userToClientIds = doubleCheckUser.client_ids || []
	if (userToClientIds.indexOf(client_id) < 0)
		throw new userInError.InternalServerError(`${errorMsg}. Failed to link client_id to user_id.`)

	// F. Determines the resource needs based on the response_type values
	const requestCode = responseTypes.some(t => t == 'code')
	const requestAccessToken = responseTypes.some(t => t == 'token')
	const requestNeedsIdToken = responseTypes.some(t => t == 'id_token')
	const requestIdToken = requestNeedsIdToken && scopes && scopes.indexOf('openid') >= 0

	// G. Generates tokens
	const emptyPromise = Promise.resolve([null, null])
	const config = { client_id, user_id, audiences:client.audiences, scopes }
	const authCodeConfig = { ...config, code_challenge, code_challenge_method, redirect_uri }
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

	// H. Redirects to user's page
	try {
		const urlConfig = urlHelp.getInfo(redirect_uri)
		urlConfig.query = {}
		
		if (codeResult && codeResult.token)
			urlConfig.query.code = codeResult.token

		if (accessTokenResult && accessTokenResult.token)
			urlConfig.query.token = accessTokenResult.token

		if (idTokenResult && idTokenResult.token)
			urlConfig.query.id_token = idTokenResult.token

		if (state)
			urlConfig.query.state = state			

		const fullConsentPageUrl = urlHelp.buildUrl(urlConfig)
		context.res.redirect(fullConsentPageUrl)
	} catch(err) {
		throw wrapErrors(errorMsg, [err])
	}
}))

module.exports = {
	endpoint,
	handler
}



