const { Strategy } = require('userin-core')

const LoginSignupFIPMockStrategy = require('./LoginSignupFIPMockStrategy')
const OpenIdMockStrategy = require('./OpenIdMockStrategy')

class ExhaustiveMockStrategy extends Strategy {
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
ExhaustiveMockStrategy.prototype.get_end_user = LoginSignupFIPMockStrategy.prototype.get_end_user

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
ExhaustiveMockStrategy.prototype.get_fip_user = LoginSignupFIPMockStrategy.prototype.get_fip_user

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
ExhaustiveMockStrategy.prototype.create_end_user = LoginSignupFIPMockStrategy.prototype.create_end_user

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
ExhaustiveMockStrategy.prototype.generate_token = LoginSignupFIPMockStrategy.prototype.generate_token

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
ExhaustiveMockStrategy.prototype.get_client = OpenIdMockStrategy.prototype.get_client

/**
 * Gets a code or a token claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		type				Values are restricted to: `code`, `access_token`, `id_token`, `refresh_token`
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
ExhaustiveMockStrategy.prototype.get_token_claims = OpenIdMockStrategy.prototype.get_token_claims

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
ExhaustiveMockStrategy.prototype.get_identity_claims = OpenIdMockStrategy.prototype.get_identity_claims


module.exports = ExhaustiveMockStrategy





