const crypto = require('crypto')
const { Strategy } = require('userin-core')
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
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
LoginSignupFIPMockStrategy.prototype.generate_access_token = LoginSignupMockStrategy.prototype.generate_access_token

/**
 * Generates a new refresh_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
LoginSignupFIPMockStrategy.prototype.generate_refresh_token = LoginSignupMockStrategy.prototype.generate_refresh_token

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
LoginSignupFIPMockStrategy.prototype.get_refresh_token_claims = LoginSignupMockStrategy.prototype.get_refresh_token_claims

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
LoginSignupFIPMockStrategy.prototype.get_end_user = LoginSignupMockStrategy.prototype.get_end_user 

/**
 * Inserts new user.
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.user.username		
 * @param  {String}		payload.user.password		
 * @param  {String}		payload.user...			More properties
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Object}		user					This object should always defined the following properties at a minimum.
 * @return {Object}		user.id					String ot number
 */
LoginSignupFIPMockStrategy.prototype.create_end_user = LoginSignupMockStrategy.prototype.create_end_user 

/**
 * Deletes a refresh_token 
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.token		
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Void}
 */
LoginSignupFIPMockStrategy.prototype.delete_refresh_token = LoginSignupMockStrategy.prototype.delete_refresh_token 

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
LoginSignupFIPMockStrategy.prototype.get_access_token_claims = LoginSignupMockStrategy.prototype.get_access_token_claims

/**
 * Inserts new FIP user.
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.strategy	e.g., 'facebook', 'google'		
 * @param  {String}		payload.user.id			
 * @param  {String}		payload.user...		More properties
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 */
LoginSignupFIPMockStrategy.prototype.create_fip_user = (root, { strategy, user }, context) => {
	const id = crypto.randomBytes(7).toString('base64')
	context.repos.user.push({ ...user, id })

	context.repos.userToFip.push({
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
 * @param  {String}		payload.strategy	FIP name (e.g., 'facebook', 'google')
 * @param  {Object}		payload.user.id		FIP's user ID. String or number. 
 * @param  {String}		payload.user...		More properties
 * @param  {String}		payload.client_id	Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		payload.state		Optional. Might be useful for logging or other custom business logic.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		user				This object should always defined the following properties at a minimum.
 * @return {Object}		user.id				String ot number
 * @return {[Object]}	user.client_ids		
 */
LoginSignupFIPMockStrategy.prototype.get_fip_user = (root, { strategy, user }, context) => {

	const existingUser = context.repos.userToFip.find(x => x.strategy == strategy && x.strategy_user_id == user.id)
	if (!existingUser)
		return null

	const client_ids = context.repos.userToClient.filter(x => x.user_id == existingUser.user_id).map(x => x.client_id)

	return {
		id: existingUser.user_id,
		client_ids
	}
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
LoginSignupFIPMockStrategy.prototype.generate_authorization_code = (root, { claims }, context) => {
	return context.tokenHelper.createValid(claims,'code')
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
LoginSignupFIPMockStrategy.prototype.get_authorization_code_claims = (root, { token }, context) => {
	const claims = context.tokenHelper.decrypt(token,'code')
	return claims
}

module.exports = LoginSignupFIPMockStrategy





