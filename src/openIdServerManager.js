const { error:{ catchErrors }, validate, fetch } = require('puffy')

const install = (openIdServer, eventHandlerStore) => catchErrors((async () => {
	const { name, discovery, authorization_endpoint, token_endpoint, scopes, client_id:clientId, client_secret: clientSecret } = openIdServer || {}
	const errorMsg = `Failed to register OpenID server ${name||'unknown'}`

	if (!name)
		throw new Error(`${errorMsg}. Missing required 'openIdServer.name'`)
	if (!eventHandlerStore)
		throw new Error(`${errorMsg}. Missing required 'eventHandlerStore'`)
	if (!discovery && (!authorization_endpoint || !token_endpoint))
		throw new Error(`${errorMsg}. When 'openIdServer.discovery' is not defined, both 'openIdServer.authorization_endpoint' and 'openIdServer.token_endpoint' are required.`)
	if (discovery && !validate.url(discovery))
		throw new Error(`${errorMsg}. Invalid 'openIdServer.discovery' is not a URL.`)
	if (authorization_endpoint && !validate.url(authorization_endpoint))
		throw new Error(`${errorMsg}. Invalid 'openIdServer.authorization_endpoint' is not a URL.`)
	if (token_endpoint && !validate.url(token_endpoint))
		throw new Error(`${errorMsg}. Invalid 'openIdServer.token_endpoint' is not a URL.`)
	
	const canonicalName = name.replace(/\s/g,'').toLowerCase()

	const envVarClientId = `${canonicalName.toUpperCase()}_CLIENT_ID`
	const envVarClientSecret = `${canonicalName.toUpperCase()}_CLIENT_SECRET`
	const client_id = clientId || process.env[envVarClientId]
	const client_secret = clientSecret || process.env[envVarClientSecret]

	if (!client_id)
		throw new Error(`${errorMsg}. Missing required 'client_id'. This value must be defined either via 'openIdServer.client_id' or via the '${envVarClientId}' environment variable.`)
	if (!client_secret)
		throw new Error(`${errorMsg}. Missing required 'client_secret'. This value must be defined either via 'openIdServer.client_secret' or via the '${envVarClientSecret}' environment variable.`)

	let authEndpoint = authorization_endpoint
	let tokenEndpoint = token_endpoint
	if (discovery) {
		const { status, data } = await fetch.get({ uri:discovery })
		if (status == 404)
			throw new Error(`${errorMsg}. HTTP GET ${discovery} not found (status: 404)`)
		if (status >= 400)
			throw new Error(`${errorMsg}. HTTP GET ${discovery} failed (status: ${status}).${data ? typeof(data) == 'string' ? data : JSON.stringify(data) : ''}`)

		if (!data.authorization_endpoint)
			throw new Error(`${errorMsg}. The ${canonicalName} discovery endpoint ${discovery} is missing the OpenID resource 'authorization_endpoint'.`)
		if (!data.token_endpoint)
			throw new Error(`${errorMsg}. The ${canonicalName} discovery endpoint ${discovery} is missing the OpenID resource 'token_endpoint'.`)

		authEndpoint = data.authorization_endpoint
		tokenEndpoint = data.token_endpoint

		const scopesExist = scopes && Array.isArray(scopes) && scopes.length
		if (data.scopes_supported && Array.isArray(data.scopes_supported) && data.scopes_supported.length && scopesExist) {
			const unsupportedScopes = scopes.filter(scope => data.scopes_supported.indexOf(scope) < 0)
			if (unsupportedScopes.length)
				throw new Error(`${errorMsg}. The ${name} Authorization Server does not support the following scopes: ${unsupportedScopes.join(', ')}. The supported scopes are: ${data.scopes_supported.join(', ')}. For more details about the ${name} Authorization Server, please refer to ${discovery}.`)
		}
	}
	
	return { name:canonicalName, scopes, authorization_endpoint:authEndpoint, token_endpoint:tokenEndpoint, client_id, client_secret }
})())


module.exports = {
	install
}


