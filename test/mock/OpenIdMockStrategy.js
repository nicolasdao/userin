const tokenHelper = require('./token')
const { Strategy } = require('userin-core')
const {
	CLIENT_STORE,
	USER_STORE,
	USER_TO_CLIENT_STORE
} = require('./stub')
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
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		user.username
 * @param  {String}		user.password
 * @param  {String}		user...				More properties
 * @param  {String}		client_id			Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		state				Optional. Might be useful for logging or other custom business logic.
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 * @return {[Object]}	user.client_ids		
 */
OpenIdMockStrategy.prototype.get_end_user = LoginSignupFIPMockStrategy.prototype.get_end_user

/**
 * Generates a new id_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_id_token = (root, { claims }) => {
	return tokenHelper.createValid(claims,'id_token')
}

/**
 * Generates a new authorization code. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_authorization_code = LoginSignupFIPMockStrategy.prototype.generate_authorization_code

/**
 * Generates a new access_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_access_token = LoginSignupFIPMockStrategy.prototype.generate_access_token

/**
 * Generates a new refresh_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
OpenIdMockStrategy.prototype.generate_refresh_token = LoginSignupFIPMockStrategy.prototype.generate_refresh_token

/**
 * Gets the client's audiences and scopes. 
 *  
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		client_id
 * @param  {String}		client_secret		Optional. If specified, this method should validate the client_secret.
 * 
 * @return {[String]}	output.audiences	Service account's audiences.	
 * @return {[String]}	output.scopes		Service account's scopes.	
 */
OpenIdMockStrategy.prototype.get_client = (root, { client_id, client_secret }) => {
	const serviceAccount = CLIENT_STORE.find(x => x.client_id == client_id)
	if (!serviceAccount)
		throw new Error(`Service account ${client_id} not found`)
	if (client_secret && serviceAccount.client_secret != client_secret)
		throw new Error('Unauthorized access')

	return {
		audiences: serviceAccount.audiences || [],
		scopes: serviceAccount.scopes || []
	}
}

/**
 * Gets the authorization code's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		token
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
 * @param  {Object}		token
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
 * Gets an id_token's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		token
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
OpenIdMockStrategy.prototype.get_id_token_claims = (root, { token }) => {
	const claims = tokenHelper.decrypt(token,'id_token')
	return claims
}

/**
 * Gets an access_token's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		token
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
OpenIdMockStrategy.prototype.get_access_token_claims = (root, { token }) => {
	const claims = tokenHelper.decrypt(token,'access_token')
	return claims
}

/**
 * Gets the user's identity claims and its associated client_ids based on the 'scopes'.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		user_id
 * @param  {[String]}	scopes
 * @param  {String}		client_id			Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		state				Optional. Might be useful for logging or other custom business logic.
 * 
 * @return {Object}		output.claims		e.g., { given_name:'Nic', family_name:'Dao' }
 * @return {[Object]}	output.client_ids
 */
OpenIdMockStrategy.prototype.get_identity_claims = (root, { user_id, scopes }) => {

	const user = USER_STORE.find(x => x.id == user_id)
	if (!user)
		throw new Error(`user_id ${user_id} not found.`)
	
	const client_ids = USER_TO_CLIENT_STORE.filter(x => x.user_id == user.id).map(x => x.client_id)

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


module.exports = OpenIdMockStrategy




