const { co } = require('core-async')
const express = require('express')
const { error: { catchErrors, wrapErrors }, promise:{ delay } } = require('puffy')
const { verifyStrategy, Strategy, getSupportedModes } = require('userin-core')
const introspectApi = require('./introspect')
const discoveryApi = require('./discovery')
const tokenApi = require('./token')
const { consentPageRequestHandler, consentPageResponseHandler } = require('./authorize')
const userinfoApi = require('./userinfo')
const revokeApi = require('./revoke')
const jwksUriApi = require('./jwks_uri')
const loginApi = require('./login')
const signupApi = require('./signup')
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
				const [errors, result] = await handler(params, eventHandlerStore, { ...appConfig, req, res, authorization, ...options })
				if (errors)
					return formatResponseError(errors, res)
				else if (result) { // when 'result' is not truthy, we assume the request/response was managed upstream (e.g., redirect to consent page)
					if (options.formatJSON) {
						res.header('Content-Type','application/json')
						return res.status(200).send(JSON.stringify(result, null, 4))
					} else
						return res.status(200).send(result||{})
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
	 * @param  {StrategyConfig}		config.config
	 * @param  {String}				config.version						Default is 'v1'.
	 * 
	 * @return {UserIn} userIn
	 */
	constructor(config) {
		super()

		this.type = 'UserIn'

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
		const appConfig = { 
			...strategy.config,
			modes,
			version: config.version || 'v1', 
			authorizeCallbackName: 'authorizecallback',
			endpoints: {} 
		}
		
		// 3. Determines the modes
		const loginSignupModeOn = modes.indexOf('loginsignup') >= 0 || modes.indexOf('loginsignupfip') >= 0
		const openIdModeOn = modes.indexOf('openid') >= 0

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
		createOauth2HttpHandler('revocation_endpoint', 'post', revokeApi)
		createHttpHandler('configuration_endpoint', 'get', discoveryApi.nonOAuth, { formatJSON:true })

		// 6. Create the HTTP endpoint based on the modes. 
		if (openIdModeOn) {
			createOauth2HttpHandler('introspection_endpoint', 'post', introspectApi)
			createOauth2HttpHandler('userinfo_endpoint', 'get', userinfoApi)
			createOauth2HttpHandler('openidconfiguration_endpoint', 'get', discoveryApi.openid, { formatJSON:true })
			if (eventHandlerStore.get_jwks)
				createOauth2HttpHandler('jwks_uri', 'get', jwksUriApi, { formatJSON:true })
			createOauth2HttpHandler('authorize_endpoint', 'get', consentPageRequestHandler)
			createOauth2HttpHandler('authorizeconsent_endpoint', 'get', consentPageResponseHandler)
		} 

		if (loginSignupModeOn) {
			createHttpHandler('login_endpoint', 'post', loginApi)
			createHttpHandler('signup_endpoint', 'post', signupApi)
		}
		
		const use = pluginManager(eventHandlerStore, createHttpHandler, this)
		const ch = []

		this.modes = modes
		this.on = registerEventHandler
		this.use = (...args) => co(function *(){
			ch.push(1)
			try {
				yield use(...args)
				ch.pop()
			} catch(err) {
				ch.pop()
				throw err
			}
			// console.log(args)
		})
		this.getEndpoints = (options={}) => catchErrors(co(function *() {
			// Make sure that there is no pending pluging installation before getting all the endpoints
			while (ch.length > 0) 
				yield delay(1)

			const errorMsg = 'Failed to get UserIn\'s endpoints'
			const [[endpointsErrors, endpoints],[fqEndpointsErrors, fqEndpoints]] = yield [
				discoveryApi.nonOAuth.handler({}, eventHandlerStore, { ...appConfig, baseUrl:'' }),
				options.fullyQualified 
					? discoveryApi.nonOAuth.handler({}, eventHandlerStore, appConfig)
					: Promise.resolve([null,null])
			]
			if (endpointsErrors || fqEndpointsErrors)
				throw wrapErrors(errorMsg, endpointsErrors || fqEndpointsErrors)
			
			return { baseUrl:appConfig.baseUrl, endpoints, fqEndpoints }
		}))

		this.config = appConfig

		Object.defineProperty(this, 'eventHandlerStore', {
			get() {
				return eventHandlerStore
			}
		})

		Object.defineProperty(this, 'strategy', {
			get() {
				return strategy
			}
		})

		return this
	}
}

module.exports = UserIn



