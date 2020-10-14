const { error: { catchErrors }, validate } = require('puffy')
const { error:userInError } = require('userin-core')
const { oauth2Params } = require('../_utils')

/**
 * Validates the consent page inputs and return extra data. 
 * 
 * @param  {Object}		eventHandlerStore		
 * @param  {Object}		input.client_id		
 * @param  {Object}		input.response_type				
 * @param  {Object}		input.scope				
 * @param  {Object}		input.redirect_uri	
 * 			
 * @return {[Error]} 	output[0]
 * @return {[String]} 	output[1].client.scopes
 * @return {[String]} 	output[1].client.audiences
 * @return {[String]} 	output[1].client.redirect_uris
 * @return {[String]} 	output[1].client.auth_methods
 * @return {[String]} 	output[1].scopes
 * @return {[String]} 	output[1].responseTypes
 */
const validateConsentPageInput = (eventHandlerStore, { client_id, response_type, scope, redirect_uri, code_challenge, code_challenge_method }) => catchErrors((async () => {
	const errorMsg = 'Failed to validate the authorize input'

	if (!eventHandlerStore.get_client)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_client' handler.`)
	if (!eventHandlerStore.get_config)
		throw new userInError.InternalServerError(`${errorMsg}. Missing 'get_config' handler.`)

	if (!client_id)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'client_id'.`)
	
	if (!response_type)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'response_type'.`)
	const [responseTypeErrors, responseTypes] = oauth2Params.convert.responseTypeToTypes(response_type)
	if (responseTypeErrors)
		throw new userInError.InvalidRequestError(errorMsg, responseTypeErrors)

	if (!redirect_uri)
		throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'redirect_uri'.`)
	if (!validate.url(redirect_uri))
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid 'redirect_uri'. ${redirect_uri} is not a valid URL.`)

	const [codeChallengeErrors] = oauth2Params.verify.codeChallenge({ code_challenge, code_challenge_method })
	if (codeChallengeErrors)
		throw new userInError.InvalidRequestError(errorMsg, codeChallengeErrors)

	// B. Get the client's details and validate the request based on those details.
	const [clientErrors, client] = await eventHandlerStore.get_client.exec({ client_id })
	if (clientErrors)
		throw new userInError.InvalidRequestError(errorMsg, clientErrors)

	if (!client)
		throw new userInError.InvalidClientError(`${errorMsg}. client_id not found.`)

	const { scopes:clientScopes, redirect_uris } = client

	if (redirect_uris && Array.isArray(redirect_uris) && redirect_uris.length && !redirect_uris.some(uri => redirect_uri.indexOf(uri) == 0 || uri.indexOf(redirect_uri) == 0))
		throw new userInError.InvalidRequestError(`${errorMsg}. Invalid redirect_uri. URL ${redirect_uri} is not included in the client's redirect URIs allowlist.`)

	const scopes = oauth2Params.convert.thingToThings(scope)
	const [scopesErrors] = oauth2Params.verify.scopes({ scopes, clientScopes })
	if (scopesErrors)
		throw new userInError.InvalidRequestError(errorMsg, scopesErrors)

	const [configErrors, config={}] = await eventHandlerStore.get_config.exec()
	if (configErrors)
		throw new userInError.InvalidRequestError(errorMsg, configErrors)

	if (!config.consentPage)
		throw new userInError.InternalServerError(`${errorMsg}. Missing required 'consentPage' configuration.`)
	if (!validate.url(config.consentPage))
		throw new userInError.InternalServerError(`${errorMsg}. Invalid 'consentPage'. ${config.consentPage} is not a valid URL.`)

	return {
		client,
		responseTypes,
		scopes,
		consentPage: config.consentPage
	}
})())

module.exports = {
	validateConsentPageInput
}

