const { co } = require('core-async')
const { assert } = require('chai')
const { handler:signupHandler } = require('../signup')
const eventRegister = require('../eventRegister')
const { logTestErrors, createShowTestResultFn } = require('./_core')

/**
 * Runs the test suites.
 * 
 * @param  {UserIn}		data.strategy
 * @param  {String}		data.user.password
 * @param  {String}		data.user.password
 * @param  {Boolean}	skip			
 *
 * @return {Void}
 */
module.exports = function runTest (data, skip, showResults) {
	const {
		user,
		newUserPassword,
		strategy
	} = data

	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const showIds = createShowTestResultFn(showResults, 'signup.handler')

	fn('signup', () => {
		describe('handler', () => {

			const payload = { ...user }

			it('01 - Should fail when the \'get_end_user\' event handler is not defined.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}

				logE.run(co(function *() {
					const [errors] = yield signupHandler(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_end_user\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'generate_access_token\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_end_user', strategy.get_end_user)

				logE.run(co(function *() {
					const [errors] = yield signupHandler(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the \'generate_refresh_token\' event handler is not defined and the scope contains \'offline_access\'.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_config', () => strategy.config)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
				registerEventHandler('get_end_user', strategy.get_end_user)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload,
						scope:'offline_access'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_refresh_token\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('04 - Should fail when the \'create_end_user\' event handler is not defined when the \'generate_refresh_token\' event handler is not defined but the scope did not include \'offline_access\'.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_config', () => strategy.config)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
				registerEventHandler('get_end_user', strategy.get_end_user)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload,
						username: null
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'create_end_user\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('05 - Should fail when the \'create_end_user\' event handler is not defined.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_config', () => strategy.config)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
				registerEventHandler('generate_refresh_token', strategy.generate_refresh_token)
				registerEventHandler('get_end_user', strategy.get_end_user)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload,
						scope:'offline_access'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'create_end_user\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('06 - Should fail when the username is missing.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload,
						username: null
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.username\'') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('07 - Should fail when the password is missing.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload,
						password: null
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.password\'') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('08 - Should fail when the username already exists.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield signupHandler({
						...payload
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf(`User ${user.username} already exists`) >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('09 - Should return an access_token when the username and password are provided and the username does not exist yet.', done => {
				const showResult = showIds('09')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield signupHandler({
						...payload,
						username: `${Date.now()}@unittest.com`,
						password: newUserPassword
					}, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.access_token, '03')
					assert.equal(result.token_type, 'bearer', '04')
					assert.isOk(result.expires_in, '05')
					assert.equal(result.expires_in, strategy.config.tokenExpiry.access_token, '06')
					assert.isNotOk(result.refresh_token, '07')

					if (showResult) console.log(result)
					done()
				}))
			})
			it('10 - Should return both an access_token and a refresh_token when the username and password are correct and the scope includes \'offline_access\'.', done => {
				const showResult = showIds('10')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield signupHandler({
						...payload,
						username: `${Date.now()+10000}@unittest.com`,
						password: newUserPassword,
						scope:'offline_access'
					}, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.access_token, '03')
					assert.equal(result.token_type, 'bearer', '04')
					assert.isOk(result.expires_in, '05')
					assert.equal(result.expires_in, strategy.config.tokenExpiry.access_token, '06')
					assert.isOk(result.refresh_token, '07')

					if (showResult) console.log(result)
					done()
				}))
			})
		})
	})
}




