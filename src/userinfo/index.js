const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

const endpoint = 'userinfo' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Gets the userinfo 
 * 					
 * @param {Object}		payload						Not needed with this method.
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
 * @yield {Boolean}		output[1].active
 * @yield {Boolean}		output[1]...				The rest of the properties depends on the scopes associated with the 
 *        											access_token. 
 */
const handler = (payload, eventHandlerStore, { authorization }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to get the user info'

	if (TRACE_ON)
		console.log('INFO - Request to get user info')

	// A. Validates input
	if (!eventHandlerStore.get_access_token_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_access_token_claims' handler.`)
	if (!eventHandlerStore.get_identity_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_identity_claims' handler.`)

	if (!authorization)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'authorization'.`)
	if (typeof(authorization) != 'string')
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must be a string (current: ${typeof(authorization)}).`)

	const [,token] = authorization.match(/^[bB]earer\s+(.*?)$/) || []

	if (!token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'authorization' header. The 'authorization' header must contain a bearer access_token.`)
	
	// B. Extract claims from access_token
	const [claimsErrors, claims] = yield eventHandlerStore.get_access_token_claims.exec({ token })
	if (claimsErrors)
		throw wrapErrors(errorMsg, claimsErrors)

	// C. Validate claims
	if (!claims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid access_token.`)

	const [claimsExpiredErrors] = oauth2Params.verify.claimsExpired(claims)
	if (claimsExpiredErrors)
		throw new userInError.InvalidTokenError(`${errorMsg}. access_token has expired.`)

	// D. Get identity claims based on the access_token's scope
	const { client_id, sub:user_id, scope } = claims
	const scopes = oauth2Params.convert.thingToThings(scope)

	const [identityClaimsErrors, identityClaims={}] = yield eventHandlerStore.get_identity_claims.exec({ client_id, user_id, scopes })
	if (identityClaimsErrors)
		throw wrapErrors(errorMsg, identityClaimsErrors)

	const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id, user_client_ids:identityClaims.client_ids })
	if (clientIdErrors)
		throw wrapErrors(errorMsg, clientIdErrors)

	return {
		...(identityClaims.claims||{}),
		active:true
	}
}))



module.exports = {
	endpoint,
	handler
}