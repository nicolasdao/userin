const { error: { catchErrors, wrapErrors }, url:{ buildUrl, getInfo }, collection } = require('puffy')
const { getOpenIdEvents, getLoginSignupEvents } = require('userin-core')

const OPENID_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'iat']
const USERIN_OPENID_CLAIMS = ['scope', 'client_id' ]
const OPENID_SCOPES = ['openid']
const LOGINSIGNUP_PROPS = [
	'issuer',
	'configuration_endpoint',
	'grant_types_supported',
	'login_endpoint',
	'postman_endpoint',
	'revocation_endpoint',
	'signup_endpoint',
	'token_endpoint'
]
const LOGINSIGNUP_FIP_PROPS = [...LOGINSIGNUP_PROPS, 'response_types_supported', 'code_challenge_methods_supported']
const OPENID_PROPS = [
	'issuer',
	'claims_supported',
	'code_challenge_methods_supported',
	'configuration_endpoint',
	'grant_types_supported',
	'id_token_signing_alg_values_supported',
	'introspection_endpoint',
	'jwks_uri',
	'openidconfiguration_endpoint',
	'postman_endpoint',
	'response_types_supported',
	'revocation_endpoint',
	'scopes_supported',
	'token_endpoint',
	'token_endpoint_auth_methods_supported',
	'userinfo_endpoint',
]

const AUTH_CODE_FLOW_REQUIRED_EVENTS = [...getLoginSignupEvents(), 'generate_authorization_code', 'get_authorization_code_claims']

const testIfOpenIdIsReady = eventHandlerStore => getOpenIdEvents({ required:true }).every(e => eventHandlerStore[e])

const supportsAuthCodeFlow = eventHandlerStore => AUTH_CODE_FLOW_REQUIRED_EVENTS.every(e => eventHandlerStore[e])

const filterProps = (discovery={}, modes=[]) => {
	let filteredDiscovery = {}
	if (modes.indexOf('loginsignup') >= 0) 
		filteredDiscovery = Object.keys(discovery).reduce((acc,key) => {
			if (LOGINSIGNUP_PROPS.indexOf(key) >= 0)
				acc[key] = discovery[key]
			return acc
		}, filteredDiscovery)
	if (modes.indexOf('loginsignupfip') >= 0) 
		filteredDiscovery = Object.keys(discovery).reduce((acc,key) => {
			if (LOGINSIGNUP_FIP_PROPS.indexOf(key) >= 0)
				acc[key] = discovery[key]
			return acc
		}, filteredDiscovery)
	if (modes.indexOf('openid') >= 0) 
		filteredDiscovery = Object.keys(discovery).reduce((acc,key) => {
			if (OPENID_PROPS.indexOf(key) >= 0)
				acc[key] = discovery[key]
			return acc
		}, filteredDiscovery)

	return Object.keys(filteredDiscovery).length ? filteredDiscovery : discovery
}

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

const createSet = set => ({
	add:(...items) => items.forEach(i => set.add(i)),
	toArray: () => Array.from(set)
})

/**
 * Gets the OpenID Connect discovery data. 
 * 					
 * @param	{Object}	eventHandlerStore
 * @param	{String}	context.baseUrl					
 * @param	{Object}	context.endpoints		Object containing all the OIDC endpoints (pathname only)
 *  
 * @return	{Object}	discovery
 */
