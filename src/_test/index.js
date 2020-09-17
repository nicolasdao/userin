const authorizeTest = require('./authorize')
const introspectTest = require('./introspect')
const tokenTest = require('./token')
const userinfoTest = require('./userinfo')

const skipTest = (name, skip, only) => {
	if (skip)
		return skip === name || (Array.isArray(skip) && skip.some(s => s == name))
	else if (only)
		return Array.isArray(only) ? !only.some(s => s == name) : only != name
	else
		return false
}

/**
 * Unit tests a UserIn strategy. 
 * 
 * @param  {Strategy}	strategy
 * @param  {Object}		client.id
 * @param  {String}		client.secret
 * @param  {Object}		client.user.id
 * @param  {String}		client.user.username
 * @param  {String}		client.user.password
 * @param  {Object}		client.fipUser.id
 * @param  {String}		client.fipUser.fip
 * @param  {Object}		altClient.id
 * @param  {String}		altClient.secret
 * @param  {String}		claimStubs[].scope		e.g., 'profile'
 * @param  {Object}		claimStubs[].claims		e.g., { given_name: 'Nic', family_name: 'Dao' }
 * @param  {[String]}	skip					Valid values: 'authorize', 'introspect', 'token', 'userinfo'
 * @param  {[String]}	only					Valid values: 'authorize', 'introspect', 'token', 'userinfo'
 * @param  {Boolean}	verbose					Default false. When true, this logs the detailed errors if there are any.
 * 
 * @return {Void}
 */
module.exports = function runTestSuite({
	strategy,
	client: { 
		id: clientId, 
		aud,
		secret: clientSecret, 
		user: { 
			id:userId, 
			username, 
			password
		}, 
		fipUser: { 
			id: userIdCreatedFromFip,
			fipUserId, 
			fip 
		} 
	},
	altClient: { 
		id:altClientId, 
		secret:altClientSecret 
	},
	claimStubs,
	skip,
	only, 
	verbose
}) {
	authorizeTest({
		clientId, 
		identityProvider: fip, 
		identityProviderUserId: fipUserId, 
		userId: userIdCreatedFromFip,
		altClientId, 
		strategy
	}, skipTest('authorize', skip, only), verbose)

	introspectTest({ 
		clientId, 
		clientSecret, 
		altClientId,
		altClientSecret,
		strategy, 
		user: { 
			id:userId,
			username, 
			password
		},
		aud
	}, skipTest('introspect', skip, only), verbose)

	tokenTest({
		clientId, 
		clientSecret, 
		altClientId, 
		strategy, 
		accessTokenExpiresIn: 3600,
		user: { 
			id: userId, 
			username, 
			password
		}
	}, skipTest('token', skip, only), verbose)

	userinfoTest({
		clientId, 
		strategy, 
		user: { 
			username, 
			password
		},
		claimStubs
	}, skipTest('userinfo', skip, only), verbose)
}