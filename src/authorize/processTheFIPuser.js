const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { error:userInError } = require('userin-core')
const { verifyScopes } = require('./_utils')
const { oauth2Params } = require('../_utils')

/**
 * Processes the user received from the FIP
 * 
 * @param {Object}		user
 * @param {Object}		user.id					String or number
 * @param {String}		client_id				
 * @param {String}		strategy				e.g., 'default', 'facebook'
 * @param {String}		response_type			e.g., 'code+id_token'
 * @param {String}		scopes
 * @param {String}		state
 * 
 * @yield {[Error]}		output[0]
 * @yield {String}		output[1].access_token
 * @yield {String}		output[1].token_type
 * @yield {String}		output[1].expires_in
 * @yield {String}		output[1].id_token
 * @yield {String}		output[1].scope
 */
const processTheFIPuser = ({ user, strategy, client_id, response_type, scopes, state }, eventHandlerStore={}) => catchErrors(co(function *() {
	const errorMsg = `Failed to process ${strategy} user`
	// A. Validates input
	if (!eventHandlerStore.get_service_account)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_service_account' handler.`)
	if (!eventHandlerStore.get_fip_user)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_fip_user' handler.`)
	if (!eventHandlerStore.generate_token)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'generate_token' handler.`)
	
	if (!user)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'user' argument.`)
	if (typeof(user) != 'object')
		throw new userInError.InvalidRequestError(`${errorMsg}. The 'user' argument must be an object.`)
	if (!user.id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'id' property in the 'user' object.`)
	if (!strategy)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'strategy' argument.`)
	
	const [responseTypeErrors] = oauth2Params.convert.responseTypeToTypes(response_type)
	if (responseTypeErrors)
		throw wrapErrors(errorMsg, responseTypeErrors)

	// B. Verifying those scopes are allowed for that client_id
	const [serviceAccountErrors, serviceAccount] = yield verifyScopes(eventHandlerStore, { client_id, scopes })
	if (serviceAccountErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors)

	// C. Processes user
	const [userErrors, validUser] = yield eventHandlerStore.get_fip_user.exec({ client_id, strategy, user, state })
	if (userErrors)
		throw wrapErrors(errorMsg, userErrors)

	// D. Validate that the client_id is allowed to process this user. 
	if (!validUser)
		throw new userInError.InternalServerError(`${errorMsg}. Corrupted data. Processing the FIP user failed to return any data.`)

	const [clientIdErrors] = oauth2Params.verify.clientId({ client_id, user_id:validUser.id, user_client_ids:validUser.client_ids })
	if (clientIdErrors)
		throw wrapErrors(errorMsg, clientIdErrors)
	
	// E. Generates tokens
	const requestIdToken = scopes && scopes.indexOf('openid') >= 0
	const config = { client_id, user_id:validUser.id, audiences:serviceAccount.audiences, scopes, state }
	const [[accessTokenErrors, accessTokenResult], [idTokenErrors, idTokenResult]] = yield [
		eventHandlerStore.generate_access_token.exec(config),
		requestIdToken ? eventHandlerStore.generate_id_token.exec(config) : Promise.resolve([null, null])
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

module.exports = processTheFIPuser



