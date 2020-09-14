const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { 
	error: { InternalServerError, InvalidRequestError, InvalidTokenError, InvalidClientError }, 
	oauth2Params } = require('../_utils')

/**
 * Creates a new access token using an authorization code.
 * NOTES: There is no 'scopes' here because the scopes are supposed to have been associated with the code 
 * during its creation. 
 *
 * @param {Object}		eventHandlerStore
 * @param {String}		client_id	
 * @param {String}		client_secret	
 * @param {String}		code	
 * @param {String}		state
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].refresh_token
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const exec = (eventHandlerStore={}, { client_id, client_secret, code, state }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'authorization_code\''
	// A. Validates input
	if (!eventHandlerStore.get_service_account)
		throw new InternalServerError(`${errorMsg}. Missing 'get_service_account' handler.`)

	if (!eventHandlerStore.get_token_claims)
		throw new InternalServerError(`${errorMsg}. Missing 'get_token_claims' handler.`)

	if (!eventHandlerStore.generate_token)
		throw new InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)

	if (!client_id)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
	if (!client_secret)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'client_secret'`)
	if (!code)
		throw new InvalidRequestError(`${errorMsg}. Missing required 'code'`)

	// B. Gets the service account's scopes and audiences as well as the code's claims
	const [[serviceAccountErrors, serviceAccount], [oidcClaimsErrors, oidcClaims]] = yield [
		eventHandlerStore.get_service_account.exec({ client_id, client_secret }),
		eventHandlerStore.get_token_claims.exec({ type:'code', token:code, state })
	]

	// C. Verifies the details are correct
	if (serviceAccountErrors || oidcClaimsErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors || oidcClaimsErrors)

	if (!oidcClaims)
		throw new InvalidTokenError(`${errorMsg}. Invalid authorization code.`)
	if (!oidcClaims.client_id)
		throw new InvalidTokenError(`${errorMsg}. Invalid code. Failed to identified code's client_id.`)
	if (oidcClaims.client_id != client_id)
		throw new InvalidClientError(`${errorMsg}. Invalid client_id.`)

	const { scope, sub } = oidcClaims 
	const scopes = oauth2Params.convert.thingToThings(scope) || []

	const [claimsError] = oauth2Params.verify.claimsExpired(oidcClaims)
	const [scopeErrors] = oauth2Params.verify.scopes({ scopes, serviceAccountScopes:serviceAccount.scopes })
	if (claimsError || scopeErrors)
		throw wrapErrors(errorMsg, claimsError || scopeErrors)

	// D. Get the access_token, id_token, and potentially the refresh_token for that user_id
	const requestRefreshToken = scopes && scopes.indexOf('offline_access') >= 0
	const requestIdToken = scopes && scopes.indexOf('openid') >= 0

	const config = { client_id, user_id:sub, audiences:serviceAccount.audiences, scopes, state }

	const emptyPromise = Promise.resolve([null, null])
	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult], [refreshTokenErrors, refresfTokenResult]] = yield [
		eventHandlerStore.generate_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_id_token.exec(config) : emptyPromise,
		requestRefreshToken ? eventHandlerStore.generate_refresh_token.exec(config) : emptyPromise
	]

	if (accessTokenErrors || idTokenErrors || refreshTokenErrors)
		throw wrapErrors(errorMsg, accessTokenErrors || idTokenErrors || refreshTokenErrors)

	return {
		access_token: accessTokenResult.token,
		token_type:'bearer',
		expires_in: accessTokenResult.expires_in,
		id_token: idTokenResult && idTokenResult.token ? idTokenResult.token : null,
		...(refresfTokenResult && refresfTokenResult.token ? { refresh_token:refresfTokenResult.token } : {}),
		scope: oauth2Params.convert.thingsToThing(scopes)
	}
}))


module.exports = {
	exec
}


