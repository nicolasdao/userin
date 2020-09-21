/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { co } = require('core-async')
const jwt = require('jsonwebtoken')
const { assert } = require('chai')
const grantTypeAuthorizationCode = require('../token/grantTypeAuthorizationCode')
const grantTypeClientCredentials = require('../token/grantTypeClientCredentials')
const grantTypePassword = require('../token/grantTypePassword')
const grantTypeRefreshToken = require('../token/grantTypeRefreshToken')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn } = require('./_core')
setUpScopeAssertion(assert)

module.exports = function runTest (data, skip, showResults) {
	const { 
		clientId:client_id, 
		clientSecret:client_secret, 
		altClientId, 
		strategy, 
		accessTokenExpiresIn,
		user: { id: user_id, username, password }
	} = data

	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const invalidCode = 'K83jeqF/YnKXPvyz'
	const notAllowedScope = 'K83jeqFYnKXPvyz'
	const invalidClientId = 'K83jeqFYnKXPvyz'
	
	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	fn('token', () => {
		describe('grantTypeAuthorizationCode', () => {
			const showIds = createShowTestResultFn(showResults, 'token.grantTypeAuthorizationCode')
			
			const stubbedServiceAccount = { client_id, client_secret:client_secret }
			const stubbedUser = { user_id }
			const stubbedPayload = { ...stubbedServiceAccount, ...stubbedUser, code:invalidCode }

			it('01 - Should fail when the \'get_client\' event handler is not defined.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)

					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'get_authorization_code_claims\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
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
			it('03 - Should fail when the \'generate_access_token\' event handler is not defined.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_authorization_code_claims', strategy.get_authorization_code_claims)
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
			it('04 - Should fail when the \'get_config\' event handler is not defined.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_authorization_code_claims', strategy.get_authorization_code_claims)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
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
			it('05 - Should fail when the client_id is missing.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

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
			it('06 - Should fail when the client_secret is missing.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

				logE.run(co(function *() {
					const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
					logE.push(codeErrors)

					assert.isNotOk(codeErrors, '01')
					assert.isOk(codeResults, '02')
					assert.isOk(codeResults.token, '03')
					
					const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
						...stubbedPayload, 
						code:codeResults.token, 
						client_secret:null 
					})
					
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('07 - Should fail when the code is missing.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

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
			it('08 - Should fail when the client_id is incorrect.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
						...stubbedPayload, 
						code:'123', 
						client_id:'sbaug67437e93279ce27' 
					})
					
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Service account sbaug67437e93279ce27 not found') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('09 - Should fail when the code is incorrect.', done => {
				const showResult = showIds('09')
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
			it('10 - Should fail when the client_id exists and the code is correct but the client_id not the one associated with the code.', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

				logE.run(co(function *() {
					const [codeErrors, codeResults] = yield eventHandlerStore.generate_openid_authorization_code.exec(codePayload)
					logE.push(codeErrors)

					assert.isNotOk(codeErrors, '01')
					assert.isOk(codeResults, '02')
					assert.isOk(codeResults.token, '03')
					
					const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
						...stubbedPayload, 
						code:codeResults.token, 
						client_id:altClientId 
					})
					
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('11 - Should fail when a valid a valid code and client_id are passed, but the code\'scopes contain \'openid\' and the \'generate_id_token\' event handler is missing.', done => {
				const showResult = showIds('11')
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
			it('12 - Should fail when a valid a valid code and client_id are passed, but the code\'scopes contain \'offline_access\' and the \'generate_refresh_token\' event handler is missing.', done => {
				const showResult = showIds('12')
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
			it('13 - Should fail when the code has expired.', done => {
				const showResult = showIds('13')
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
			it('14 - Should return an access_token when the code is valid.', done => {
				const showResult = showIds('14')
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
			it('15 - Should return an access_token and a valid id_token when the code is valid and the scopes include \'openid\'.', done => {
				const showResult = showIds('15')
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
					assert.equal(claims.sub, user_id, '13')
					assert.isOk(claims.aud != undefined, '14')
					assert.equal(claims.client_id, client_id, '15')
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
			it('16 - Should return an access_token, an id_token and a refresh_token when the code is valid and the scopes include \'openid\' and \'offline_access\'.', done => {
				const showResult = showIds('16')
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
		})
		describe('grantTypeClientCredentials', () => {
			const showIds = createShowTestResultFn(showResults, 'token.grantTypeClientCredentials')
			
			const stubbedServiceAccount = { client_id:client_id, client_secret:client_secret, scopes:['profile'] }

			it('01 - Should fail when the \'get_client\' event handler is not defined.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'generate_access_token\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the \'get_config\' event handler is not defined.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_config\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('04 - Should return an access_token when the credentials are valid.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
					
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
			it('05 - Should fail when the client_id is missing.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
						...stubbedServiceAccount,
						client_id:null
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('06 - Should fail when the client_secret is missing.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
						...stubbedServiceAccount,
						client_secret:null
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('07 - Should fail when the scopes are not allowed.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
						...stubbedServiceAccount,
						scopes:[notAllowedScope]
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf(`Access to scope ${notAllowedScope} is not allowed`) >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('08 - Should fail when the client_id is incorrect.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
						...stubbedServiceAccount,
						client_id:invalidClientId
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf(`Service account ${invalidClientId} not found`) >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('09 - Should fail when the client_secret is incorrect.', done => {
				const showResult = showIds('09')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
						...stubbedServiceAccount,
						client_secret:invalidClientId
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('10 - Should not return an id_token when the credentials are valid even when the \'openid\' scope is provided.', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
						...stubbedServiceAccount,
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
			it('11 - Should not return a refresh_token when the credentials are valid even when the \'offline_access\' scope is provided.', done => {
				const showResult = showIds('11')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
						...stubbedServiceAccount,
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
		describe('grantTypePassword', () => {
			const showIds = createShowTestResultFn(showResults, 'token.grantTypePassword')
			
			const stubbedUser = { 
				client_id:client_id, 
				user:{ 
					username,
					password
				}, 
				scopes:[]
			}

			it('01 - Should fail when the \'get_client\' event handler is not defined.', done => {
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
			it('02 - Should fail when the \'get_end_user\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
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
			it('03 - Should fail when the \'generate_access_token\' event handler is not defined.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_end_user', strategy.get_end_user)
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
			it('04 - Should fail when the scopes include \'openid\' and the \'generate_id_token\' event handler is not defined.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_end_user', strategy.get_end_user)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
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
			it('05 - Should not fail because of the missing \'generate_id_token\' event handler when the scopes DOES NOT include \'openid\'.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_end_user', strategy.get_end_user)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
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
			it('06 - Should fail when the \'get_config\' event handler is not defined.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_end_user', strategy.get_end_user)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
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
			it('07 - Should return an access_token when the username and password are valid.', done => {
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
			it('08 - Should return an access_token and a valid id_token when the username and password are valid and the scopes contain \'openid\'.', done => {
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
					assert.equal(claims.sub, user_id, '12')
					assert.isOk(claims.aud != undefined, '13')
					assert.equal(claims.client_id, client_id, '14')
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
			it('09 - Should not return a refresh_token when the username and password are valid and the scopes contain \'offline_access\'.', done => {
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
					assert.equal(claims.sub, user_id, '12')
					assert.isOk(claims.aud != undefined, '13')
					assert.equal(claims.client_id, client_id, '14')
					assert.isOk(claims.exp != undefined, '16')
					assert.isOk(claims.iat != undefined, '17')

					if (showResult) {
						console.log(result)
						console.log(claims)
					}
					done()
				}))
			})
			it('10 - Should fail when the client_id is missing.', done => {
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
			it('11 - Should fail when the user is missing.', done => {
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
			it('12 - Should fail when the user.username is missing.', done => {
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
			it('13 - Should fail when the user.password is missing.', done => {
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
			it('14 - Should fail when the username and password are incorrect.', done => {
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
			it('15 - Should fail when scopes are not allowed.', done => {
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
			it('16 - Should fail when the client_id and client_secret are from an unauthorized account.', done => {
				const showResult = showIds('16')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
						...stubbedUser,
						client_id: altClientId
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
			const showIds = createShowTestResultFn(showResults, 'token.grantTypeRefreshToken')
			
			const stubbedPayload = { 
				client_id:client_id
			}

			const getValidRefreshToken = (eventHandlerStore, scopes) => co(function *() {
				const stubbedServiceAccount = { client_id:client_id, client_secret:client_secret }
				const [, { token:code }] = yield eventHandlerStore.generate_openid_authorization_code.exec({
					...stubbedServiceAccount, 
					user_id, 
					scopes
				})
				const [, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedServiceAccount, 
					code 
				})
				return result.refresh_token
			})

			it('01 - Should fail when the \'get_refresh_token_claims\' event handler is not defined.', done => {
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
			it('02 - Should fail when the \'get_client\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)
				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the \'generate_access_token\' event handler is not defined.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)
				registerEventHandler('get_client', strategy.get_client)
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
			it('04 - Should fail when the \'get_config\' event handler is not defined.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('generate_access_token', strategy.generate_access_token)
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
			it('07 - Should fail when the client_id is missing.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['offline_access', 'openid'])
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
			it('08 - Should fail when the refresh_token is missing.', done => {
				const showResult = showIds('08')
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
			it('09 - Should fail when the client_id is valid, the refresh_token is also valid, but the client_id is not the one associated with the refresh_token.', done => {
				const showResult = showIds('09')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['offline_access', 'openid'])
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
						...stubbedPayload,
						refresh_token,
						client_id:altClientId
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '03')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('10 - Should fail when the refresh_token is incorrect.', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
						...stubbedPayload,
						refresh_token:client_secret
					})
						
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '03')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('11 - Should fail when the refresh_token is associated with a \'openid\' scope, but the  \'generate_id_token\' event handler is missing.', done => {
				const showResult = showIds('11')
				const logE = logTest(done)

				const codeEventHandlerStore = {}
				registerAllHandlers(codeEventHandlerStore)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				eventHandlerStore.generate_id_token = null

				logE.run(co(function *() {
					const refresh_token = yield getValidRefreshToken(codeEventHandlerStore, ['offline_access', 'openid'])
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
			it('12 - Should return an access_token when a valid refresh_token is provided.', done => {
				const showResult = showIds('12')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['offline_access'])
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
			it('13 - Should return an access_token and a valid id_token when a valid refresh_token is provided and the scopes contain \'openid\'.', done => {
				const showResult = showIds('13')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['offline_access', 'openid'])
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
					assert.equal(claims.sub, user_id, '10')
					assert.isOk(claims.aud != undefined, '11')
					assert.equal(claims.client_id, client_id, '12')
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
	})
}



