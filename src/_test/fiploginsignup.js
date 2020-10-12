/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const crypto = require('crypto')
const { co } = require('core-async')
const jwt = require('jsonwebtoken')
const { assert } = require('chai')
const getFIPuserProcessor = require('../fipauthorize/processTheFIPuser')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn } = require('./_core')
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
	const { 
		clientId:client_id, 
		identityProvider, 
		identityProviderUserId, 
		userId, 
		altClientId, 
		openIdMode,
		userIn } = data

	const strategy = userIn.strategy
	const usecase = openIdMode ? 'openid' : 'non-openid' 

	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const payload = {
		client_id, 
		strategy:identityProvider, 
		user:{ id:identityProviderUserId }, 
		response_type:'code',
		redirect_uri: 'https://userin.com/authorization'
	}
	
	const showLoginIds = createShowTestResultFn(showResults, 'fiplogin.processLoginWithFIPuser')

	fn('fiploginsignup', () => {
		const processTheFIPuser = getFIPuserProcessor('login')(openIdMode)
		describe('processLoginWithFIPuser', () => {		

			if (openIdMode)
				it(`01 [${usecase} mode] - Should fail when the 'get_client' event handler is not defined.`, done => {
					const showResult = showLoginIds('01')
					const logE = logTest(done)
					const eventHandlerStore = {}
					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})

			it(`02 [${usecase} mode] - Should fail when the 'get_fip_user' event handler is not defined.`, done => {
				const showResult = showLoginIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_fip_user\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})

			if (openIdMode)
				it(`03 [${usecase} mode] - Should fail when the client_id is missing.`, done => {
					const showResult = showLoginIds('03')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser({
							...payload,
							client_id: null					
						}, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})

			it(`04 [${usecase} mode] - Should fail when the user is missing.`, done => {
				const showResult = showLoginIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						user: null					
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user\'') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`05 [${usecase} mode] - Should fail when the user.id is not defined.`, done => {
				const showResult = showLoginIds('05')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,			
						user:{}	
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'id\' property in the \'user\' object') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`06 [${usecase} mode] - Should fail when the strategy is missing.`, done => {
				const showResult = showLoginIds('06')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						strategy: null					
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'strategy\'') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`07 [${usecase} mode] - Should fail when the response_type is missing.`, done => {
				const showResult = showLoginIds('07')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						response_type: null					
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'response_type\' argument') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`08 [${usecase} mode] - Should fail when the response_type is not supported.`, done => {
				const showResult = showLoginIds('08')
				const logE = logTest(done)
				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						response_type: 'cola'					
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('The value \'cola\' is not a supported OIDC \'response_type\'') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`09 [${usecase} mode] - Should fail when response_type contains 'code' but the 'generate_authorization_code' event handler is not defined.`, done => {
				const showResult = showLoginIds('09')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_fip_user', strategy.get_fip_user)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						response_type: 'code'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_authorization_code\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it(`10 [${usecase} mode] - Should fail when response_type contains 'token' but the 'generate_access_token' event handler is not defined.`, done => {
				const showResult = showLoginIds('10')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_fip_user', strategy.get_fip_user)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser({
						...payload,
						response_type: 'token'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_access_token\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})

			if (openIdMode) {
				it(`11 [${usecase} mode] - Should fail when response_type contains 'id_token' and the scope contains 'openid' but the 'generate_id_token' event handler is not defined.`, done => {
					const showResult = showLoginIds('11')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					registerEventHandler('get_fip_user', strategy.get_fip_user)
					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser({
							...payload,
							response_type: 'id_token',
							scope: 'openid'
						}, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_id_token\' handler') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})

				it(`12 [${usecase} mode] - Should fail when the scopes is not allowed.`, done => {
					const showResult = showLoginIds('12')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser({
							...payload,
							scopes:['hello', 'world']					
						}, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Access to scopes hello, world is not allowed') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})
				it(`13 [${usecase} mode] - Should fail when the client_id and client_secret are from an unauthorized account.`, done => {
					const showResult = showLoginIds('10')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser({
							...payload,
							client_id: altClientId			
						}, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid client_id') >= 0), '03')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it(`14 [${usecase} mode] - Should NOT fail when response_type contains 'id_token' and the scope DOES NOT contain 'openid' but the 'generate_id_token' event handler is not defined.`, done => {
					const showResult = showLoginIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					registerEventHandler('get_fip_user', strategy.get_fip_user)
					registerEventHandler('generate_access_token', strategy.generate_access_token)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,	
							response_type: 'token'	
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')

						if (showResult) console.log(result)
						done()
					}))
				})
			}

			it(`15 [${usecase} mode] - Should return a code only when the FIP user ID exists and the response_type contains 'code'.`, done => {
				const showResult = showLoginIds('12')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,	
						scopes: []	
					}, eventHandlerStore)
					logE.push(errors)
					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.code, '03')
					assert.isNotOk(result.access_token, '03')
					assert.isNotOk(result.token_type, 'bearer', '04')
					assert.isNotOk(result.expires_in, 3600, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')

					if (showResult) console.log(result)
					done()
				}))
			})
			it(`16 [${usecase} mode] - Should return an access_token only when the FIP user ID exists and the response_type contains 'token'.`, done => {
				const showResult = showLoginIds('13')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,	
						response_type: 'token',
						scopes: []	
					}, eventHandlerStore)
					logE.push(errors)
					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isNotOk(result.code, '03')
					assert.isOk(result.access_token, '03')
					assert.isOk(result.token_type, 'bearer', '04')
					assert.isOk(result.expires_in, 3600, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')

					if (showResult) console.log(result)
					done()
				}))
			})

			if (openIdMode) {
				it(`17 [${usecase} mode] - Should not return an id_token only when the FIP user ID exists and the response_type contains 'id_token' and the scope does not include 'openid'.`, done => {
					const showResult = showLoginIds('14')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser({
							...payload,	
							response_type: 'id_token',
							scopes: []	
						}, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('response_type \'id_token\' is invalid without the \'openid\' scope') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})
				it(`18 [${usecase} mode] - Should return an id_token only when the FIP user ID exists and the response_type contains 'id_token' and the scope contains 'openid'.`, done => {
					const showResult = showLoginIds('15')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,	
							response_type: 'id_token',
							scopes: ['openid']	
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isNotOk(result.code, '03')
						assert.isNotOk(result.access_token, '03')
						assert.isNotOk(result.token_type, 'bearer', '04')
						assert.isNotOk(result.expires_in, 3600, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '11')
						assert.equal(claims.sub, userId, '12')
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
				it(`19 [${usecase} mode] - Should return an id_token, access_token and code when the FIP user ID exists and the response_type contains 'id_token token code' and the scope contains 'openid'.`, done => {
					const showResult = showLoginIds('16')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,	
							response_type: 'id_token token code',
							scopes: ['openid']	
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.code, '03')
						assert.isOk(result.access_token, '03')
						assert.isOk(result.token_type, 'bearer', '04')
						assert.isOk(result.expires_in, 3600, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '11')
						assert.equal(claims.sub, userId, '12')
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
				it(`20 [${usecase} mode] - Should return an access_token and a valid id_token when FIP user ID exists and the response_type contains 'id_token token' and the scopes contain 'openid'.`, done => {
					const showResult = showLoginIds('17')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,		
							response_type: 'id_token token',
							scopes: ['openid']
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, 3600, '05')
						assert.isOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						const claims = jwt.decode(result.id_token)
						assert.isOk(claims, '11')
						assert.equal(claims.sub, userId, '12')
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
			} else {
				it(`17 [${usecase} mode] - Should return an access_token and a code (no id_token) when the FIP user ID exists and the response_type contains 'id_token token code' and the scope contains 'openid'.`, done => {
					const showResult = showLoginIds('16')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,	
							response_type: 'id_token token code',
							scopes: ['openid']	
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.code, '03')
						assert.isOk(result.access_token, '03')
						assert.isOk(result.token_type, 'bearer', '04')
						assert.isOk(result.expires_in, 3600, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) {
							console.log(result) 
						}
						done()
					}))
				})
				it(`18 [${usecase} mode] - Should return an access_token (no id_token) when FIP user ID exists and the response_type contains 'id_token token' and the scopes contain 'openid'.`, done => {
					const showResult = showLoginIds('17')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [errors, result] = yield processTheFIPuser({
							...payload,		
							response_type: 'id_token token',
							scopes: ['openid']
						}, eventHandlerStore)
						logE.push(errors)
						assert.isNotOk(errors, '01')
						assert.isOk(result, '02')
						assert.isOk(result.access_token, '03')
						assert.equal(result.token_type, 'bearer', '04')
						assert.equal(result.expires_in, 3600, '05')
						assert.isNotOk(result.id_token, '06')
						assert.isNotOk(result.refresh_token, '07')

						if (showResult) {
							console.log(result) 
						}
						done()
					}))
				})
			}

			it(`19 [${usecase} mode] - Should not return a refresh_token when FIP user ID exists and the response_type contains 'token' and the scopes contain 'offline_access'.`, done => {
				const showResult = showLoginIds('18')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,	
						response_type: 'token',
						scopes: ['offline_access']	
					}, eventHandlerStore)
					logE.push(errors)
					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.access_token, '03')
					assert.equal(result.token_type, 'bearer', '04')
					assert.equal(result.expires_in, 3600, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')
		
					if (showResult) {
						console.log(result) 
					}
					done()
				}))
			})

			it('20 - Should not fail when the \'create_fip_user\' event handler is not defined.', done => {
				const showResult = showLoginIds('19')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				eventHandlerStore.create_fip_user = null

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,	
						response_type: 'token',
						scopes: []	
					}, eventHandlerStore)
					logE.push(errors)
					assert.isNotOk(errors, '01')
					assert.isOk(result, '02')
					assert.isNotOk(result.code, '03')
					assert.isOk(result.access_token, '03')
					assert.isOk(result.token_type, 'bearer', '04')
					assert.isOk(result.expires_in, 3600, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')

					if (showResult) {
						console.log(result)  
					}
					done()
				}))
			})
		})
	})

	if (!openIdMode) {
		const showSignupIds = createShowTestResultFn(showResults, 'fipsignup.processSignupWithFIPuser')
		fn('fipsignup', () => {
			const processTheFIPuser = getFIPuserProcessor('signup')(false)
			describe('processSignupWithFIPuser', () => {
				it('01 - Should fail when the \'create_fip_user\' event handler is not defined.', done => {
					const showResult = showSignupIds('01')
					const logE = logTest(done)
					const eventHandlerStore = {}
					const registerEventHandler = eventRegister(eventHandlerStore)
					if (strategy.get_client) registerEventHandler('get_client', strategy.get_client)
					registerEventHandler('get_fip_user', strategy.get_fip_user)
					logE.run(co(function *() {
						const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
						logE.push(errors)
						assert.isOk(errors, '01')
						assert.isOk(errors.length, '02')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'create_fip_user\' handler') >= 0), '03')
						
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('02 - Should create a new FIP user when that user does exist yet', done => {
					const showResult = showSignupIds('02')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					const fipStrategy = 'facebook'
					const fipUser = {
						id: crypto.randomBytes(7).toString('base64'),
						firstName:'Bernard', 
						lastName:'Connor'
					}

					logE.run(co(function *() {
						// 1. Proves that the new FIP user does not exist
						const [, existingUser] = yield eventHandlerStore.get_fip_user.exec({ 
							strategy:fipStrategy,
							user: fipUser
						})

						assert.isNotOk(existingUser, '01')

						// 2. Inserts the new user
						const [errors, results] = yield processTheFIPuser({
							user:fipUser, 
							strategy:fipStrategy, 
							response_type: 'code',
							redirect_uri: payload.redirect_uri
						}, eventHandlerStore)

						logE.push(errors)
						// 3. Proves that the operation did not fail 
						assert.isNotOk(errors, '02')
						assert.isOk(results, '03')
						assert.isOk(results.user_already_exists === false, '04')
						assert.isOk(results.code, '05')

						// 4. Proves that the new FIP user has been successfully created
						const [existingUser2Errors, existingUser2] = yield eventHandlerStore.get_fip_user.exec({ 
							strategy:fipStrategy,
							user: fipUser
						})

						logE.push(existingUser2Errors)
						assert.isNotOk(existingUser2Errors, '06')
						assert.isOk(existingUser2, '07')
						assert.isOk(existingUser2.id, '08')

						if (showResult) console.log(results)
						done()
					}))
				})
				it('03 - Should not create a new FIP user when that user already exist yet', done => {
					const showResult = showSignupIds('03')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					const fipStrategy = 'facebook'
					const fipUser = {
						id: identityProviderUserId,
						firstName:'Bernard', 
						lastName:'Connor'
					}

					logE.run(co(function *() {
						// 1. Proves that the new FIP user does not exist
						const [, existingUser] = yield eventHandlerStore.get_fip_user.exec({ 
							strategy:fipStrategy,
							user: fipUser
						})

						assert.isOk(existingUser, '01')

						// 2. Inserts the new user
						const [errors, results] = yield processTheFIPuser({
							user:fipUser, 
							strategy:fipStrategy, 
							response_type: 'code',
							redirect_uri: payload.redirect_uri
						}, eventHandlerStore)

						logE.push(errors)
						// 3. Proves that the operation did not fail 
						assert.isNotOk(errors, '02')
						assert.isOk(results, '03')
						assert.isOk(results.user_already_exists === true, '04')
						assert.isOk(results.code, '05')

						if (showResult) console.log(results)
						done()
					}))
				})
			})
		})
	}
}



