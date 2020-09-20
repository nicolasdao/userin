const { request: { getFullUrl } } = require('../_utils')

/**
 * Gets the all the endpoints where all pathnames have been converted to fully qualified URIs. 
 * 					
 * @param {Request}		req						Express Request
 * @param {Object}		endpoints				Object containing all the OIDC endpoints (pathname only)
 * @param {Boolean}		includeNonStandard		Default false
 *  
 * @return {Object}		fullyQualifiedEndpoints	
 */
const getFullyQualifiedEndpoints = (req, endpoints, includeNonStandard) => {
	
	const authorizationEndpoints = {}
	for(let endpointKey in endpoints) {
		const pathname = endpoints[endpointKey]
		if (endpointKey.indexOf('authorization_') == 0)
			authorizationEndpoints[endpointKey] = getFullUrl(req, pathname)
	}

	const openIdEndpoints = {
		issuer: endpoints.issuer||null
	}

	if (endpoints.introspection_endpoint)
		openIdEndpoints.introspection_endpoint = getFullUrl(req, endpoints.introspection_endpoint)
	if (endpoints.token_endpoint)
		openIdEndpoints.token_endpoint = getFullUrl(req, endpoints.token_endpoint)
	if (endpoints.userinfo_endpoint)
		openIdEndpoints.userinfo_endpoint = getFullUrl(req, endpoints.userinfo_endpoint)

	// Set up non OAuth2 endpoints
	const allEndpoints = {
		...openIdEndpoints,
		...authorizationEndpoints
	}

	if (endpoints.browse_endpoint)
		allEndpoints.browse_endpoint = getFullUrl(req, endpoints.browse_endpoint)
	if (endpoints.browse_redirect_endpoint)
		allEndpoints.browse_redirect_endpoint = getFullUrl(req, endpoints.browse_redirect_endpoint)
	if (endpoints.openidconfiguration_endpoint)
		allEndpoints.openidconfiguration_endpoint = getFullUrl(req, endpoints.openidconfiguration_endpoint)

	if (endpoints.configuration_endpoint)
		allEndpoints.configuration_endpoint = getFullUrl(req, endpoints.configuration_endpoint)
	if (endpoints.login_endpoint)
		allEndpoints.login_endpoint = getFullUrl(req, endpoints.login_endpoint)
	if (endpoints.signup_endpoint)
		allEndpoints.signup_endpoint = getFullUrl(req, endpoints.signup_endpoint)

	return includeNonStandard ? allEndpoints : openIdEndpoints

}

module.exports = {
	getFullyQualifiedEndpoints
}