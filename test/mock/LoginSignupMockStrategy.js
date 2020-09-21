const { Strategy } = require('userin-core')
const crypto = require('crypto')

class LoginSignUpMockStrategy extends Strategy {
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
LoginSignUpMockStrategy.prototype.generate_access_token = (root, { claims }, context) => {
	return context.tokenHelper.createValid(claims,'access_token')
}

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
LoginSignUpMockStrategy.prototype.generate_refresh_token = (root, { claims }, context) => {
	return context.tokenHelper.createValid(claims,'refresh_token')
}

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
LoginSignUpMockStrategy.prototype.get_refresh_token_claims = (root, { token }, context) => {
	const claims = context.tokenHelper.decrypt(token,'refresh_token')
	return claims
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
LoginSignUpMockStrategy.prototype.get_end_user = (root, { user }, context) => {
	// const existingUser = USER_STORE.find(x => x.email == user.username)
	const existingUser = context.repos.user.find(x => x.email == user.username)
	if (!existingUser)
		return null
	if (user.password && existingUser.password != user.password)
		throw new Error('Incorrect username or password')

	const client_ids = context.repos.userToClient.filter(x => x.user_id == existingUser.id).map(x => x.client_id)

	return {
		id: existingUser.id,
		client_ids
	}
}

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
LoginSignUpMockStrategy.prototype.create_end_user = (root, { user }, context) => {
	const id = crypto.randomBytes(7).toString('base64')
	context.repos.user.push({ ...user, id })

	return {
		id
	}
}

module.exports = LoginSignUpMockStrategy





