const { co } = require('core-async')
const { url: urlHelp, error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { request: { getUrlInfo }, oauth2Params } = require('../_utils')
const getFIPuserProcessor = require('./processTheFIPuser')

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

const _getMissingQueryParamError = (errorMsg, strategy, queryParam) => 
	`${errorMsg}. ${strategy} did not include the required query parameter '${queryParam}' in its redirect URI. It was either not included in the first place, or ${strategy} removed it when redirecting back to UserIn.`
const _getMissingStateQueryParamError = (errorMsg, strategy, queryParam) => 
	`${errorMsg}. The encoded 'state' query parameter in the ${strategy} redirect URI is missing the required '${queryParam}' variable.`

module.exports = getUserProfile => (endpoint, strategy, verifyClientId=true) => {
	const classErrorMsg = 'Failed to create consent page response handler'
	if (!endpoint)
		throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'endpoint'.`)
	if (!strategy)
		throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'strategy'.`)

	/**
	 * Listens for responses from the Consent Page 
	 *
	 * @param {String}		payload.state						
	 * 					
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
	 * @return {Void}		output[1]
	 */
	const handler = (payload={}, eventHandlerStore={}, context={}) => catchErrors(co(function *() {		
		const errorMsg = `Failed to process authentication response from ${strategy}`
		
		if (!context.req)
			throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.req'.`)
		if (!context.res)
			throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.res'.`)

		if (TRACE_ON)
			console.log(`INFO - Received response from ${strategy} to ${getUrlInfo(context.req).pathname}`)

		if (!payload.state)
			throw new userInError.InvalidRequestError(_getMissingQueryParamError(errorMsg, strategy, 'state'))
		const [decodedStateErrors, decodedState] = oauth2Params.convert.base64ToObject(payload.state)
		if (decodedStateErrors)
			throw wrapErrors(errorMsg, decodedStateErrors)

		const { client_id, redirect_uri, response_type, orig_redirectUri, scope, state, code_challenge, code_challenge_method, nonce, mode } = decodedState || {}

		// if (!client_id)
		// 	throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'client_id'))
		if (!redirect_uri)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'redirect_uri'))
		if (!response_type)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'response_type'))
		if (!orig_redirectUri)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'orig_redirectUri'))

		// The 'orig_redirectUri' URL is a security check. Certain IdPs (e.g., Facebook) require that you 
		// use the same redirect uri that then one used to get the 'code' in order to get the access_token.
		const [idpErrors, user] = yield getUserProfile(context.req, context.res, strategy, orig_redirectUri)

		if (idpErrors)
			throw wrapErrors(errorMsg, idpErrors)

		const processTheFIPuser = getFIPuserProcessor(mode)(verifyClientId)
		const [tokenResultErrors, tokenResult] = yield processTheFIPuser({ 
			user, 
			strategy, 
			client_id,
			response_type,
			scopes: oauth2Params.convert.thingToThings(scope),
			state,
			code_challenge,
			code_challenge_method,
			nonce,
			redirect_uri
		}, eventHandlerStore)

		if (tokenResultErrors)
			throw wrapErrors(errorMsg, tokenResultErrors)

		if (TRACE_ON)
			console.log(`INFO - ${strategy} user successfully authenticated`)

		// Builds the redirect_uri
		const urlInfo = urlHelp.getInfo(redirect_uri)
		if (tokenResult && tokenResult.code)
			urlInfo.query.code = tokenResult.code
		if (tokenResult && tokenResult.access_token)
			urlInfo.query.access_token = tokenResult.access_token
		if (tokenResult && tokenResult.id_token)
			urlInfo.query.id_token = tokenResult.id_token
		if (state)
			urlInfo.query.state = state
		
		const redirectUri = urlHelp.buildUrl(urlInfo)

		context.res.redirect(redirectUri)
	}))

	return {
		endpoint,
		handler
	}
}

