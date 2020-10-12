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
const { error:{ mergeErrors } } = require('puffy')
const { handler:introspectHandler } = require('../introspect')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn, getUserInServer } = require('./_core')
const { assert } = chai
setUpScopeAssertion(assert)

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
module.exports = function runTest (data, skip, showResults=[]) {
	const { userIn, stub:{ client, altClient, privateClient } } = data || {}

	const strategy = userIn.strategy
	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const { version='v1' } = userIn.config || {}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const showIds = createShowTestResultFn(showResults, 'introspect.handler')

	const getAccessToken = (eventHandlerStore, client_id, user_id, scopes=[]) => co(function *() {
		const [errors, result] = yield eventHandlerStore.generate_openid_access_token.exec({
			client_id,
			user_id, 
			scopes
		})

		if (errors)
			throw mergeErrors(errors)
		
		const { token } = result

		return token
	})

	const getIdToken = (eventHandlerStore, client_id, user_id, scopes=[]) => co(function *() {
		const [errors, result] = yield eventHandlerStore.generate_openid_id_token.exec({
			client_id,
			user_id, 
			scopes
		})

		if (errors)
			throw mergeErrors(errors)
		
		const { token } = result

		return token
	})

	const getRefreshToken = (eventHandlerStore, client_id, user_id, scopes=[]) => co(function *() {
		const [errors, result] = yield eventHandlerStore.generate_openid_refresh_token.exec({
			client_id,
			user_id, 
			scopes
		})

		if (errors)
			throw mergeErrors(errors)
		
		const { token } = result

		return token
	})

	fn('introspect', () => {
		describe('handler', () => {

			it('01 - Should fail when the token_type_hint is missing.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler({ 
						client_id:client.id, client_secret:client.secret, 
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
							client_id:client.id, client_secret:client.secret, 
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
						client_id:client.id, client_secret:client.secret,
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
						client_id:client.id, 
						client_secret:client.secret,
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
						client_id:client.id, 
						client_secret:client.secret,
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
						client_id:client.id,
						client_secret:client.secret,
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
					const [errors] = yield introspectHandler({ 
						client_id:null,
						client_secret:client.secret, 
						token:'123', 
						token_type_hint:'refresh_token'
					}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('08 - Should fail when the token is missing.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
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
			it('09 - Should fail when the client_secret is missing and the client is configured to require it.', done => {
				const showResult = showIds('09')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield introspectHandler({ 
						client_id: privateClient.id,
						client_secret:null,
						token:'123', 
						token_type_hint:'refresh_token'
					}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '06')

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
					const [errors] = yield introspectHandler({ 
						token:'123', 
						token_type_hint:'refresh_token',
						client_id: privateClient.id,
						client_secret:'GYUE&((#VYVV(V'
					}, eventHandlerStore)
					logE.push(errors)

					assert.isOk(errors, '05')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('client_id not found') >= 0), '06')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('11 - Should fail when the client_id are not identifying the client associated with the token.', done => {
				const showResult = showIds('11')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const token = yield getRefreshToken(eventHandlerStore, client.id, client.user.id)

					const [errors] = yield introspectHandler({ 
						client_id: altClient.id, 
						client_secret:client.secret, 
						token, 
						token_type_hint:'refresh_token'
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
					const [errors] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
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
					const access_token = yield getAccessToken(eventHandlerStore, client.id, client.user.id)

					assert.isOk(access_token, '02')
					
					const [errors, tokenInfo] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
						token:access_token, 
						token_type_hint:'access_token' 
					}, eventHandlerStore)
					logE.push(errors)
					
					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, client.user.id, '07')
					assert.equal(tokenInfo.client_id, client.id, '09')
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
					const token = yield getIdToken(eventHandlerStore, client.id, client.user.id, ['openid', 'offline_access'])

					const [errors, tokenInfo] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
						token, 
						token_type_hint:'id_token' 
					}, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, client.user.id, '07')
					assert.equal(tokenInfo.client_id, client.id, '09')
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
					const token = yield getRefreshToken(eventHandlerStore, client.id, client.user.id, ['openid', 'offline_access'])

					const [errors, tokenInfo] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
						token, 
						token_type_hint:'refresh_token' 
					}, eventHandlerStore)
					logE.push(errors)

					assert.isNotOk(errors, '03')
					assert.isOk(tokenInfo, '04')
					assert.isOk(tokenInfo.active, '05')
					assert.equal(tokenInfo.iss, strategy.config.iss, '06')
					assert.equal(tokenInfo.sub, client.user.id, '07')
					assert.equal(tokenInfo.client_id, client.id, '09')
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
					const [errors] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
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
					const access_token = yield getAccessToken(eventHandlerStore, client.id, client.user.id)

					assert.isOk(access_token, '02')
					
					const [errors, tokenInfo] = yield introspectHandler({ 
						client_id:client.id, 
						client_secret:client.secret, 
						token:access_token, 
						token_type_hint:'access_token' 
					}, eventHandlerStore)
					logE.push(errors)
					
					assert.isNotOk(errors, '01')
					assert.isOk(tokenInfo, '02')
					assert.isOk(tokenInfo.active === false, '03')

					if (showResult) console.log(tokenInfo)
					done()
				}))
			})
		})

		describe('/introspect', () => {	
			const showIds = createShowTestResultFn(showResults, 'introspect/introspect')		

			it('01 - Should fail when the token_type_hint is missing.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({

					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'token_type_hint\'', '03')					

					server.close()
					done()
				}))
			})
			it('02 - Should fail when the token_type_hint is invalid.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'hello'
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'token_type_hint \'hello\' is not supported', '03')					

					server.close()
					done()
				}))
			})
			it('03 - Should fail when the client_id is missing.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'refresh_token'
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'client_id\'', '03')					

					server.close()
					done()
				}))
			})
			it('04 - Should fail when the token is missing.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint: 'refresh_token',
						client_id: client.id
					})

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
			it('05 - Should fail when the client_secret is missing and the client\'s auth_methods contain \'client_secret_post\'.', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint: 'refresh_token',
						token: '123',
						client_id: privateClient.id
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request','02')
					assert.include(body.error_description, 'Missing required \'client_secret\'', '03')					

					server.close()
					done()
				}))
			})
			it('06 - Should fail when the client_secret is invalid and the client\'s auth_methods contain \'client_secret_post\'.', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint: 'refresh_token',
						token: '123',
						client_id: privateClient.id,
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
			it('07 - Should return the access_token details when a valid access_token is provided without a client_secret and the client\'s auth_methods is not configured.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getAccessToken(userIn.eventHandlerStore, client.id, client.user.id)
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'access_token',
						token,
						client_id: client.id
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, client.user.id, '03')
					assert.equal(body.client_id, client.id, '04')
					assert.equal(body.active, true, '05')
					assert.isAbove(body.exp*1000, Date.now(), '06')

					server.close()
					done()
				}))
			})
			it('08 - Should return the access_token details when a valid access_token is provided with a valid client_secret and the client\'s auth_methods contain \'client_secret_post\'.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getAccessToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)

					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'access_token',
						token,
						client_id: privateClient.id,
						client_secret: privateClient.secret
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, privateClient.user.id, '03')
					assert.equal(body.client_id, privateClient.id, '04')
					assert.equal(body.active, true, '05')
					assert.isAbove(body.exp*1000, Date.now(), '06')				

					server.close()
					done()
				}))
			})
			it('09 - Should return the id_token details when a valid id_token is provided without a client_secret and the client\'s auth_methods is not configured.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getIdToken(userIn.eventHandlerStore, client.id, client.user.id)
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'id_token',
						token,
						client_id: client.id
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, client.user.id, '03')
					assert.equal(body.client_id, client.id, '04')
					assert.equal(body.active, true, '05')
					assert.isAbove(body.exp*1000, Date.now(), '06')

					server.close()
					done()
				}))
			})
			it('10 - Should return the id_token details when a valid id_token is provided with a valid client_secret and the client\'s auth_methods contain \'client_secret_post\'.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getIdToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)

					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'id_token',
						token,
						client_id: privateClient.id,
						client_secret: privateClient.secret
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, privateClient.user.id, '03')
					assert.equal(body.client_id, privateClient.id, '04')
					assert.equal(body.active, true, '05')
					assert.isAbove(body.exp*1000, Date.now(), '06')				

					server.close()
					done()
				}))
			})
			it('11 - Should return the refresh_token details when a valid refresh_token is provided without a client_secret and the client\'s auth_methods is not configured.', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getRefreshToken(userIn.eventHandlerStore, client.id, client.user.id)
					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'refresh_token',
						token,
						client_id: client.id
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, client.user.id, '03')
					assert.equal(body.client_id, client.id, '04')
					assert.equal(body.active, true, '05')

					server.close()
					done()
				}))
			})
			it('12 - Should return the refresh_token details when a valid refresh_token is provided with a valid client_secret and the client\'s auth_methods contain \'client_secret_post\'.', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				logE.run(co(function *() {
					const token = yield getRefreshToken(userIn.eventHandlerStore, privateClient.id, privateClient.user.id)

					const { server, app } = yield getUserInServer(userIn)
					const { status, body={} } = yield chai.request(app).post(`/oauth2/${version}/introspect`).send({
						token_type_hint:'refresh_token',
						token,
						client_id: privateClient.id,
						client_secret: privateClient.secret
					})

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 200, '01')
					assert.isOk(body,'02')
					assert.equal(body.sub, privateClient.user.id, '03')
					assert.equal(body.client_id, privateClient.id, '04')
					assert.equal(body.active, true, '05')			

					server.close()
					done()
				}))
			})
		})
	})
}



