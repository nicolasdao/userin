const { error: { mergeErrors, catchErrors, wrapErrors } } = require('puffy')
const { resolve } = require('path')
const fs = require('fs')
const configuration_endpoint = require('./configuration_endpoint')
const introspection_endpoint = require('./introspection_endpoint')
const jwks_uri = require('./jwks_uri')
const login_endpoint = require('./login_endpoint')
const openidconfiguration_endpoint = require('./openidconfiguration_endpoint')
const revocation_endpoint = require('./revocation_endpoint')
const signup_endpoint = require('./signup_endpoint')
const token_endpoint = require('./token_endpoint')
const userinfo_endpoint = require('./userinfo_endpoint')
const fipauthorize_endpoint = require('./fipauthorize_endpoint')
const authorization_endpoint = require('./authorization_endpoint')

const DESCRIPTION = `# UserIn OAuth 2.0. Authorization Server
`

const printInfo = msg => console.log(`\x1b[1m\x1b[36mi ${msg}\x1b[0m`)

/**
 * Creates file or update file located under 'filePath'. 
 * 
 * @param  {String}  filePath 			Absolute file path on the local machine
 * @param  {Object}  content 			File content
 * @param  {Boolean} options.append 	Default false. If true, this function appends rather than overrides.
 * @param  {String}  options.appendSep 	Default '\n'. That the string used to separate appended content. This option is only
 *                                     	active when 'options.append' is set to true.
 * @return {Void}                	
 */
const writeToFile = (filePath, content, options) => new Promise((onSuccess, onFailure) => {
	content = content || ''
	const { append, appendSep='\n' } = options || {}
	const stringContent = (typeof(content) == 'string' || content instanceof Buffer) ? content : JSON.stringify(content, null, '  ')
	const fn = append ? fs.appendFile : fs.writeFile
	fn(filePath, append ? `${stringContent}${appendSep}` : stringContent, err => err ? onFailure(err) : onSuccess())
})

const createCollection = (name, baseUrl, discovery={}) => {
	const collection = {
		info: {
			name: name || 'userin',
			schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
			description: DESCRIPTION
		},
		item: [],
		variable: [{
			key: 'client_id',
			value: 'ENTER_CLIENT_ID_HERE'
		}, {
			key: 'client_secret',
			value: 'ENTER_CLIENT_SECRET_HERE'
		}, {
			key: 'base_url',
			value: baseUrl
		}],
		protocolProfileBehavior: {}
	}

	// [Non OAuth] - configuration_endpoint
	if (discovery.configuration_endpoint)
		collection.item.push(configuration_endpoint.create(discovery.configuration_endpoint))

	// [Non OAuth] - login_endpoint
	if (discovery.login_endpoint)
		collection.item.push(login_endpoint.create(discovery.login_endpoint))

	// [Non OAuth] - signup_endpoint
	if (discovery.signup_endpoint)
		collection.item.push(signup_endpoint.create(discovery.signup_endpoint))

	// [Non OAuth] - FIP consent page
	const fipAuthorizeEndpoints = []
	for (let endpointName in discovery) {
		const [,identityProviderName] = endpointName.match(/authorization_(.*?)_endpoint/) || []
		if (identityProviderName && !/_redirect$/.test(identityProviderName)) {
			fipAuthorizeEndpoints.push({ identityProviderName, endpointName, pathname:discovery[endpointName] })
			collection.item.push(fipauthorize_endpoint.create(discovery[endpointName], endpointName, identityProviderName))
		}
	}

	// [OAuth] - token_endpoint
	if (discovery.grant_types_supported && discovery.grant_types_supported.length && discovery.token_endpoint) {
		const tokenEndpointFolder = {
			name: '[OAuth] - token_endpoint',
			item: [],
			protocolProfileBehavior: {}
		}
		if (discovery.grant_types_supported.indexOf('authorization_code') >= 0) {
			const tokenAuthCodeEndpointFolder = {
				name: 'token_endpoint - authorization_code',
				item: [],
				protocolProfileBehavior: {}
			}
			// Adds the bare bone token endpoint that expects to get a code
			tokenAuthCodeEndpointFolder.item.push(token_endpoint.authorization_code.create(discovery.token_endpoint))
			// Adds a Postman OAuth 2.0. Authorization Code flow endpoint. With this set up, the actual token endpoint
			// is not explicitely used. Instead, a Postman OAuth 2.0. utility is configured that uses both the 
			// FIP '/authorize' endpoint and this '/token' endpoint to retrieve tokens. The code exchange will not be
			// explicitely observable as this is part of the Postman blackbox. This 'hack' is the only way to implement
			// HTTP redirect in Postman via an external browser.
			for (let fipAuthorizeEndpoint of fipAuthorizeEndpoints)
				tokenAuthCodeEndpointFolder.item.push(token_endpoint.authorization_code.create(discovery.token_endpoint, fipAuthorizeEndpoint))
			
			tokenEndpointFolder.item.push(tokenAuthCodeEndpointFolder)
		}

		if (discovery.grant_types_supported.indexOf('refresh_token') >= 0)
			tokenEndpointFolder.item.push(token_endpoint.refresh_token.create(discovery.token_endpoint))

		if (discovery.grant_types_supported.indexOf('password') >= 0)
			tokenEndpointFolder.item.push(token_endpoint.password.create(discovery.token_endpoint))

		if (discovery.grant_types_supported.indexOf('client_credentials') >= 0)
			tokenEndpointFolder.item.push(token_endpoint.client_credentials.create(discovery.token_endpoint))

		collection.item.push(tokenEndpointFolder)
	}

	// [OAuth] - introspection_endpoint
	if (discovery.introspection_endpoint)
		collection.item.push(introspection_endpoint.create(discovery.introspection_endpoint))

	// [OAuth] - revocation_endpoint
	if (discovery.revocation_endpoint)
		collection.item.push(revocation_endpoint.create(discovery.revocation_endpoint))

	// [OAuth] - userinfo_endpoint
	if (discovery.userinfo_endpoint)
		collection.item.push(userinfo_endpoint.create(discovery.userinfo_endpoint))

	// [OAuth] - authorization_endpoint
	if (discovery.authorization_endpoint && discovery.token_endpoint)
		collection.item.push(authorization_endpoint.create(discovery.authorization_endpoint, discovery.token_endpoint))

	// [OpenID] - jwks_uri
	if (discovery.jwks_uri)
		collection.item.push(jwks_uri.create(discovery.jwks_uri))

	// [OpenID] - openidconfiguration_endpoint
	if (discovery.openidconfiguration_endpoint)
		collection.item.push(openidconfiguration_endpoint.create(discovery.openidconfiguration_endpoint))
	
	return collection
}

