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
const { handler:userInfoHandler } = require('../src/userinfo')
const grantTypePassword = require('../src/token/grantTypePassword')
const eventRegister = require('../src/eventRegister')
const { MockStrategy } = require('./mock/handler')
const tokenHelper = require('./mock/token')

const strategy = new MockStrategy()

const registerAllHandlers = eventHandlerStore => {
	const registerEventHandler = eventRegister(eventHandlerStore)
	registerEventHandler(strategy)
}

describe('userinfo', () => {
	describe('handler', () => {
		
		const client_id = 'default'
		const user = { username: 'nic@cloudlessconsulting.com', password: 123456 }

		const getValidAccessToken = (eventHandlerStore, scopes) => co(function *() {
			const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, { client_id, user, scopes })
			if (errors)
				return [errors, null]
			else
				return [null, `Bearer ${result.access_token}`]
		})

		it('01 - Should fail when the \'get_token_claims\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			co(function *() {
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'' })
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_token_claims\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('02 - Should fail when the \'get_identity_claims\' event handler is not defined.', done => {
			const eventHandlerStore = {}
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler('get_token_claims', strategy.get_token_claims)
			co(function *() {
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'' })
				assert.isOk(errors, '01')
				assert.isOk(errors.length, '02')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_identity_claims\' handler') >= 0), '03')
				done()
			}).catch(done)
		})
		it('03 - Should return the userinfo when the access_token is valid.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, ['profile'])
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(authorization, '02')
				
				const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					
				assert.isNotOk(errors, '03')
				assert.isOk(userinfo, '04')
				assert.isOk(userinfo.active, '05')
				assert.equal(userinfo.given_name, 'Nic', '06')
				assert.equal(userinfo.family_name, 'Dao', '07')
				assert.equal(userinfo.zoneinfo, 'Australia/Sydney', '08')
				assert.isOk(userinfo.email === undefined, '09')
				assert.isOk(userinfo.email_verified === undefined, '10')
				assert.isOk(userinfo.address === undefined, '11')
				assert.isOk(userinfo.phone === undefined, '12')
				assert.isOk(userinfo.phone_number_verified === undefined, '13')

				done()
			}).catch(done)
		})
		it('04 - Should return the userinfo with email when the access_token is valid and the scopes contain \'email\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, ['profile', 'email'])
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(authorization, '02')
				
				const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					
				assert.isNotOk(errors, '03')
				assert.isOk(userinfo, '04')
				assert.isOk(userinfo.active, '05')
				assert.equal(userinfo.given_name, 'Nic', '06')
				assert.equal(userinfo.family_name, 'Dao', '07')
				assert.equal(userinfo.zoneinfo, 'Australia/Sydney', '08')
				assert.isOk(userinfo.email === 'nic@cloudlessconsulting.com', '09')
				assert.isOk(userinfo.email_verified === true, '10')
				assert.isOk(userinfo.address === undefined, '11')
				assert.isOk(userinfo.phone === undefined, '12')
				assert.isOk(userinfo.phone_number_verified === undefined, '13')

				done()
			}).catch(done)
		})
		it('05 - Should return the userinfo with phone when the access_token is valid and the scopes contain \'phone\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, ['profile', 'email', 'phone'])
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(authorization, '02')
				
				const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					
				assert.isNotOk(errors, '03')
				assert.isOk(userinfo, '04')
				assert.isOk(userinfo.active, '05')
				assert.equal(userinfo.given_name, 'Nic', '06')
				assert.equal(userinfo.family_name, 'Dao', '07')
				assert.equal(userinfo.zoneinfo, 'Australia/Sydney', '08')
				assert.isOk(userinfo.email === 'nic@cloudlessconsulting.com', '09')
				assert.isOk(userinfo.email_verified === true, '10')
				assert.isOk(userinfo.address === undefined, '11')
				assert.isOk(userinfo.phone === '+6112345678', '12')
				assert.isOk(userinfo.phone_number_verified === false, '13')

				done()
			}).catch(done)
		})
		it('06 - Should return the userinfo with address when the access_token is valid and the scopes contain \'address\'.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, ['profile', 'email', 'phone', 'address'])
				
				assert.isNotOk(codeErrors, '01')
				assert.isOk(authorization, '02')
				
				const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					
				assert.isNotOk(errors, '03')
				assert.isOk(userinfo, '04')
				assert.isOk(userinfo.active, '05')
				assert.equal(userinfo.given_name, 'Nic', '06')
				assert.equal(userinfo.family_name, 'Dao', '07')
				assert.equal(userinfo.zoneinfo, 'Australia/Sydney', '08')
				assert.isOk(userinfo.email === 'nic@cloudlessconsulting.com', '09')
				assert.isOk(userinfo.email_verified === true, '10')
				assert.isOk(userinfo.address === 'Some street in Sydney', '11')
				assert.isOk(userinfo.phone === '+6112345678', '12')
				assert.isOk(userinfo.phone_number_verified === false, '13')

				done()
			}).catch(done)
		})
		it('07 - Should fail when no access_token is passed in the authorization header.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:null })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing required \'authorization\'') >= 0), '02')

				done()
			}).catch(done)
		})
		it('08 - Should fail when an invalid access_token is passed in the authorization header.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'bearer 123' })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('Invalid access_token') >= 0), '02')

				done()
			}).catch(done)
		})
		it('09 - Should fail when an non bearer token is passed in the authorization header.', done => {

			const eventHandlerStore = {}
			registerAllHandlers(eventHandlerStore)

			co(function *() {
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'123' })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('The \'authorization\' header must contain a bearer access_token') >= 0), '02')

				done()
			}).catch(done)
		})
		it('10 - Should fail when an expired access_token is passed in the authorization header.', done => {

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
				const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:`Bearer ${access_token}` })
				
				assert.isOk(errors, '01')
				assert.isOk(errors.some(e => e.message && e.message.indexOf('access_token has expired') >= 0), '02')

				done()
			}).catch(done)
		})
	})
})



