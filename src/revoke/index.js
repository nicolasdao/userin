const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

const endpoint = 'revoke' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Revokes a refresh_token. This API requires an access_token passed in the Authorization header. 
 * 												
 * @param {String}		payload.client_id			Required only when the claims associated with the access_token	
 *                                      			contain a 'client_id'. This allows to support non-standard OAuth 2 
 *                                      			flows for the loginsignup or loginsignupfip mode.												
 * @param {String}		payload.token				We're assuming that's the refresh_token.					
 * @param {String}		payload.token_type_hint		Technically, we're supposed to use this value which can either be 
 *                                           		'refresh_token' or 'access_token', but most of the time we only care 
 *                                           		about the refresh_token as the access_token is usually self-encoded, 
 *                                           		and therefore not revokable. That's why we're ignoring it. To know more 
 *                                           		about this, please refer to 
 *                                           		https://www.oauth.com/oauth2-servers/listing-authorizations/revoking-access/
 * @param {Object}		eventHandlerStore
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')                 					    						
 *  
 * @yield  {[Error]}	output[0]					Array of errors
 * @return {Void}		output[1]
 */
const handler = (payload={}, eventHandlerStore={}, context={}) => catchErrors(co(function *() {
	const { client_id, token } = payload
	const { authorization } = context

	if (TRACE_ON)
		console.log('INFO - Request to revoke token')

	const errorMsg = 'Failed to revoke token'
	// A. Validates input
	if (!eventHandlerStore.get_refresh_token_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_refresh_token_claims' handler.`)
	if (!eventHandlerStore.delete_refresh_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'delete_refresh_token' handler.`)

	if (!token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'token'.`)
	if (!authorization)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'authorization'.`)
	if (typeof(authorization) != 'string')
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must be a string (current: ${typeof(authorization)}).`)

	const [,access_token] = authorization.match(/^[bB]earer\s+(.*?)$/) || []

	if (!access_token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must contain a bearer access_token.`)
	
	// B. Extract claims from access_token
	const [claimsErrors, claims] = yield eventHandlerStore.get_access_token_claims.exec({ token:access_token })
	if (claimsErrors)
		throw wrapErrors(errorMsg, claimsErrors)

	// C. Validate access_token claims
	if (!claims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid access_token.`)

	const [claimsExpiredErrors] = oauth2Params.verify.claimsExpired(claims)
	if (claimsExpiredErrors)
		throw new userInError.InvalidTokenError(`${errorMsg}. access_token has expired.`)

	const checkClientId = client_id || claims.client_id

	if (checkClientId) {
		if (!eventHandlerStore.get_client)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
		if (!client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
		if (claims.client_id != client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'client_id'.`)
	}

	// D. Gets the refresh_token claims
	const [[serviceAccountErrors, serviceAccount], [refreshTokenClaimsErrors, refreshTokenClaims]] = yield [
		checkClientId ? eventHandlerStore.get_client.exec({ client_id }) : Promise.resolve([null,{}]),
		eventHandlerStore.get_refresh_token_claims.exec({ token })
	]
	
	if (serviceAccountErrors || refreshTokenClaimsErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors || refreshTokenClaimsErrors)

	// If the refresh_token is expired or does not exist or the client does not exist anymore, 
	// then the revokation is automatically considered successfull
	if (!refreshTokenClaims || !serviceAccount || (refreshTokenClaims.exp && !isNaN(refreshTokenClaims.exp*1) && Date.now() > refreshTokenClaims.exp*1000))
		return

	// E. Validates refresh_token claims
	if (checkClientId && refreshTokenClaims.client_id != client_id)
		throw new userInError.InvalidClientError(`${errorMsg}. Invalid 'client_id'.`)

	// F. Deletes the refresh_token
	const [tokenDeletedErrors] = yield eventHandlerStore.delete_refresh_token.exec({ token })
	if (tokenDeletedErrors)
		throw wrapErrors(errorMsg, tokenDeletedErrors)

	return
}))

module.exports = {
	endpoint,
	handler
}



