const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const { oauth2Params } = require('../_utils')

/**
 * Verifies that the client_id is allowed to access the scopes.
 * 
 * @param {Object}		eventHandlerStore
 * @param {String}		client_id
 * @param {[String]}	scopes
 * 
 * @yield {[Error]}		output[0]
 * @yield {[String]}	output[1].scopes
 * @yield {[String]}	output[1].audiences
 */
const verifyScopes = (eventHandlerStore, { client_id, scopes }) => catchErrors(co(function *(){
	const errorMsg = `Failed to verifies scopes access for client_id ${client_id||'unknown'}`
	const [serviceAccountErrors, serviceAccount] = yield eventHandlerStore.get_client.exec({ client_id })
	if (serviceAccountErrors)
		throw wrapErrors(errorMsg, serviceAccountErrors)

	const [scopeErrors] = oauth2Params.verify.scopes({ scopes, serviceAccountScopes:serviceAccount.scopes })
	if (scopeErrors)
		throw wrapErrors(errorMsg, scopeErrors)

	return serviceAccount
}))


module.exports = {
	verifyScopes
}