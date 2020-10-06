const { error: { mergeErrors } } = require('puffy')
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
			schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
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

	// configuration_endpoint
	if (discovery.configuration_endpoint)
		collection.item.push(configuration_endpoint.create(discovery.configuration_endpoint))

	// openidconfiguration_endpoint
	if (discovery.openidconfiguration_endpoint)
		collection.item.push(openidconfiguration_endpoint.create(discovery.openidconfiguration_endpoint))

	// login_endpoint
	if (discovery.login_endpoint)
		collection.item.push(login_endpoint.create(discovery.login_endpoint))

	// signup_endpoint
	if (discovery.signup_endpoint)
		collection.item.push(signup_endpoint.create(discovery.signup_endpoint))

	// token_endpoint
	if (discovery.grant_types_supported && discovery.grant_types_supported.length && discovery.token_endpoint) {
		if (discovery.grant_types_supported.indexOf('authorization_code') >= 0)
			collection.item.push(token_endpoint.authorization_code.create(discovery.token_endpoint))

		if (discovery.grant_types_supported.indexOf('refresh_token') >= 0)
			collection.item.push(token_endpoint.refresh_token.create(discovery.token_endpoint))

		if (discovery.grant_types_supported.indexOf('password') >= 0)
			collection.item.push(token_endpoint.password.create(discovery.token_endpoint))

		if (discovery.grant_types_supported.indexOf('client_credentials') >= 0)
			collection.item.push(token_endpoint.client_credentials.create(discovery.token_endpoint))
	}

	// introspection_endpoint
	if (discovery.introspection_endpoint)
		collection.item.push(introspection_endpoint.create(discovery.introspection_endpoint))

	// revocation_endpoint
	if (discovery.revocation_endpoint)
		collection.item.push(revocation_endpoint.create(discovery.revocation_endpoint))

	// revocation_endpoint
	if (discovery.userinfo_endpoint)
		collection.item.push(userinfo_endpoint.create(discovery.userinfo_endpoint))

	// jwks_uri
	if (discovery.jwks_uri)
		collection.item.push(jwks_uri.create(discovery.jwks_uri))
	

	return collection
}

const Postman = {
	export: async (collectionConfig={}) => {
		const errorMsg = 'Failed to export Postman collectionConfig from UserIn instance'
		const { name, path, userIn } = collectionConfig
		if (!name)
			throw new Error(`${errorMsg}. Missing required 'collectionConfig.name'`)
		if (!userIn)
			throw new Error('Missing required \'userIn\' instance')
		if (userIn.type != 'UserIn')
			throw new Error(`Invalid 'userIn' argument. Expecting 'userIn' to be an instance of UserIn class. Found ${typeof(userIn)} instead.`)

		const canonicalName = name.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'userin'
		const collectionPath = resolve(path||`${canonicalName}.json`)

		const [errors, result] = await userIn.getEndpoints()
		if (errors)
			throw mergeErrors([new Error(errorMsg), ...errors])

		const { baseUrl, endpoints } = result

		const collection = createCollection(name, baseUrl, endpoints)

		try {
			await writeToFile(collectionPath, collection)
		} catch(err) {
			throw mergeErrors([new Error(errorMsg), err])
		}

		printInfo(`Postman collection ${collectionPath} created`)
	}
}

module.exports = {
	Postman
}



