const passport = require('passport')
const { consentPageRequest, consentPageResponse, openIdConsentPageRequest, openIdConsentPageResponse} = require('./fipauthorize')
const passportManager = require('./passportManager')
const openIdServerManager = require('./openIdServerManager')

/**
 * Registers a new Plugin to the UserIn middleware.
 * 
 * @param  {Object}		eventHandlerStore		
 * @param  {Function}	createHttpHandler		(endpointRef: String, method: String, handler: Handler): Void 
 *                                       		This function mutates an 'endpoints' object by adding the details
 *                                       		of the new handler to it. This helps with building the discovery endpoint. 
 * @return {Void}								
 */
module.exports = (eventHandlerStore, createHttpHandler) => {
	return async (Plugin, options={}) => {
		if (!Plugin)
			throw new Error('Missing required \'Plugin\'')

		const isStrategy = Plugin.prototype instanceof passport.Strategy
		const isOpenIdServer = Plugin.name && Plugin.discovery

		const installPlugin = isStrategy ? passportManager.install : isOpenIdServer ? openIdServerManager.install : null

		if (!installPlugin)
			throw new Error('Invalid \'Plugin\'. \'Plugin\' must either be a Passport.Strategy class or an OpenID server config object.')

		const [errors, result] = await installPlugin(Plugin, eventHandlerStore, options)
		if (errors) {
			errors.forEach(e => console.log(e.stack))
			throw new Error('Failed to add new Passport Strategy.')
		}

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
			
	}
}



