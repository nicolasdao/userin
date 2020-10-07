const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

/**
 * Creates a new access token using the client credentials.
 *
 * @param {Object}		eventHandlerStore
 * @param {String}		client_id	
 * @param {String}		client_secret	
 * @param {[String]}	scopes	
 * @param {String}		state
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].scope
 */
const exec = (eventHandlerStore={}, { client_id, client_secret, scopes, state }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'client_credentials\''
	// A. Validates input
	if (!eventHandlerStore.get_client)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
	if (!eventHandlerStore.generate_access_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler.`)
	if (!eventHandlerStore.get_config)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
	if (!client_secret)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_secret'`)

	// B. Gets the client's scopes and audiences
	const [serviceAccountErrors, serviceAccount] = yield eventHandlerStore.get_client.exec({ client_id, client_secret })
	if (serviceAccountErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors)
	
	// C. Verifies the details are correct
	if (!serviceAccount)
		throw new userInError.InvalidClientError(`${errorMsg}. 'client_id' not found.`)
	const { audiences, scopes:clientScopes } = serviceAccount 
	const [scopeErrors] = oauth2Params.verify.scopes({ scopes, clientScopes })
	if (scopeErrors)
		throw wrapErrors(errorMsg, scopeErrors)

	// D. Get the access_token for that user_id
	const [tokenErrors, tokenResult] = yield eventHandlerStore.generate_openid_access_token.exec({ client_id, audiences, scopes, state })
	if (tokenErrors)
		throw wrapErrors(errorMsg, tokenErrors)

	return {
		access_token: tokenResult.token,
		token_type:'bearer',
		expires_in: tokenResult.expires_in,
		scope: oauth2Params.convert.thingsToThing(scopes)
	}
}))


module.exports = {
	exec
}


