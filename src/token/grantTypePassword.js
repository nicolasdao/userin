const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

/**
 * Creates a new access token using username and password.
 * 	
 * @param {String}		client_id	
 * @param {String}		client_secret
 * @param {String}		user.username
 * @param {String}		user.password	
 * @param {[String]}	scopes	
 * @param {String}		state
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const exec = (eventHandlerStore, { client_id, client_secret, user, scopes, state }) => catchErrors(co(function *() {
	const errorMsg = 'Failed to acquire tokens for grant_type \'password\''
	const requestIdToken = scopes && scopes.indexOf('openid') >= 0

	// A. Validates input
	if (!eventHandlerStore.get_client)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
	if (!eventHandlerStore.get_end_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_end_user' handler.`)
	if (!eventHandlerStore.generate_access_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_access_token' handler.`)
	if (requestIdToken && !eventHandlerStore.generate_id_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_id_token' handler. This event handler is required when 'scope' contains 'openid'.`)
	if (!eventHandlerStore.get_config)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'`)
	if (!user)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user'`)
	if (!user.username)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user.username'`)
	if (!user.password)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user.password'`)

	// B. Verifying those scopes are allowed for that client_id
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

	const [scopeErrors] = oauth2Params.verify.scopes({ scopes, clientScopes:client.scopes })
	if (scopeErrors)
		throw wrapErrors(errorMsg, scopeErrors)

	// C. Processes user
	const incorrectUsernamePasswordError = new userInError.InvalidCredentialsError('Incorrect username or password')
	const [userErrors, validUser] = yield eventHandlerStore.get_end_user.exec({ client_id, user, state })
	if (userErrors) {
		if (userErrors.some(e => e instanceof userInError.InvalidCredentialsError))
			throw incorrectUsernamePasswordError
		else
			throw wrapErrors(errorMsg, userErrors)
	}
	
	// D. Validate that the client_id is allowed to process this user. 
	if (!validUser)
		throw incorrectUsernamePasswordError

	const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id:validUser.id, user_client_ids:validUser.client_ids })
	if (clientIdErrors)
		throw wrapErrors(errorMsg, clientIdErrors)

	// E. Generates tokens
	const config = { client_id, user_id:validUser.id, audiences:client.audiences, scopes, state }
	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult]] = yield [
		eventHandlerStore.generate_openid_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_openid_id_token.exec(config) : Promise.resolve([null, null])
	]

	if (accessTokenErrors || idTokenErrors)
		throw wrapErrors(errorMsg, accessTokenErrors || idTokenErrors)

	return {
		access_token: accessTokenResult.token,
		token_type:'bearer',
		expires_in: accessTokenResult.expires_in,
		id_token: idTokenResult && idTokenResult.token ? idTokenResult.token : null,
		scope: oauth2Params.convert.thingsToThing(scopes)
	}
}))


module.exports = {
	exec
}


