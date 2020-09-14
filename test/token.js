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
const grantTypeAuthorizationCode = require('../src/token/grantTypeAuthorizationCode')
const grantTypeClientCredentials = require('../src/token/grantTypeClientCredentials')
const grantTypePassword = require('../src/token/grantTypePassword')
const grantTypeRefreshToken = require('../src/token/grantTypeRefreshToken')
const eventRegister = require('../src/eventRegister')
const { MockStrategy } = require('./mock/handler')
const tokenHelper = require('./mock/token')

const strategy = new MockStrategy

const registerAllHandlers = eventHandlerStore => {
	const registerEventHandler = eventRegister(eventHandlerStore)
	registerEventHandler(strategy)
}

describe('token', () => {
	describe('grantTypeAuthorizationCode', () => {
		
		const stubbedServiceAccount = { client_id:'default', client_secret:123, scopes:['profile'] }
		const stubbedUser = { user_id:1 }
		const stubbedPayload = { ...stubbedServiceAccount, ...stubbedUser, code:123 }

		it('01 - Should fail when the \'get_service_account\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'get_token_claims\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			co(function *() {
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_token_claims\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should fail when the \'generate_token\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			registerEventHandler('get_token_claims', strategy.get_token_claims)
			co(function *() {
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, stubbedPayload)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('04 - Should return an access_token when the code is valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(stubbedPayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
					
				assert.isNotOk(errors, '04')
				assert.isOk(result, '05')
				assert.isOk(result.access_token, '06')
				assert.equal(result.token_type, 'bearer', '07')
				assert.equal(result.expires_in, 3600, '08')
				assert.isNotOk(result.id_token, '09')
				assert.isNotOk(result.refresh_token, '10')
				assert.equal(result.scope, 'profile', '11')

				done()
			}).catch(done)
		})
		it('05 - Should return an access_token and a valid id_token when the code is valid and the scopes include \'openid\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
					
				assert.isNotOk(errors, '04')
				assert.isOk(result, '05')
				assert.isOk(result.access_token, '06')
				assert.equal(result.token_type, 'bearer', '07')
				assert.equal(result.expires_in, 3600, '08')
				assert.isOk(result.id_token, '09')
				assert.isNotOk(result.refresh_token, '10')

				const claims = jwt.decode(result.id_token)
				assert.isOk(claims, '11')
				assert.equal(claims.iss, 'https://userin.com', '12')
				assert.equal(claims.sub, 1, '13')
				assert.isOk(claims.aud != undefined, '14')
				assert.equal(claims.client_id, 'default', '15')
				assert.equal(claims.scope, 'openid', '16')
				assert.isOk(claims.exp != undefined, '17')
				assert.isOk(claims.iat != undefined, '18')
				assert.equal(claims.given_name, 'Nic', '19')
				assert.equal(claims.family_name, 'Dao', '20')
				assert.equal(claims.zoneinfo, 'Australia/Sydney', '21')
				assert.isOk(claims.email === undefined, '22')
				assert.isOk(claims.email_verified === undefined, '23')

				assert.equal(result.scope, 'openid', '24')

				done()
			}).catch(done)
		})
		it('06 - Should return an access_token, an id_token and a refresh_token when the code is valid and the scopes include \'openid\' and \'offline_access\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'offline_access'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
					
				assert.isNotOk(errors, '04')
				assert.isOk(result, '05')
				assert.isOk(result.access_token, '06')
				assert.equal(result.token_type, 'bearer', '07')
				assert.equal(result.expires_in, 3600, '08')
				assert.isOk(result.id_token, '09')
				assert.isOk(result.refresh_token, '10')

				assert.equal(result.scope, 'openid offline_access', '11')

				done()
			}).catch(done)
		})
		it('07 - Should return a valid id_token with email claims when the code is valid and the scopes include \'openid\', \'profile\', \'email\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:codeResults.token })
					
				assert.isNotOk(errors, '04')
				assert.isOk(result, '05')
				assert.isOk(result.access_token, '06')
				assert.equal(result.token_type, 'bearer', '07')
				assert.equal(result.expires_in, 3600, '08')
				assert.isOk(result.id_token, '09')
				assert.isNotOk(result.refresh_token, '10')

				const claims = jwt.decode(result.id_token)
				assert.isOk(claims, '11')
				assert.equal(claims.sub, 1, '12')
				assert.isOk(claims.aud != undefined, '13')
				assert.equal(claims.client_id, 'default', '14')
				assert.equal(claims.scope, 'openid profile email', '15')
				assert.isOk(claims.exp != undefined, '16')
				assert.isOk(claims.iat != undefined, '17')
				assert.equal(claims.given_name, 'Nic', '18')
				assert.equal(claims.family_name, 'Dao', '19')
				assert.equal(claims.zoneinfo, 'Australia/Sydney', '20')
				assert.equal(claims.email, 'nic@cloudlessconsulting.com', '21')
				assert.equal(claims.email_verified, true, '22')

				assert.equal(result.scope, 'openid profile email', '23')

				done()
			}).catch(done)
		})
		it('08 - Should fail when the code has expired.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const { token:code } = tokenHelper.createExpired({
					iss: 'https://userin.com',
					sub: stubbedUser.user_id,
					aud: '',
					client_id: stubbedServiceAccount.client_id,
					scope: 'openid profile email'
				})

				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Token or code has expired') >= 0), '02')

				done()
			}).catch(done)
		})
		it('09 - Should fail when the client_id is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedPayload, 
					code:codeResults.token, 
					client_id:'fraudster' 
				})
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

				done()
			}).catch(done)
		})
		it('10 - Should fail when the client_id is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedPayload, 
					code:codeResults.token, 
					client_id:null 
				})
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('11 - Should fail when the client_secret is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedPayload, 
					code:codeResults.token, 
					client_secret:null 
				})
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('12 - Should fail when the code is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			const codePayload = { ...stubbedPayload, scopes:['openid', 'profile', 'email'] }

			co(function *() {
				const [codeErrors, codeResults] = yield eventHandlerStore.generate_authorization_code.exec(codePayload)
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(codeResults, '02')
				assert.isOk(codeResults.token, '03')
				
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
					...stubbedPayload, 
					code:null
				})
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'code\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('13 - Should fail when the code is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { ...stubbedPayload, code:123 })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid authorization code') >= 0), '02')

				done()
			}).catch(done)
		})
	})
	describe('grantTypeClientCredentials', () => {
		
		const stubbedServiceAccount = { client_id:'default', client_secret:123, scopes:['profile'] }

		it('01 - Should fail when the \'get_service_account\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'generate_token\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should return an access_token when the credentials are valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, stubbedServiceAccount)
					
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
		it('04 - Should fail when the client_id is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
					...stubbedServiceAccount,
					client_id:null
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('05 - Should fail when the client_secret is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
					...stubbedServiceAccount,
					client_secret:null
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_secret\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('05 - Should fail when the scopes are not allowed.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
					...stubbedServiceAccount,
					scopes:['billing']
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Access to scope billing is not allowed') >= 0), '02')

				done()
			}).catch(done)
		})
		it('06 - Should fail when the client_id is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
					...stubbedServiceAccount,
					client_id:1234
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Service account 1234 not found') >= 0), '02')

				done()
			}).catch(done)
		})
		it('07 - Should fail when the client_secret is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeClientCredentials.exec(eventHandlerStore, { 
					...stubbedServiceAccount,
					client_secret:1234
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '02')

				done()
			}).catch(done)
		})
		it('08 - Should not return an id_token when the credentials are valid even when the \'openid\' scope is provided.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
					...stubbedServiceAccount,
					scopes:['profile', 'openid']
				})
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isNotOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')

				assert.equal(result.scope, 'profile openid', '08')

				done()
			}).catch(done)
		})
		it('09 - Should not return a refresh_token when the credentials are valid even when the \'offline_access\' scope is provided.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypeClientCredentials.exec(eventHandlerStore, {
					...stubbedServiceAccount,
					scopes:['profile', 'openid', 'offline_access']
				})
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isNotOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')

				assert.equal(result.scope, 'profile openid offline_access', '08')

				done()
			}).catch(done)
		})
	})
	describe('grantTypePassword', () => {
		
		const stubbedUser = { 
			client_id:'default', 
			user:{ 
				username: 'nic@cloudlessconsulting.com',
				password: 123456
			}, 
			scopes:['profile']
		}

		it('01 - Should fail when the \'get_service_account\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'get_end_user\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_end_user\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should fail when the \'generate_token\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_service_account', strategy.get_service_account)
			registerEventHandler('get_end_user', strategy.get_end_user)
			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('04 - Should return an access_token when the username and password are valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, stubbedUser)
					
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
		it('05 - Should return an access_token and a valid id_token when the username and password are valid and the scopes contain \'openid\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid']
				})
					
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
		it('06 - Should not return a refresh_token when the username and password are valid and the scopes contain \'offline_access\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access']
				})
					
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
		it('07 - Should fail when the client_id is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
					client_id: null
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('08 - Should fail when the user is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
					user: null
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('09 - Should fail when the user.username is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
					user: {
						username:null,
						password:123
					}
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.username\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('10 - Should fail when the user.password is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
					user: {
						username:123,
						password:null
					}
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'user.password\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('11 - Should fail when the username and password are incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'offline_access'],
					user: {
						username:stubbedUser.user.username,
						password:876
					}
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Incorrect username or password') >= 0), '03')

				done()
			}).catch(done)
		})
		it('12 - Should fail when scopes are not allowed.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					scopes: [...stubbedUser.scopes, 'openid', 'restricted']
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Access to scope restricted is not allowed') >= 0), '03')

				done()
			}).catch(done)
		})
		it('13 - Should fail when the client_id and client_secret are from an unauthorized account.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypePassword.exec(eventHandlerStore, {
					...stubbedUser,
					client_id: 'fraudster'
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid client_id') >= 0), '03')

				done()
			}).catch(done)
		})
	})
	describe('grantTypeRefreshToken', () => {
		
		const stubbedPayload = { 
			client_id:'default'
		}

		const getValidRefreshToken = (eventHandlerStore, scopes) => co(function *() {
			const stubbedServiceAccount = { client_id:'default', client_secret:123 }
			const [, { token:code }] = yield eventHandlerStore.generate_authorization_code.exec({
				...stubbedServiceAccount, 
				user_id:1, 
				scopes
			})
			const [, result] = yield grantTypeAuthorizationCode.exec(eventHandlerStore, { 
				...stubbedServiceAccount, 
				code 
			})
			return result.refresh_token
		})

		it('01 - Should fail when the \'get_token_claims\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
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
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_service_account\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should fail when the \'generate_token\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_token_claims', strategy.get_token_claims)
			registerEventHandler('get_service_account', strategy.get_service_account)
			co(function *() {
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, stubbedPayload)
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'generate_token\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('04 - Should return an access_token when a valid refresh_token is provided.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['profile', 'offline_access'])
				const [errors, result] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload,
					refresh_token
				})
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isNotOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')
				assert.equal(result.scope, 'profile offline_access', '08')

				done()
			}).catch(done)
		})
		it('05 - Should return an access_token and a valid id_token when a valid refresh_token is provided and the scopes contain \'openid\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['profile', 'offline_access', 'openid'])
				const [errors, result] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload,
					refresh_token
				})
					
				assert.isNotOk(errors, '01')
				assert.isOk(result, '02')
				assert.isOk(result.access_token, '03')
				assert.equal(result.token_type, 'bearer', '04')
				assert.equal(result.expires_in, 3600, '05')
				assert.isOk(result.id_token, '06')
				assert.isNotOk(result.refresh_token, '07')
				assert.equal(result.scope, 'profile offline_access openid', '08')

				const claims = jwt.decode(result.id_token)
				assert.isOk(claims, '09')
				assert.equal(claims.sub, 1, '10')
				assert.isOk(claims.aud != undefined, '11')
				assert.equal(claims.client_id, 'default', '12')
				assert.equal(claims.scope, 'profile offline_access openid', '13')
				assert.isOk(claims.exp != undefined, '14')
				assert.isOk(claims.iat != undefined, '15')
				assert.equal(claims.given_name, 'Nic', '16')
				assert.equal(claims.family_name, 'Dao', '17')
				assert.equal(claims.zoneinfo, 'Australia/Sydney', '18')

				done()
			}).catch(done)
		})
		it('07 - Should fail when the client_id is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['profile', 'offline_access', 'openid'])
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload,
					refresh_token,
					client_id:null
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'client_id\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('08 - Should fail when the refresh_token is missing.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'refresh_token\'') >= 0), '03')

				done()
			}).catch(done)
		})
		it('09 - Should fail when the client_id is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const refresh_token = yield getValidRefreshToken(eventHandlerStore, ['profile', 'offline_access', 'openid'])
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload,
					refresh_token,
					client_id:'fraudster'
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Unauthorized access') >= 0), '03')

				done()
			}).catch(done)
		})
		it('10 - Should fail when the refresh_token is incorrect.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield grantTypeRefreshToken.exec(eventHandlerStore, { 
					...stubbedPayload,
					refresh_token:123
				})
					
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid refresh_token') >= 0), '03')

				done()
			}).catch(done)
		})
	})
})



