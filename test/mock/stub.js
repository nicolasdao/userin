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

const REFRESH_TOKEN_STORE = []

module.exports = {
	SCOPES,
	CLAIMS,
	AUDIENCES,
	GOOD_CLIENT,
	BAD_CLIENT,
	END_USER,
	FIP_USER,
	FIP_USER_TO_STRATEGY,
	CLIENT_STORE,
	USER_STORE,
	USER_TO_FIP_STORE,
	USER_TO_CLIENT_STORE,
	REFRESH_TOKEN_STORE
}