/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { co } = require('core-async')
const chai = require('chai')
const { handler:revokeHandler } = require('../revoke')
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
module.exports = function runTest (data, skip, showResults=[]) {
	const { testSuiteName='', userIn, stub:{ client={}, altClient={}, privateClient={} } } = data || {}
	client.user = client.user || {}
	privateClient.user = privateClient.user || {}

	const strategy = userIn.strategy
	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const { modes=[], version='v1' } = userIn.config || {}

	const isOpenIdMode = modes.indexOf('openid') >= 0

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const getRefreshToken = (eventHandlerStore, client_id, user_id) => co(function *() {
		const [errors, result] = yield eventHandlerStore.generate_openid_refresh_token.exec({ client_id, user_id })
		if (errors)
			return [errors, null]
		else
			return [null, result.token]
	})

	const getAuthorizationHeader = (eventHandlerStore, client_id, user_id) => co(function *() {
		const [errors, result] = yield eventHandlerStore.generate_openid_access_token.exec({ client_id, user_id })
		if (errors)
			return [errors, null]
		else
			return [null, `Bearer ${result.token}`]
	})

	fn(`revoke[${testSuiteName}]`, () => {
		describe('validate stub', () => {
			it('01 - Should define some specific loginsignup and loginsignupfip stub values', () => {
				assert.isOk(client.user.id, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.user.id'`)
			})
			if (isOpenIdMode)
				it('02 - Should define some specific openid stub values', () => {
					assert.isOk(client.id, `01 - revoke Test suite in ${testSuiteName} mode require stub 'client.id'`)
					assert.isOk(client.secret, `02 - revoke Test suite in ${testSuiteName} mode require stub 'client.secret'`)
					assert.isOk(altClient.id, `03 - revoke Test suite in ${testSuiteName} mode require stub 'altClient.id'`)
					assert.isOk(privateClient.id, `04 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.id'`)
					assert.isOk(privateClient.secret, `05 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.secret'`)
					assert.isOk(privateClient.user.id, `06 - revoke Test suite in ${testSuiteName} mode require stub 'privateClient.user.id'`)
				})
		})

		describe('handler', () => {
			const showIds = createShowTestResultFn(showResults, `revoke[${testSuiteName}].handler`)

			it('01 - Should fail when the \'get_refresh_token_claims\' event handler is not defined', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id:client.id
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_refresh_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'delete_refresh_token\' event handler is not defined', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id:client.id
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'delete_refresh_token\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when no access_token is passed in the authorization header', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id:client.id,
						token:'1234'
					}, eventHandlerStore, { authorization:null })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'authorization\'') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('04 - Should fail when an non bearer token is passed in the authorization header', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id:client.id,
						token:'1234'
					}, eventHandlerStore, { authorization:'123' })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('The \'authorization\' header must contain a bearer access_token') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('05 - Should fail when the token is missing', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({ 
						client_id:client.id
					}, eventHandlerStore, { authorization:'bearer 123' })
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('06 - Should fail when an invalid access_token is passed in the authorization header', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id:client.id,
						token:'1234'
					}, eventHandlerStore, { authorization:'bearer 123' })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid access_token') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('07 - Should fail when an expired access_token is passed in the authorization header', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_config', (root) => {
					const clone = JSON.parse(JSON.stringify(root))
					clone.tokenExpiry.access_token = -1000
					return clone
				})

				logE.run(co(function *() {
					const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')
					
					const [errors] = yield revokeHandler({
						client_id:client.id,
						token:'1234'
					}, eventHandlerStore, { authorization })
					logE.push(errors)
					
					assert.isOk(errors, '03')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('access_token has expired') >= 0), '04')

					if (showResult) console.log(errors)
					done()
				}))
			})

			if (isOpenIdMode) {
				it('08 - Should fail when a client_id is passed but the \'get_client\' event handler is not defined', done => {
					const showResult = showIds('08')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					eventHandlerStore.get_client = null
					
					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, altClient.id)
						logE.push(reffeshTokenErrors)
						
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')

						const [errors] = yield revokeHandler({
							client_id: client.id,
							token:refresh_token
						}, eventHandlerStore, { authorization })
						
						logE.push(errors)
						assert.isOk(errors, '03')
						assert.isOk(errors.length, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '05')
						
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('09 - Should fail when the client_id is missing while one is associated with the access_token passed in the authorization header', done => {
					const showResult = showIds('09')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, altClient.id)
						logE.push(reffeshTokenErrors)
						
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [errors] = yield revokeHandler({
							client_id:null,
							token:refresh_token
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '03')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '04')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('10 - Should fail when the client_id does not match the one associated with the access_token passed in the authorization header', done => {
					const showResult = showIds('10')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, altClient.id)
						logE.push(reffeshTokenErrors)
						
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [errors] = yield revokeHandler({
							client_id:altClient.id,
							token:refresh_token
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '03')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid \'client_id\'') >= 0), '04')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('11 - Should fail when the refresh_token is associated with a different client_id than the one passed in the request', done => {
					const showResult = showIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, altClient.id)
						logE.push(reffeshTokenErrors)
						
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [errors] = yield revokeHandler({
							client_id: client.id,
							token: refresh_token
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '06')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid \'client_id\'') >= 0), '07')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('12 - Should succeed when the refresh_token is still valid, the access_token is valid and they are both associated with the specified client_id', done => {
					const showResult = showIds('12')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client.id, client.user.id)
						
						logE.push(codeErrors)
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, client.id, client.user.id)
						logE.push(reffeshTokenErrors)
						
						logE.push(reffeshTokenErrors)
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaimsErrors)
						assert.isNotOk(refreshTokenClaimsErrors, '05')
						assert.isOk(refreshTokenClaims, '06')

						const [errors] = yield revokeHandler({
							client_id: client.id,
							token: refresh_token
						}, eventHandlerStore, { authorization })
						
						logE.push(errors)
						assert.isNotOk(errors, '07')

						const [refreshTokenClaims2Errors, refreshTokenClaims2] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaims2Errors)
						assert.isOk(refreshTokenClaims2Errors || !refreshTokenClaims2, '08')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('13 - Should fail when the client_secret is missing and the refresh_token, access_token, and client_id are valid but the client\'s auth_methods contain \'client_secret_post\'', done => {
					const showResult = showIds('13')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, privateClient.id, privateClient.user.id)
						
						logE.push(codeErrors)
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, privateClient.id, privateClient.user.id)
						logE.push(reffeshTokenErrors)
						
						logE.push(reffeshTokenErrors)
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaimsErrors)
						assert.isNotOk(refreshTokenClaimsErrors, '05')
						assert.isOk(refreshTokenClaims, '06')

						const [errors] = yield revokeHandler({
							client_id: privateClient.id,
							token: refresh_token
						}, eventHandlerStore, { authorization })
						
						logE.push(errors)
						assert.isOk(errors, '07')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '08')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('14 - Should succeed when the client_secret, refresh_token, access_token, and client_id are valid and the client\'s auth_methods contain \'client_secret_post\'', done => {
					const showResult = showIds('14')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, privateClient.id, privateClient.user.id)
						
						logE.push(codeErrors)
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, privateClient.id, privateClient.user.id)
						logE.push(reffeshTokenErrors)
						
						logE.push(reffeshTokenErrors)
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaimsErrors)
						assert.isNotOk(refreshTokenClaimsErrors, '05')
						assert.isOk(refreshTokenClaims, '06')

						const [errors] = yield revokeHandler({
							client_id: privateClient.id,
							client_secret: privateClient.secret,
							token: refresh_token
						}, eventHandlerStore, { authorization })
						
						logE.push(errors)
						assert.isNotOk(errors, '07')

						const [refreshTokenClaims2Errors, refreshTokenClaims2] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaims2Errors)
						assert.isOk(refreshTokenClaims2Errors || !refreshTokenClaims2, '08')

						if (showResult) console.log(errors)
						done()
					}))
				})
			}

			it('15 - Should succeed when the refresh_token is still valid, the access_token is valid and none of them are associated with a client_id', done => {
				const showResult = showIds('15')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, null, client.user.id)
					
					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')

					const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, null, client.user.id)
					logE.push(reffeshTokenErrors)
					
					logE.push(reffeshTokenErrors)
					assert.isNotOk(reffeshTokenErrors, '03')
					assert.isOk(refresh_token, '04')
					
					const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })

					logE.push(refreshTokenClaimsErrors)
					assert.isNotOk(refreshTokenClaimsErrors, '05')
					assert.isOk(refreshTokenClaims, '06')

					const [errors] = yield revokeHandler({
						token: refresh_token
					}, eventHandlerStore, { authorization })
					
					logE.push(errors)
					assert.isNotOk(errors, '07')

					const [refreshTokenClaims2Errors, refreshTokenClaims2] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
					
					logE.push(refreshTokenClaims2Errors)

					assert.isOk(refreshTokenClaims2Errors || !refreshTokenClaims2, '08')

					if (showResult) console.log(errors)
					done()
				}))
			})
		})

		describe('/revoke', () => {	
			const showIds = createShowTestResultFn(showResults, `revoke[${testSuiteName}]/revoke`)		

			it('01 - Should fail when the authorization header is missing', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`).send({

					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'authorization\'', '03')					

					server.close()
					done()
				}))
			})
			it('02 - Should fail when the token is missing', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
						.set('Authorization', 'Bearer 123')
						.send({})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'token\'', '03')					

					server.close()
					done()
				}))
			})
			it('03 - Should fail when the token does not exist', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, client.id, client.user.id)
					logE.push(authorizationErrors)

					assert.isNotOk(authorizationErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
						.set('Authorization', authorization)
						.send({
							token: '1'
						})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '01')
					assert.equal(body.error, 'invalid_token','02')
					assert.include(body.error_description, 'Token not found', '03')					

					server.close()
					done()
				}))
			})
			it('04 - Should succeed when the token is a valid refresh_token which is not associated with a client_id and the client_id missing', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, null, client.user.id)
					const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, null, client.user.id)
					logE.push(authorizationErrors)
					logE.push(refreshTokenErrors)

					assert.isNotOk(authorizationErrors, '01')
					assert.isNotOk(refreshTokenErrors, '02')

					const { server, app } = yield getUserInServer(userIn)
					const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
						grant_type: 'refresh_token',
						refresh_token: refreshToken
					})

					assert.equal(refreshTokenResp.status, 200, '03')
					assert.isOk(refreshTokenResp.body.access_token, '04')

					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
						.set('Authorization', authorization)
						.send({
							token: refreshToken
						})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '05')				

					const refreshTokenResp2 = yield chai.request(app).post(`/oauth2/${version}/token`).send({
						grant_type: 'refresh_token',
						refresh_token: refreshToken
					})

					assert.equal(refreshTokenResp2.status, 403, '06')
					assert.equal(refreshTokenResp2.body.error, 'invalid_token', '07')
					assert.include(refreshTokenResp2.body.error_description, 'Invalid refresh_token', '08')

					server.close()
					done()
				}))
			})
			if (isOpenIdMode) {
				it('05 - Should fail when the client_id is missing and the token is a valid refresh_token which is associated with a client_id', done => {
					const showResult = showIds('05')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, client.id, client.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, client.id, client.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: client.id
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 400, '05')				
						assert.equal(body.error, 'invalid_request', '06')
						assert.include(body.error_description, 'Missing required \'client_id\'', '07')
						server.close()
						done()
					}))
				})
				it('06 - Should fail when the client_id does not exist and the token is a valid refresh_token which is associated with a client_id', done => {
					const showResult = showIds('06')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, client.id, client.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, client.id, client.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: client.id
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken,
								client_id: 'ebwubd63458rf685f^*F^e623cdwf5f16vde61365d8cev63d6e13cde 8136'
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 401, '05')				
						assert.equal(body.error, 'invalid_client', '06')
						assert.include(body.error_description, 'Invalid \'client_id\'', '07')
						server.close()
						done()
					}))
				})
				it('07 - Should succeed when the client_id is valid and the token is a valid refresh_token which is associated with a client_id', done => {
					const showResult = showIds('07')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, client.id, client.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, client.id, client.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: client.id
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken,
								client_id: client.id
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 200, '05')				

						const refreshTokenResp2 = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: client.id
						})

						assert.equal(refreshTokenResp2.status, 403, '06')
						assert.equal(refreshTokenResp2.body.error, 'invalid_token', '07')
						assert.include(refreshTokenResp2.body.error_description, 'Invalid refresh_token', '08')

						server.close()
						done()
					}))
				})
				it('08 - Should fail when the client_secret is missing and the client_id and token is are valid but the client\'s auth_methods contains \'client_secret_post\'', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: privateClient.id,
							client_secret: privateClient.secret
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken,
								client_id: privateClient.id
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 400, '05')				
						assert.equal(body.error, 'invalid_request', '07')
						assert.include(body.error_description, 'Missing required \'client_secret\'', '08')

						server.close()
						done()
					}))
				})
				it('09 - Should fail when the client_secret is incorrect and the client_id and token is are valid but the client\'s auth_methods contains \'client_secret_post\'', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: privateClient.id,
							client_secret: privateClient.secret
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken,
								client_id: privateClient.id,
								client_secret: privateClient.secret + '123'
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 401, '05')				
						assert.equal(body.error, 'invalid_client', '07')
						assert.include(body.error_description, 'client_id not found', '08')

						server.close()
						done()
					}))
				})
				it('10 - Should succeed when the client_secret is correct and the client_id and token is are valid but the client\'s auth_methods contains \'client_secret_post\'', done => {
					const showResult = showIds('08')
					const logE = logTest(done)

					logE.run(co(function *() {
						const [authorizationErrors, authorization] = yield getAuthorizationHeader(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						const [refreshTokenErrors, refreshToken] = yield getRefreshToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)
						logE.push(authorizationErrors)
						logE.push(refreshTokenErrors)

						assert.isNotOk(authorizationErrors, '01')
						assert.isNotOk(refreshTokenErrors, '02')

						const { server, app } = yield getUserInServer(userIn)
						const refreshTokenResp = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: privateClient.id,
							client_secret: privateClient.secret
						})

						assert.equal(refreshTokenResp.status, 200, '03')
						assert.isOk(refreshTokenResp.body.access_token, '04')

						const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/revoke`)
							.set('Authorization', authorization)
							.send({
								token: refreshToken,
								client_id: privateClient.id,
								client_secret: privateClient.secret
							})

						if (showResult) console.log(body)

						if (status != 200)
							logE.push(new Error(body.error_description || body.error))

						assert.equal(status, 200, '05')				

						const refreshTokenResp2 = yield chai.request(app).post(`/oauth2/${version}/token`).send({
							grant_type: 'refresh_token',
							refresh_token: refreshToken,
							client_id: privateClient.id,
							client_secret: privateClient.secret
						})

						assert.equal(refreshTokenResp2.status, 403, '06')
						assert.equal(refreshTokenResp2.body.error, 'invalid_token', '07')
						assert.include(refreshTokenResp2.body.error_description, 'Invalid refresh_token', '08')

						server.close()
						done()
					}))
				})
			}
		})
	})
}
















