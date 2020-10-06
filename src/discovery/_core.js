const { error: { catchErrors, wrapErrors }, url:{ buildUrl }, collection } = require('puffy')
const { getOpenIdEvents, getLoginSignupEvents } = require('userin-core')

const OPENID_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'iat']
const USERIN_OPENID_CLAIMS = ['scope', 'client_id' ]
const OPENID_SCOPES = ['openid']

const AUTH_CODE_FLOW_REQUIRED_EVENTS = [...getLoginSignupEvents(), 'generate_authorization_code', 'get_authorization_code_claims']

const isOpenIdReady = eventHandlerStore => getOpenIdEvents({ required:true }).every(e => eventHandlerStore[e])

const supportsAuthCodeFlow = eventHandlerStore => AUTH_CODE_FLOW_REQUIRED_EVENTS.every(e => eventHandlerStore[e])

/**
 * Rearranges the discovery fields to present them in a better order. This is pure cosmetic.
 * 
 * @param  {Object} discovery
 * @return {Object}
 */
const orderFields = discovery => {
	const { urls, issuer, others } = Object.keys(discovery).reduce((acc, key) => {
		const value = discovery[key]
		if (key == 'issuer')
			acc.issuer = value
		else if (typeof(value) == 'string' && value.indexOf('http') == 0)
			acc.urls.push({ name:key, value }) 
		else
			acc.others.push({ name:key, value })
		return acc
	}, { issuer:null, urls:[], others:[] })

	return { 
		issuer,
		...collection.sortBy(urls, x => x.name).reduce((acc, { name, value }) => { acc[name] = value; return acc }, {}),
		...collection.sortBy(others, x => x.name).reduce((acc, { name, value }) => { acc[name] = value; return acc }, {})
	}
}

const joinUrlParts = (origin='', pathname='') => origin ? buildUrl({ origin, pathname }) : pathname

/**
 * Gets the OpenID Connect discovery data. 
 * 					
 * @param  {String}		baseUrl					
 * @param  {Object}		endpoints				Object containing all the OIDC endpoints (pathname only)
 *  
 * @return {Object}		discovery	
 */
const getOpenIdDiscoveryData = (baseUrl='', endpoints, eventHandlerStore) => catchErrors((async () => {
	const errorMsg = 'Failed to get the OpenID Connect discovery data'

	const [configErrors, config={}] = await eventHandlerStore.get_config.exec()
	if (configErrors)
		throw wrapErrors(errorMsg, configErrors)
	
	const discovery = {
		issuer: config.iss||null,
		claims_supported:[],
		scopes_supported:[],
		grant_types_supported:[]
	}

	if (endpoints.introspection_endpoint)
		discovery.introspection_endpoint = joinUrlParts(baseUrl, endpoints.introspection_endpoint)
	if (endpoints.token_endpoint)
		discovery.token_endpoint = joinUrlParts(baseUrl, endpoints.token_endpoint)
	if (endpoints.userinfo_endpoint)
		discovery.userinfo_endpoint = joinUrlParts(baseUrl, endpoints.userinfo_endpoint)
	if (endpoints.jwks_uri)
		discovery.jwks_uri = joinUrlParts(baseUrl, endpoints.jwks_uri)
	if (endpoints.revocation_endpoint)
		discovery.revocation_endpoint = joinUrlParts(baseUrl, endpoints.revocation_endpoint)

	const openIdReady = isOpenIdReady(eventHandlerStore)
	const authCodeFlowReady = supportsAuthCodeFlow(eventHandlerStore)

	if (openIdReady || authCodeFlowReady) {
		discovery.code_challenge_methods_supported = ['plain', 'S256']
		discovery.response_types_supported = ['code', 'token', 'code token']
		discovery.grant_types_supported.push('authorization_code', 'refresh_token')
	}

	if (openIdReady) {
		discovery.response_types_supported = [ 'code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token']
		discovery.token_endpoint_auth_methods_supported = ['client_secret_post']
		discovery.grant_types_supported.push('password', 'client_credentials')
		discovery.claims_supported.push(...OPENID_CLAIMS, ...USERIN_OPENID_CLAIMS)
		discovery.scopes_supported.push(...OPENID_SCOPES)
	}

	if (eventHandlerStore.get_jwks) {
		const [errors, keys=[]] = await eventHandlerStore.get_jwks.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		const algs = Array.from(new Set(keys.filter(k => k.alg).map(k => k.alg)))
		discovery.id_token_signing_alg_values_supported = algs
	}

	if (eventHandlerStore.get_scopes_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_scopes_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		discovery.scopes_supported = values
		discovery.scopes_supported = Array.from(new Set([...discovery.scopes_supported, ...values]))
	}

	if (eventHandlerStore.get_claims_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_claims_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		discovery.claims_supported = values
		discovery.claims_supported = Array.from(new Set([...discovery.claims_supported, ...values]))
	}

	if (eventHandlerStore.get_grant_types_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_grant_types_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		discovery.grant_types_supported = Array.from(new Set([...discovery.grant_types_supported, ...values]))
	}

	return orderFields(discovery)
})())

/**
 * Gets the UserIn discovery data (incl. OpenID discovery data).  
 * 					
 * @param  {String}		baseUrl					
 * @param  {Object}		endpoints				Object containing all the OIDC endpoints (pathname only)
 *  
 * @return {Object}		discovery	
 */
const getDiscoveryData = (baseUrl='', endpoints, eventHandlerStore) => catchErrors((async () => {
	const errorMsg = 'Failed to get the UserIn discovery data'

	const [openIdDiscoveryErrors, openIdDiscovery] = await getOpenIdDiscoveryData(baseUrl, endpoints, eventHandlerStore)
	if (openIdDiscoveryErrors)
		throw wrapErrors(errorMsg, openIdDiscoveryErrors)

	const authorizationEndpoints = {}
	for(let endpointKey in endpoints) {
		const pathname = endpoints[endpointKey]
		if (endpointKey.indexOf('authorization_') == 0)
			authorizationEndpoints[endpointKey] = joinUrlParts(baseUrl, pathname)
	}

	// Set up non OAuth2 endpoints
	const discovery = {
		...openIdDiscovery,
		...authorizationEndpoints
	}

	if (endpoints.browse_endpoint)
		discovery.browse_endpoint = joinUrlParts(baseUrl, endpoints.browse_endpoint)
	if (endpoints.browse_redirect_endpoint)
		discovery.browse_redirect_endpoint = joinUrlParts(baseUrl, endpoints.browse_redirect_endpoint)
	if (endpoints.openidconfiguration_endpoint)
		discovery.openidconfiguration_endpoint = joinUrlParts(baseUrl, endpoints.openidconfiguration_endpoint)
	if (endpoints.configuration_endpoint)
		discovery.configuration_endpoint = joinUrlParts(baseUrl, endpoints.configuration_endpoint)

	if (endpoints.login_endpoint)
		discovery.login_endpoint = joinUrlParts(baseUrl, endpoints.login_endpoint)
	if (endpoints.signup_endpoint)
		discovery.signup_endpoint = joinUrlParts(baseUrl, endpoints.signup_endpoint)

	return orderFields(discovery)

})())

module.exports = {
	getDiscoveryData,
	getOpenIdDiscoveryData
}