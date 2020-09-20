const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')

const endpoint = 'introspect' 

const VALID_TOKEN_TYPES = ['id_token', 'access_token', 'refresh_token']
const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Verifies that a token is valid and returns the claims associated with that token if it is valid. 
 * 												
 * @param {String}		payload.client_id							
 * @param {String}		payload.client_secret							
 * @param {String}		payload.token							
 * @param {String}		payload.token_type_hint	
 * @param {Object}		eventHandlerStore
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')                 					    						
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
const handler = (payload={}, eventHandlerStore={}) => catchErrors(co(function *() {
	const { client_id, client_secret, token, token_type_hint } = payload

	if (TRACE_ON)
		console.log(`INFO - Request to introspect ${token_type_hint || 'unknown token type'}`)

	const errorMsg = `Failed to introspect ${token_type_hint || 'unknown token type'}`
	// A. Validates input

	if (!token_type_hint)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'token_type_hint'.`)
	if (VALID_TOKEN_TYPES.indexOf(token_type_hint) < 0)
		throw new userInError.InvalidRequestError(`${errorMsg}. token_type_hint '${token_type_hint}' is not supported.`)

	const tokenClaimsEventName = `get_${token_type_hint}_claims`

	if (!eventHandlerStore[tokenClaimsEventName])
		throw new userInError.InternalServerError(`${errorMsg}. Missing '${tokenClaimsEventName}' handler.`)
	if (!eventHandlerStore.get_client)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
	if (!client_secret)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_secret'.`)
	if (!token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'token'.`)

	const [[serviceAccountErrors], [claimErrors, claims]] = yield [
		eventHandlerStore.get_client.exec({ client_id, client_secret }),
		eventHandlerStore[tokenClaimsEventName].exec({ token })
	]
	
	if (serviceAccountErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors)

	if (claimErrors)
		return { active:false }

	if (!claims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid ${token_type_hint}`)

	if (claims.exp && !isNaN(claims.exp*1) && Date.now() > claims.exp*1000)
		return { active:false }

	if (claims.client_id != client_id)
		throw new userInError.InvalidClientError(`${errorMsg}. client_id not found.`)

	return {
		iss: claims.iss || null,
		sub: claims.sub || null,
		aud: claims.aud || null,
		exp: claims.exp || null,
		iat: claims.iat || null,
		client_id: claims.client_id || null,
		scope: claims.scope || null,
		active:true,
		token_type: 'Bearer'
	}
}))

module.exports = {
	endpoint,
	handler
}



