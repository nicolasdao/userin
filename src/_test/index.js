const { assert } = require('chai')
const fipLoginSignupTest = require('./fiploginsignup')
const introspectTest = require('./introspect')
const tokenTest = require('./token')
const userinfoTest = require('./userinfo')
const revokeTest = require('./revoke')
const loginTest = require('./login')
const signupTest = require('./signup')
const discoveryTest = require('./discovery')
const authorizeTest = require('./authorize')
const strategyTest = require('./Strategy')
const { logTestErrors } = require('./_core')
const UserIn = require('../UserIn.js')

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

const toggleTestMode = () => process.env.TEST_MODE = true

/**
 * Unit tests a LoginSignup UserIn strategy. 
 * 
 * @param  {Class}		Strategy
 * @param  {Object}		config							Strategy's config. Use it in the Strategy's constructor.			
 * @param  {String}		stub.user.username				
 * @param  {String}		stub.user.password		
 * @param  {String}		stub.newUserPassword		
 * @param  {[String]}	options.skip					Valid values: 'all', 'strategy', 'login', 'signup', 'token', 'discovery'
 * @param  {[String]}	options.only					Valid values: 'strategy', 'login', 'signup', 'token', 'discovery'
 */
const testLoginSignup = (Strategy, config={}, stub={}, options={}) => {
	toggleTestMode()
	const testSuiteName = 'loginsignup'
	const modes = ['loginsignup']
	const loginSignupConfig = { ...config, modes }

	const logTest = logTestErrors()

	describe('Validating the \'loginsignup\' test suite arguments', () => {
		it('Should provide a valid stub', () => {
			assert.isOk(stub.user, '01 - Missing required \'user\' stub object.')
			assert.isOk(stub.user.username, '02 - Missing required \'user.username\' stub.')
			assert.isOk(stub.user.password, '03 - Missing required \'user.password\' stub.')
			assert.isOk(stub.newUserPassword, '04 - Missing required \'newUserPassword\' stub.')
		})
	})

	// 1. Tests that the strategy is instantiable
	describe('loginsignup Strategy instance', () => {
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

	// 2. Tests that the strategy is instantiable
	describe('loginsignup UserIn instance', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const userIn = new UserIn({
						Strategy,
						modes,
						config
					})
					voidFn(userIn)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create UserIn instance in \'loginsignup\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 3. Creates strategy and userIn instances. If it fails, abort the test.
	let userIn
	try {
		userIn = new UserIn({
			Strategy,
			modes,
			config
		})
	} catch (err) {
		userIn  = (() => null)(err)
	}

	if (!userIn)
		return

	const { user, newUserPassword } = stub
	const { skip, only, showResults } = options
	
	const stdStub = { client: { user } }

	strategyTest({ loginSignupStrategy:userIn.strategy }, skipTest('strategy', skip, only), showResults)
	loginTest({ user, userIn }, skipTest('login', skip, only), showResults)
	signupTest({ newUserPassword, user, userIn }, skipTest('signup', skip, only), showResults)
	revokeTest({ testSuiteName, stub:stdStub, userIn }, skipTest('revoke', skip, only), showResults)
	discoveryTest({ testSuiteName, userIn }, skipTest('discovery', skip, only), showResults)
	tokenTest({ testSuiteName, stub: { client: { user } }, userIn }, skipTest('token', skip, only), showResults)
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
 * @param  {[String]}	options.skip					Valid values: 'all', 'strategy', 'login', 'signup', 'fiploginsignup', 'token', 'discovery'
 * @param  {[String]}	options.only					Valid values: 'strategy', 'login', 'signup', 'fiploginsignup', 'token', 'discovery'
 */
const testLoginSignupFIP = (Strategy, config={}, stub={}, options={}) => {
	toggleTestMode()
	const testSuiteName = 'loginsignupfip'
	const modes = ['loginsignupfip']
	const loginSignupConfig = { ...config, modes }

	const logTest = logTestErrors()

	describe('Validating the \'loginsignupfip\' test suite arguments', () => {
		it('Should provide a valid stub', () => {
			assert.isOk(stub.user, '01 - Missing required \'user\' stub object.')
			assert.isOk(stub.user.username, '02 - Missing required \'user.username\' stub.')
			assert.isOk(stub.user.password, '03 - Missing required \'user.password\' stub.')
			assert.isOk(stub.newUserPassword, '04 - Missing required \'newUserPassword\' stub.')
			assert.isOk(stub.fipUser, '05 - Missing required \'fipUser\' stub object.')
			assert.isOk(stub.fipUser.id, '06 - Missing required \'fipUser.id\' stub.')
			assert.isOk(stub.fipUser.fipName, '07 - Missing required \'fipUser.fipName\' stub.')
			assert.isOk(stub.fipUser.userId, '08 - Missing required \'fipUser.userId\' stub.')
		})
	})

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

	// 2. Tests that the strategy is instantiable
	describe('loginsignupfip UserIn instance', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const userIn = new UserIn({
						Strategy,
						modes,
						config
					})
					voidFn(userIn)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create UserIn instance in \'loginsignup\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 3. Creates strategy and userIn instances. If it fails, abort the test.
	let userIn
	try {
		userIn = new UserIn({
			Strategy,
			modes,
			config
		})
	} catch (err) {
		userIn  = (() => null)(err)
	}

	if (!userIn)
		return

	const { user, newUserPassword, fipUser } = stub
	const { skip, only, showResults } = options
	
	const stdStub = { client: { user } }

	strategyTest({ loginSignupFipStrategy:userIn.strategy }, skipTest('strategy', skip, only), showResults)
	loginTest({ user, userIn }, skipTest('login', skip, only), showResults)
	signupTest({ newUserPassword, userIn, user }, skipTest('signup', skip, only), showResults)
	fipLoginSignupTest({
		userIn,
		identityProvider: fipUser.fipName, 
		identityProviderUserId: fipUser.id, 
		userId: fipUser.userId,
	}, skipTest('fiploginsignup', skip, only), showResults)
	revokeTest({ testSuiteName, stub:stdStub, userIn }, skipTest('revoke', skip, only), showResults)
	discoveryTest({ testSuiteName, userIn }, skipTest('discovery', skip, only), showResults)
	tokenTest({ testSuiteName, stub: { client: { user } }, userIn }, skipTest('token', skip, only), showResults)
}

/**
 * Unit tests an OpenID UserIn strategy. 
 * 
 * @param  {Class}		Strategy
 * @param  {Object}		config									Strategy's config. Use it in the Strategy's constructor.
 * @param  {Object}		stub.client.id
 * @param  {String}		stub.client.secret
 * @param  {String}		stub.client.aud
 * @param  {Object}		stub.client.user.id
 * @param  {String}		stub.client.user.username
 * @param  {String}		stub.client.user.password
 * @param  {String}		stub.client.user.claimStubs[].scope		e.g., 'profile'
 * @param  {Object}		stub.client.user.claimStubs[].claims	e.g., { given_name: 'Nic', family_name: 'Dao' }
 * @param  {Object}		stub.altClient.id
 * @param  {String}		stub.altClient.secret
 * @param  {Object}		stub.privateClient.id
 * @param  {String}		stub.privateClient.secret	

 * @param  {[String]}	options.skip							Valid values: 'all', 'strategy', 'introspect', 'token', 'userinfo'
 * @param  {[String]}	options.only							Valid values: 'strategy', 'introspect', 'token', 'userinfo'
 * @param  {[String]}	options.showResults						e.g. ['introspect.handler.15,16', 'userinfo.handler.04']
 * 
 * @return {Void}
 */
const testOpenId = (Strategy, config={}, stub={}, options={}) => {
	toggleTestMode()
	const testSuiteName = 'openid'
	const modes = ['openid']
	const openIdConfig = { ...config, modes }

	const logTest = logTestErrors()

	describe('Validating the \'loginsignupfip\' test suite arguments', () => {
		it('Should provide a valid stub', () => {
			assert.isOk(stub.client, '01 - Missing required \'user\' stub object.')
			assert.isOk(stub.client.id, '02 - Missing required \'client.id\' stub.')
			assert.isOk(stub.client.secret, '03 - Missing required \'client.secret\' stub.')
			assert.isOk(stub.client.user, '04 - Missing required \'client.user\' stub.')
			assert.isOk(stub.client.user.id, '05 - Missing required \'client.user.id\' stub.')
			assert.isOk(stub.client.user.username, '06 - Missing required \'client.user.username\' stub.')
			assert.isOk(stub.client.user.password, '07 - Missing required \'client.user.password\' stub.')
			assert.isOk(stub.altClient, '08 - Missing required \'altClient\' stub.')
			assert.isOk(stub.altClient.id, '09 - Missing required \'altClient.id\' stub.')
			assert.isOk(stub.altClient.secret, '10 - Missing required \'altClient.secret\' stub.')
			assert.isOk(stub.privateClient, '11 - Missing required \'privateClient\' stub.')
			assert.isOk(stub.privateClient.id, '12 - Missing required \'privateClient.id\' stub.')
			assert.isOk(stub.privateClient.secret, '13 - Missing required \'privateClient.secret\' stub.')
		})
	})

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

	// 2. Tests that the strategy is instantiable
	describe('loginsignupfip UserIn instance', () => {
		it('Should create an instance when the valid params are provided', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				try {
					const userIn = new UserIn({
						Strategy,
						modes,
						config
					})
					voidFn(userIn)
					done()
				} catch(err) {
					logE.push([new Error('Failed to create UserIn instance in \'loginsignup\' mode'), err])
					throw err
				}
			}))
		})
	})

	// 3. Creates strategy and userIn instances. If it fails, abort the test.
	let userIn
	try {
		userIn = new UserIn({
			Strategy,
			modes,
			config
		})
	} catch (err) {
		userIn  = (() => null)(err)
	}

	if (!userIn)
		return

	const { skip, only, showResults } = options

	// 3. Runs all the tests
	strategyTest({ openIdStrategy:userIn.strategy }, skipTest('strategy', skip, only), showResults)

	introspectTest({ userIn, stub }, skipTest('introspect', skip, only), showResults)

	tokenTest({ testSuiteName, stub, userIn }, skipTest('token', skip, only), showResults)

	userinfoTest({ stub, userIn }, skipTest('userinfo', skip, only), showResults)

	revokeTest({ testSuiteName, userIn, stub }, skipTest('revoke', skip, only), showResults)
	discoveryTest({ testSuiteName, userIn }, skipTest('discovery', skip, only), showResults)
	authorizeTest({ userIn, stub }, skipTest('authorize', skip, only), showResults)
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



