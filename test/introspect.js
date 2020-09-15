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
const { handler:introspectHandler } = require('../src/introspect')
const grantTypePassword = require('../src/token/grantTypePassword')
const grantTypeAuthorizationCode = require('../src/token/grantTypeAuthorizationCode')
const eventRegister = require('../src/eventRegister')
const { MockStrategy } = require('./mock/handler')
const tokenHelper = require('./mock/token')

const strategy = new MockStrategy()

const registerAllHandlers = eventHandlerStore => {
	const registerEventHandler = eventRegister(eventHandlerStore)
	registerEventHandler(strategy)
}

describe('introspect', () => {
	describe('handler', () => {
		
		const payload = { client_id:'default', client_secret:123 }
		const user = { username: 'nic@cloudlessconsulting.com', password: 123456 }

		const getValidAccessToken = (eventHandlerStore) => co(function *() {
			const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, { 
				client_id:payload.client_id, 
				user, 
				scopes:['profile']
			})
			if (errors)
				return [errors, null]
			else
				return [null, result.access_token]
		})

		const getValidIdAndRefreshToken = (eventHandlerStore) => co(function *() {
			const stubbedServiceAccount = { client_id:'default', client_secret:123 }
			const [codeErrors, { token:code }] = yield eventHandlerStore.generate_authorization_code.exec({
				...stubbedServiceAccount, 
				user_id:1, 
				scopes:['profile', 'openid', 'offline_access']
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

		it('01 - Should fail when the \'get_token_claims\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield introspectHandler(payload, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_token_claims\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'get_service_account\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_token_claims', strategy.get_token_claims)
			co(function *() {
				const [errors] = yield introspectHandler(payload, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should return the token info when the access_token is valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, access_token] = yield getValidAccessToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(access_token, '02')
				
				const [errors, tokenInfo] = yield introspectHandler(
					{ ...payload, token:access_token, token_type_hint:'access_token' }, eventHandlerStore)
				
				assert.isNotOk(errors, '03')
				assert.isOk(tokenInfo, '04')
				assert.isOk(tokenInfo.active, '05')
				assert.equal(tokenInfo.iss, 'https://userin.com', '06')
				assert.equal(tokenInfo.sub, 1, '07')
				assert.equal(tokenInfo.aud, 'https://unittest.com', '08')
				assert.equal(tokenInfo.client_id, 'default', '09')
				assert.equal(tokenInfo.scope, 'profile', '10')
				assert.equal(tokenInfo.token_type, 'Bearer', '11')

				done()
			}).catch(done)
		})
		it('04 - Should return the token info when the id_token is valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors, tokenInfo] = yield introspectHandler(
					{ ...payload, token:result.id_token, token_type_hint:'id_token' }, eventHandlerStore)

				assert.isNotOk(errors, '03')
				assert.isOk(tokenInfo, '04')
				assert.isOk(tokenInfo.active, '05')
				assert.equal(tokenInfo.iss, 'https://userin.com', '06')
				assert.equal(tokenInfo.sub, 1, '07')
				assert.equal(tokenInfo.aud, 'https://unittest.com', '08')
				assert.equal(tokenInfo.client_id, 'default', '09')
				assert.equal(tokenInfo.scope, 'profile openid offline_access', '10')
				assert.equal(tokenInfo.token_type, 'Bearer', '11')

				done()
			}).catch(done)
		})
		it('05 - Should return the token info when the refresh_token is valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors, tokenInfo] = yield introspectHandler(
					{ ...payload, token:result.refresh_token, token_type_hint:'refresh_token' }, eventHandlerStore)

				assert.isNotOk(errors, '03')
				assert.isOk(tokenInfo, '04')
				assert.isOk(tokenInfo.active, '05')
				assert.equal(tokenInfo.iss, 'https://userin.com', '06')
				assert.equal(tokenInfo.sub, 1, '07')
				assert.equal(tokenInfo.aud, 'https://unittest.com', '08')
				assert.equal(tokenInfo.client_id, 'default', '09')
				assert.equal(tokenInfo.scope, 'profile openid offline_access', '10')
				assert.equal(tokenInfo.token_type, 'Bearer', '11')

				done()
			}).catch(done)
		})
		it('06 - Should fail when the client_id is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors] = yield introspectHandler(
					{ 
						...payload, 
						token:result.refresh_token, 
						token_type_hint:'refresh_token',
						client_id:null
					}, eventHandlerStore)

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '06')

				done()
			}).catch(done)
		})
		it('07 - Should fail when the client_secret is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors] = yield introspectHandler(
					{ 
						...payload, 
						token:result.refresh_token, 
						token_type_hint:'refresh_token',
						client_secret:null
					}, eventHandlerStore)

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '06')

				done()
			}).catch(done)
		})
		it('08 - Should fail when the token is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors] = yield introspectHandler(
					{ 
						...payload, 
						token:null, 
						token_type_hint:'refresh_token',
					}, eventHandlerStore)

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token\'') >= 0), '06')

				done()
			}).catch(done)
		})
		it('09 - Should fail when the token_type_hint is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors] = yield introspectHandler(
					{ 
						...payload, 
						token:result.refresh_token, 
						token_type_hint:null,
					}, eventHandlerStore)

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'token_type_hint\'') >= 0), '06')

				done()
			}).catch(done)
		})
		it('10 - Should fail when the token is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
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

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '06')

				done()
			}).catch(done)
		})
		it('11 - Should fail when the client_id and client_secret are not the service account associated with the token.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, result] = yield getValidIdAndRefreshToken(eventHandlerStore)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.id_token, '03')
				assert.isOk(result.refresh_token, '04')

				const [errors] = yield introspectHandler(
					{ 
						...payload, 
						token:result.refresh_token, 
						token_type_hint:'refresh_token',
						client_id: 'fraudster',
						client_secret:456
					}, eventHandlerStore)

				assert.isOk(errors, '05')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('client_id not found') >= 0), '06')

				done()
			}).catch(done)
		})
		it('12 - Should show active false when an expired access_token is passed in the authorization header.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const access_token = tokenHelper.createExpired({
					iss: 'https://userin.com',
					sub: 1,
					aud: 'https://unittest.com',
					client_id: 'default',
					scope: 'profile email phone address'
				})
				const [errors, tokenInfo] = yield introspectHandler(
					{ ...payload, token:access_token, token_type_hint:'access_token' }, eventHandlerStore)
				
				assert.isNotOk(errors, '01')
				assert.isOk(tokenInfo, '02')
				assert.isOk(tokenInfo.active === false, '03')

				done()
			}).catch(done)
		})
	})
})



