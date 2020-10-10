const { getOpenIdDiscoveryData } = require('./_core')

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
 * @param {String}		context.baseUrl
 * @param {Object}		context.tokenExpiry			
 * @param {[String]}	context.modes				Valid values: 'loginsignup', 'loginsignupfip', 'openid'
 * @param {String}		context.version
 *  
 * @return {Object}		fullyQualifiedEndpoints	
 */
const handler = (payload, eventHandlerStore, context={}) => getOpenIdDiscoveryData(eventHandlerStore, context)

module.exports = {
	endpoint,
	handler
}