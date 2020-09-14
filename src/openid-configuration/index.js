const { co } = require('core-async')
const { error: { catchErrors } } = require('puffy')
const { request: { getFullUrl } } = require('../_utils')

const endpoint = '.well-known/openid-configuration' 

/**
 * Gets the all the endpoints where all pathnames have been converted to fully qualified URIs. 
 * 					
 * @param {Object}		payload						Not needed with this method.
 * @param {Object}		eventHandlerStore			Not needed with this method.
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')
 * @param {Boolean}		includeNonStandard			Default false
 *  
 * @yield {[Error]}		output[0]					Array of errors
 * @yield {Object}		output[1]	
 */
const handler = (payload, eventHandlerStore, context={}) => catchErrors(co(function *() {
	yield Promise.resolve({ payload, eventHandlerStore })
	
	const authorizationEndpoints = {}
	for(let endpointKey in context.endpoints) {
		const pathname = context.endpoints[endpointKey]
		if (/\/authorize$/.test(pathname))
			authorizationEndpoints[endpointKey] = getFullUrl(context.req, pathname)
	}

	const oidcEndpoints = {
		issuer: context.endpoints.issuer,
		...authorizationEndpoints,
		introspection_endpoint: getFullUrl(context.req, context.endpoints.introspection_endpoint),
		token_endpoint: getFullUrl(context.req, context.endpoints.token_endpoint),
		userinfo_endpoint: getFullUrl(context.req, context.endpoints.userinfo_endpoint)
	}

	const endpoints = {
		...oidcEndpoints,
		browse_endpoint: getFullUrl(context.req, context.endpoints.browse_endpoint),
		browse_redirect_endpoint: getFullUrl(context.req, context.endpoints.browse_redirect_endpoint),
		openidconfiguration_endpoint: getFullUrl(context.req, context.endpoints.openidconfiguration_endpoint)
	}

	return context.includeNonStandard ? endpoints : oidcEndpoints

}))

module.exports = {
	endpoint,
	handler
}