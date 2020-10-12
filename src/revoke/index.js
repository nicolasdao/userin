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
 * @param {String}		context.baseUrl
 * @param {Object}		context.tokenExpiry			
 * @param {[String]}	context.modes				Valid values: 'loginsignup', 'loginsignupfip', 'openid'
 * @param {String}		context.version          					    						
 *  
 * @yield  {[Error]}	output[0]					Array of errors
 * @return {Void}		output[1]
 */
const handler = (payload={}, eventHandlerStore={}, context={}) => catchErrors(co(function *() {
	const { client_id, client_secret, token } = payload
	const { authorization } = context

	if (TRACE_ON)
		console.log('INFO - Request to revoke token')

	const errorMsg = 'Failed to revoke token'
	// A. Validates input
	if (!eventHandlerStore.get_refresh_token_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_refresh_token_claims' handler.`)
	if (!eventHandlerStore.delete_refresh_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'delete_refresh_token' handler.`)

	if (!authorization)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'authorization' header.`)
	
	const [,access_token] = authorization.match(/^[bB]earer\s+(.*?)$/) || []
	if (!access_token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must contain a bearer access_token.`)

	if (!token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'token'.`)
	if (typeof(authorization) != 'string')
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must be a string (current: ${typeof(authorization)}).`)
	
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

	const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token })
	if (refreshTokenClaimsErrors)
		throw wrapErrors(errorMsg, refreshTokenClaimsErrors)

	if (!refreshTokenClaims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Token not found.`)

	const checkClientId = claims.client_id || refreshTokenClaims.client_id

	if (checkClientId) {
		if (!eventHandlerStore.get_client)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
		if (!client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
		if (claims.client_id != client_id)
			throw new userInError.InvalidClientError(`${errorMsg}. Invalid 'client_id'.`)
		if (refreshTokenClaims.client_id != client_id)
			throw new userInError.InvalidClientError(`${errorMsg}. Invalid 'client_id'.`)
	
		const [clientErrors, client] = yield eventHandlerStore.get_client.exec({ client_id })
		if (clientErrors)
			throw wrapErrors(errorMsg, clientErrors)

		if (!client)
			throw new userInError.InvalidClientError(`${errorMsg}. client_id not found.`)

		if (oauth2Params.check.client.isPrivate(client)) {
			if (!client_secret)
				throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_secret'.`)

			const [clientErrors, client] = yield eventHandlerStore.get_client.exec({ client_id, client_secret })
			if (clientErrors)
				throw wrapErrors(errorMsg, [new userInError.InvalidClientError('client_id not found'), ...clientErrors])
			if (!client)
				throw new userInError.InvalidClientError(`${errorMsg}. 'client_id' not found.`)
		}
	}

	// F. Check that if the access_token belongs to a user, that refresh_token belong to that same user
	if (claims.sub && claims.sub != refreshTokenClaims.sub)
		throw new userInError.InvalidTokenError(`${errorMsg}. Unauthorized access.`)
	
	// D. Gets the refresh_token claims
	const tokenHasExpired = refreshTokenClaims.exp && !isNaN(refreshTokenClaims.exp*1) && Date.now() > refreshTokenClaims.exp*1000
	if (tokenHasExpired)
		return {}

	// G. Deletes the refresh_token
	const [tokenDeletedErrors] = yield eventHandlerStore.delete_refresh_token.exec({ token })
	if (tokenDeletedErrors)
		throw wrapErrors(errorMsg, tokenDeletedErrors)

	return {}
}))

module.exports = {
	endpoint,
	handler
}



