const { co } = require('core-async')
const { error: { catchErrors } } = require('puffy')
const { getFullyQualifiedEndpoints } = require('./_core')

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
 * @return {Object}		fullyQualifiedEndpoints	
 */
const handler = (payload, eventHandlerStore, context={}) => catchErrors(co(function *() {
	return yield Promise.resolve(null).then(() => getFullyQualifiedEndpoints(context.req, context.endpoints))
}))

module.exports = {
	endpoint,
	handler
}