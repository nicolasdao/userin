const { co } = require('core-async')
const { error: { catchErrors, wrapErrors }, url:urlHelp } = require('puffy')
const { error:userInError } = require('userin-core')
const { validateConsentPageInput } = require('./_core')

const endpoint = 'authorize' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Verifies that a token is valid and returns the claims associated with that token if it is valid. 
 * 												
 * @param {String}		payload.client_id							
 * @param {String}		payload.response_type							
 * @param {String}		payload.scope							
 * @param {String}		payload.state	
 * @param {String}		payload.code_challenge
 * @param {String}		payload.code_challenge_method
 * @param {String}		payload.nonce
 * @param {String}		payload.redirect_uri
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
	const { client_id, response_type, scope, state, redirect_uri, code_challenge, code_challenge_method, nonce } = payload

	if (TRACE_ON)
		console.log('INFO - Request to authorize client_id')

	const errorMsg = 'Failed to authorize client_id'
	// A. Validates input
	const [validationErrors, validation] = yield validateConsentPageInput(eventHandlerStore, { client_id, response_type, scope, redirect_uri, code_challenge, code_challenge_method })
	if (validationErrors)
		throw wrapErrors(errorMsg, validationErrors)

	if (!eventHandlerStore.generate_auth_request_code)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_auth_request_code' handler.`)

	// B. Generates an opaque code to safely persist those data so they can be extracted later when they come back
	// from the consent page.
	const claims = { client_id, response_type, scope, state, redirect_uri, code_challenge, code_challenge_method, nonce }
	const [codeErrors, code] = yield eventHandlerStore.generate_auth_request_code.exec({ claims })
	if (codeErrors)
		throw wrapErrors(errorMsg, codeErrors)		

	// C. Redirects to the consent page
	try {
		const urlConfig = urlHelp.getInfo(validation.consentPage)
		urlConfig.query.code = code
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



