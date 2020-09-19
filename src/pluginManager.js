const passport = require('passport')
const { ConsentPageRequest, ConsentPageResponse } = require('./fipauthorize')
const passportManager = require('./passportManager')

module.exports = (eventHandlerStore, createHttpHandler) => {
	return (Plugin, options) => {
		if (!Plugin)
			throw new Error('Missing required \'Plugin\'')

		if (Plugin.prototype instanceof passport.Strategy) {
			const [errors, result] = passportManager.addStrategy(Plugin, eventHandlerStore, options)
			if (errors) {
				errors.forEach(e => console.log(e.stack))
				throw new Error('Failed to add new Passport Strategy.')
			}

			const { name:passportStrategy, scopes } = result

			// authorization_endpoint
			const endpoint = `${passportStrategy}/authorize`
			const endpointRedirect = `${passportStrategy}/authorizecallback`
			const endpointRef = `authorization${passportStrategy ? `_${passportStrategy}` : ''}_endpoint`
			const endpointRedirectRef = `authorization${passportStrategy ? `_${passportStrategy}` : ''}_redirect_endpoint`

			const verifyClientId = false
			const consentPageRequest = new ConsentPageRequest(endpoint, passportStrategy, endpointRedirectRef, scopes, verifyClientId)
			const consentPageResponse = new ConsentPageResponse(endpointRedirect, passportStrategy, verifyClientId)
			
			createHttpHandler(endpointRef, 'get', consentPageRequest)
			createHttpHandler(endpointRedirectRef, 'get', consentPageResponse)
		} 
		else 
			throw new Error('Invalid \'Plugin\'. \'Plugin\' must either be a Passport.Strategy class or an instance of of the userin-core Strategy class.')
	}
}



