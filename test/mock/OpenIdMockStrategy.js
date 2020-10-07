const { Strategy } = require('userin-core')
const LoginSignupFIPMockStrategy = require('./LoginSignupFIPMockStrategy')

const getProfileClaims = entity => {
	entity = entity || {}
	return {
		given_name:entity.given_name || null,
		family_name:entity.family_name || null,
		zoneinfo: entity.zoneinfo || null
	}
}

const getPhoneClaims = entity => {
	entity = entity || {}
	return {
		phone:entity.phone || null,
		phone_number_verified: entity.phone_number_verified || false
	}
}

const getEmailClaims = entity => {
	entity = entity || {}
	return {
		email:entity.email || null,
		email_verified:entity.email_verified || false
	}
}

const getAddressClaims = entity => {
	entity = entity || {}
	return {
		address:entity.address || null
	}
}

class OpenIdMockStrategy extends Strategy {
	constructor(config) {
		super(config)
		this.name = 'mock'
	}
}


/**
 * Gets the user's ID and its associated client_ids if this user exists (based on username and password).
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.user.username
 * @param  {String}		payload.user.password
 * @param  {String}		payload.user...			More properties
 * @param  {String}		payload.client_id		Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		payload.state			Optional. Might be useful for logging or other custom business logic.
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Object}		user					This object should always defined the following properties at a minimum.
 * @return {Object}		user.id					String ot number
 * @return {[Object]}	user.client_ids		
 */
OpenIdMockStrategy.prototype.get_end_user = LoginSignupFIPMockStrategy.prototype.get_end_user

/**
 * Generates a new id_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_id_token = (root, { claims }, context) => {
	return context.tokenHelper.createValid(claims,'id_token')
}

/**
 * Generates a new authorization code. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_authorization_code = LoginSignupFIPMockStrategy.prototype.generate_authorization_code

/**
 * Generates a new access_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_access_token = LoginSignupFIPMockStrategy.prototype.generate_access_token

/**
 * Generates a new refresh_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_refresh_token = LoginSignupFIPMockStrategy.prototype.generate_refresh_token

/**
 * Gets the client's audiences and scopes. 
 *  
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.client_id
 * @param  {String}		payload.client_secret	Optional. If specified, this method should validate the client_secret.
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {[String]}	output.audiences		Client ID's audiences.	
 * @return {[String]}	output.scopes			Client ID's scopes.	
 */
OpenIdMockStrategy.prototype.get_client = (root, { client_id, client_secret }, context) => {
	const client = context.repos.client.find(x => x.client_id == client_id)
	if (!client)
		return null
	if (client_secret && client.client_secret != client_secret)
		throw new Error('Unauthorized access')

	return {
		audiences: client.audiences || [],
		scopes: client.scopes || []
	}
}

/**
 * Gets the authorization code's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.token
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		claims				This object should always defined the following properties at a minimum.
 * @return {String}		claims.iss			
 * @return {Object}		claims.sub			String or number
 * @return {String}		claims.aud
 * @return {Number}		claims.exp
 * @return {Number}		claims.iat
 * @return {Object}		claims.client_id	String or number
 * @return {String}		claims.scope
 */
OpenIdMockStrategy.prototype.get_authorization_code_claims = LoginSignupFIPMockStrategy.prototype.get_authorization_code_claims

/**
 * Gets the refresh_token claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.token
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		claims				This object should always defined the following properties at a minimum.
 * @return {String}		claims.iss			
 * @return {Object}		claims.sub			String or number
 * @return {String}		claims.aud
 * @return {Number}		claims.exp
 * @return {Number}		claims.iat
 * @return {Object}		claims.client_id	String or number
 * @return {String}		claims.scope
 */
OpenIdMockStrategy.prototype.get_refresh_token_claims = LoginSignupFIPMockStrategy.prototype.get_refresh_token_claims

/**
 * Deletes a refresh_token 
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.token		
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Void}
 */
OpenIdMockStrategy.prototype.delete_refresh_token = LoginSignupFIPMockStrategy.prototype.delete_refresh_token 

/**
 * Gets an access_token's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.token
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		claims				This object should always defined the following properties at a minimum.
 * @return {String}		claims.iss			
 * @return {Object}		claims.sub			String or number
 * @return {String}		claims.aud
 * @return {Number}		claims.exp
 * @return {Number}		claims.iat
 * @return {Object}		claims.client_id	String or number
 * @return {String}		claims.scope
 */
OpenIdMockStrategy.prototype.get_access_token_claims = LoginSignupFIPMockStrategy.prototype.get_access_token_claims

/**
 * Gets an id_token's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.token
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		claims				This object should always defined the following properties at a minimum.
 * @return {String}		claims.iss			
 * @return {Object}		claims.sub			String or number
 * @return {String}		claims.aud
 * @return {Number}		claims.exp
 * @return {Number}		claims.iat
 * @return {Object}		claims.client_id	String or number
 * @return {String}		claims.scope
 */