const getOpenIdDiscoveryData = (eventHandlerStore, context={}) => catchErrors((async () => {
	const errorMsg = 'Failed to get the OpenID Connect discovery data'
	const { baseUrl='', endpoints, modes=[] } = context

	const isOpenId = modes.indexOf('openid') >= 0
	const isLoginSignupFip = modes.indexOf('loginsignupfip') >= 0
	const isLoginSignup = isLoginSignupFip || modes.indexOf('loginsignup') >= 0
	const isOpenIdReady = testIfOpenIdIsReady(eventHandlerStore)
	const isAuthCodeFlowReady = supportsAuthCodeFlow(eventHandlerStore)
	
	const discovery = {
		issuer: baseUrl ? getInfo(baseUrl).origin : null,
		claims_supported:[],
		scopes_supported:[],
		grant_types_supported:[]
	}

	const code_challenge_methods_supported = createSet(new Set())
	const response_types_supported = createSet(new Set())
	const grant_types_supported = createSet(new Set())
	const token_endpoint_auth_methods_supported = createSet(new Set())
	const claims_supported = createSet(new Set())
	const scopes_supported = createSet(new Set())

	if (isLoginSignup)
		grant_types_supported.add('refresh_token')

	if (isLoginSignupFip) {
		grant_types_supported.add('refresh_token')
		
		if (isAuthCodeFlowReady) {
			grant_types_supported.add('authorization_code')

			code_challenge_methods_supported.add('plain', 'S256')
		}

		response_types_supported.add('code', 'token', 'code token')
	}

	if (isOpenId && isOpenIdReady) {
		grant_types_supported.add('password', 'refresh_token', 'authorization_code', 'client_credentials')

		code_challenge_methods_supported.add('plain', 'S256')

		response_types_supported.add('code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token')

		token_endpoint_auth_methods_supported.add('client_secret_post')

		claims_supported.add(...OPENID_CLAIMS, ...USERIN_OPENID_CLAIMS)

		scopes_supported.add(...OPENID_SCOPES)
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
	if (endpoints.postman_endpoint)
		discovery.postman_endpoint = joinUrlParts(baseUrl, endpoints.postman_endpoint)

	if (eventHandlerStore.get_jwks) {
		const [errors, keys=[]] = await eventHandlerStore.get_jwks.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		const algs = Array.from(new Set(keys.filter(k => k.alg).map(k => k.alg)))
		discovery.id_token_signing_alg_values_supported = algs
	}

	if (eventHandlerStore.get_scopes_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_scopes_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		scopes_supported.add(...values)
	}

	if (eventHandlerStore.get_claims_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_claims_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		claims_supported.add(...values)
	}

	if (eventHandlerStore.get_grant_types_supported) {
		const [errors, values=[]] = await eventHandlerStore.get_grant_types_supported.exec()
		if (errors) throw wrapErrors(errorMsg, errors)
		grant_types_supported.add(...values)
	}

	discovery.code_challenge_methods_supported = code_challenge_methods_supported.toArray()
	discovery.response_types_supported = response_types_supported.toArray()
	discovery.grant_types_supported = grant_types_supported.toArray()
	discovery.token_endpoint_auth_methods_supported = token_endpoint_auth_methods_supported.toArray()
	discovery.claims_supported = claims_supported.toArray()
	discovery.scopes_supported = scopes_supported.toArray()

	return orderFields(filterProps(discovery, modes))
})())

/**
 * Gets the UserIn discovery data (incl. OpenID discovery data).  
 * 					
 * @param	{Object}	eventHandlerStore
 * @param	{String}	context.baseUrl					
 * @param	{Object}	context.endpoints		Object containing all the OIDC endpoints (pathname only)
 *  
 * @return	{Object}	discovery	
 */
const getDiscoveryData = (eventHandlerStore, context={}) => catchErrors((async () => {
	const errorMsg = 'Failed to get the UserIn discovery data'
	const { baseUrl='', endpoints, modes } = context

	const [openIdDiscoveryErrors, openIdDiscovery] = await getOpenIdDiscoveryData(eventHandlerStore, context)
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

	if (endpoints.openidconfiguration_endpoint)
		discovery.openidconfiguration_endpoint = joinUrlParts(baseUrl, endpoints.openidconfiguration_endpoint)
	if (endpoints.configuration_endpoint)
		discovery.configuration_endpoint = joinUrlParts(baseUrl, endpoints.configuration_endpoint)

	if (endpoints.login_endpoint)
		discovery.login_endpoint = joinUrlParts(baseUrl, endpoints.login_endpoint)
	if (endpoints.signup_endpoint)
		discovery.signup_endpoint = joinUrlParts(baseUrl, endpoints.signup_endpoint)

	return orderFields(filterProps(discovery, modes))

})())

module.exports = {
	getDiscoveryData,
	getOpenIdDiscoveryData
}