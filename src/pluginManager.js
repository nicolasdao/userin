// const passport = require('passport')
const eventRegister = require('./eventRegister')
const { Strategy, verifyStrategy } = require('userin-core')
// const { ConsentPageRequest, ConsentPageResponse } = require('./authorize')
// const passportManager = require('./passportManager')

module.exports = (eventHandlerStore) => {
	const registerEventHandler = eventRegister(eventHandlerStore)
	return (Plugin) => {
		if (!Plugin)
			throw new Error('Missing required \'Plugin\'')

		if (Plugin.prototype instanceof Strategy) {
			const plugin = new Plugin()
			verifyStrategy(plugin)
			registerEventHandler(plugin)
		} 
		// else if (Plugin.prototype instanceof passport.Strategy) {
		// 	const [errors, result] = passportManager.addStrategy(Plugin, eventHandlerStore, options)
		// 	if (errors) {
		// 		errors.forEach(e => console.log(e.stack))
		// 		throw new Error('Failed to add new Passport Strategy.')
		// 	}

		// 	const { name:passportStrategy, scopes } = result

		// 	// authorization_endpoint
		// 	const authorizationPrefix = options.default ? '' : passportStrategy
		// 	const endpoint = `${authorizationPrefix}/authorize`
		// 	const endpointRedirect = `${authorizationPrefix}/authorizecallback`
		// 	const endpointRef = `authorization${authorizationPrefix ? `_${authorizationPrefix}` : ''}_endpoint`
		// 	const endpointRedirectRef = `authorization${authorizationPrefix ? `_${authorizationPrefix}` : ''}_redirect_endpoint`

		// 	const consentPageRequest = new ConsentPageRequest(endpoint, passportStrategy, endpointRedirectRef, scopes)
		// 	const consentPageResponse = new ConsentPageResponse(endpointRedirect, passportStrategy)
			
		// 	createHttpHandler(endpointRef, 'get', consentPageRequest)
		// 	createHttpHandler(endpointRedirectRef, 'get', consentPageResponse)
		// } 
		else 
			throw new Error('Invalid \'Plugin\'. \'Plugin\' must either be a Passport.Strategy class or an instance of of the userin-core Strategy class.')
	}
}



