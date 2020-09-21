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
const { handler:introspectHandler } = require('../introspect')
const grantTypePassword = require('../token/grantTypePassword')
const grantTypeAuthorizationCode = require('../token/grantTypeAuthorizationCode')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn } = require('./_core')
setUpScopeAssertion(assert)

module.exports = function runTest (data, skip, showResults=[]) {
	const { 
		clientId:client_id, 
		clientSecret:client_secret, 
		altClientId,
		altClientSecret,
		strategy, 
		user: { id: user_id, username, password },
		aud
	} = data

	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const showIds = createShowTestResultFn(showResults, 'introspect.handler')

	fn('introspect', () => {
		describe('handler', () => {
			
			const payload = { client_id, client_secret }
			const user = { username, password }

			const getValidAccessToken = (eventHandlerStore) => co(function *() {
				const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, { 
					client_id:payload.client_id, 
					user, 
					scopes:[]
				})
				if (errors)
					return [errors, null]
				else
					return [null, result.access_token]
			})

			const getValidIdAndRefreshToken = (eventHandlerStore) => co(function *() {
				const stubbedServiceAccount = { client_id, client_secret }
				const [codeErrors, { token:code }] = yield eventHandlerStore.generate_openid_authorization_code.exec({
					...stubbedServiceAccount, 
					user_id, 
					scopes:['openid', 'offline_access']
				})
				if (codeErrors)
					return [codeErrors, null]
				const [tokenErrors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedServiceAccount, 
					code 
				})
				if (tokenErrors)
					return [tokenErrors, null]
				return [null, result]
			})

			it('01 - Should fail when the token_type_hint is missing.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:'123', 
							token_type_hint:null,
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token_type_hint\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the token_type_hint is not supported.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:'123', 
							token_type_hint:'hello',
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('token_type_hint \'hello\' is not supported.') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should fail when the \'token_type_hint\' is \'id_token\' and the \'get_id_token_claims\' event handler is not defined.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield introspectHandler({
						...payload,
						token_type_hint: 'id_token'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_id_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('04 - Should fail when the \'token_type_hint\' is \'access_token\' and the \'get_access_token_claims\' event handler is not defined.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield introspectHandler({
						...payload,
						token_type_hint: 'access_token'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_access_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('05 - Should fail when the \'token_type_hint\' is \'refresh_token\' and the \'get_refresh_token_claims\' event handler is not defined.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield introspectHandler({
						...payload,
						token_type_hint: 'refresh_token'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_refresh_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('06 - Should fail when the \'get_client\' event handler is not defined.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_access_token_claims', strategy.get_access_token_claims)
				logE.run(co(function *() {
					const [errors] = yield introspectHandler({
						...payload,
						token_type_hint: 'access_token'
					}, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
					
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
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:'123', 
							token_type_hint:'refresh_token',
							client_id:null
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('08 - Should fail when the client_secret is missing.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:'123', 
							token_type_hint:'refresh_token',
							client_secret:null
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('09 - Should fail when the token is missing.', done => {
				const showResult = showIds('09')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:null, 
							token_type_hint:'refresh_token',
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('10 - Should fail when the client_id and client_secret are not valid.', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:'123', 
							token_type_hint:'refresh_token',
							client_id: 'GYUE&((#VYVV(V',
							client_secret:altClientSecret
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Service account GYUE&((#VYVV(V not found') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('11 - Should fail when the client_id and client_secret are not the identifying the client associated with the token.', done => {
				const showResult = showIds('11')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.id_token, '03')
					assert.isOk(result.refresh_token, '04')

					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:result.refresh_token, 
							token_type_hint:'refresh_token',
							client_id: altClientId,
							client_secret:altClientSecret
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('client_id not found') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('12 - Should fail when the token is incorrect.', done => {
				const showResult = showIds('12')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:12344, 
							token_type_hint:'refresh_token',
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('13 - Should return the token info when the access_token is valid.', done => {
				const showResult = showIds('13')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, access_token] = yield getValidAccessToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(access_token, '02')
					
					const [errors, tokenInfo] = yield introspectHandler(
						{ ...payload, token:access_token, token_type_hint:'access_token' }, eventHandlerStore)
					logE.push(errors)
					
					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, user_id, '07')
					assert.equal(tokenInfo.aud, aud, '08')
					assert.equal(tokenInfo.client_id, client_id, '09')
					assert.equal(tokenInfo.token_type, 'Bearer', '10')

					if (showResult) console.log(tokenInfo)
					done()
				}))
			})
			it('14 - Should return the token info when the id_token is valid.', done => {
				const showResult = showIds('14')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.id_token, '03')
					assert.isOk(result.refresh_token, '04')

					const [errors, tokenInfo] = yield introspectHandler(
						{ ...payload, token:result.id_token, token_type_hint:'id_token' }, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, user_id, '07')
					assert.equal(tokenInfo.aud, aud, '08')
					assert.equal(tokenInfo.client_id, client_id, '09')
					assert.scopes(tokenInfo.scope, ['openid', 'offline_access'], 10)
					assert.equal(tokenInfo.token_type, 'Bearer', '13')

					if (showResult) console.log(tokenInfo)
					done()
				}))
			})
			it('15 - Should return the token info when the refresh_token is valid.', done => {
				const showResult = showIds('15')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.id_token, '03')
					assert.isOk(result.refresh_token, '04')

					const [errors, tokenInfo] = yield introspectHandler(
						{ ...payload, token:result.refresh_token, token_type_hint:'refresh_token' }, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, user_id, '07')
					assert.equal(tokenInfo.aud, aud, '08')
					assert.equal(tokenInfo.client_id, client_id, '09')
					assert.scopes(tokenInfo.scope, ['openid', 'offline_access'], 10)
					assert.equal(tokenInfo.token_type, 'Bearer', '13')

					if (showResult) console.log(tokenInfo)
					done()
				}))
			})
			it('16 - Should fail when the token is incorrect.', done => {
				const showResult = showIds('16')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(result, '02')
					assert.isOk(result.id_token, '03')
					assert.isOk(result.refresh_token, '04')

					const [errors] = yield introspectHandler(
						{ 
							...payload, 
							token:12344, 
							token_type_hint:'refresh_token',
						}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('17 - Should show active false when an expired access_token is passed in the authorization header.', done => {
				const showResult = showIds('17')
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
					const [codeErrors, access_token] = yield getValidAccessToken(eventHandlerStore)
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(access_token, '02')
					
					const [errors, tokenInfo] = yield introspectHandler(
						{ ...payload, token:access_token, token_type_hint:'access_token' }, eventHandlerStore)
					logE.push(errors)
					
					assert.isNotOk(errors, '01')
					assert.isOk(tokenInfo, '02')
					assert.isOk(tokenInfo.active === false, '03')

					if (showResult) console.log(tokenInfo)
					done()
				}))
			})
		})
	})
}



