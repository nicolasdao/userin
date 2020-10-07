const passport = require('passport')
const { consentPageRequest, consentPageResponse, openIdConsentPageRequest, openIdConsentPageResponse} = require('./fipauthorize')
const passportManager = require('./passportManager')
const openIdServerManager = require('./openIdServerManager')
const { Postman } = require('./postman')

const printErrors = (errors, message) => {
	if (errors) {
		errors.forEach(e => console.log(e.stack))
		throw new Error(message)
	}
}

/**
 * Registers a new Plugin to the UserIn middleware.
 * 
 * @param  {Object}		eventHandlerStore		
 * @param  {Function}	createHttpHandler		(endpointRef: String, method: String, handler: Handler): Void 
 *                                       		This function mutates an 'endpoints' object by adding the details
 *                                       		of the new handler to it. This helps with building the discovery endpoint. 
 * @param  {UserIn}		userIn					                                      		
 * @return {Void}								
 */
module.exports = (eventHandlerStore, createHttpHandler, userIn) => {
	return async (Plugin, options={}) => {
		if (!Plugin)
			throw new Error('Missing required \'Plugin\'')

		const isStrategy = Plugin.prototype instanceof passport.Strategy
		const isOpenIdServer = Plugin.name && Plugin.discovery
		const isPostman = Plugin instanceof Postman 

		if (isStrategy || isOpenIdServer) {
			const installPlugin = isStrategy ? passportManager.install : openIdServerManager.install

			const [errors, result] = await installPlugin(Plugin, eventHandlerStore, options)
			printErrors(errors, 'Failed to install Passport Strategy.')

			const { name, scopes, authorization_endpoint, token_endpoint, client_id, client_secret } = result

			// authorization_endpoint
			const endpoint = `${name}/authorize`
			const endpointRedirect = `${name}/authorizecallback`
			const endpointRef = `authorization_${name}_endpoint`
			const endpointRedirectRef = `authorization_${name}_redirect_endpoint`

			const verifyClientId = false
			const getConsentPageRequestHandler = isStrategy 
				? consentPageRequest()
				: openIdConsentPageRequest({ authorization_endpoint, client_id })
			const getConsentPageResponseHandler = isStrategy
				? consentPageResponse()
				: openIdConsentPageResponse({ token_endpoint, client_id, client_secret })
			
			const requestHandler = getConsentPageRequestHandler(endpoint, name, endpointRedirectRef, scopes, verifyClientId)
			const responseHandler = getConsentPageResponseHandler(endpointRedirect, name, verifyClientId)
			
			createHttpHandler(endpointRef, 'get', requestHandler)
			createHttpHandler(endpointRedirectRef, 'get', responseHandler) 
		} else if (isPostman) {
			createHttpHandler('postman_endpoint', 'get', { 
				endpoint:'postman/collection.json', 
				handler: () => Plugin.getCollection(userIn)
			}, { formatJSON:true })
		} else 
			throw new Error('Invalid \'Plugin\'. \'Plugin\' must either be a Passport.Strategy class, an OpenID server config object, or a Postman instance.')
	}
}



