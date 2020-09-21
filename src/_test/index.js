const fipLoginSignupTest = require('./fiploginsignup')
const introspectTest = require('./introspect')
const tokenTest = require('./token')
const userinfoTest = require('./userinfo')
const loginTest = require('./login')
const signupTest = require('./signup')
const strategyTest = require('./Strategy')
const { logTestErrors } = require('./_core')

const skipTest = (name, skip, only) => {
	if (skip)
		return skip == 'all' || skip === name || (Array.isArray(skip) && skip.some(s => s == name || s == 'all'))
	else if (only && only.length)
		return Array.isArray(only) ? !only.some(s => s == name) : only != name
	else
		return false
}

// Used to consume params that are not used and avoid linting warnings
const voidFn = () => null

/**
 * Unit tests an OpenID UserIn strategy. 
 * 
 * @param  {Class}		Strategy
 * @param  {Object}		config							Strategy's config. Use it in the Strategy's constructor.
 * @param  {Object}		stub.client.id
 * @param  {String}		stub.client.secret
 * @param  {Object}		stub.client.user.id
 * @param  {String}		stub.client.user.username
 * @param  {String}		stub.client.user.password
 * @param  {Object}		stub.client.fipUser.id
 * @param  {String}		stub.client.fipUser.fip
 * @param  {Object}		stub.altClient.id
 * @param  {String}		stub.altClient.secret
 * @param  {String}		stub.claimStubs[].scope			e.g., 'profile'
 * @param  {Object}		stub.claimStubs[].claims		e.g., { given_name: 'Nic', family_name: 'Dao' }
 * @param  {[String]}	options.skip					Valid values: 'all', 'strategy', 'introspect', 'token', 'userinfo'
 * @param  {[String]}	options.only					Valid values: 'strategy', 'introspect', 'token', 'userinfo'
 * @param  {[String]}	options.showResults				e.g. ['introspect.handler.15,16', 'userinfo.handler.04']
 * 
 * @return {Void}
 */
const testOpenId = (Strategy, config={}, stub={}, options={}) => {
	const openIdConfig = { ...config, modes:['openid'] }

	const logTest = logTestErrors()

	// 1. Tests that the strategy is instantiable
	describe('Concrete openid strategy', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const strategy = new Strategy(openIdConfig)
					voidFn(strategy)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create Strategy instance in \'openid\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 2. Creates a new strategy instance. If ot fails, abort the test.
	let strategy
	try {
		strategy = new Strategy(openIdConfig)
	} catch (err) {
		strategy  = (() => null)(err)
	}

	if (!strategy)
		return

	const {
		client: { 
			id: clientId, 
			aud,
			secret: clientSecret, 
			user: { 
				id:userId, 
				username, 
				password,
				claimStubs
			}
		},
		altClient: { 
			id:altClientId, 
			secret:altClientSecret 
		}
	} = stub

	const { skip, only, showResults } = options

	// 3. Runs all the tests
	strategyTest({ openIdStrategy:strategy }, skipTest('strategy', skip, only), showResults)

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
	}, skipTest('introspect', skip, only), showResults)

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
	}, skipTest('token', skip, only), showResults)

	userinfoTest({
		clientId, 
		strategy, 
		user: { 
			username, 
			password
		},
		claimStubs
	}, skipTest('userinfo', skip, only), showResults)
}

/**
 * Unit tests a LoginSignup UserIn strategy. 
 * 
 * @param  {Class}		Strategy
 * @param  {Object}		config							Strategy's config. Use it in the Strategy's constructor.			
 * @param  {String}		stub.user.username				
 * @param  {String}		stub.user.password		
 * @param  {String}		stub.newUserPassword		
 * @param  {[String]}	options.skip					Valid values: 'all', 'strategy', 'login', 'signup'
 * @param  {[String]}	options.only					Valid values: 'strategy', 'login', 'signup'
 */
const testLoginSignup = (Strategy, config={}, stub={}, options={}) => {
	const loginSignupConfig = { ...config, modes:['loginsignup'] }

	const logTest = logTestErrors()

	// 1. Tests that the strategy is instantiable
	describe('Concrete loginsignup strategy', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const strategy = new Strategy(loginSignupConfig)
					voidFn(strategy)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create Strategy instance in \'loginsignup\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 2. Creates a new strategy instance. If ot fails, abort the test.
	let strategy
	try {
		strategy = new Strategy(loginSignupConfig)
	} catch (err) {
		strategy  = (() => null)(err)
	}

	if (!strategy)
		return

	const { user, newUserPassword } = stub
	const { skip, only, showResults } = options

	strategyTest({ loginSignupStrategy:strategy }, skipTest('strategy', skip, only), showResults)
	loginTest({ strategy, user }, skipTest('login', skip, only), showResults)
	signupTest({ newUserPassword, strategy, user }, skipTest('signup', skip, only), showResults)
}

/**
 * Unit tests a LoginSignupFIP UserIn strategy. 
 * 
 * @param  {Class}		Strategy
 * @param  {Object}		config							Strategy's config. Use it in the Strategy's constructor.			
 * @param  {String}		stub.user.username				
 * @param  {String}		stub.user.password	
 * @param  {String}		stub.newUserPassword
 * @param  {String}		stub.fipUser.id					ID of the user in the FIP (not the user ID on your system)
 * @param  {String}		stub.fipUser.fipName			e.g., 'facebook', 'google'
 * @param  {String}		stub.fipUser.userId				ID if the user on your system.
 * @param  {[String]}	options.skip					Valid values: 'all', 'strategy', 'login', 'signup', 'fiploginsignup'
 * @param  {[String]}	options.only					Valid values: 'strategy', 'login', 'signup', 'fiploginsignup'
 */
const testLoginSignupFIP = (Strategy, config={}, stub={}, options={}) => {
	const loginSignupConfig = { ...config, modes:['loginsignupfip'] }

	const logTest = logTestErrors()

	// 1. Tests that the strategy is instantiable
	describe('Concrete loginsignup strategy', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const strategy = new Strategy(loginSignupConfig)
					voidFn(strategy)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create Strategy instance in \'loginsignup\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 2. Creates a new strategy instance. If ot fails, abort the test.
	let strategy
	try {
		strategy = new Strategy(loginSignupConfig)
	} catch (err) {
		strategy  = (() => null)(err)
	}

	if (!strategy)
		return

	const { user, newUserPassword, fipUser } = stub
	const { skip, only, showResults } = options

	strategyTest({ loginSignupFipStrategy:strategy }, skipTest('strategy', skip, only), showResults)
	loginTest({ strategy, user }, skipTest('login', skip, only), showResults)
	signupTest({ newUserPassword, strategy, user }, skipTest('signup', skip, only), showResults)
	fipLoginSignupTest({
		strategy,
		identityProvider: fipUser.fipName, 
		identityProviderUserId: fipUser.id, 
		userId: fipUser.userId,
	}, skipTest('fiploginsignup', skip, only), showResults)
}

const testAll = (Strategy, config={}, stub={}, options={}) => {
	testOpenId(Strategy, config, stub, options)
	testLoginSignup(Strategy, config, stub, options)
	testLoginSignupFIP(Strategy, config, stub, options)
}

module.exports = {
	testOpenId,
	testLoginSignup,
	testLoginSignupFIP,
	testAll
}



