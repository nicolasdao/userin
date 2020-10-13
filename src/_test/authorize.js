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
const { url:urlHelp, validate } = require('puffy')
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
	const { userIn, stub:{ client } } = data || {}

	const { version='v1' } = userIn.config || {}

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	fn('authorize', () => {
		describe('stub_validation', () => {
			const showIds = createShowTestResultFn(showResults, 'authorize.stub_validation')
			it('01 - Should define some specific stub values', () => {
				const showResult = showIds('01')
				assert.isOk(client.id, '01 - authorize test suite requires stub \'client.id\'')
				assert.isOk(client.user, '02 - authorize test suite requires stub \'client.user\'')
				assert.isOk(client.user.id, '03 - authorize test suite requires stub \'client.user.id\'')
				assert.isOk(client.user.username, '04 - authorize test suite requires stub \'client.user.username\'')
				
				if (showResult) console.log(client)
			})
			it('02 - Should use a client that has at least one scope', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					logE.push(errors)

					const errorMsg = `Stubbed client ID ${client.id} has no scopes`

					assert.isNotOk(errors, '01')
					assert.isOk(clientData, '02')
					assert.isOk(clientData.scopes, `03 - ${errorMsg}`)
					assert.isAbove(clientData.scopes.length, 0, `04 - ${errorMsg}`)

					if (showResult) console.log(clientData)
					done()
				}))
			})
			it('03 - Should use a client that has no auth_methods or has a single \'none\' auth_methods', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					logE.push(errors)

					const errorMsg = `Stubbed client ID ${client.id} should not define any auth_methods`

					assert.isNotOk(errors, '01')
					assert.isOk(clientData, '02')
					const auth_method = (clientData.auth_methods || [])[0]
					assert.isOk(
						!clientData.auth_methods || !clientData.auth_methods.length || (clientData.auth_methods.length == 1 && auth_method == 'none'), 
						`03 - ${errorMsg}`)

					if (showResult) console.log(clientData)
					done()
				}))
			})
			it('04 - Should use a client that has at least one valid redirect_uri set up in its redirect_uris allowlist', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					logE.push(errors)

					const errorMsg = `Stubbed client ID ${client.id} has no redirect_uris`

					assert.isNotOk(errors, '01')
					assert.isOk(clientData, '02')
					assert.isOk(clientData.redirect_uris, `03 - ${errorMsg}`)
					assert.isAbove(clientData.redirect_uris.length, 0, `04 - ${errorMsg}`)
					const redirect_uri = clientData.redirect_uris[0]
					assert.isOk(validate.url(redirect_uri), `05 - Stubbed client ID ${client.id} uses an invalid redirect_uri. ${redirect_uri} is not a valid URL.`)

					if (showResult) console.log(clientData)
					done()
				}))
			})
		})

		describe('consent_page_request', () => {
			const showIds = createShowTestResultFn(showResults, 'authorize.consent_page_request')		

			it('01 - Should fail when the client_id is missing', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Missing required \'client_id\'', '03')					

					server.close()
					done()
				}))
			})
			it('02 - Should fail when the response_type is missing', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Missing required \'response_type\'', '03')					

					server.close()
					done()
				}))
			})
			it('03 - Should fail when the response_type is not supported', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code rabbit'
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Invalid \'response_type\'', '03')					

					server.close()
					done()
				}))
			})
			it('04 - Should fail when the redirect_uri is missing', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code'
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Missing required \'redirect_uri\'', '03')					

					server.close()
					done()
				}))
			})
			it('05 - Should fail when the redirect_uri is an invalid URL', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code',
							redirect_uri: 'cbweuqb'
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Invalid \'redirect_uri\'', '03')					

					server.close()
					done()
				}))
			})
			it('06 - Should fail when the redirect_uri is not in the client\'s allowlist', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')
					const validRedirectData = urlHelp.getInfo(clientData.redirect_uris[0])
					validRedirectData.host = 'badswuxv56751g' + validRedirectData.host
					const badRedirectUrl = urlHelp.buildUrl(validRedirectData)
					
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code',
							redirect_uri: badRedirectUrl
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '02')
					assert.equal(body.error, 'invalid_request', '03')
					assert.include(body.error_description, 'is not included in the client\'s redirect URIs allowlist', '04')					

					server.close()
					done()
				}))
			})
			it('07 - Should redirect to the consent page with a valid code on the query parameters', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				logE.run(co(function *() {
					assert.isOk(userIn.config.consentPage, '01')
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '02')
					
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code',
							redirect_uri: clientData.redirect_uris[0]
						}
					}).replace('http://hello.com','')
					const resp = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(resp.body)

					assert.equal(resp.status, 302, '03')
					assert.isOk(resp.res.headers.location, '04')
					assert.include(resp.res.headers.location, userIn.config.consentPage, '05')
					const { query: { code } } = urlHelp.getInfo(resp.res.headers.location)
					assert.isOk(code, '06')

					const [codeErrors, codeClaims] = yield userIn.eventHandlerStore.get_auth_request_claims.exec({ token:code })

					logE.push(codeErrors)

					assert.isNotOk(codeErrors, '07')
					assert.isOk(codeClaims, '08')
					assert.equal(codeClaims.client_id, client.id, '09')
					assert.equal(codeClaims.response_type, 'code', '10')
					assert.equal(codeClaims.redirect_uri, clientData.redirect_uris[0], '11')

					server.close()
					done()
				}))
			})
			it('08 - Should fail when the scopes are not supported by the client', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')
					const unsupportedScope = clientData.scopes.join('') + '123'
					
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorize`,
						query: {
							client_id: client.id,
							response_type: 'code',
							redirect_uri: clientData.redirect_uris[0],
							scope: unsupportedScope
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '02')
					assert.equal(body.error, 'invalid_scope', '03')
					assert.include(body.error_description, 'Access to scope', '04')					
					assert.include(body.error_description, 'is not allowed', '05')					

					server.close()
					done()
				}))
			})
		})

		describe('consent_page_response', () => {
			const showIds = createShowTestResultFn(showResults, 'authorize.consent_page_response')		

			it('01 - Should fail when the consentcode is missing', done => {
				const showResult = showIds('01')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 400, '01')
					assert.equal(body.error, 'invalid_request', '02')
					assert.include(body.error_description, 'Missing required \'consentcode\'', '03')					

					server.close()
					done()
				}))
			})
			it('02 - Should fail when the consentcode is invalid', done => {
				const showResult = showIds('02')
				const logE = logTest(done)

				logE.run(co(function *() {
					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:'1'
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '01')
					assert.equal(body.error, 'invalid_token', '02')
					assert.include(body.error_description, 'Invalid consentcode', '03')					

					server.close()
					done()
				}))
			})
			it('03 - Should fail when the consentcode is missing the user_id', done => {
				const showResult = showIds('03')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'Missing required \'user_id\'', '04')					

					server.close()
					done()
				}))
			})
			it('04 - Should fail when the consentcode is missing the username', done => {
				const showResult = showIds('04')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id
						}
					})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'Missing required \'username\'', '04')					

					server.close()
					done()
				}))
			})
			it('05 - Should fail when the consentcode is missing the code', done => {
				const showResult = showIds('05')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
						}
					})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'Missing required \'code\'', '04')					

					server.close()
					done()
				}))
			})
			it('06 - Should fail when the consentcode is missing the exp', done => {
				const showResult = showIds('06')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code:'123'
						}
					})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'Missing required \'exp\'', '04')					

					server.close()
					done()
				}))
			})
			it('07 - Should fail when the consentcode is expired', done => {
				const showResult = showIds('07')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code:'123',
							exp:1000
						}
					})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'consentcode is expired', '04')					

					server.close()
					done()
				}))
			})
			it('08 - Should fail when the consentcode\'s code is invalid', done => {
				const showResult = showIds('08')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code:'123',
							exp:Date.now() + 100000
						}
					})
					logE.push(consentErrors)

					assert.isNotOk(consentErrors, '01')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, body={} } = yield chai.request(app).get(pathname)

					if (showResult) console.log(body)

					if (status != 200)
						logE.push(new Error(body.error_description || body.error))

					assert.equal(status, 403, '02')
					assert.equal(body.error, 'invalid_token', '03')
					assert.include(body.error_description, 'Invalid auth request code', '04')					

					server.close()
					done()
				}))
			})
			it('09 - Should redirect to the redirect_uri with a code query parameter when the original response_type was \'code\'', done => {
				const showResult = showIds('09')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')

					const [codeErrors, code] = yield userIn.eventHandlerStore.generate_auth_request_code.exec({
						claims: {
							client_id: client.id, 
							response_type: 'code',  
							redirect_uri: clientData.redirect_uris[0]
						}
					})

					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '02')

					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code,
							exp:Date.now() + 100000
						}
					})

					logE.push(consentErrors)
					assert.isNotOk(consentErrors, '03')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, res } = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(res.headers.location)

					assert.equal(status, 302, '04')
					assert.isOk(res.headers.location, '04')
					assert.include(res.headers.location, clientData.redirect_uris[0], '05')
					const { query } = urlHelp.getInfo(res.headers.location)
					assert.isOk(query.code, '06')
					assert.isNotOk(query.token, '07')
					assert.isNotOk(query.id_token, '08')

					server.close()
					done()
				}))
			})
			it('10 - Should redirect to the redirect_uri with a code and a token query parameter when the original response_type was \'code token\'', done => {
				const showResult = showIds('10')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')

					const [codeErrors, code] = yield userIn.eventHandlerStore.generate_auth_request_code.exec({
						claims: {
							client_id: client.id, 
							response_type: 'code token',  
							redirect_uri: clientData.redirect_uris[0]
						}
					})

					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '02')

					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code,
							exp:Date.now() + 100000
						}
					})

					logE.push(consentErrors)
					assert.isNotOk(consentErrors, '03')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, res } = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(res.headers.location)

					assert.equal(status, 302, '04')
					assert.isOk(res.headers.location, '04')
					assert.include(res.headers.location, clientData.redirect_uris[0], '05')
					const { query } = urlHelp.getInfo(res.headers.location)
					assert.isOk(query.code, '06')
					assert.isOk(query.token, '07')
					assert.isNotOk(query.id_token, '08')

					server.close()
					done()
				}))
			})
			it('11 - Should redirect to the redirect_uri with a code and a token and no id_token query parameter when the original response_type was \'code token id_token\' but the scope does not contain \'openid\'', done => {
				const showResult = showIds('11')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')

					const [codeErrors, code] = yield userIn.eventHandlerStore.generate_auth_request_code.exec({
						claims: {
							client_id: client.id, 
							response_type: 'code token id_token',  
							redirect_uri: clientData.redirect_uris[0]
						}
					})

					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '02')

					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code,
							exp:Date.now() + 100000
						}
					})

					logE.push(consentErrors)
					assert.isNotOk(consentErrors, '03')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, res } = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(res.headers.location)

					assert.equal(status, 302, '04')
					assert.isOk(res.headers.location, '04')
					assert.include(res.headers.location, clientData.redirect_uris[0], '05')
					const { query } = urlHelp.getInfo(res.headers.location)
					assert.isOk(query.code, '06')
					assert.isOk(query.token, '07')
					assert.isNotOk(query.id_token, '08')

					server.close()
					done()
				}))
			})
			it('12 - Should redirect to the redirect_uri with a code and a token and id_token query parameter when the original response_type was \'code token id_token\' but the scope contains \'openid\'', done => {
				const showResult = showIds('12')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')

					const [codeErrors, code] = yield userIn.eventHandlerStore.generate_auth_request_code.exec({
						claims: {
							client_id: client.id, 
							response_type: 'code token id_token',  
							redirect_uri: clientData.redirect_uris[0],
							scope: 'openid'
						}
					})

					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '02')

					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code,
							exp:Date.now() + 100000
						}
					})

					logE.push(consentErrors)
					assert.isNotOk(consentErrors, '03')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, res } = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(res.headers.location)

					assert.equal(status, 302, '04')
					assert.isOk(res.headers.location, '04')
					assert.include(res.headers.location, clientData.redirect_uris[0], '05')
					const { query } = urlHelp.getInfo(res.headers.location)
					assert.isOk(query.code, '06')
					assert.isOk(query.token, '07')
					assert.isOk(query.id_token, '08')

					server.close()
					done()
				}))
			})
			it('13 - Should redirect to the redirect_uri with a code, token, id_token and state query parameter when the original response_type was \'code token id_token\' but the scope contains \'openid\'', done => {
				const showResult = showIds('13')
				const logE = logTest(done)

				logE.run(co(function *() {
					const [errors, clientData] = yield userIn.eventHandlerStore.get_client.exec({ client_id:client.id })
					
					logE.push(errors)
					assert.isNotOk(errors, '01')

					const [codeErrors, code] = yield userIn.eventHandlerStore.generate_auth_request_code.exec({
						claims: {
							client_id: client.id, 
							response_type: 'code token id_token',  
							redirect_uri: clientData.redirect_uris[0],
							scope: 'openid',
							state: '123'
						}
					})

					logE.push(codeErrors)
					assert.isNotOk(codeErrors, '02')

					const [consentErrors, consentcode] = yield userIn.eventHandlerStore.generate_auth_consent_code.exec({
						claims: {
							user_id: client.user.id,
							username: client.user.username,
							code,
							exp:Date.now() + 100000
						}
					})

					logE.push(consentErrors)
					assert.isNotOk(consentErrors, '03')

					const { server, app } = yield getUserInServer(userIn)
					const pathname = urlHelp.buildUrl({
						origin: 'http://hello.com',
						pathname: `/oauth2/${version}/authorizeconsent`,
						query: {
							consentcode:consentcode
						}
					}).replace('http://hello.com','')
					const { status, res } = yield chai.request(app).get(pathname).redirects(0).send({})

					if (showResult) console.log(res.headers.location)

					assert.equal(status, 302, '04')
					assert.isOk(res.headers.location, '04')
					assert.include(res.headers.location, clientData.redirect_uris[0], '05')
					const { query } = urlHelp.getInfo(res.headers.location)
					assert.isOk(query.code, '06')
					assert.isOk(query.token, '07')
					assert.isOk(query.id_token, '08')
					assert.equal(query.state, '123', '09')

					server.close()
					done()
				}))
			})
		})
	})
}



