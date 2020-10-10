const { co } = require('core-async')
const { url: urlHelp, error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { request: { getUrlInfo }, oauth2Params } = require('../_utils')
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
	// If the request is not from localhost and the protocol is HTTP, then upgrade to HTTPS.
	if (requestUrlInfo.host.indexOf('localhost') < 0 && requestUrlInfo.protocol == 'http:')
		requestUrlInfo.protocol = 'https:'
	const query = requestUrlInfo.query
	const redirectUri = urlHelp.buildUrl({ ...requestUrlInfo, pathname:redirectPath, query:'' })
	query.orig_redirectUri = redirectUri
	const state = oauth2Params.convert.objectToBase64(query)
	
	return { state, uri:redirectUri }
}

/**
 * Validates the authorization request before it is sent to the IdP. 
 * 
 * @param {String}		client_id					e.g., '123445'
 * @param {String}		response_type				e.g., 'code+id_token'
 * @param {String}		redirect_uri				e.g., 'https%3A%2F%2Fneap.co'
 * @param {String}		scope						e.g., 'profile%20email'
 * @param {[String]}	options.scopes				Extra scopes that need to be added to the original 'scope'
 * @param {Boolean}		options.verifyClientId		False is used with flows where no client_id is used (e.g., 'loginsignupfip').
 *
 * @yield {Void}
 */
const _validateAuthorizationRequest = (eventHandlerStore, { client_id, response_type, redirect_uri, scope }, options={}) => catchErrors(co(function *() {
	const errorMsg = 'Failed to execute the \'authorization\' request'
	// if (!client_id)
	// 	throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
	if (!response_type)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'response_type'.`)
	if (!redirect_uri)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'redirect_uri'.`)

	const [responseTypeErrors] = oauth2Params.convert.responseTypeToTypes(response_type)
	if (responseTypeErrors)
		throw wrapErrors(errorMsg, responseTypeErrors)

	const scopes = oauth2Params.convert.thingToThings(scope)
	if (options.scopes && Array.isArray(options.scopes))
		scopes.push(...options.scopes)

	if (options.verifyClientId && scopes.length) {
		// B. Verifying those scopes are allowed for that client_id
		const [serviceAccountErrors] = yield verifyScopes(eventHandlerStore, { client_id, scopes })
		if (serviceAccountErrors)
			throw wrapErrors(errorMsg, serviceAccountErrors)
	}
}))


/**
 * Creates a 'getRequestHandler' function that can configure a new handler. 
 * 
 * @param  {Function} configureRedirect			(config: Object): Function
 * @return {Function} getRequestHandler
 */
module.exports = configureRedirect => 
	/**
	 * Creates a handler for a specific endpoint. 
	 *
	 * @param {String}		endpoint			e.g., '/google/authorize'
	 * @param {String}		openIdServer		e.g., 'google'
	 * @param {String}		redirectPathname	e.g., '/google/authorizecallback'			
	 * @param {[String]}	scopes		
	 * @param {Boolean}		verifyClientId		Default true. False is used with flows where no client_id is used (e.g., 'loginsignupfip').
	 *
	 * @return {String}		endpoint			Same as 'endpoint'
	 * @return {Function}	handler				(payload: Object, eventHandlerStore: Object, context: Object): Void
	 */
	(endpoint, openIdServer, endpointRedirectRef, scopes, verifyClientId=true) => {
		const classErrorMsg = 'Failed to create a new instance of OpenIdConsentPageRequestHandler'
		if (!configureRedirect)
			throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'configureRedirect'.`)
		if (!endpoint)
			throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'endpoint'.`)
		if (!openIdServer)
			throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'openIdServer'.`)
		if (!endpointRedirectRef)
			throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'endpointRedirectRef'.`)
		if (!scopes || !scopes.length)
			throw new userInError.InternalServerError(`${classErrorMsg}. 'scopes' must exist and cannot be empty.`)

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
		 * @param {String}		context.baseUrl
		 * @param {Object}		context.tokenExpiry			
		 * @param {[String]}	context.modes				Valid values: 'loginsignup', 'loginsignupfip', 'openid'
		 * @param {String}		context.version
		 *  
		 * @yield {[Error]}		output[0]					Array of errors
		 * @return {Void}		output[1]
		 */
		const handler = (payload={}, eventHandlerStore={}, context={}) => catchErrors(co(function *() {		
			const errorMsg = `Failed to browse to ${openIdServer} consent page`
			
			if (!context.req)
				throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.req'.`)
			if (!context.res)
				throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.res'.`)
			if (!context.endpoints)
				throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.endpoints'.`)

			const redirectPathname = context.endpoints[endpointRedirectRef]

			if (!redirectPathname)
				throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.endpoints.${endpointRedirectRef}'.`)

			const { state, uri:redirect_uri } = _getRedirectUri(context.req, redirectPathname)
			
			if (TRACE_ON)
				console.log(`INFO - Request received to browse to ${openIdServer} for scopes ${scopes.map(s => `'${s}'`).join(', ')} (redirect URI: ${redirect_uri})`)
			
			const [errors] = yield _validateAuthorizationRequest(eventHandlerStore, payload, { verifyClientId })
			if (errors) 
				throw wrapErrors(errorMsg, errors)

			const sendToConsentPage = configureRedirect({ redirect_uri, state, openIdServer, scopes })
			const [consentPageErrors] = sendToConsentPage(context.req, context.res)
			if (consentPageErrors) 
				throw wrapErrors(errorMsg, consentPageErrors)
		}))

		return {
			endpoint,
			handler
		}
	}

