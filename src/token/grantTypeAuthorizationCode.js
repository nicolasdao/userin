const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

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
 * @param {String}		code_verifier				Used for PKCE
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].refresh_token
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const exec = (eventHandlerStore={}, { client_id, client_secret, code, state, code_verifier, redirect_uri }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'authorization_code\''
	// A. Validates input
	if (!eventHandlerStore.get_authorization_code_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_authorization_code_claims' handler.`)
	if (!eventHandlerStore.generate_access_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler.`)
	if (!eventHandlerStore.get_config)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)

	if (!code)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'code'`)
	if (!redirect_uri)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'redirect_uri'`)

	// B. Gets the client's scopes and audiences as well as the code's claims
	const [codeClaimsErrors, codeClaims] = yield eventHandlerStore.get_authorization_code_claims.exec({ token:code, state })
	if (codeClaimsErrors)
		throw wrapErrors(errorMsg, codeClaimsErrors)

	if (!codeClaims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid authorization code.`)
	if (codeClaims.redirect_uri != redirect_uri)
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'redirect_uri'. The 'redirect_uri' does not match the redirect_uri used in the authorization request.`)

	const verifyClientId = codeClaims.client_id
	const clientScopes = []
	const clientAudiences = []
	if (verifyClientId) {
		if (!eventHandlerStore.get_client)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
		if (!client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
		if (codeClaims.client_id != client_id)
			throw new userInError.InvalidClientError(`${errorMsg}. Unauthorized access.`)

		const [clientErrors, client] = yield eventHandlerStore.get_client.exec({ client_id })
		if (clientErrors)
			throw wrapErrors(errorMsg, clientErrors)
		if (!client)
			throw new userInError.InvalidClientError(`${errorMsg}. 'client_id' not found.`)

		if (oauth2Params.check.client.isPrivate(client)) {
			if (!client_secret)
				throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_secret'.`)

			const [clientErrors, client] = yield eventHandlerStore.get_client.exec({ client_id, client_secret })
			if (clientErrors)
				throw wrapErrors(errorMsg, [new userInError.InvalidClientError('client_id not found'), ...clientErrors])
			if (!client)
				throw new userInError.InvalidClientError(`${errorMsg}. 'client_id' not found.`)
		}

		clientScopes.push(...(client.scopes||[]))
		clientAudiences.push(...(client.audiences||[]))
	}

	// D. Verifies the authorization code
	const { scope, sub, code_challenge, code_challenge_method, nonce } = codeClaims

	// D.1. Basic verification
	const scopes = oauth2Params.convert.thingToThings(scope) || []
	const requestIdToken = verifyClientId && scopes && scopes.indexOf('openid') >= 0
	const requestRefreshToken = scopes && scopes.indexOf('offline_access') >= 0
	
	if (requestIdToken && !eventHandlerStore.generate_id_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler. This event handler is required when 'scope' contains 'openid'.`)
	if (requestRefreshToken && !eventHandlerStore.generate_refresh_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_refresh_token' handler. This event handler is required when 'scope' contains 'offline_access'.`)

	const [claimsError] = oauth2Params.verify.claimsExpired(codeClaims)
	const [scopeErrors] = verifyClientId ? oauth2Params.verify.scopes({ scopes, clientScopes }) : [null]
	if (claimsError || scopeErrors)
		throw wrapErrors(errorMsg, claimsError || scopeErrors)

	// D.2. If a code_challenge was associated with the authorization code, then validate the PKCE
	if (code_challenge || code_challenge_method) {
		if (code_challenge && !code_challenge_method)
			throw new userInError.InvalidRequestError(`${errorMsg}. When 'code_challenge' is specified, 'code_challenge_method' is required.`)
		if (!code_challenge && code_challenge_method)
			throw new userInError.InvalidRequestError(`${errorMsg}. When 'code_challenge_method' is specified, 'code_challenge' is required.`)
		if (code_challenge_method && code_challenge_method != 'S256' && code_challenge_method != 'plain')
			throw new userInError.InvalidRequestError(`${errorMsg}. code_challenge_method '${code_challenge_method}' is not a supported OpenID standard. Valid values: 'plain' or 'S256'.`)
		
		if (!code_verifier)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'code_verifier'.`)
		
		if (code_challenge_method == 'plain' && code_verifier !== code_challenge)
			throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'code_verifier'.`)
		else if (code_challenge_method == 'S256') {
			const codeChallenge = oauth2Params.convert.codeVerifierToChallenge(code_verifier)

			if (codeChallenge != code_challenge)
				throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'code_verifier'.`)
		}
	}

	// E. Get the access_token, id_token, and potentially the refresh_token for that user_id
	const config = { client_id, user_id:sub, audiences:clientAudiences, scopes, state }
	const idTokenConfig = { ...config, nonce }

	const emptyPromise = Promise.resolve([null, null])
	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult], [refreshTokenErrors, refresfTokenResult]] = yield [
		eventHandlerStore.generate_openid_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_openid_id_token.exec(idTokenConfig) : emptyPromise,
		requestRefreshToken ? eventHandlerStore.generate_openid_refresh_token.exec(config) : emptyPromise
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


