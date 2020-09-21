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
ExhaustiveMockStrategy.prototype.get_end_user = LoginSignupFIPMockStrategy.prototype.get_end_user

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
ExhaustiveMockStrategy.prototype.get_fip_user = LoginSignupFIPMockStrategy.prototype.get_fip_user

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
ExhaustiveMockStrategy.prototype.create_end_user = LoginSignupFIPMockStrategy.prototype.create_end_user

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
ExhaustiveMockStrategy.prototype.create_fip_user = LoginSignupFIPMockStrategy.prototype.create_fip_user

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
ExhaustiveMockStrategy.prototype.generate_access_token = LoginSignupFIPMockStrategy.prototype.generate_access_token

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
ExhaustiveMockStrategy.prototype.generate_refresh_token = LoginSignupFIPMockStrategy.prototype.generate_refresh_token

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
ExhaustiveMockStrategy.prototype.generate_authorization_code = LoginSignupFIPMockStrategy.prototype.generate_authorization_code

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
ExhaustiveMockStrategy.prototype.generate_id_token = OpenIdMockStrategy.prototype.generate_id_token

/**
 * Gets the client's audiences and scopes. 
 *  
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.client_id
 * @param  {String}		payload.client_secret	Optional. If specified, this method should validate the client_secret.
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {[String]}	output.audiences		Service account's audiences.	
 * @return {[String]}	output.scopes			Service account's scopes.	
 */
ExhaustiveMockStrategy.prototype.get_client = OpenIdMockStrategy.prototype.get_client

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
ExhaustiveMockStrategy.prototype.get_authorization_code_claims = LoginSignupFIPMockStrategy.prototype.get_authorization_code_claims

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
ExhaustiveMockStrategy.prototype.get_refresh_token_claims = LoginSignupFIPMockStrategy.prototype.get_refresh_token_claims

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
ExhaustiveMockStrategy.prototype.get_id_token_claims = OpenIdMockStrategy.prototype.get_id_token_claims

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
ExhaustiveMockStrategy.prototype.get_access_token_claims = OpenIdMockStrategy.prototype.get_access_token_claims

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
ExhaustiveMockStrategy.prototype.get_identity_claims = OpenIdMockStrategy.prototype.get_identity_claims


module.exports = ExhaustiveMockStrategy





