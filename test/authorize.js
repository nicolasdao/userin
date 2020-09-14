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
const processTheFIPuser = require('../src/authorize/processTheFIPuser')
const eventRegister = require('../src/eventRegister')
const { MockStrategy } = require('./mock/handler')

const strategy = new MockStrategy()

const registerAllHandlers = eventHandlerStore => {
	const registerEventHandler = eventRegister(eventHandlerStore)
	registerEventHandler(strategy)
}

describe('authorize', () => {
	describe('processTheFIPuser', () => {
		
		const payload = { client_id: 'default', strategy: 'facebook', user:{ id:23 }, response_type:'code' }

		it('01 - Should fail when the \'get_service_account\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'get_fip_user\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			co(function *() {
				const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_fip_user\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should fail when the \'generate_token\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			registerEventHandler('get_fip_user', strategy.get_fip_user)
			co(function *() {
				const [errors] = yield processTheFIPuser(payload, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('04 - Should fail when the user is missing.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					user: null					
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user\'') >= 0), '03')
				done()
			}).catch(done)
		})
		it('05 - Should fail when the strategy is missing.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					strategy: null					
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'strategy\'') >= 0), '03')
				done()
			}).catch(done)
		})
		it('06 - Should fail when the response_type is missing.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					response_type: null					
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('\'response_type\' is required') >= 0), '03')
				done()
			}).catch(done)
		})
		it('07 - Should fail when the response_type is not supported.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					response_type: 'cola'					
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('The value \'cola\' is not a supported OIDC \'response_type\'') >= 0), '03')
				done()
			}).catch(done)
		})
		it('08 - Should fail when the scopes is not allowed.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					scopes:['hello', 'world']					
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Access to scopes hello, world is not allowed') >= 0), '03')
				done()
			}).catch(done)
		})
		it('09 - Should fail when the user.id is not defined.', done => {
			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)
			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,			
					user:{}	
				}, eventHandlerStore)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'id\' property in the \'user\' object') >= 0), '03')
				done()
			}).catch(done)
		})
		it('10 - Should fail when the client_id and client_secret are from an unauthorized account.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield processTheFIPuser({
					...payload,
					client_id: 'fraudster'			
				}, eventHandlerStore)
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid client_id') >= 0), '03')

				done()
			}).catch(done)
		})
		it('11 - Should return an access_token when the username and password are valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield processTheFIPuser({
					...payload,	
					scopes: ['profile']	
				}, eventHandlerStore)
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isNotOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')

				assert.equal(result.scope, 'profile', '08')

				done()
			}).catch(done)
		})
		it('12 - Should return an access_token and a valid id_token when the username and password are valid and the scopes contain \'openid\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield processTheFIPuser({
					...payload,		
					scopes: ['profile', 'openid']
				}, eventHandlerStore)
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')

				const claims = jwt.decode(result.id_token)
				assert.isOk(claims, '11')
				assert.equal(claims.sub, 1, '12')
				assert.isOk(claims.aud != undefined, '13')
				assert.equal(claims.client_id, 'default', '14')
				assert.equal(claims.scope, 'profile openid', '15')
				assert.isOk(claims.exp != undefined, '16')
				assert.isOk(claims.iat != undefined, '17')
				assert.equal(claims.given_name, 'Nic', '18')
				assert.equal(claims.family_name, 'Dao', '19')
				assert.equal(claims.zoneinfo, 'Australia/Sydney', '20')

				assert.equal(result.scope, 'profile openid', '21')

				done()
			}).catch(done)
		})
		it('13 - Should not return a refresh_token when the username and password are valid and the scopes contain \'offline_access\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield processTheFIPuser({
					...payload,	
					scopes: ['profile', 'openid', 'offline_access']	
				}, eventHandlerStore)
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')

				const claims = jwt.decode(result.id_token)
				assert.isOk(claims, '11')
				assert.equal(claims.sub, 1, '12')
				assert.isOk(claims.aud != undefined, '13')
				assert.equal(claims.client_id, 'default', '14')
				assert.equal(claims.scope, 'profile openid offline_access', '15')
				assert.isOk(claims.exp != undefined, '16')
				assert.isOk(claims.iat != undefined, '17')
				assert.equal(claims.given_name, 'Nic', '18')
				assert.equal(claims.family_name, 'Dao', '19')
				assert.equal(claims.zoneinfo, 'Australia/Sydney', '20')

				assert.equal(result.scope, 'profile openid offline_access', '21')

				done()
			}).catch(done)
		})
	})
})



