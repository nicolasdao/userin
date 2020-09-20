const { co } = require('core-async')
const passport = require('passport')
const { url: urlHelp, error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params, request: { getUrlInfo } } = require('../_utils')
const getFIPuserProcessor = require('./processTheFIPuser')

const TRACE_ON = process.env.LOG_LEVEL == 'trace'


/**
 * Gets the user details from the IdP. This should also include OIDC tokens such as a refreshToken and an accessToken. 
 * 
 * @param  {Request}	req				This request object contained the secret 'code' in its query params. Without 
 *                          			that 'code', it would not be possible to get the user details. 	
 * @param  {Response}	res				To be honest, this one is useless here.
 * @param  {String}		strategy
 * @param  {String}		callbackURL
 * 
 * @return {[Error]}	output[0]
 * @return {Object}		output[1]		IdP User	
 */
const _getIdPuser = (req, res, strategy, callbackURL) => catchErrors(new Promise((onSuccess, onFailure) => {
	const errorMsg = `Failed to retrieve ${strategy} user and tokens when querying ${callbackURL}`

	if (TRACE_ON)
		console.log(`INFO - Exchanging ${strategy} Authorization code for a user object (incl. tokens)`)

	try {
		passport.authenticate(strategy, { callbackURL }, (err,user) => {
			// CASE 1 - IdP Failure
			if (err) 
				onFailure(wrapErrors(errorMsg, [err]))
			// CASE 2 - IdP Success
			else 
				onSuccess(user)
		})(req, res)
	} catch (err) {
		onFailure(wrapErrors(errorMsg, [err]))
	}
}))

const _getMissingQueryParamError = (errorMsg, strategy, queryParam) => 
	`${errorMsg}. ${strategy} did not include the required query parameter '${queryParam}' in its redirect URI. It was either not included in the first place, or ${strategy} removed it when redirecting back to UserIn.`
const _getMissingStateQueryParamError = (errorMsg, strategy, queryParam) => 
	`${errorMsg}. The encoded 'state' query parameter in the ${strategy} redirect URI is missing the required '${queryParam}' variable.`

/**
 * Class ConsentPageRequestHandler definition
 *
 * @param {String}		endpoint			e.g., '/facebook/authorizecallback'
 * @param {String}		strategy			e.g., 'facebook'
 * @param {Boolean}		verifyClientId		Default true. False is used with flows where no client_id is used (e.g., 'loginsignupfip').	
 * 
 */
module.exports = function ConsentPageResponseHandler(endpoint, strategy, verifyClientId=true) {
	const classErrorMsg = 'Failed to create a new instance of ConsentPageResponseHandler'
	if (!endpoint)
		throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'endpoint'.`)
	if (!strategy)
		throw new userInError.InternalServerError(`${classErrorMsg}. Missing required 'strategy'.`)

	this.endpoint = endpoint

	/**
	 * Redirects to the consent page 
	 *
	 * @param {String}		payload.state						
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
		const errorMsg = `Failed to process authentication response from ${strategy}`
		
		if (!context.req)
			throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.req'.`)
		if (!context.res)
			throw new userInError.InternalServerError(`${errorMsg}. Missing required 'context.res'.`)

		if (TRACE_ON)
			console.log(`INFO - Received redirect from ${strategy} to ${getUrlInfo(context.req).pathname}`)

		if (!payload.state)
			throw new userInError.InvalidRequestError(_getMissingQueryParamError(errorMsg, strategy, 'state'))
		const [decodedStateErrors, decodedState] = oauth2Params.convert.base64ToObject(payload.state)
		if (decodedStateErrors)
			throw wrapErrors(errorMsg, decodedStateErrors)

		const { client_id, redirect_uri, response_type, orig_redirectUri, scope, state } = decodedState || {}

		// if (!client_id)
		// 	throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'client_id'))
		if (!redirect_uri)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'redirect_uri'))
		if (!response_type)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'response_type'))
		if (!orig_redirectUri)
			throw new userInError.InvalidRequestError(_getMissingStateQueryParamError(errorMsg, strategy, 'orig_redirectUri'))

		// The 'orig_redirectUri' URL is a security check. Certain IdPs (e.g., Facebook) requires that you 
		// use the same redirect uri that then one used to get the 'code' in order to get the access_token.
		const [idpErrors, user] = yield _getIdPuser(context.req, context.res, strategy, orig_redirectUri)

		if (idpErrors)
			throw wrapErrors(errorMsg, idpErrors)

		const processTheFIPuser = getFIPuserProcessor('login')(verifyClientId)
		const [tokenResultErrors, tokenResult] = yield processTheFIPuser({ 
			user, 
			strategy, 
			client_id,
			response_type,
			scopes: oauth2Params.convert.thingToThings(scope),
			state,
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
}





