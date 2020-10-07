/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { assert } = require('chai')
const express = require('express')
const { UserIn } = require('../src/index.js')
const { logTestErrors } = require('../src/_test/_core')
const { ExhaustiveStrategy, LoginSignupStrategy } = require('./mock/strategy')

const logTest = logTestErrors()
// Used to consume params that are not used and avoid linting warnings
const voidFn = () => null

const exhaustiveConfig = { 
	baseUrl: 'https://userin.com',
	openid: { 
		tokenExpiry: { 
			access_token: 3600, 
			id_token:3600, 
			code:30 
		} 
	} 
}
const loginSignupConfig = { 
	baseUrl: 'https://userin.com',
	modes:['loginsignup'], 
	tokenExpiry: { 
		access_token:3600 
	} 
}

const loginSignupStrategy = new LoginSignupStrategy(loginSignupConfig)

describe('UserIn', () => {
	describe('constructor', () => {
		it('01 - Should inherits from Express Router', () => {
			assert.isOk(UserIn.prototype instanceof express.Router, '01')
		})
		it('02 - Should fail when the parameters are missing', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn()
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'Missing required \'config\'', '02')
				done()
			}))
		})
		it('03 - Should fail when Strategy class is missing', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'Missing required \'Strategy\'', '02')
				done()
			}))
		})
		it('04 - Should fail when the Strategy is not a UserIn Strategy class', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: 'Hello'
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, '\'Strategy\' is expected to be a class inheriting from the UserIn Strategy class. Found string instead.', '02')
				done()
			}))
		})
		it('05 - Should fail with a usefull message when the Strategy is a UserIn Strategy instance rather than a class', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: loginSignupStrategy
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, '\'Strategy\' is an instance of a UserIn Strategy class instead of being a class inheriting from the UserIn Strategy.', '02')
				done()
			}))
		})
		it('06 - Should fail when the mode is missing', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: LoginSignupStrategy
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'Missing required \'modes\'', '02')
				done()
			}))
		})
		it('07 - Should fail when the mode is not supported', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: LoginSignupStrategy,
						modes:['hello']
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'The following modes are not supported: hello', '02')
				done()
			}))
		})
		it('08 - Should fail when the config is missing', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: LoginSignupStrategy,
						modes:['loginsignup']
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'Missing required \'config\'', '02')
				done()
			}))
		})
		it('09 - Should fail when the mode is valid but the strategy is not configured to support that mode', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: LoginSignupStrategy,
						modes:['loginsignup', 'openid'],
						config: loginSignupConfig
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'When modes contains \'openid\', the UserIn strategy \'config.openid\' object is required', '02')
				done()
			}))
		})
		it('10 - Should fail when the mode is valid but the strategy does not support that mode', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error
				try {
					const userIn = new UserIn({
						Strategy: LoginSignupStrategy,
						modes:['loginsignup', 'openid'],
						config: exhaustiveConfig
					})
					voidFn(userIn)
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isOk(error, '01')
				assert.equal(error.message, 'When \'modes\' contains loginsignupfip, openid the strategy must implement the \'generate_authorization_code\' event handler. This event handler is currently not implemented.', '02')
				done()
			}))
		})
		it('11 - Should succeed when the right parameters are passed.', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error, userin
				try {
					userin = new UserIn({
						Strategy: LoginSignupStrategy,
						modes:['loginsignup'],
						config: loginSignupConfig
					})
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isNotOk(error, '01')
				assert.isOk(userin, '02')
				done()
			}))
		})
		it('12 - Should support multiple modes.', done => {
			const logE = logTest(done)
			logE.run(Promise.resolve(null).then(() => {
				let error, userin
				try {
					userin = new UserIn({
						Strategy: ExhaustiveStrategy,
						modes:['loginsignup', 'loginsignupfip', 'openid'],
						config: exhaustiveConfig
					})
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isNotOk(error, '01')
				assert.isOk(userin, '02')
				done()
			}))
		})
	})
	describe('getEndpoints', () => {
		it('01 - Should return the baseUrl and all the endpoints with their path only by default.', done => {
			const logE = logTest(done)
			logE.run((async () => {
				let error, userin
				try {
					userin = new UserIn({
						Strategy: ExhaustiveStrategy,
						modes:['loginsignup', 'loginsignupfip', 'openid'],
						config: exhaustiveConfig
					})
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isNotOk(error, '01')
				assert.isOk(userin, '02.A')

				const [errors, result] = await userin.getEndpoints({ fullyQualified:true })

				logE.push(errors)
				assert.isNotOk(errors, '02.B')
				const { baseUrl, endpoints } = result
				assert.equal(baseUrl, exhaustiveConfig.baseUrl, '03')
				assert.isOk(endpoints, '04')

				const { 
					configuration_endpoint,
					introspection_endpoint,
					jwks_uri,
					login_endpoint,
					openidconfiguration_endpoint,
					revocation_endpoint,
					signup_endpoint,
					token_endpoint,
					userinfo_endpoint
				} = endpoints

				// OpenID
				assert.equal(openidconfiguration_endpoint, '/oauth2/v1/.well-known/openid-configuration', '05')
				assert.equal(token_endpoint, '/oauth2/v1/token', '06')
				assert.equal(userinfo_endpoint, '/oauth2/v1/userinfo', '07')
				assert.equal(introspection_endpoint, '/oauth2/v1/introspect', '08')
				assert.equal(revocation_endpoint, '/oauth2/v1/revoke', '09')
				assert.equal(jwks_uri, '/oauth2/v1/certs', '10')
				// Non-standard OAuth
				assert.equal(configuration_endpoint, '/v1/.well-known/configuration', '11')
				assert.equal(login_endpoint, '/v1/login', '12')
				assert.equal(signup_endpoint, '/v1/signup', '13')
				
				done()
			})())
		})
		it('02 - Should add the endpoints with their fully qualified URL when the \'fullyQualified\' option is true.', done => {
			const logE = logTest(done)
			logE.run((async () => {
				let error, userin
				try {
					userin = new UserIn({
						Strategy: ExhaustiveStrategy,
						modes:['loginsignup', 'loginsignupfip', 'openid'],
						config: exhaustiveConfig
					})
				} catch(err) {
					error = err
				}

				logE.push(error)
				assert.isNotOk(error, '01')
				assert.isOk(userin, '02.A')

				const [errors, result] = await userin.getEndpoints({ fullyQualified:true })

				logE.push(errors)
				assert.isNotOk(errors, '02.B')
				const { baseUrl, endpoints, fqEndpoints } = result
				assert.equal(baseUrl, exhaustiveConfig.baseUrl, '03')
				assert.isOk(endpoints, '04')

				// OpenID
				assert.equal(endpoints.openidconfiguration_endpoint, '/oauth2/v1/.well-known/openid-configuration', '05')
				assert.equal(endpoints.token_endpoint, '/oauth2/v1/token', '06')
				assert.equal(endpoints.userinfo_endpoint, '/oauth2/v1/userinfo', '07')
				assert.equal(endpoints.introspection_endpoint, '/oauth2/v1/introspect', '08')
				assert.equal(endpoints.revocation_endpoint, '/oauth2/v1/revoke', '09')
				assert.equal(endpoints.jwks_uri, '/oauth2/v1/certs', '10')
				// Non-standard OAuth
				assert.equal(endpoints.configuration_endpoint, '/v1/.well-known/configuration', '11')
				assert.equal(endpoints.login_endpoint, '/v1/login', '12')
				assert.equal(endpoints.signup_endpoint, '/v1/signup', '13')

				// OpenID
				assert.equal(fqEndpoints.openidconfiguration_endpoint, `${exhaustiveConfig.baseUrl}/oauth2/v1/.well-known/openid-configuration`, '14')
				assert.equal(fqEndpoints.token_endpoint, `${exhaustiveConfig.baseUrl}/oauth2/v1/token`, '15')
				assert.equal(fqEndpoints.userinfo_endpoint, `${exhaustiveConfig.baseUrl}/oauth2/v1/userinfo`, '16')
				assert.equal(fqEndpoints.introspection_endpoint, `${exhaustiveConfig.baseUrl}/oauth2/v1/introspect`, '17')
				assert.equal(fqEndpoints.revocation_endpoint, `${exhaustiveConfig.baseUrl}/oauth2/v1/revoke`, '18')
				assert.equal(fqEndpoints.jwks_uri, `${exhaustiveConfig.baseUrl}/oauth2/v1/certs`, '19')
				// Non-standard OAuth
				assert.equal(fqEndpoints.configuration_endpoint, `${exhaustiveConfig.baseUrl}/v1/.well-known/configuration`, '20')
				assert.equal(fqEndpoints.login_endpoint, `${exhaustiveConfig.baseUrl}/v1/login`, '21')
				assert.equal(fqEndpoints.signup_endpoint, `${exhaustiveConfig.baseUrl}/v1/signup`, '22')
				
				done()
			})())
		})
	})
})
