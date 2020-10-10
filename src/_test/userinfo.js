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
const { handler:userInfoHandler } = require('../userinfo')
const grantTypePassword = require('../token/grantTypePassword')
const eventRegister = require('../eventRegister')
const { setUpScopeAssertion, logTestErrors, createShowTestResultFn } = require('./_core')
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
module.exports = function runTest (data, skip, showResults) {
	
	const { 
		clientId:client_id, 
		strategy, 
		user: { username, password },
		claimStubs=[]
	} = data
	
	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	const showIds = createShowTestResultFn(showResults, 'userinfo.handler')
	
	fn('userinfo', () => {

		const registerAllHandlers = eventHandlerStore => {
			const registerEventHandler = eventRegister(eventHandlerStore)
			registerEventHandler(strategy)
		}
		
		describe('handler', () => {
			
			const user = { username, password }

			const getValidAccessToken = (eventHandlerStore, scopes) => co(function *() {
				const [errors, result] = yield grantTypePassword.exec(eventHandlerStore, { client_id, user, scopes })
				if (errors)
					return [errors, null]
				else
					return [null, `Bearer ${result.access_token}`]
			})

			it('01 - Should fail when the \'get_access_token_claims\' event handler is not defined.', done => {
				const showResult = showIds('01')
				const logE = logTest(done)
				const eventHandlerStore = {}
				logE.run(co(function *() {
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'' })
					logE.push(errors)

					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_access_token_claims\' handler') >= 0), '03')
					
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('02 - Should fail when the \'get_identity_claims\' event handler is not defined.', done => {
				const showResult = showIds('02')
				const logE = logTest(done)
				const eventHandlerStore = {}
				const registerEventHandler = eventRegister(eventHandlerStore)
				registerEventHandler('get_access_token_claims', strategy.get_access_token_claims)
				logE.run(co(function *() {
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'' })
					logE.push(errors)
					assert.isOk(errors, '01')
					assert.isOk(errors.length, '02')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_identity_claims\' handler') >= 0), '03')
					if (showResult) console.log(errors)
					done()
				}))
			})
			it('03 - Should return the userinfo when the access_token is valid.', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, ['profile'])
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')
					
					const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					logE.push(errors)
						
					assert.isNotOk(errors, '03')
					assert.isOk(userinfo, '04')
					assert.isOk(userinfo.active, '05')

					if (showResult) console.log(userinfo)
					done()
				}))
			})
			it('04 - Should fail when no access_token is passed in the authorization header.', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				const eventHandlerStore = {}
				registerAllHandlers(eventHandlerStore)

				logE.run(co(function *() {
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:null })
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
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'bearer 123' })
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
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization:'123' })
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
					const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, [])
					logE.push(codeErrors)
					
					assert.isNotOk(codeErrors, '01')
					assert.isOk(authorization, '02')
					
					const [errors] = yield userInfoHandler(null, eventHandlerStore, { authorization })
					logE.push(errors)
					
					assert.isOk(errors, '03')
					assert.isOk(errors.some(e => e.message && e.message.indexOf('access_token has expired') >= 0), '04')

					if (showResult) console.log(errors)
					done()
				}))
			})
			it('08 - Should have at least one set of claims to be tested', () => {
				assert.isOk(claimStubs.length, '01 - Your test is missing some claim stubs to assert whether the userinfo works as expected.')
			})

			let i = 9
			for(let claimStub of claimStubs) {
				const { scope, claims } = claimStub || {}
				if (!scope)
					throw new Error('Invalid test configuration. A claimStub must define a \'scope\' property.')
				if (!claims)
					throw new Error('Invalid test configuration. A claimStub must define a \'claims\' property.')
				if (typeof(claims) != 'object')
					throw new Error(`Invalid test configuration. 'claimStub.claims' is expected to be an object. Found ${typeof(claims)} instead.`)

				it(`${i++} - Should return the userinfo with specific properties when the access_token is valid and the scopes contain '${scope}'.`, done => {
					const showResult = showIds(i-1)
					const logE = logTest(done)

					const eventHandlerStore = {}
					registerAllHandlers(eventHandlerStore)

					logE.run(co(function *() {
						const [codeErrors, authorization] = yield getValidAccessToken(eventHandlerStore, [scope])
						logE.push(codeErrors)
						
						assert.isNotOk(codeErrors, '01')
						assert.isOk(authorization, '02')
						
						const [errors, userinfo] = yield userInfoHandler(null, eventHandlerStore, { authorization })
						logE.push(errors)
							
						assert.isNotOk(errors, '03')
						assert.isOk(userinfo, '04')
						assert.isOk(userinfo.active, '05')
						let j = 6
						for(let field in claims) {
							const value = claims[field]
							assert.equal(userinfo[field], value, j++)	
						}

						if (showResult) console.log(userinfo)
						done()
					}))
				})
			}
		})
	})
}



