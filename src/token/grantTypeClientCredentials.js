const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

/**
 * Creates a new access token using service account credentials.
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
	if (!eventHandlerStore.get_service_account)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_service_account' handler.`)

	if (!eventHandlerStore.generate_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
	if (!client_secret)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_secret'`)

	// B. Gets the service account's scopes and audiences
	const [serviceAccountErrors, serviceAccount] = yield eventHandlerStore.get_service_account.exec({ client_id, client_secret })
	if (serviceAccountErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors)
	
	// C. Verifies the details are correct
	const { audiences, scopes:serviceAccountScopes } = serviceAccount 
	const [scopeErrors] = oauth2Params.verify.scopes({ scopes, serviceAccountScopes })
	if (scopeErrors)
		throw wrapErrors(errorMsg, scopeErrors)

	// D. Get the access_token for that user_id
	const [tokenErrors, tokenResult] = yield eventHandlerStore.generate_access_token.exec({ client_id, audiences, scopes, state })
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


