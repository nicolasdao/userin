const crypto = require('crypto')
const { Strategy } = require('userin-core')
const tokenHelper = require('./token')
const {
	USER_STORE,
	USER_TO_FIP_STORE,
	USER_TO_CLIENT_STORE
} = require('./stub')
const LoginSignupMockStrategy = require('./LoginSignupMockStrategy')

class LoginSignupFIPMockStrategy extends Strategy {
	constructor(config) {
		super(config)
		this.name = 'mock'
	}
}

/**
 * Generates a new access_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
LoginSignupFIPMockStrategy.prototype.generate_access_token = LoginSignupMockStrategy.prototype.generate_access_token

/**
 * Generates a new refresh_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
LoginSignupFIPMockStrategy.prototype.generate_refresh_token = LoginSignupMockStrategy.prototype.generate_refresh_token

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
LoginSignupFIPMockStrategy.prototype.get_refresh_token_claims = LoginSignupMockStrategy.prototype.get_refresh_token_claims

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
LoginSignupFIPMockStrategy.prototype.get_end_user = LoginSignupMockStrategy.prototype.get_end_user 

/**
 * Inserts new user.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		user.username		
 * @param  {String}		user.password		
 * @param  {String}		user...				More properties
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 */
LoginSignupFIPMockStrategy.prototype.create_end_user = LoginSignupMockStrategy.prototype.create_end_user 

/**
 * Inserts new FIP user.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		strategy			e.g., 'facebook', 'google'		
 * @param  {String}		user.id			
 * @param  {String}		user...				More properties
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 */
LoginSignupFIPMockStrategy.prototype.create_fip_user = (root, { strategy, user }) => {
	const id = crypto.randomBytes(7).toString('base64')
	USER_STORE.push({ ...user, id })

	USER_TO_FIP_STORE.push({
		user_id:id,
		strategy,
		strategy_user_id:user.id
	})

	return {
		id
	}
}

/**
 * Gets the user ID and its associated client_ids if this user exists (based on strategy and FIP's user ID).
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		strategy			FIP name (e.g., 'facebook', 'google')
 * @param  {Object}		user.id				FIP's user ID. String or number. 
 * @param  {String}		user...				More properties
 * @param  {String}		client_id			Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		state				Optional. Might be useful for logging or other custom business logic.
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 * @return {[Object]}	user.client_ids		
 */
LoginSignupFIPMockStrategy.prototype.get_fip_user = (root, { strategy, user }) => {

	const existingUser = USER_TO_FIP_STORE.find(x => x.strategy == strategy && x.strategy_user_id == user.id)
	if (!existingUser)
		return null

	const client_ids = USER_TO_CLIENT_STORE.filter(x => x.user_id == existingUser.user_id).map(x => x.client_id)

	return {
		id: existingUser.user_id,
		client_ids
	}
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
LoginSignupFIPMockStrategy.prototype.generate_authorization_code = (root, { claims }) => {
	return tokenHelper.createValid(claims,'code')
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
LoginSignupFIPMockStrategy.prototype.get_authorization_code_claims = (root, { token }) => {
	const claims = tokenHelper.decrypt(token,'code')
	return claims
}

module.exports = LoginSignupFIPMockStrategy