OpenIdMockStrategy.prototype.get_id_token_claims = (root, { token }, context) => {
	const claims = context.tokenHelper.decrypt(token,'id_token')
	return claims
}

/**
 * Gets the user's identity claims and its associated client_ids based on the 'scopes'.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.user_id
 * @param  {[String]}	payload.scopes
 * @param  {String}		payload.client_id	Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		payload.state		Optional. Might be useful for logging or other custom business logic.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		output.claims		e.g., { given_name:'Nic', family_name:'Dao' }
 * @return {[Object]}	output.client_ids
 */
OpenIdMockStrategy.prototype.get_identity_claims = (root, { user_id, scopes }, context) => {

	const user = context.repos.user.find(x => x.id == user_id)
	if (!user)
		throw new Error(`user_id ${user_id} not found.`)
	
	const client_ids = context.repos.userToClient.filter(x => x.user_id == user.id).map(x => x.client_id)

	if (!scopes || !scopes.filter(s => s != 'openid').length)
		return {
			claims: getProfileClaims(user),
			client_ids
		}
	else {
		return {
			claims: {
				...(scopes.some(s => s == 'profile') ? getProfileClaims(user)  : {}),
				...(scopes.some(s => s == 'email') ? getEmailClaims(user)  : {}),
				...(scopes.some(s => s == 'address') ? getAddressClaims(user)  : {}),
				...(scopes.some(s => s == 'phone') ? getPhoneClaims(user)  : {})
			},
			client_ids
		}
	}
}

/**
 * Gets all supported claims.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {[String]}	claims				e.g., ['given_name', 'family_name', 'zoneinfo', 'email', 'email_verified', 'address', 'phone', 'phone_number_verified']
 */
OpenIdMockStrategy.prototype.get_claims_supported = () => {
	// Note: You do not need to include the OpenID claims (e.g., 'iss', 'aud'). UserIn takes care of these. 

	return ['given_name', 'family_name', 'zoneinfo', 'email', 'email_verified', 'address', 'phone', 'phone_number_verified']
}

/**
 * Gets all supported scopes
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {[String]}	scopes				e.g., ['profile', 'email', 'phone', 'address', 'openid']
 */
OpenIdMockStrategy.prototype.get_scopes_supported = () => {
	// Note: You do not need to include the OpenID scope 'openid'. UserIn takes care of that one.

	return ['profile', 'email', 'phone', 'address', 'openid']
}

/**
 * Gets the public JWKs that can be used to verify the id_token.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {[JWK]}		jwks
 */
OpenIdMockStrategy.prototype.get_jwks = () => {
	return [{
		n: 'mvj-0waJ2owQlFWrlC06goLs9PcNehIzCF0QrkdsYZJXOsipcHCFlXBsgQIdTdLvlCzNI07jSYA-zggycYi96lfDX-FYv_CqC8dRLf9TBOPvUgCyFMCFNUTC69hsrEYMR_J79Wj0MIOffiVr6eX-AaCG3KhBMZMh15KCdn3uVrl9coQivy7bk2Uw-aUJ_b26C0gWYj1DnpO4UEEKBk1X-lpeUMh0B_XorqWeq0NYK2pN6CoEIh0UrzYKlGfdnMU1pJJCsNxMiha-Vw3qqxez6oytOV_AswlWvQc7TkSX6cHfqepNskQb7pGxpgQpy9sA34oIxB_S-O7VS7_h0Qh4vQ',
		kty: 'RSA',
		e: 'AQAB',
		use: 'sig',
		alg: 'RS256',
		kid: '2c6fa6f5950a7ce465fcf247aa0b094828ac952c'
	}, {
		kty: 'RSA',
		kid: '5effa76ef33ecb5e346bd512d7d89b30e47d8e98',
		e: 'AQAB',
		alg: 'RS256',
		n: 'teG3wvigoU_KPbPAiEVERFmlGeHWPsnqbEk1pAhz69B0kGHJXU8l8tPHpTw0Gy_M9BJ5WAe9FvXL41xSFbqMGiJ7DIZ32ejlncrf2vGkMl26C5p8OOvuS6ThFjREUzWbV0sYtJL0nNjzmQNCQeb90tDQDZW229ZeUNlM2yN0QRisKlGFSK7uL8X0dRUbXnfgS6eI4mvSAK6tqq3n8IcPA0PxBr-R81rtdG70C2zxlPQ4Wp_MJzjb81d-RPdcYd64loOMhhHFbbfq2bTS9TSn_Y16lYA7gyRGSPhwcsdqOH2qqon7QOiF8gtrvztwd9TpxecPd7mleGGWVFlN6pTQYQ',
		use: 'sig'
	}]
}


module.exports = OpenIdMockStrategy





