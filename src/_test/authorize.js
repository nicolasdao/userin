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
const processTheFIPuser = require('../authorize/processTheFIPuser')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors } = require('./_core')
setUpScopeAssertion(assert)

module.exports = function runTest (data, skip, verboseLog) {
	const { clientId:client_id, identityProvider, identityProviderUserId, userId, altClientId, strategy } = data
	const registerAllHandlers = eventHandlerStore => {
		const registerEventHandler = eventRegister(eventHandlerStore)
		registerEventHandler(strategy)
	}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors(verboseLog)

	fn('authorize', () => {
		describe('processTheFIPuser', () => {
			
			const payload = { client_id, strategy:identityProvider, user:{ id:identityProviderUserId }, response_type:'code' }

			it('01 - Should fail when the \'get_client\' event handler is not defined.', done => {
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
					done()
				}))
			})
			it('02 - Should fail when the \'get_fip_user\' event handler is not defined.', done => {
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_fip_user\' handler') >= 0), '03')
					done()
				}))
			})
			it('03 - Should fail when the \'generate_token\' event handler is not defined.', done => {
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_client', strategy.get_client)
				registerEventHandler('get_fip_user', strategy.get_fip_user)
				logE.run(co(function *() {
					const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
					done()
				}))
			})
			it('04 - Should fail when the user is missing.', done => {
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
					done()
				}))
			})
			it('05 - Should fail when the strategy is missing.', done => {
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
					done()
				}))
			})
			it('06 - Should fail when the response_type is missing.', done => {
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
					assert.isOk(errors.some(e => e.message && e.message.indexOf('\'response_type\' is required') >= 0), '03')
					done()
				}))
			})
			it('07 - Should fail when the response_type is not supported.', done => {
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
					done()
				}))
			})
			it('08 - Should fail when the scopes is not allowed.', done => {
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
					done()
				}))
			})
			it('09 - Should fail when the user.id is not defined.', done => {
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
					done()
				}))
			})
			it('10 - Should fail when the client_id and client_secret are from an unauthorized account.', done => {
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

					done()
				}))
			})
			it('11 - Should return an access_token when the FIP user ID exists.', done => {
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
					assert.isOk(result.access_token, '03')
					assert.equal(result.token_type, 'bearer', '04')
					assert.equal(result.expires_in, 3600, '05')
					assert.isNotOk(result.id_token, '06')
					assert.isNotOk(result.refresh_token, '07')

					done()
				}))
			})
			it('12 - Should return an access_token and a valid id_token when FIP user ID exists and the scopes contain \'openid\'.', done => {
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,		
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
					done()
				}))
			})
			it('13 - Should not return a refresh_token when FIP user ID exists and the scopes contain \'offline_access\'.', done => {
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors, result] = yield processTheFIPuser({
						...payload,	
						scopes: ['openid', 'offline_access']	
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
					assert.scopes(claims.scope, ['openid', 'offline_access'], 15)
					assert.isOk(claims.exp != undefined, '18')
					assert.isOk(claims.iat != undefined, '19')
					assert.scopes(result.scope, ['openid', 'offline_access'], 20)

					done()
				}))
			})
		})
	})
}



