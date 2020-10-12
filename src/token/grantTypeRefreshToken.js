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
 * @param {String}		client_secret	
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
const exec = (eventHandlerStore, { client_id, client_secret, refresh_token, state }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'refresh_token\''
	// A. Validates input
	if (!eventHandlerStore.get_refresh_token_claims)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_refresh_token_claims' handler.`)
	if (!eventHandlerStore.generate_access_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler.`)
	if (!eventHandlerStore.get_config)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)
	if (!refresh_token)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'refresh_token'`)

	// B. Gets the claims originally associated with the refresh_token
	const [claimsErrors, claims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })

	// C. Validate claims
	if (claimsErrors)
		throw wrapErrors(errorMsg, claimsErrors)
	if (!claims)
		throw new userInError.InvalidTokenError(`${errorMsg}. Invalid refresh_token.`)

	// D. Verifies client
	const verifyClientId = claims.client_id
	const clientScopes = []
	const clientAudiences = []
	if (verifyClientId) {
		if (!eventHandlerStore.get_client)
			throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
		if (!client_id)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
		if (claims.client_id != client_id)
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

	// E. Validates that the details match between the client and the refresh_token.
	if (claims.exp) {
		const [claimsExpiredErrors] = oauth2Params.verify.claimsExpired(claims)
		if (claimsExpiredErrors)
			throw wrapErrors(errorMsg, claimsExpiredErrors)
	}

	const refreshTokenScopes = claims.scope ? oauth2Params.convert.thingToThings(claims.scope) : clientScopes
	const requestIdToken = refreshTokenScopes && refreshTokenScopes.indexOf('openid') >= 0

	if (requestIdToken && !eventHandlerStore.generate_id_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler. This event handler is required when 'scope' contains 'openid'.`)
	
	if (verifyClientId && claims.scope) {
		const [scopeErrors] = oauth2Params.verify.scopes({ scopes:refreshTokenScopes, clientScopes })
		if (scopeErrors)
			throw wrapErrors(errorMsg, scopeErrors)
	}

	// D. Get the access_token (and potentially the id_token to) for that user_id
	const config = { client_id, user_id:claims.sub, audiences:clientAudiences, scopes:refreshTokenScopes, state }

	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult]] = yield [
		eventHandlerStore.generate_openid_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_openid_id_token.exec(config) : Promise.resolve([null,null])
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


