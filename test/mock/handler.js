const tokenHelper = require('./token')
const { Strategy, error: { NotFoundError } } = require('userin-core')
const crypto = require('crypto')

const SCOPES = [
	'profile',
	'offline_access',
	'email',
	'phone',
	'address'
]

const CLAIMS = [
	// Required OIDC
	'iss', 
	'sub',
	'aud',
	'exp',
	'iat',
	// Popular profile
	'name',
	'family_name',
	'given_name',
	'middle_name',
	'nickname',
	'preferred_username',
	'profile',
	'picture',
	'website',
	'gender',
	'birthdate',
	'zoneinfo',
	'locale',
	'updated_at',
	// email
	'email',
	'email_verified',
	// address
	'address',
	// phone
	'phone',
	'phone_number_verified'
]

const AUDIENCES = ['https://www.unittest.com']

const GOOD_CLIENT = {
	client_id:'app123', 
	client_secret:98765, 
	scopes:SCOPES, 
	audiences:AUDIENCES
}

const BAD_CLIENT = {
	client_id:'badapp123', 
	client_secret:468269832, 
	scopes:['profile'], 
	audiences:AUDIENCES
}

const END_USER = {
	id:11,
	given_name:'Nic',
	family_name:'Dao',
	zoneinfo: 'Australia/Sydney',
	email:'nic@cloudlessconsulting.com',
	email_verified:true,
	address:'Some street in Sydney',
	phone: '+6112345678',
	phone_number_verified: false,
	password: 123456
}

const FIP_USER = {
	id:23,
	given_name:'Tom',
	family_name:'Cruise',
	zoneinfo: 'Australia/Sydney',
	email:'tom@cruise.com',
	email_verified:true,
	address:'Some street in LA',
	phone: '+112345678',
	phone_number_verified: false
}

const FIP_USER_TO_STRATEGY = {
	user_id:FIP_USER.id,
	strategy:'facebook',
	strategy_user_id:76
}

const CLIENT_STORE = [GOOD_CLIENT, BAD_CLIENT]
const USER_STORE = [END_USER, FIP_USER]
const USER_TO_FIP_STORE = [FIP_USER_TO_STRATEGY]
const USER_TO_CLIENT_STORE = [{
	user_id: USER_STORE[0].id,
	client_id: CLIENT_STORE[0].client_id
},{
	user_id: USER_STORE[1].id,
	client_id: CLIENT_STORE[0].client_id
}]

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

class MockStrategy extends Strategy {
	constructor(config) {
		super(config)
		this.name = 'mock'
	}
}

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
MockStrategy.prototype.get_client = (root, { client_id, client_secret }) => {
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
MockStrategy.prototype.get_token_claims = (root, { type, token }) => {
	const claims = tokenHelper.decrypt(token,type)
	return claims
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
MockStrategy.prototype.generate_token = (root, { type, claims }) => {
	return tokenHelper.createValid(claims,type)
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
MockStrategy.prototype.get_identity_claims = (root, { user_id, scopes }) => {

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
MockStrategy.prototype.get_end_user = (root, { user }) => {

	const existingUser = USER_STORE.find(x => x.email == user.username)
	if (!existingUser)
		throw new NotFoundError(`user ${user.username} not found`)
	if (user.password && existingUser.password != user.password)
		throw new Error('Incorrect username or password')

	const client_ids = USER_TO_CLIENT_STORE.filter(x => x.user_id == existingUser.id).map(x => x.client_id)

	return {
		id: existingUser.id,
		client_ids
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
MockStrategy.prototype.get_fip_user = (root, { strategy, user }) => {

	const existingUser = USER_TO_FIP_STORE.find(x => x.strategy == strategy && x.strategy_user_id == user.id)
	if (!existingUser)
		throw new Error(`${strategy} user ID ${user.id} not found`)

	const client_ids = USER_TO_CLIENT_STORE.filter(x => x.user_id == existingUser.user_id).map(x => x.client_id)

	return {
		id: existingUser.user_id,
		client_ids
	}
}

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
MockStrategy.prototype.create_end_user = (root, { user }) => {
	const id = crypto.randomBytes(7).toString('base64')
	USER_STORE.push({ ...user, id })

	return {
		id
	}
}

module.exports = {
	MockStrategy,
	getClaims: () => CLAIMS,
	GOOD_CLIENT,
	BAD_CLIENT,
	END_USER,
	FIP_USER,
	FIP_USER_TO_STRATEGY
}





