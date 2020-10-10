const { co } = require('core-async')
const { error: { catchErrors, wrapErrors } } = require('puffy')

const endpoint = 'certs' 

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Verifies that a token is valid and returns the claims associated with that token if it is valid. 
 *
 * @param {Object}		_
 * @param {Object}		eventHandlerStore
 * @param {Object}		context.endpoints			Object containing all the OIDC endpoints (pathname only)
 * @param {Request}		context.req					Express Request
 * @param {Response}	context.res					Express Response
 * @param {String}		context.authorization		HTTP Authorization header value (e.g., 'Bearer 12345')    
 * @param {String}		context.baseUrl
 * @param {Object}		context.tokenExpiry			
 * @param {[String]}	context.modes				Valid values: 'loginsignup', 'loginsignupfip', 'openid'
 * @param {String}		context.version             					    						
 *  
 * @yield  {[Error]}	output[0]					Array of errors
 * @return {[JWK]}		output[1].keys			
 */
const handler = (_, eventHandlerStore={}) => catchErrors(co(function *() {
	if (TRACE_ON)
		console.log('INFO - Request to get the JWK public keys')

	const errorMsg = 'Failed to get the JWK public keys'

	if (eventHandlerStore.get_jwks) {
		const [errors, jwks] = yield eventHandlerStore.get_jwks.exec()
		if (errors)
			throw wrapErrors(errorMsg, errors)
		
		return { keys:jwks }
	} else
		return { keys:[] }
}))

module.exports = {
	endpoint,
	handler
}



