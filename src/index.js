const express = require('express')
const browseApi = require('./browse')
const introspectApi = require('./introspect')
const configApi = require('./openid-configuration')
const tokenApi = require('./token')
const userinfoApi = require('./userinfo')
const defaultConfig = require('./config')
const eventRegister = require('./eventRegister')
const pluginManager = require('./pluginManager')
const runTestSuite = require('../src/test')
const { request: { getParams }, config:{ prefixPathname }, response: { formatResponseError } } = require('./_utils')

/**
 * Higher-order function that returns a 'createHttpHandler' factory. 
 * 
 * @param  {Express}	app						Express app
 * @param  {Object}		eventHandlerStore					
 * @param  {String}		appConfig.prefix		Default: 'oauth2'
 * @param  {String}		appConfig.version		Default: 'v1'
 * @param  {Object}		appConfig.endpoints		This object is mutated by the createHttpHandler that adds a new endpoint
 *                                        		each time it runs. 'createHttpHandler' encapsulates the logic that defines the 
 *                                        		endpoint value. Eventually, this object will be similar to this:
 *                                        		{ 
 *                                        			introspection_endpoint: 'oauth2/v1/introspect', 
 *                                        			userinfo_endpoint: 'oauth2/v1/introspect' 
 *                                        		}
 * 
 * @return {Function}	createHttpHandler	
 */
const oauth2HttpHandlerFactory = (app, eventHandlerStore, appConfig) => {
	if (!app)
		throw new Error('Missing required \'app\'')
	if (!eventHandlerStore)
		throw new Error('Missing required \'eventHandlerStore\'')
	if (!appConfig)
		throw new Error('Missing required \'appConfig\'')
	if (!appConfig.endpoints)
		throw new Error('Missing required \'appConfig.endpoints\'')

	/**
	 * Creates a new HTTP listener (e.g., app.get('/something', (req,res) => doSomething))
	 * 
	 * @param  {String}		endpointRef			Property name on the 'appConfig.endpoints' object (e.g., 'introspection_endpoint')
	 * @param  {String}		method				e.g., 'GET', 'POST', 'PUT'
	 * @param  {String}		endpoint			e.g., '/hello'
	 * @param  {Function}	handler				(params: Object, eventHandlerStore: Object, context: Object): Promise<[[Error], Object]>	
	 * 
	 * @return {Void}
	 */
	return (endpointRef, method, { endpoint, handler }) => {
		if (!endpointRef)
			throw new Error('Missing required \'endpointRef\'')
		if (!method)
			throw new Error('Missing required \'method\'')
		if (!endpoint)
			throw new Error('Missing required \'endpoint\'')
		if (!handler)
			throw new Error('Missing required \'handler\'')

		// 1. Gets the full pathname for that endpoint
		const endpointFullPathname = prefixPathname(appConfig, endpoint)
		
		// 2. Sets that pathname on the 'endpoints' list so it can be used in other services (e.g., '/.well-known/openid-configuration')
		appConfig.endpoints[endpointRef] = endpointFullPathname
		
		// 3. Create the HTTP listener
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

class UserIn extends express.Router {
	constructor(config={}) {
		super()

		const eventHandlerStore = {}
		const registerEventHandler = eventRegister(eventHandlerStore)

		const appConfig = { ...defaultConfig, ...config, endpoints: { issuer: defaultConfig.issuer } }

		const createHttpHandler = oauth2HttpHandlerFactory(this, eventHandlerStore, appConfig)

		createHttpHandler('introspection_endpoint', 'post', introspectApi)
		createHttpHandler('token_endpoint', 'post', tokenApi)
		createHttpHandler('userinfo_endpoint', 'get', userinfoApi)
		createHttpHandler('browse_redirect_endpoint', 'get', browseApi.redirect)
		createHttpHandler('browse_endpoint', 'get', browseApi)
		createHttpHandler('openidconfiguration_endpoint', 'get', configApi)
		
		this.on = registerEventHandler

		this.use = pluginManager(eventHandlerStore, createHttpHandler)
	}
}

module.exports = {
	UserIn,
	...require('userin-core'),
	runTestSuite
}



