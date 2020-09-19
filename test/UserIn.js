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
const { UserIn } = require('../src')
const { logTestErrors } = require('../src/_test/_core')
const { ExhaustiveStrategy, LoginSignupStrategy } = require('./mock/strategy')

const logTest = logTestErrors(true)
// Used to consume params that are not used and avoid linting warnings
const voidFn = () => null

const exhaustiveConfig = { openid: { iss:'https://example.com', tokenExpiry: { access_token: 3600, id_token:3600, code:30 } } }
const loginSignupConfig = { modes:['loginsignup'], tokenExpiry: { access_token:3600 } }
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
				assert.equal(error.message, 'When \'modes\' contains openid the strategy must implement the \'get_client\' event handler. This event handler is currently not implemented.', '02')
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
})
