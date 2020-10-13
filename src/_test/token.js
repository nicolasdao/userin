/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { co } = require('core-async')
const { error: { mergeErrors } } = require('puffy')
const jwt = require('jsonwebtoken')
const chai = require('chai')
const grantTypeAuthorizationCode = require('../token/grantTypeAuthorizationCode')
const grantTypeClientCredentials = require('../token/grantTypeClientCredentials')
const grantTypePassword = require('../token/grantTypePassword')
const grantTypeRefreshToken = require('../token/grantTypeRefreshToken')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn, getUserInServer } = require('./_core')
const { assert } = chai
setUpScopeAssertion(assert)

/**
 * Runs the test suites.
 * 
 * @param  {UserIn}		data.userIn
 * @param  {String}		data.user.password
 * @param  {String}		data.user.password
 * @param  {Boolean}	skip			
 *
 * @return {Void}
 */
module.exports = function runTest (data, skip, showResults) {
	const { testSuiteName, userIn, stub: { client={}, altClient={}, privateClient={} } } = data || {}
	client.user = client.user || {}

	const strategy = userIn.strategy
	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const { modes=[], version='v1', tokenExpiry:{ access_token:accessTokenExpiresIn } } = userIn.config || {}

	const isLoginSignupMode = modes.indexOf('loginsignup') >= 0
	const isLoginSignupFipMode = modes.indexOf('loginsignupfip') >= 0
	const isOpenIdMode = modes.indexOf('openid') >= 0

	const invalidCode = 'K83jeqF/YnKXPvyz'
	const invalidRefreshToken = 'Bdbbxkstyvt7t67rt7v32dvouv'
	const notAllowedScope = 'K83jeqFYnKXPvyz'
	const invalidClientId = 'K83jeqFYnKXPvyz'
	const nonce = 'FqF2DNdNpqJh0iBMyxC7rOGRf6ell.t4'
	const codeChallengeS256 = 'qjrzSW9gMiUgpUvqgEPE4_-8swvyCtfOVvg55o5S_es'
	const codeVerifier = 'M25iVXpKU3puUjFaYWg3T1NDTDQtcW1ROUY5YXlwalNoc0hhakxifmZHag'
	const redirectUri = 'https://userin.com/authorization'
	
	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const getRefreshToken = (eventHandlerStore, scopes, client_id, user_id) => co(function *() {
		const [errors, codeResult] = yield eventHandlerStore.generate_openid_refresh_token.exec({
			client_id,
			user_id, 
			scopes
		})

		if (errors)
			throw mergeErrors(errors)
		
		const { token } = codeResult
		return token
	})

	const redirect_uri = 'https://userin.com'

	const getAuthorizationCode = (eventHandlerStore, scopes, client_id, user_id) => co(function *() {
		const [errors, codeResult] = yield eventHandlerStore.generate_openid_authorization_code.exec({
			client_id,
			user_id, 
			scopes,
			redirect_uri
		})

		if (errors)
			throw mergeErrors(errors)
		
		const { token } = codeResult
		return token
	})

	fn(`token[${testSuiteName}]`, () => {
		describe('stub_validation', () => {
			it('01 - Should define some specific loginsignup and loginsignupfip stub values', () => {
				assert.isOk(client.user.id, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.user.id'`)
				assert.isOk(client.user.username, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.user.username'`)
				assert.isOk(client.user.password, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.user.password'`)
			})
			if (isOpenIdMode)
				it('02 - Should define some specific openid stub values', () => {
					assert.isOk(client.id, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.id'`)
					assert.isOk(client.secret, `02 - revoke Test suite in ${testSuiteName} mode require stub 'client.secret'`)
					assert.isOk(altClient.id, `03 - revoke Test suite in ${testSuiteName} mode require stub 'altClient.id'`)
					assert.isOk(privateClient.id, `04 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.id'`)
					assert.isOk(privateClient.secret, `05 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.secret'`)
					assert.isOk(privateClient.user.id, `06 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.user.id'`)
					assert.isOk(privateClient.user.username, `06 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.user.username'`)
					assert.isOk(privateClient.user.password, `06 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.user.password'`)
				})
		})

		if (isOpenIdMode || isLoginSignupFipMode) {
			describe('grantTypeAuthorizationCode', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}].grantTypeAuthorizationCode`)
				
				const stubbedClient = { client_id: client.id, client_secret:client.secret }
				const stubbedUser = { user_id:client.user.id }
				const stubbedPayload = { 
					...stubbedClient, 
					...stubbedUser, 
					code:invalidCode,
					redirect_uri: redirectUri
				}

				it('01 - Should fail when the \'get_authorization_code_claims\' event handler is not defined', done => {
					const showResult = showIds('01')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					logE.run(co(function *() {
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
						
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_authorization_code_claims\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('02 - Should fail when the \'generate_access_token\' event handler is not defined', done => {
					const showResult = showIds('02')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_authorization_code_claims) registerEventHandler('get_authorization_code_claims', strategy.get_authorization_code_claims)
					logE.run(co(function *() {
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
						
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('03 - Should fail when the \'get_config\' event handler is not defined', done => {
					const showResult = showIds('03')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_authorization_code_claims) registerEventHandler('get_authorization_code_claims', strategy.get_authorization_code_claims)
					if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
					logE.run(co(function *() {
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
						
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('04 - Should fail when the code is missing', done => {
					const showResult = showIds('04')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'], redirect_uri: redirectUri }

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:null
						})
						
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'code\'') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('05 - Should fail when the redirect_uri is not passed with the code', done => {
					const showResult = showIds('05')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(stubbedPayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							redirect_uri:null
						})
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'redirect_uri\'') >= 0), '05')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('06 - Should fail when the redirect_uri is passed with the code but it does not exactly match the redirect_uri used to get the code', done => {
					const showResult = showIds('06')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(stubbedPayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							redirect_uri: 'https://dangerous.com'
						})
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('The \'redirect_uri\' does not match the redirect_uri used in the authorization request') >= 0), '05')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('07 - Should fail when the code is incorrect', done => {
					const showResult = showIds('07')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:invalidCode })
						
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid authorization code') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})

				if (isOpenIdMode) {
					it('08 - Should fail when the \'get_client\' event handler is not defined', done => {
						const showResult = showIds('08')
						const logE = logTest(done)
						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)
						eventHandlerStore.get_client = null

						const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'], redirect_uri: redirectUri }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')

							const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
								...stubbedPayload, 
								code:codeResults.token, 
								client_id:null 
							})

							logE.push(errors)
							assert.isOk(errors, '01')
							assert.isOk(errors.length, '02')
							assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
							
							if (showResult) console.log(errors)
							done()
						}))
					})
					it('09 - Should fail when the client_id is missing', done => {
						const showResult = showIds('09')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'], redirect_uri: redirectUri }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
								...stubbedPayload, 
								code:codeResults.token, 
								client_id:null 
							})
							
							logE.push(errors)
							assert.isOk(errors, '01')
							assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '02')

							if (showResult) console.log(errors)
							done()
						}))
					})
					it('10 - Should fail when the client_id is incorrect', done => {
						const showResult = showIds('10')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'], redirect_uri: redirectUri }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')

							const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
								...stubbedPayload, 
								code:codeResults.token, 
								client_id:'sbaug67437e93279ce27' 
							})
							
							logE.push(errors)
							assert.isOk(errors, '01')
							assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

							if (showResult) console.log(errors)
							done()
						}))
					})
					it('11 - Should fail when the client_id exists and the code is correct but the client_id not the one associated with the code', done => {
						const showResult = showIds('11')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'], redirect_uri: redirectUri }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
								...stubbedPayload, 
								code:codeResults.token, 
								client_id:altClient.id 
							})
							
							logE.push(errors)
							assert.isOk(errors, '01')
							assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

							if (showResult) console.log(errors)
							done()
						}))
					})
					it('12 - Should fail when a valid code and client_id are passed, but the code\'scopes contain \'openid\' and the \'generate_id_token\' event handler is missing', done => {
						const showResult = showIds('12')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)
						eventHandlerStore.generate_id_token = null

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
								...stubbedPayload,
								scopes:['openid']
							})
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
							
							logE.push(errors)	
							assert.isOk(errors, '04')
							assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_id_token\' handler') >= 0), '05')

							if (showResult) console.log(errors)
							done()
						}))
					})
				}

				it('13 - Should fail when a valid a valid code and client_id are passed, but the code\'scopes contain \'offline_access\' and the \'generate_refresh_token\' event handler is missing', done => {
					const showResult = showIds('13')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					eventHandlerStore.generate_refresh_token = null

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							scopes:['offline_access']
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_refresh_token\' handler') >= 0), '05')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('14 - Should fail when the code has expired', done => {
					const showResult = showIds('14')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					const registerEventHandler = eventRegister(eventHandlerStore)
					registerEventHandler('get_config', (root) => {
						const clone = JSON.parse(JSON.stringify(root))
						clone.tokenExpiry.code = -1000
						return clone
					})

					const codePayload = { ...stubbedPayload, scopes:['openid', 'offline_access'] }

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')

						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
						
						logE.push(errors)
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Token or code has expired') >= 0), '05')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('15 - Should return an access_token when the code is valid', done => {
					const showResult = showIds('15')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(stubbedPayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
						
						logE.push(errors)	
						assert.isNotOk(errors, '04')
						assert.isOk(result, '05')
						assert.isOk(result.access_token, '06')
						assert.equal(result.token_type, 'bearer', '07')
						assert.equal(result.expires_in, accessTokenExpiresIn, '08')
						assert.isNotOk(result.id_token, '09')
						assert.isNotOk(result.refresh_token, '10')

						if (showResult) console.log(result)
						done()
					}))
				})

				if (isOpenIdMode) {
					it('16 - Should return an access_token and a valid id_token when the code is valid and the scopes include \'openid\'', done => {
						const showResult = showIds('16')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid'] }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
							
							logE.push(errors)	
							assert.isNotOk(errors, '04')
							assert.isOk(result, '05')
							assert.isOk(result.access_token, '06')
							assert.equal(result.token_type, 'bearer', '07')
							assert.equal(result.expires_in, accessTokenExpiresIn, '08')
							assert.isOk(result.id_token, '09')
							assert.isNotOk(result.refresh_token, '10')

							const claims = jwt.decode(result.id_token)
							assert.isOk(claims, '11')
							assert.equal(claims.iss, strategy.config.iss, '12')
							assert.equal(claims.sub, client.user.id, '13')
							assert.isOk(claims.aud != undefined, '14')
							assert.equal(claims.client_id, client.id, '15')
							assert.scopes(claims.scope, ['openid'], 15)
							assert.isOk(claims.exp != undefined, '18')
							assert.isOk(claims.iat != undefined, '19')
							assert.scopes(result.scope, ['openid'], 20)

							if (showResult) {
								console.log(result)
								console.log(claims)
							}
							done()
						}))
					})
					it('17 - Should return an access_token, an id_token and a refresh_token when the code is valid and the scopes include \'openid\' and \'offline_access\'', done => {
						const showResult = showIds('17')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid', 'offline_access'] }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
						
							logE.push(errors)
							assert.isNotOk(errors, '04')
							assert.isOk(result, '05')
							assert.isOk(result.access_token, '06')
							assert.equal(result.token_type, 'bearer', '07')
							assert.equal(result.expires_in, accessTokenExpiresIn, '08')
							assert.isOk(result.id_token, '09')
							assert.isOk(result.refresh_token, '10')
							assert.isOk(result.scope, '11')
							assert.isOk(result.scope.indexOf('openid') >= 0, '12 - result.scope should contain \'openid\'')
							assert.isOk(result.scope.indexOf('offline_access') >= 0, '13 - result.scope should contain \'offline_access\'')

							if (showResult) console.log(result)
							done()
						}))
					})
				}

				it('18 - Should fail when a code_challenge is passed without the code_challenge_method', done => {
					const showResult = showIds('18')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256
						})
						logE.push(codeErrors)

						assert.isOk(codeErrors, '01')
						assert.isOk(codeErrors.some(e => e.message && e.message.indexOf('\'code_challenge_method\' is required') >= 0), '02')

						if (showResult) console.log(codeErrors)
						done()
					}))
				})
				it('19 - Should fail when a code_challenge is passed with a non-supported code_challenge_method', done => {
					const showResult = showIds('19')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256,
							code_challenge_method: 'dcewdew'
						})
						logE.push(codeErrors)

						assert.isOk(codeErrors, '01')
						assert.isOk(codeErrors.some(e => e.message && e.message.indexOf('code_challenge_method \'dcewdew\' is not a supported OpenID standard') >= 0), '02')

						if (showResult) console.log(codeErrors)
						done()
					}))
				})
				it('20 - Should fail even though the code is valid when a code_challenge is required and no code_verifier is provided', done => {
					const showResult = showIds('20')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256,
							code_challenge_method: 'S256'
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token 
						})
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'code_verifier\'') >= 0), '05')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('21 - Should fail even though the code is valid when a code_challenge is required and the code_verifier is incorrect', done => {
					const showResult = showIds('21')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256,
							code_challenge_method: 'S256'
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							code_verifier: '12345'
						})
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid \'code_verifier\'') >= 0), '05')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('22 - Should fail even though the code is valid when a code_challenge is required and the code_challenge is not using the correct method (plain vs S256)', done => {
					const showResult = showIds('22')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256,
							code_challenge_method: 'plain'
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							code_verifier: codeVerifier
						})
						
						logE.push(errors)	
						assert.isOk(errors, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid \'code_verifier\'') >= 0), '05')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('23 - Should return an access_token when both the code and the S256 code_verifier are valid', done => {
					const showResult = showIds('23')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeChallengeS256,
							code_challenge_method: 'S256'
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							code_verifier: codeVerifier
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '04')
						assert.isOk(result, '05')
						assert.isOk(result.access_token, '06')
						assert.equal(result.token_type, 'bearer', '07')
						assert.equal(result.expires_in, accessTokenExpiresIn, '08')
						assert.isNotOk(result.id_token, '09')
						assert.isNotOk(result.refresh_token, '10')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('24 - Should return an access_token when both the code and the plain code_verifier are valid', done => {
					const showResult = showIds('24')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec({
							...stubbedPayload,
							code_challenge: codeVerifier,
							code_challenge_method: 'plain'
						})
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
							...stubbedPayload, 
							code:codeResults.token,
							code_verifier: codeVerifier
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '04')
						assert.isOk(result, '05')
						assert.isOk(result.access_token, '06')
						assert.equal(result.token_type, 'bearer', '07')
						assert.equal(result.expires_in, accessTokenExpiresIn, '08')
						assert.isNotOk(result.id_token, '09')
						assert.isNotOk(result.refresh_token, '10')

						if (showResult) console.log(result)
						done()
					}))
				})

				if (isOpenIdMode)
					it('25 - Should return a valid id_token with a nonce claim when the code is valid and the scopes include \'openid\' and a nonce was passed in the authorization request', done => {
						const showResult = showIds('25')
						const logE = logTest(done)

						const eventHandlerStore = {}
						registerAllHandlers(eventHandlerStore)

						const codePayload = { ...stubbedPayload, scopes:['openid'], nonce }

						logE.run(co(function *() {
							const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
							logE.push(codeErrors)

							assert.isNotOk(codeErrors, '01')
							assert.isOk(codeResults, '02')
							assert.isOk(codeResults.token, '03')
							
							const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
								...stubbedPayload, 
								code:codeResults.token
							})
							
							logE.push(errors)	
							assert.isNotOk(errors, '04')
							assert.isOk(result, '05')
							assert.isOk(result.access_token, '06')
							assert.equal(result.token_type, 'bearer', '07')
							assert.equal(result.expires_in, accessTokenExpiresIn, '08')
							assert.isOk(result.id_token, '09')
							assert.isNotOk(result.refresh_token, '10')

							const claims = jwt.decode(result.id_token)
							assert.isOk(claims, '11')
							assert.equal(claims.iss, strategy.config.iss, '12')
							assert.equal(claims.sub, client.user.id, '13')
							assert.isOk(claims.aud != undefined, '14')
							assert.equal(claims.client_id, client.id, '15')
							assert.scopes(claims.scope, ['openid'], 15)
							assert.isOk(claims.exp != undefined, '18')
							assert.isOk(claims.iat != undefined, '19')
							assert.scopes(result.scope, ['openid'], 20)
							assert.equal(claims.nonce, nonce, '21')

							if (showResult) {
								console.log(result)
								console.log(claims)
							}
							done()
						}))
					})


				it('26 - Should return an access_token and a refresh_token when the code is valid and the scopes include \'offline_access\'', done => {
					const showResult = showIds('17')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					const codePayload = { ...stubbedPayload, scopes:['offline_access'] }

					logE.run(co(function *() {
						const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
						logE.push(codeErrors)

						assert.isNotOk(codeErrors, '01')
						assert.isOk(codeResults, '02')
						assert.isOk(codeResults.token, '03')
						
						const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
					
						logE.push(errors)
						assert.isNotOk(errors, '04')
						assert.isOk(result, '05')
						assert.isOk(result.access_token, '06')
						assert.equal(result.token_type, 'bearer', '07')
						assert.equal(result.expires_in, accessTokenExpiresIn, '08')
						assert.isNotOk(result.id_token, '09')
						assert.isOk(result.refresh_token, '10')
						assert.isOk(result.scope, '11')
						assert.isOk(result.scope.indexOf('offline_access') >= 0, '13 - result.scope should contain \'offline_access\'')

						if (showResult) console.log(result)
						done()
					}))
				})
			})
		}

		if (isOpenIdMode) {
			describe('grantTypeClientCredentials', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}].grantTypeClientCredentials`)
				
				const stubbedClient = { client_id:client.id, client_secret:client.secret, scopes:['profile'] }

				it('01 - Should fail when the \'get_client\' event handler is not defined', done => {
					const showResult = showIds('01')
					const logE = logTest(done)
					const eventHandlerStore = {}
					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedClient)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('02 - Should fail when the \'generate_access_token\' event handler is not defined', done => {
					const showResult = showIds('02')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedClient)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('03 - Should fail when the \'get_config\' event handler is not defined', done => {
					const showResult = showIds('03')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedClient)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('04 - Should return an access_token when the credentials are valid', done => {
					const showResult = showIds('04')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedClient)
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('05 - Should fail when the client_id is missing', done => {
					const showResult = showIds('05')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
							...stubbedClient,
							client_id:null
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('06 - Should fail when the client_secret is missing', done => {
					const showResult = showIds('06')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
							...stubbedClient,
							client_secret:null
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('07 - Should fail when the scopes are not allowed', done => {
					const showResult = showIds('07')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
							...stubbedClient,
							scopes:[notAllowedScope]
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf(`Access to scope ${notAllowedScope} is not allowed`) >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('08 - Should fail when the client_id is incorrect', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
							...stubbedClient,
							client_id:invalidClientId
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('\'client_id\' not found') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('09 - Should fail when the client_secret is incorrect', done => {
					const showResult = showIds('09')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
							...stubbedClient,
							client_secret:invalidClientId
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('client_id not found') >= 0), '02')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('10 - Should not return an id_token when the credentials are valid even when the \'openid\' scope is provided', done => {
					const showResult = showIds('10')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
							...stubbedClient,
							scopes:['openid']
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('11 - Should not return a refresh_token when the credentials are valid even when the \'offline_access\' scope is provided', done => {
					const showResult = showIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
							...stubbedClient,
							scopes:['openid', 'offline_access']
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) console.log(result)
						done()
					}))
				})
			})
		}

		if (isOpenIdMode)
			describe('grantTypePassword', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}].grantTypePassword`)
				
				const stubbedUser = { 
					client_id:client.id, 
					user: client.user, 
					scopes:[]
				}

				it('01 - Should fail when the \'get_client\' event handler is not defined', done => {
					const showResult = showIds('01')
					const logE = logTest(done)
					const eventHandlerStore = {}
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('02 - Should fail when the \'get_end_user\' event handler is not defined', done => {
					const showResult = showIds('02')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_end_user\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('03 - Should fail when the \'generate_access_token\' event handler is not defined', done => {
					const showResult = showIds('03')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_end_user) registerEventHandler('get_end_user', strategy.get_end_user)
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('04 - Should fail when the scopes include \'openid\' and the \'generate_id_token\' event handler is not defined', done => {
					const showResult = showIds('04')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_end_user) registerEventHandler('get_end_user', strategy.get_end_user)
					if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes:['openid']
						})
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_id_token\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('05 - Should not fail because of the missing \'generate_id_token\' event handler when the scopes DOES NOT include \'openid\'', done => {
					const showResult = showIds('05')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_end_user) registerEventHandler('get_end_user', strategy.get_end_user)
					if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser
						})
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('06 - Should fail when the \'get_config\' event handler is not defined', done => {
					const showResult = showIds('06')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					if (strategy.get_end_user) registerEventHandler('get_end_user', strategy.get_end_user)
					if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('07 - Should return an access_token when the username and password are valid', done => {
					const showResult = showIds('07')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) console.log(result)
						done()
					}))
				})
				it('08 - Should return an access_token and a valid id_token when the username and password are valid and the scopes contain \'openid\'', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid']
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '11')
						assert.equal(claims.sub, client.user.id, '12')
						assert.isOk(claims.aud != undefined, '13')
						assert.equal(claims.client_id, client.id, '14')
						assert.scopes(claims.scope, ['openid'], 15)
						assert.isOk(claims.exp != undefined, '17')
						assert.isOk(claims.iat != undefined, '18')
						assert.scopes(result.scope, ['openid'], 19)
						
						if (showResult) {
							console.log(result)
							console.log(claims)
						}
						done()
					}))
				})
				it('09 - Should not return a refresh_token when the username and password are valid and the scopes contain \'offline_access\'', done => {
					const showResult = showIds('09')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access']
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '11')
						assert.equal(claims.sub, client.user.id, '12')
						assert.isOk(claims.aud != undefined, '13')
						assert.equal(claims.client_id, client.id, '14')
						assert.isOk(claims.exp != undefined, '16')
						assert.isOk(claims.iat != undefined, '17')

						if (showResult) {
							console.log(result)
							console.log(claims)
						}
						done()
					}))
				})
				it('10 - Should fail when the client_id is missing', done => {
					const showResult = showIds('10')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
							client_id: null
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('11 - Should fail when the user is missing', done => {
					const showResult = showIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
							user: null
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user\'') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('12 - Should fail when the user.username is missing', done => {
					const showResult = showIds('12')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
							user: {
								username:null,
								password:123
							}
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.username\'') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('13 - Should fail when the user.password is missing', done => {
					const showResult = showIds('13')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
							user: {
								username:123,
								password:null
							}
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.password\'') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('14 - Should fail when the username and password are incorrect', done => {
					const showResult = showIds('14')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
							user: {
								username:stubbedUser.user.username,
								password:invalidClientId
							}
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Incorrect username or password') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('15 - Should fail when scopes are not allowed', done => {
					const showResult = showIds('15')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							scopes: [...stubbedUser.scopes, 'openid', invalidClientId]
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf(`Access to scope ${invalidClientId} is not allowed`) >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('16 - Should fail when the client_id and client_secret are from an unauthorized account', done => {
					const showResult = showIds('16')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
							...stubbedUser,
							client_id: altClient.id
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid client_id') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
			})

		describe('grantTypeRefreshToken', () => {
			const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}].grantTypeRefreshToken`)
			
			const stubbedPayload = { 
				client_id:client.id
			}

			it('01 - Should fail when the \'get_refresh_token_claims\' event handler is not defined', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_refresh_token_claims\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'generate_access_token\' event handler is not defined', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				if (strategy.get_refresh_token_claims) registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)
				if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the \'get_config\' event handler is not defined', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				if (strategy.get_refresh_token_claims) registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)
				if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
				if (strategy.generate_access_token) registerEventHandler('generate_access_token', strategy.generate_access_token)
				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})	
			it('04 - Should fail when the refresh_token is missing', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
						...stubbedPayload
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'refresh_token\'') >= 0), '03')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('05 - Should fail when the refresh_token is incorrect', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
						...stubbedPayload,
						refresh_token:invalidRefreshToken
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '03')

					if (showResult) console.log(errors)
					done()
				}))
			})

			if (isOpenIdMode) {
				it('06 - Should fail when the \'get_client\' event handler is not defined and the refresh_token is associated with a client_id', done => {
					const showResult = showIds('06')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					eventHandlerStore.get_client = null
					
					logE.run(co(function *() {
						const refresh_token = yield getRefreshToken(eventHandlerStore, ['offline_access'], client.id, client.user.id)
						const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
							...stubbedPayload,
							refresh_token
						})
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('07 - Should fail when the client_id is missing', done => {
					const showResult = showIds('07')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const refresh_token = yield getRefreshToken(eventHandlerStore, ['offline_access', 'openid'], client.id, client.user.id)
						const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
							...stubbedPayload,
							refresh_token,
							client_id:null
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('08 - Should fail when the client_id is valid, the refresh_token is also valid, but the client_id is not the one associated with the refresh_token', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const refresh_token = yield getRefreshToken(eventHandlerStore, ['offline_access', 'openid'], client.id, client.user.id)
						const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
							...stubbedPayload,
							refresh_token,
							client_id:altClient.id
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('09 - Should fail when the refresh_token is associated with a \'openid\' scope, but the  \'generate_id_token\' event handler is missing', done => {
					const showResult = showIds('09')
					const logE = logTest(done)

					const codeEventHandlerStore = {}
					registerAllHandlers(codeEventHandlerStore)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					eventHandlerStore.generate_id_token = null

					logE.run(co(function *() {
						const refresh_token = yield getRefreshToken(codeEventHandlerStore, ['offline_access', 'openid'], client.id, client.user.id)
						const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
							...stubbedPayload,
							refresh_token
						})
							
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_id_token\' handler') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
			}

			it('10 - Should return an access_token when a valid refresh_token is provided', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const refresh_token = yield getRefreshToken(eventHandlerStore, ['offline_access'], null, client.user.id)
					const [errors, result] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
						...stubbedPayload,
						refresh_token
					})
					
					logE.push(errors)	
					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.access_token, '03')
					assert.equal(result.token_type, 'bearer', '04')
					assert.equal(result.expires_in, accessTokenExpiresIn, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')
					assert.isOk(result.scope, '08')
					assert.isOk(result.scope.indexOf('offline_access') >= 0, '09 - result.scope should contain \'offline_access\'')

					if (showResult) console.log(result)
					done()
				}))
			})

			if (isOpenIdMode)
				it('11 - Should return an access_token and a valid id_token when a valid refresh_token is provided and the scopes contain \'openid\'', done => {
					const showResult = showIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const refresh_token = yield getRefreshToken(eventHandlerStore, ['offline_access', 'openid'], client.id, client.user.id)
						const [errors, result] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
							...stubbedPayload,
							refresh_token
						})
						
						logE.push(errors)	
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, accessTokenExpiresIn, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '09')
						assert.equal(claims.sub, client.user.id, '10')
						assert.isOk(claims.aud != undefined, '11')
						assert.equal(claims.client_id, client.id, '12')
						assert.scopes(claims.scope, ['openid', 'offline_access'], 13)
						assert.isOk(claims.exp != undefined, '16')
						assert.isOk(claims.iat != undefined, '17')
						assert.scopes(result.scope, ['openid', 'offline_access'], 18)

						if (showResult) {
							console.log(result)
							console.log(claims)
						}
						done()
					}))
				})
		})

		describe('/token', () => {	
			const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}]/token`)		

			it('01 - Should fail when no grant_type is provided', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'grant_type\'', '03')					

					server.close()
					done()
				}))
			})

			describe('grant_type:refresh_token', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}]/token.grant_type:refresh_token`)	

				it('01 - Should fail when no refresh_token is provided', done => {
					const showResult = showIds('01')
					const logE = logTest(done)

					logE.run(co(function *() {
						const { server, app } = yield getUserInServer(userIn)
						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type:'refresh_token'
						})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 400, '01')
						assert.equal(body.error, 'invalid_request','02')
						assert.include(body.error_description, '\'refresh_token\' is required', '03')					

						server.close()
						done()
					}))
				})

				it('02 - Should fail when when an invalid refresh_token is provided', done => {
					const showResult = showIds('02')
					const logE = logTest(done)

					logE.run(co(function *() {
						const { server, app } = yield getUserInServer(userIn)
						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: '1'
						})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 403, '01')
						assert.equal(body.error, 'invalid_token', '02')
						assert.include(body.error_description, 'Invalid refresh_token', '03')					

						server.close()
						done()
					}))
				})

				if (isLoginSignupMode || isLoginSignupFipMode) {
					const mode = isLoginSignupMode ? 'loginsignup' : 'loginsignupfip'

					it(`03 - Should return an access_token when a valid refresh_token is provided with no 'client_id' in '${mode}' mode.`, done => {
						const showResult = showIds('03')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore, [], null, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')
							assert.equal(body.expires_in, userIn.config.tokenExpiry.access_token, '03')					

							server.close()
							done()
						}))
					})
				}

				if (isOpenIdMode) {
					it('03 - Should fail when client_id is missing and a valid refresh_token associated with a client_id is provided', done => {
						const showResult = showIds('03')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], client.id, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '02')
							assert.equal(body.error, 'invalid_request','03')
							assert.include(body.error_description, 'Missing required \'client_id\'', '04')					

							server.close()
							done()
						}))
					})
					it('04 - Should fail when the client_id is invalid and a valid refresh_token associated with a client_id is provided', done => {
						const showResult = showIds('04')
						const logE = logTest(done)

						logE.run(co(function *() {
							assert.isOk(altClient.id, '02 - To test this assertion, a altClientId must be provided.')
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], client.id, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token,
								client_id: altClient.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 401, '02')
							assert.equal(body.error, 'invalid_client','03')
							assert.include(body.error_description, 'Unauthorized access', '04')					

							server.close()
							done()
						}))
					})
					it('05 - Should return an access_token when a valid refresh_token associated with a client_id is provided with a valid \'client_id\'', done => {
						const showResult = showIds('05')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], client.id, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token,
								client_id:client.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')
							assert.equal(body.expires_in, userIn.config.tokenExpiry.access_token, '03')					

							server.close()
							done()
						}))
					})
					it('06 - Should fail when the client_secret is missing and the grant_type is \'refresh_token\', a valid access_token and client_id are provided and the client\'s auth_methods contains \'client_secret_post\'', done => {
						const showResult = showIds('01')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token,
								client_id:privateClient.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.isOk(body.error, 'invalid_request','02')
							assert.include(body.error_description, 'Missing required \'client_secret\'', '03')					

							server.close()
							done()
						}))
					})
					it('07 - Should fail when an invalid client_secret is provided and when a valid refresh_token, client_id and client_secret are provided and the client\'s auth_methods contains \'client_secret_post\'', done => {
						const showResult = showIds('07')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token,
								client_id:privateClient.id,
								client_secret: privateClient.secret + '123'
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 401, '01')
							assert.equal(body.error, 'invalid_client','02')
							assert.include(body.error_description, 'client_id not found', '03')					

							server.close()
							done()
						}))
					})
					it('08 - Should return an access_token when a valid refresh_token, client_id and client_secret are provided and the client\'s auth_methods contains \'client_secret_post\'', done => {
						const showResult = showIds('08')
						const logE = logTest(done)

						logE.run(co(function *() {
							const refresh_token = yield getRefreshToken(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'refresh_token',
								refresh_token,
								client_id:privateClient.id,
								client_secret: privateClient.secret
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')
							assert.equal(body.expires_in, userIn.config.tokenExpiry.access_token, '03')					

							server.close()
							done()
						}))
					})
				}
			})
			
			describe('grant_type:authorize_code', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}]/token.grant_type:authorize_code`)	

				if (isLoginSignupFipMode || isOpenIdMode) {
					it('01 - Should fail when the code is missing', done => {
						const showResult = showIds('01')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code'
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, '\'code\' is required', '03')					

							server.close()
							done()
						}))
					})
					it('02 - Should fail when the redirect_uri is missing', done => {
						const showResult = showIds('02')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], null, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, 'Missing required \'redirect_uri\'', '03')					

							server.close()
							done()
						}))
					})
				}

				if (isLoginSignupFipMode) {
					it('03 - Should return an access_token when no client_id is provided and a valid code and redirect_uri are provided when the code is not associated with a client_id', done => {
						const showResult = showIds('03')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], null, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token,'02')

							server.close()
							done()
						}))
					})
				}

				if (isOpenIdMode) {
					it('03 - Should fail when the client_id is missing and a valid code and redirect_uri are provided when the code is associated with a client_id', done => {
						const showResult = showIds('03')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], client.id, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, ' Missing required \'client_id\'','02')

							server.close()
							done()
						}))
					})
					it('04 - Should return an access_token when a valid code, redirect_uri and client_id are provided when the code is associated with a client_id', done => {
						const showResult = showIds('04')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], client.id, client.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri,
								client_id: client.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')

							server.close()
							done()
						}))
					})
					it('05 - Should fail when the client_secret is missing when a valid code, redirect_uri and client_id are provided when the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('05')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri,
								client_id: privateClient.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, 'Missing required \'client_secret\'','03')

							server.close()
							done()
						}))
					})
					it('06 - Should fail when the client_secret is invalid when a valid code, redirect_uri and client_id are provided when the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('06')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri,
								client_id: privateClient.id,
								client_secret: privateClient.secret + '123'
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 401, '01')
							assert.equal(body.error, 'invalid_client','02')
							assert.include(body.error_description, 'client_id not found','03')

							server.close()
							done()
						}))
					})
					it('07 - Should return an access_token when a valid code, redirect_uri, client_id and client_secret are provided when the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('07')
						const logE = logTest(done)

						logE.run(co(function *() {
							const code = yield getAuthorizationCode(userIn.eventHandlerStore,[], privateClient.id, privateClient.user.id)
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'authorization_code',
								code,
								redirect_uri,
								client_id: privateClient.id,
								client_secret: privateClient.secret
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token,'02')

							server.close()
							done()
						}))
					})
				}
			})
			
			describe('grant_type:password', () => {
				const showIds = createShowTestResultFn(showResults, `token[${testSuiteName}]/token.grant_type:password`)	

				if (isOpenIdMode) {
					it('01 - Should fail when the client_id is missing', done => {
						const showResult = showIds('01')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password'
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, '\'client_id\' is required','02')

							server.close()
							done()
						}))
					})
					it('02 - Should fail when the username is missing', done => {
						const showResult = showIds('02')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: client.id
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, 'When grant_type is \'password\' both \'username\' and \'password\' are required','02')

							server.close()
							done()
						}))
					})
					it('03 - Should fail when the password is missing', done => {
						const showResult = showIds('03')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: client.id,
								username: client.user.username
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request','02')
							assert.include(body.error_description, 'When grant_type is \'password\' both \'username\' and \'password\' are required','02')

							server.close()
							done()
						}))
					})
					it('04 - Should fail when the username and password are incorrect', done => {
						const showResult = showIds('04')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: client.id,
								username: client.user.username,
								password: client.user.password + '123'
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 401, '01')
							assert.equal(body.error, 'invalid_credentials','02')
							assert.include(body.error_description, 'Incorrect username or password','02')

							server.close()
							done()
						}))
					})
					it('05 - Should return an access_token when a valid client_id, and valid credentials are provided', done => {
						const showResult = showIds('05')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: client.id,
								username: client.user.username,
								password: client.user.password
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')

							server.close()
							done()
						}))
					})
					it('06 - Should fail when client_secret is missing and a valid client_id, and valid credentials are provided but the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('06')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: privateClient.id,
								username: privateClient.user.username,
								password: privateClient.user.password
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 400, '01')
							assert.equal(body.error, 'invalid_request', '02')
							assert.include(body.error_description, 'Missing required \'client_secret\'', '03')

							server.close()
							done()
						}))
					})
					it('07 - Should fail when client_secret is invalid and a valid client_id, and valid credentials are provided but the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('07')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: privateClient.id,
								client_secret: privateClient.secret + '123',
								username: privateClient.user.username,
								password: privateClient.user.password,
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 401, '01')
							assert.equal(body.error, 'invalid_client', '02')
							assert.include(body.error_description, 'client_id not found', '03')

							server.close()
							done()
						}))
					})
					it('08 - Should return an access_token when a valid client_id, client_secret, credentials are provided and the client\'s auth_methods contain \'client_secret_post\'', done => {
						const showResult = showIds('08')
						const logE = logTest(done)

						logE.run(co(function *() {
							const { server, app } = yield getUserInServer(userIn)
							const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/token`).send({
								grant_type: 'password',
								client_id: privateClient.id,
								client_secret: privateClient.secret,
								username: privateClient.user.username,
								password: privateClient.user.password,
							})

							if (showResult) console.log(body)

							if (status != 200)
								logE.push(new Error(body.error_description || body.error))

							assert.equal(status, 200, '01')
							assert.isOk(body.access_token, '02')

							server.close()
							done()
						}))
					})
				}
			})
		})
	})
}



