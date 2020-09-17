const express = require('express')
const { verifyStrategy, isLoginSignupModeOn, isOpenIdModeOn } = require('userin-core')
const browseApi = require('./browse')
const introspectApi = require('./introspect')
const configApi = require('./openid-configuration')
const tokenApi = require('./token')
const userinfoApi = require('./userinfo')
const loginApi = require('./login')
const signupApi = require('./signup')
const defaultConfig = require('./config')
const eventRegister = require('./eventRegister')
// const pluginManager = require('./pluginManager')
const { request: { getParams }, config:{ prefixPathname }, response: { formatResponseError } } = require('./_utils')

/**
 * Gets a 'httpHandlerFactory' factory. 
 * 
 * @param  {Express}	app						Express app
 * @param  {Object}		eventHandlerStore					
 * @param  {String}		appConfig.version		Default: 'v1'
 * @param  {Object}		appConfig.endpoints		This object is mutated by the createHttpHandler that adds a new endpoint
 *                                        		each time it runs. 'createHttpHandler' encapsulates the logic that defines the 
 *                                        		endpoint value. Eventually, this object will be similar to this:
 *                                        		{ 
 *                                        			introspection_endpoint: 'oauth2/v1/introspect', 
 *                                        			userinfo_endpoint: 'oauth2/v1/introspect' 
 *                                        		}
 * 
 * @return {Function}	httpHandlerFactory	
 */
const createHttpHandlerFactory = (app, eventHandlerStore, appConfig) => {
	if (!app)
		throw new Error('Missing required \'app\'')
	if (!eventHandlerStore)
		throw new Error('Missing required \'eventHandlerStore\'')
	if (!appConfig)
		throw new Error('Missing required \'appConfig\'')
	
	const version = appConfig.version||'v1'

	const getEndpointFullPathnameFactory = openIdEndpointRef => openIdEndpointRef
		? endpoint => {
			if (!appConfig.endpoints)
				throw new Error('Missing required \'appConfig.endpoints\'')

			const endpointFullPathname = prefixPathname('oauth2')(version, endpoint)
			appConfig.endpoints[openIdEndpointRef] = endpointFullPathname
			return endpointFullPathname
		}
		: endpoint => prefixPathname()(version, endpoint)

	/**
	 * Gets a 'createHttpHandler' factory. 
	 * 
	 * @param  {String}		openIdEndpointRef	Property name on the 'appConfig.endpoints' object (e.g., 'introspection_endpoint')
	 * 
	 * @return {Function}	createHttpHandler
	 */
	return openIdEndpointRef => {
		// If the 'openIdEndpointRef' exists, prefix it with 'oauth2' and register it so it can be used later in the OpenID
		// Discovery API. 
		const getEndpointFullPathname = getEndpointFullPathnameFactory(openIdEndpointRef)

		/**
		 * Creates a new HTTP listener (e.g., app.get('/something', (req,res) => doSomething))
		 * 
		 * @param  {String}		method				e.g., 'GET', 'POST', 'PUT'
		 * @param  {String}		endpoint			e.g., '/hello'
		 * @param  {Function}	handler				(params: Object, eventHandlerStore: Object, context: Object): Promise<[[Error], Object]>	
		 * 
		 * @return {Void}
		 */
		return (method, { endpoint, handler }) => {
			if (!method)
				throw new Error('Missing required \'method\'')
			if (!endpoint)
				throw new Error('Missing required \'endpoint\'')
			if (!handler)
				throw new Error('Missing required \'handler\'')

			// 1. Gets the full pathname for that endpoint
			const endpointFullPathname = getEndpointFullPathname(endpoint)
			
			// 2. Create the HTTP listener
			app[method](endpointFullPathname, async (req, res) => {
				const params = await getParams(req)
				const authorization = req.headers.Authorization || req.headers.authorization
				const [errors, result] = await handler(params, eventHandlerStore, { endpoints:appConfig.endpoints, req, res, authorization })
				if (errors)
					return formatResponseError(errors, res)
				else if (result) // when 'result' is not truthy, we assume the request/response was managed upstream (e.g., redirect to consent page)
					return res.status(200).send(result)
			})
		}
	}
}

class UserIn extends express.Router {
	/**
	 * Creates a new instance of the UserIn Express middleware. 
	 * 
	 * @param  {String}		config.version						Default is 'v1'.
	 * @param  {String}		config.authorizeCallbackName		Pathname used in the IdP redirect URL. Default is 'authorizecallback'.
	 * 
	 * @return {UserIn} userIn
	 */
	constructor(strategy, config={}) {
		super()

		// 1. Validates the strategy
		verifyStrategy(strategy)

		// 2. Merges all the configs
		const appConfig = { ...defaultConfig, ...config, endpoints: {} }
		
		// 3. Determines the modes
		const modes = strategy.modes
		const loginSignupModeOn = isLoginSignupModeOn(modes)
		const openIdModeOn = isOpenIdModeOn(modes)

		// 4. Creates a store to maintain this instance's event handlers. This store is dynamically populated 
		// outside of the instance vie the 'use' or 'on' APIs.
		const eventHandlerStore = {}
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)

		// 5. Create the Create HTTP handler function
		const httpHandlerFactory = createHttpHandlerFactory(this, eventHandlerStore, appConfig)

		// 6. Create the HTTP endpoint based on the modes. 
		if (openIdModeOn) {
			httpHandlerFactory('introspection_endpoint')('post', introspectApi)
			httpHandlerFactory('token_endpoint')('post', tokenApi)
			httpHandlerFactory('userinfo_endpoint')('get', userinfoApi)
			httpHandlerFactory('browse_redirect_endpoint')('get', browseApi.redirect)
			httpHandlerFactory('browse_endpoint')('get', browseApi)
			httpHandlerFactory('openidconfiguration_endpoint')('get', configApi)
		} 

		if (loginSignupModeOn) {
			const createHttpHandler = httpHandlerFactory()
			createHttpHandler('post', loginApi)
			createHttpHandler('post', signupApi)
		}
		
		this.modes = modes
		this.on = registerEventHandler
		// this.use = pluginManager(eventHandlerStore)
	}
}

module.exports = {
	UserIn,
	...require('userin-core'),
	runTestSuite: require('../src/_test')
}



