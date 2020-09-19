const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

const endpoint = 'signup' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Handler to manage signup with username and password.
 * 												
 * @param {String}		payload.username
 * @param {String}		payload.password
 * @param {Object}		payload...					Any other user properties
 * @param {String}		payload.scope				This one should have been passed via the query param and is not part of the
 *                                   				user properties. 
 * @param {Object}		eventHandlerStore
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')                 					    						
 *  
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].refresh_token
 * @yield {String}		output[1].scope
 */
const handler = (payload={}, eventHandlerStore={}) => catchErrors(co(function *() {
	const errorMsg = `Failed to signup user ${payload.username||'unknown username'}`

	const user = { ...payload }
	if (user.scope)
		delete user.scope
	const scopes = oauth2Params.convert.thingToThings(payload.scope||'')

	if (TRACE_ON)
		console.log(`INFO - Request to signup user ${payload.username||'unknown username'}`)
	// A. Validates input
	if (!eventHandlerStore.get_end_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_end_user' handler.`)
	if (!eventHandlerStore.generate_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
	if (!eventHandlerStore.create_end_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'create_end_user' handler.`)

	if (!user.username)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user.username'`)
	if (!user.password)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user.password'`)

	// B. Checks if the user already exists
	const [existingUserErrors, existingUser] = yield eventHandlerStore.get_end_user.exec({ user: { username:user.username } })
	if (existingUserErrors)
		throw wrapErrors(errorMsg, existingUserErrors)

	if (existingUser)
		throw new userInError.InvalidUserError(`${errorMsg}. User ${user.username} already exists.`)

	// Creates the new user
	const [newUserErrors, newUser] = yield eventHandlerStore.create_end_user.exec({ user })
	if (newUserErrors)
		throw wrapErrors(errorMsg, newUserErrors)

	if (!newUser)
		throw new userInError.InvalidUserError(`${errorMsg}. The user creation process failed to return a new user.`)
	if (!newUser.id)
		throw new userInError.InvalidUserError(`${errorMsg}. The user creation process failed to return a new user with a valid 'id'.`)

	// C. Generates tokens
	const requestRefreshToken = scopes && scopes.indexOf('offline_access') >= 0

	const config = { user_id:newUser.id, scopes }

	const emptyPromise = Promise.resolve([null, null])
	const [[accessTokenErrors, accessTokenResult], [refreshTokenErrors, refresfTokenResult]] = yield [
		eventHandlerStore.generate_access_token.exec(config),
		requestRefreshToken ? eventHandlerStore.generate_refresh_token.exec(config) : emptyPromise
	]

	if (accessTokenErrors || refreshTokenErrors)
		throw wrapErrors(errorMsg, accessTokenErrors || refreshTokenErrors)

	return {
		access_token: accessTokenResult.token,
		token_type:'bearer',
		expires_in: accessTokenResult.expires_in,
		...(refresfTokenResult && refresfTokenResult.token ? { refresh_token:refresfTokenResult.token } : {}),
		scope: oauth2Params.convert.thingsToThing(scopes)
	}
}))

module.exports = {
	endpoint,
	handler
}



