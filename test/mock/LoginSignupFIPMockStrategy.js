const { Strategy } = require('userin-core')
const {
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
 * Generates a new token or code. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		type				Values are restricted to: `code`, `access_token`, `id_token`, `refresh_token`
 * @param  {Object}		claims
 * @param  {String}		state				This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * 
 * @return {String}		token
 */
LoginSignupFIPMockStrategy.prototype.generate_token = LoginSignupMockStrategy.prototype.generate_token 

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

module.exports = LoginSignupFIPMockStrategy





