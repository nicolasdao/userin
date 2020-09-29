const { error: { catchErrors, wrapErrors } } = require('puffy')
const { request: { getFullUrl } } = require('../_utils')

/**
 * Gets the OpenID Connect discovery data. 
 * 					
 * @param  {Request}	req						Express Request
 * @param  {Object}		endpoints				Object containing all the OIDC endpoints (pathname only)
 *  
 * @return {Object}		discovery	
 */
const getOpenIdDiscoveryData = (req, endpoints, eventHandlerStore) => catchErrors((async () => {
	const errorMsg = 'Failed to get the OpenID Connect discovery data'
	
	const discovery = {
		issuer: endpoints.issuer||null
	}

	if (endpoints.introspection_endpoint)
		discovery.introspection_endpoint = getFullUrl(req, endpoints.introspection_endpoint)
	if (endpoints.token_endpoint)
		discovery.token_endpoint = getFullUrl(req, endpoints.token_endpoint)
	if (endpoints.userinfo_endpoint)
		discovery.userinfo_endpoint = getFullUrl(req, endpoints.userinfo_endpoint)

	// const jwks_uri
	// const response_types_supported
	// const id_token_signing_alg_values_supported
	// const scopes_supported
	// const token_endpoint_auth_methods_supported
	// const claims_supported
	// const code_challenge_methods_supported
	// const grant_types_supported

	return discovery
})())

/**
 * Gets the UserIn discovery data (incl. OpenID discovery data).  
 * 					
 * @param  {Request}		req						Express Request
 * @param  {Object}		endpoints				Object containing all the OIDC endpoints (pathname only)
 *  
 * @return {Object}		discovery	
 */
const getDiscoveryData = (req, endpoints, eventHandlerStore) => catchErrors((async () => {
	const errorMsg = 'Failed to get the UserIn discovery data'

	const [openIdDiscoveryErrors, openIdDiscovery] = await getOpenIdDiscoveryData(req, endpoints, eventHandlerStore)
	if (openIdDiscoveryErrors)
		throw wrapErrors(errorMsg, openIdDiscoveryErrors)

	const authorizationEndpoints = {}
	for(let endpointKey in endpoints) {
		const pathname = endpoints[endpointKey]
		if (endpointKey.indexOf('authorization_') == 0)
			authorizationEndpoints[endpointKey] = getFullUrl(req, pathname)
	}

	// Set up non OAuth2 endpoints
	const discovery = {
		...openIdDiscovery,
		...authorizationEndpoints
	}

	if (endpoints.browse_endpoint)
		discovery.browse_endpoint = getFullUrl(req, endpoints.browse_endpoint)
	if (endpoints.browse_redirect_endpoint)
		discovery.browse_redirect_endpoint = getFullUrl(req, endpoints.browse_redirect_endpoint)
	if (endpoints.openidconfiguration_endpoint)
		discovery.openidconfiguration_endpoint = getFullUrl(req, endpoints.openidconfiguration_endpoint)

	if (endpoints.login_endpoint)
		discovery.login_endpoint = getFullUrl(req, endpoints.login_endpoint)
	if (endpoints.signup_endpoint)
		discovery.signup_endpoint = getFullUrl(req, endpoints.signup_endpoint)

	return discovery

})())

module.exports = {
	getDiscoveryData,
	getOpenIdDiscoveryData
}