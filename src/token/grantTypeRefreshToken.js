const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

/**
 * Creates a new access token using a refresh token.
 * 
 * @param {String}		authPortal.api				URL to the custom Auth API
 * @param {Object}		authPortal.headers		
 * @param {String}		client_id	
 * @param {String}		refresh_token	
 * @param {String}		state
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const exec = (eventHandlerStore, { client_id, refresh_token, state }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'refresh_token\''
	// A. Validates input
	if (!eventHandlerStore.get_token_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_token_claims' handler.`)
	if (!eventHandlerStore.get_service_account)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_service_account' handler.`)
	if (!eventHandlerStore.generate_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
	if (!refresh_token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'refresh_token'`)

	// B. Gets the service account's scopes and audiences as well as the claims originally associated with the refresh_token
	const [[claimsErrors, claims], [serviceAccountErrors, serviceAccount]] = yield [
		eventHandlerStore.get_token_claims.exec({ type:'refresh_token', token:refresh_token }),
		eventHandlerStore.get_service_account.exec({ client_id })
	]
	if (claimsErrors || serviceAccountErrors)
		throw wrapErrors(errorMsg, claimsErrors || serviceAccountErrors)

	// C. Validates that the details match between the service account and the refresh_token.
	if (!claims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid refresh_token.`)
	if (claims.exp) {
		const [claimsExpiredErrors] = oauth2Params.verify.claimsExpired(claims)
		if (claimsExpiredErrors)
			throw wrapErrors(errorMsg, claimsExpiredErrors)
	}

	if (!claims.client_id)
		throw new userInError.InvalidTokenError(`${errorMsg}. Corrupted refresh_token. This token is not associated with any client_id.`)
	if (claims.client_id != client_id)
		throw new userInError.InvalidClientError(`${errorMsg}. Unauthorized access.`)

	const refreshTokenScopes = claims.scope ? oauth2Params.convert.thingToThings(claims.scope) : serviceAccount.scopes
	
	if (claims.scope) {
		const [scopeErrors] = oauth2Params.verify.scopes({ scopes:refreshTokenScopes, serviceAccountScopes:serviceAccount.scopes })
		if (scopeErrors)
			throw wrapErrors(errorMsg, scopeErrors)
	}

	// D. Get the access_token (and potentially the id_token to) for that user_id
	const config = { client_id, user_id:claims.sub, audiences:serviceAccount.audiences, scopes:refreshTokenScopes, state }

	const requestIdToken = refreshTokenScopes && refreshTokenScopes.indexOf('openid') >= 0
	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult]] = yield [
		eventHandlerStore.generate_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_id_token.exec(config) : Promise.resolve([null,null])
	]

	if (accessTokenErrors || idTokenErrors)
		throw wrapErrors(errorMsg, accessTokenErrors || idTokenErrors)

	return {
		id_token: idTokenResult && idTokenResult.token ? idTokenResult.token : null,
		access_token: accessTokenResult.token,
		token_type:'bearer',
		expires_in: accessTokenResult.expires_in,
		scope: oauth2Params.convert.thingsToThing(refreshTokenScopes)
	}
}))


module.exports = {
	exec
}