/**
 * Gets the Postman collection. 
 * 
 * @param  {UserIn} collectionConfig.userIn			
 * @param  {String} collectionConfig.name					
 * 
 * @return {Object} postmanCollection
 */
const getCollection = (collectionConfig={}) => catchErrors((async () => {
	const errorMsg = 'Failed to extract Postman collection from UserIn instance'
	const { name, userIn } = collectionConfig
	if (!name)
		throw new Error(`${errorMsg}. Missing required 'collectionConfig.name'`)
	if (!userIn)
		throw new Error(`${errorMsg}. 'Missing required 'userIn' instance`)
	if (userIn.type != 'UserIn')
		throw new Error(`${errorMsg}. Invalid 'userIn' argument. Expecting 'userIn' to be an instance of UserIn class. Found ${typeof(userIn)} instead.`)

	const [errors, result] = await userIn.getEndpoints()
	if (errors)
		throw wrapErrors(errorMsg, errors)

	const { baseUrl, endpoints } = result

	const collection = createCollection(name, baseUrl, endpoints)
	return collection
})())

function Postman(collectionName='userin') {

	this.getCollection = userIn => getCollection({ userIn, name:collectionName })

	return this
}

/**
 * Exports a Postman collection JSON object to a local file.. 
 * 
 * @param  {UserIn} collectionConfig.userIn		UserIn instance. 	
 * @param  {String} collectionConfig.name		Default 'userin'. Postman collection name. 
 * @param  {String} collectionConfig.path		Local file. Accepts both relative and absolute paths. 
 * 
 * @return {Object} postmanCollection
 */
Postman.export = async (collectionConfig={}) => {
	const errorMsg = 'Failed to export Postman collectionConfig from UserIn instance'
	
	const [errors, collection] = await getCollection(collectionConfig)
	if (errors)
		throw mergeErrors([new Error(errorMsg), ...errors])
	
	const { name, path } = collectionConfig
	const canonicalName = name.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'userin'
	const collectionPath = resolve(path||`${canonicalName}.json`)
	try {
		await writeToFile(collectionPath, collection)
	} catch(err) {
		throw mergeErrors([new Error(errorMsg), err])
	}

	printInfo(`Postman collection ${collectionPath} created`)
}

module.exports = {
	Postman
}



