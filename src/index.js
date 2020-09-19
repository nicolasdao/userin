const express = require('express')
const { verifyStrategy, isLoginSignupModeOn, isOpenIdModeOn, Strategy, getSupportedModes } = require('userin-core')
const browseApi = require('./browse')
const introspectApi = require('./introspect')
const discoveryApi = require('./discovery')
const tokenApi = require('./token')
const userinfoApi = require('./userinfo')
const loginApi = require('./login')
const signupApi = require('./signup')
const defaultConfig = require('./config')
const eventRegister = require('./eventRegister')
const pluginManager = require('./pluginManager')
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
	
	appConfig.endpoints = appConfig.endpoints || {}	
	const version = appConfig.version||'v1'

	/**
	 * Gets a 'createHttpHandler' factory. 
	 * 
	 * @param  {Boolean}	options.oauth2		Default false. When true, the pathname is prefixed with 'oauth2'
	 * 
	 * @return {Function}	createHttpHandler
	 */
	return (options={}) => {
		const pathnamePrefix = options.oauth2 ? 'oauth2' : ''

		// If the 'endpointRef' exists, prefix it with 'oauth2' and register it so it can be used later in the OpenID
		// Discovery API. 
		

		/**
		 * Creates a new HTTP listener (e.g., app.get('/something', (req,res) => doSomething))
		 * 
		 * @param  {String}		endpointRef			e.g., 'token_endpoint'. This is used to create discovery endpoints.
		 * @param  {String}		method				e.g., 'GET', 'POST', 'PUT'
		 * @param  {String}		endpoint			e.g., '/hello'
		 * @param  {Function}	handler				(params: Object, eventHandlerStore: Object, context: Object): Promise<[[Error], Object]>	
		 * @param  {Object}		options				Random options used in different cases.
		 * 
		 * @return {Void}
		 */
		return (endpointRef, method, { endpoint, handler }, options={}) => {
			if (!endpointRef)
				throw new Error('Missing required \'endpointRef\'')
			if (!method)
				throw new Error('Missing required \'method\'')
			if (!endpoint)
				throw new Error('Missing required \'endpoint\'')
			if (!handler)
				throw new Error('Missing required \'handler\'')


			const endpointFullPathname = prefixPathname(pathnamePrefix)(version, endpoint)
			appConfig.endpoints[endpointRef] = endpointFullPathname

			// 2. Create the HTTP listener
			app[method](endpointFullPathname, async (req, res) => {
				const params = await getParams(req)
				const authorization = req.headers.Authorization || req.headers.authorization
				const [errors, result] = await handler(params, eventHandlerStore, { endpoints:appConfig.endpoints, req, res, authorization, ...options })
				if (errors)
					return formatResponseError(errors, res)
				else if (result) { // when 'result' is not truthy, we assume the request/response was managed upstream (e.g., redirect to consent page)
					if (options.formatJSON) {
						res.header('Content-Type','application/json')
						return res.status(200).send(JSON.stringify(result, null, 4))
					} else
						return res.status(200).send(result)
				}	
			})
		}
	}
}

class UserIn extends express.Router {
	/**
	 * Creates a new instance of the UserIn Express middleware. 
	 *
	 * @param  {UserInStrategy}		config.Strategy
	 * @param  {[String]}			config.modes						Vaid values: 'loginsignup', 'loginsignupfip', 'openid'
	 * @param  {String}				options.version						Default is 'v1'.
	 * @param  {String}				options.authorizeCallbackName		Pathname used in the IdP redirect URL. Default is 'authorizecallback'.
	 * 
	 * @return {UserIn} userIn
	 */
	constructor(config, options={}) {
		super()

		// 1. Validates the input
		if (!config)
			throw new Error('Missing required \'config\'')
		if (!config.Strategy)
			throw new Error('Missing required \'Strategy\'')
		if (!config.Strategy.prototype) {
			if (config.Strategy instanceof Strategy)
				throw new Error('\'Strategy\' is an instance of a UserIn Strategy class instead of being a class inheriting from the UserIn Strategy.')
			else
				throw new Error(`'Strategy' is expected to be a class inheriting from the UserIn Strategy class. Found ${typeof(config.Strategy)} instead.`)
		}

		if (!(config.Strategy.prototype instanceof Strategy))
			throw new Error('\'Strategy\' is expected to be a class inheriting from the UserIn Strategy class.')

		if (!config.modes || !config.modes.length)
			throw new Error('Missing required \'modes\'')

		const modes = getSupportedModes(config.modes)
		const invalidModes = config.modes.filter(m => modes.indexOf(m) < 0)
		if (invalidModes.length)
			throw new Error(`The following modes are not supported: ${invalidModes.join(', ')}`)

		if (!config.config)
			throw new Error('Missing required \'config\'')

		const strategy = new config.Strategy({ ...config.config, modes })

		verifyStrategy(strategy)

		// 2. Merges all the configs
		const appConfig = { ...defaultConfig, ...options, endpoints: {} }
		
		// 3. Determines the modes
		const loginSignupModeOn = isLoginSignupModeOn(modes)
		const openIdModeOn = isOpenIdModeOn(modes)

		// 4. Creates a store to maintain this instance's event handlers. This store is dynamically populated 
		// outside of the instance vie the 'use' or 'on' APIs.
		const eventHandlerStore = {}
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)

		// 5. Create the Create HTTP handler function
		const httpHandlerFactory = createHttpHandlerFactory(this, eventHandlerStore, appConfig)
		
		const createOauth2HttpHandler = httpHandlerFactory({ oauth2:true })
		const createHttpHandler = httpHandlerFactory()

		createOauth2HttpHandler('token_endpoint', 'post', tokenApi)
		createOauth2HttpHandler('openidconfiguration_endpoint', 'get', discoveryApi.openid, { formatJSON:true })
		createHttpHandler('browse_endpoint', 'get', browseApi)
		createHttpHandler('browse_redirect_endpoint', 'get', browseApi.redirect)

		// 6. Create the HTTP endpoint based on the modes. 
		if (openIdModeOn) {
			createOauth2HttpHandler('introspection_endpoint', 'post', introspectApi)
			createOauth2HttpHandler('userinfo_endpoint', 'get', userinfoApi)
		} 

		if (loginSignupModeOn) {
			createHttpHandler('configuration_endpoint', 'get', discoveryApi.nonOAuth, { formatJSON:true })
			createHttpHandler('login_endpoint', 'post', loginApi)
			createHttpHandler('signup_endpoint', 'post', signupApi)
		}
		
		this.modes = modes
		this.on = registerEventHandler
		this.use = pluginManager(eventHandlerStore, createHttpHandler)
	}
}

module.exports = {
	UserIn,
	...require('userin-core'),
	testSuite: require('../src/_test')
}



