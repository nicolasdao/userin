/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { co } = require('core-async')
const { assert } = require('chai')
const { handler:revokeHandler } = require('../revoke')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn } = require('./_core')
setUpScopeAssertion(assert)

module.exports = function runTest (data, skip, showResults=[]) {
	const { 
		clientId:client_id, 
		altClientId,
		strategy, 
		user: { id: user_id }
	} = data

	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const showIds = createShowTestResultFn(showResults, 'revoke.handler')

	fn('revoke', () => {
		describe('handler', () => {

			const getRefreshToken = (eventHandlerStore, client_id) => co(function *() {
				const [errors, result] = yield eventHandlerStore.generate_openid_refresh_token.exec({ client_id, user_id })
				if (errors)
					return [errors, null]
				else
					return [null, result.token]
			})

			const getAuthorizationHeader = (eventHandlerStore, client_id) => co(function *() {
				const [errors, result] = yield eventHandlerStore.generate_openid_access_token.exec({ client_id, user_id })
				if (errors)
					return [errors, null]
				else
					return [null, `Bearer ${result.token}`]
			})

			it('01 - Should fail when the \'get_refresh_token_claims\' event handler is not defined.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_refresh_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'delete_refresh_token\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_refresh_token_claims', strategy.get_refresh_token_claims)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'delete_refresh_token\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the token is missing.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({ 
						client_id
					}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('04 - Should fail when no access_token is passed in the authorization header.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id,
						token:'1234'
					}, eventHandlerStore, { authorization:null })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'authorization\'') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('05 - Should fail when an invalid access_token is passed in the authorization header.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id,
						token:'1234'
					}, eventHandlerStore, { authorization:'bearer 123' })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid access_token') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('06 - Should fail when an non bearer token is passed in the authorization header.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield revokeHandler({
						client_id,
						token:'1234'
					}, eventHandlerStore, { authorization:'123' })
					logE.push(errors)
					
					assert.isOk(errors, '01')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('The \'authorization\' header must contain a bearer access_token') >= 0), '02')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('07 - Should fail when an expired access_token is passed in the authorization header.', done => {
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
					const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')
					
					const [errors] = yield revokeHandler({
						client_id,
						token:'1234'
					}, eventHandlerStore, { authorization })
					logE.push(errors)
					
					assert.isOk(errors, '03')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('access_token has expired') >= 0), '04')

					if (showResult) console.log(errors)
					done()
				}))
			})

			if (client_id) {
				it('08 - Should fail when a client_id is passed but the \'get_client\' event handler is not defined.', done => {
					const showResult = showIds('08')
					const logE = logTest(done)
					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)
					eventHandlerStore.get_client = null
					
					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client_id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [errors] = yield revokeHandler({
							client_id,
							token:'123'
						}, eventHandlerStore, { authorization })
						
						logE.push(errors)
						assert.isOk(errors, '03')
						assert.isOk(errors.length, '04')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '05')
						
						if (showResult) console.log(errors)
						done()
					}))
				})
				it('09 - Should fail when the client_id is missing while one is associated with the access_token passed in the authorization header.', done => {
					const showResult = showIds('09')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client_id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')
						
						const [errors] = yield revokeHandler({
							client_id:null,
							token:'1234'
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '03')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '04')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('10 - Should fail when the client_id does not match the one associated with the access_token passed in the authorization header.', done => {
					const showResult = showIds('10')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client_id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')
						
						const [errors] = yield revokeHandler({
							client_id:altClientId,
							token:'1234'
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '03')
						assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid \'client_id\'') >= 0), '04')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('11 - Should fail when the refresh_token is associated with a different client_id than the one passed in the request.', done => {
					const showResult = showIds('11')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client_id)
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, altClientId)
						logE.push(reffeshTokenErrors)
						
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [errors] = yield revokeHandler({
							client_id,
							token: refresh_token
						}, eventHandlerStore, { authorization })
						logE.push(errors)
						
						assert.isOk(errors, '06')
						assert.isOk(errors.some(e => e.message && e.message.indexOf(`Invalid 'client_id'`) >= 0), '07')

						if (showResult) console.log(errors)
						done()
					}))
				})
				it('12 - Should succeed when the refresh_token is still valid, the access_token is valid and they are both associated with the specified client_id.', done => {
					const showResult = showIds('12')
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore, client_id)
						
						logE.push(codeErrors)
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')

						const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore, client_id)
						logE.push(reffeshTokenErrors)
						
						logE.push(reffeshTokenErrors)
						assert.isNotOk(reffeshTokenErrors, '03')
						assert.isOk(refresh_token, '04')
						
						const [refreshTokenClaimsErrors, refreshTokenClaims] = yield eventHandlerStore.get_refresh_token_claims.exec({ token:refresh_token })
						
						logE.push(refreshTokenClaimsErrors)
						assert.isNotOk(refreshTokenClaimsErrors, '05')
						assert.isOk(refreshTokenClaims, '06')

						const [errors] = yield revokeHandler({
							client_id,
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

			it('13 - Should succeed when the refresh_token is still valid, the access_token is valid and none of them are associated with a client_id.', done => {
				const showResult = showIds('13')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, authorization] = yield getAuthorizationHeader(eventHandlerStore)
					
					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')

					const [reffeshTokenErrors, refresh_token] = yield getRefreshToken(eventHandlerStore)
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
	})
}



