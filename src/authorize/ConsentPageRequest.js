const { co } = require('core-async')
const passport = require('passport')
const { url: urlHelp, error: { catchErrors, wrapErrors } } = require('puffy')
const { 
	request: { getUrlInfo },
	oauth2Params,
	error: { InvalidRequestError, InternalServerError } } = require('../_utils')
const { verifyScopes } = require('./_utils')

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Returns a URL identical to the request except it has its pathname changed to 'redirectPath' and all its query parameters
 * JSONified into a new 'state' query parameter. The JSONified query parameters are also organized in a such a way that
 * values such as 'response_type=code+id_token' and 'response_type=id_token+code' are identical. This is to avoid IdP such as Google
 * to perceive those 2 values as different URLs. 
 * 
 * @param  {Request}	req				Express request
 * @param  {String}		redirectPath	Redirect pathname
 * 
 * @return {String}		output.state	Base 64 encoded string for the state. Passport sends it to the consent page so when it redirects, it includes that state.
 * @return {String}		output.uri		Fully qualified redirect URL. Passport sends it to the consent page so it can later redirect.
 */
const _getRedirectUri = (req, redirectPath) => {
	const requestUrlInfo = getUrlInfo(req)
	const query = requestUrlInfo.query
	const redirectUri = urlHelp.buildUrl({ ...requestUrlInfo, pathname:redirectPath, query:'' })
	query.orig_redirectUri = redirectUri
	const state = oauth2Params.convert.objectToBase64(query)
	
	return { state, uri:redirectUri }
}

/**
 * Validates the authorization request before it is sent to the IdP. 
 * 
 * @param {String}		client_id			e.g., '123445'
 * @param {String}		response_type		e.g., 'code+id_token'
 * @param {String}		redirect_uri		e.g., 'https%3A%2F%2Fneap.co'
 * @param {String}		scope				e.g., 'profile%20email'
 * @param {[String]}	options.scopes		Extra scopes that need to be added to the original 'scope'
 *
 * @yield {Void}
 */
const _validateAuthorizationRequest = (eventHandlerStore, { client_id, response_type, redirect_uri, scope }, options) => catchErrors(co(function *() {
	const errorMsg = 'Failed to execute the \'authorization\' request'
	if (!client_id)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
	if (!response_type)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'response_type'.`)
	if (!redirect_uri)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'redirect_uri'.`)

	const [responseTypeErrors] = oauth2Params.convert.responseTypeToTypes(response_type)
	if (responseTypeErrors)
		throw wrapErrors(errorMsg, responseTypeErrors)

	const scopes = oauth2Params.convert.thingToThings(scope)
	if (options && options.scopes && Array.isArray(options.scopes))
		scopes.push(...options.scopes)

	if (scopes.length) {
		// B. Verifying those scopes are allowed for that client_id
		const [serviceAccountErrors] = yield verifyScopes(eventHandlerStore, { client_id, scopes })
		if (serviceAccountErrors)
			throw wrapErrors(errorMsg, serviceAccountErrors)
	}
}))

/**
 * Class ConsentPageRequestHandler definition
 *
 * @param {String}		endpoint			e.g., '/facebook/authorize'
 * @param {String}		strategy			e.g., 'facebook'
 * @param {String}		redirectPathname	e.g., '/facebook/authorizecallback'			
 * @param {[String]}	scopes		
 * 
 */
module.exports = function ConsentPageRequestHandler(endpoint, strategy, endpointRedirectRef, scopes) {
	const classErrorMsg = 'Failed to create a new instance of ConsentPageRequestHandler'
	if (!endpoint)
		throw new InternalServerError(`${classErrorMsg}. Missing required 'endpoint'.`)
	if (!strategy)
		throw new InternalServerError(`${classErrorMsg}. Missing required 'strategy'.`)
	if (!endpointRedirectRef)
		throw new InternalServerError(`${classErrorMsg}. Missing required 'endpointRedirectRef'.`)

	this.endpoint = endpoint

	/**
	 * Redirects to the consent page 
	 *
	 * @param {String}		payload.client_id			e.g., '123445'
	 * @param {String}		payload.response_type		e.g., 'code+id_token'
	 * @param {String}		payload.redirect_uri		e.g., 'https%3A%2F%2Fneap.co'
	 * @param {String}		payload.scope				e.g., 'profile%20email'
	 * 					
	 * @param {Object}		eventHandlerStore
	 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
	 * @param {Request}		context.req					Express Request
	 * @param {Response}	context.res					Express Response
	 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')
	 *  
	 * @yield {[Error]}		output[0]					Array of errors
	 * @return {Void}		output[1]
	 */
	this.handler = (payload={}, eventHandlerStore={}, context={}) => catchErrors(co(function *() {		
		const errorMsg = `Failed to browse to ${strategy} consent page`
		
		if (!context.req)
			throw new InternalServerError(`${errorMsg}. Missing required 'context.req'.`)
		if (!context.res)
			throw new InternalServerError(`${errorMsg}. Missing required 'context.res'.`)
		if (!context.endpoints)
			throw new InternalServerError(`${errorMsg}. Missing required 'context.endpoints'.`)

		const redirectPathname = context.endpoints[endpointRedirectRef]

		if (!redirectPathname)
			throw new InternalServerError(`${errorMsg}. Missing required 'context.endpoints.${endpointRedirectRef}'.`)

		const { state, uri:callbackURL } = _getRedirectUri(context.req, redirectPathname)
		
		if (TRACE_ON)
			console.log(`INFO - Request received to browse to ${strategy} for scopes ${scopes.map(s => `'${s}'`).join(', ')} (callback URL: ${callbackURL})`)
		
		const [errors] = yield _validateAuthorizationRequest(eventHandlerStore, payload)
		if (errors) 
			throw wrapErrors(errorMsg, errors)

		try {
			passport.authenticate(strategy, { callbackURL, scope:scopes, state })(context.req, context.res)
		} catch(err) {
			throw new InternalServerError(`${errorMsg}. Passport authenticate failed. Details: ${err.message || err.stack}`)
		}
	}))
}





