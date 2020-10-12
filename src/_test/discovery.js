const { co } = require('core-async')
const chai = require('chai')
const { logTestErrors, createShowTestResultFn, getUserInServer } = require('./_core')
const { assert } = chai

/**
 * Runs the test suites.
 * 
 * @param  {UserIn}		data.userIn
 * @param  {String}		data.user.password
 * @param  {String}		data.user.password
 * @param  {Boolean}	skip			
 *
 * @return {Void}
 */
module.exports = function runTest (data, skip, showResults) {
	const {
		testSuiteName,
		userIn
	} = data

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()
	const { baseUrl, modes=[], version='v1' } = userIn.config || {}

	const isLoginSignupMode = modes.indexOf('loginsignup') >= 0
	const isLoginSignupFipMode = modes.indexOf('loginsignupfip') >= 0
	const isOpenIdMode = modes.indexOf('openid') >= 0

	fn(`discovery[${testSuiteName}]`, async () => {
		describe('/.well-known/configuration', () => {	
			const showIds = createShowTestResultFn(showResults, `discovery./${version}/.well-known/configuration`)		

			if (isLoginSignupMode)
				it('01 - Should return a discovery object with \'loginsignup\' endpoints only.', done => {
					const showResult = showIds('01')
					const logE = logTest(done)

					logE.run(co(function *() {
						const { server, app } = yield getUserInServer(userIn)
						const { status, body } = yield chai.request(app).get(`/${version}/.well-known/configuration`)

						if (showResult) console.log(body)

						assert.equal(status, 200, '01')
						assert.isOk(body, '02')
						assert.equal(body.issuer, baseUrl,'03')
						assert.equal(body.configuration_endpoint, `${baseUrl}/${version}/.well-known/configuration`,'04')
						assert.equal(body.login_endpoint, `${baseUrl}/${version}/login`,'05')
						assert.equal(body.signup_endpoint, `${baseUrl}/${version}/signup`,'06')
						assert.equal(body.token_endpoint, `${baseUrl}/oauth2/${version}/token`,'07')
						assert.equal(body.revocation_endpoint, `${baseUrl}/oauth2/${version}/revoke`,'08')
						assert.isOk(body.grant_types_supported, '09')
						assert.equal(body.grant_types_supported.length, 1 ,'10')
						assert.equal(body.grant_types_supported[0], 'refresh_token' ,'12')
						
						const validDiscovery = [
							'issuer',
							'configuration_endpoint',
							'login_endpoint',
							'signup_endpoint',
							'token_endpoint',
							'revocation_endpoint',
							'grant_types_supported'
						]
						const invalidKeys = Object.keys(body).filter(x => validDiscovery.indexOf(x) < 0).join(', ')
						assert.equal(invalidKeys, '', '13')

						server.close()
						done()
					}))
				})
			if (isLoginSignupFipMode)
				it('02 - Should return a discovery object with \'loginsignupfip\' endpoints only.', done => {
					const showResult = showIds('02')
					const logE = logTest(done)

					logE.run(co(function *() {
						const { server, app } = yield getUserInServer(userIn)
						const { status, body } = yield chai.request(app).get(`/${version}/.well-known/configuration`)

						if (showResult) console.log(body)

						assert.equal(status, 200, '01')
						assert.isOk(body, '02')
						assert.equal(body.issuer, baseUrl,'03')
						assert.equal(body.configuration_endpoint, `${baseUrl}/${version}/.well-known/configuration`,'04')
						assert.equal(body.login_endpoint, `${baseUrl}/${version}/login`,'05')
						assert.equal(body.signup_endpoint, `${baseUrl}/${version}/signup`,'06')
						assert.equal(body.token_endpoint, `${baseUrl}/oauth2/${version}/token`,'07')
						assert.equal(body.revocation_endpoint, `${baseUrl}/oauth2/${version}/revoke`,'08')
						assert.isOk(body.grant_types_supported, '09')
						assert.equal(body.grant_types_supported.length, 2 ,'10')
						assert.equal(body.grant_types_supported[0], 'refresh_token' ,'12')
						assert.equal(body.grant_types_supported[1], 'authorization_code' ,'13')
						assert.isOk(body.code_challenge_methods_supported, '14')
						assert.equal(body.code_challenge_methods_supported.length, 2 ,'15')
						assert.equal(body.code_challenge_methods_supported[0], 'plain' ,'16')
						assert.equal(body.code_challenge_methods_supported[1], 'S256' ,'17')
						assert.isOk(body.response_types_supported, '18')
						assert.equal(body.response_types_supported.length, 3 ,'19')
						assert.equal(body.response_types_supported[0], 'code' ,'20')
						assert.equal(body.response_types_supported[1], 'token' ,'21')
						assert.equal(body.response_types_supported[2], 'code token' ,'22')
						
						const validDiscovery = [
							'issuer',
							'configuration_endpoint',
							'login_endpoint',
							'signup_endpoint',
							'token_endpoint',
							'revocation_endpoint',
							'grant_types_supported',
							'code_challenge_methods_supported',
							'response_types_supported'
						]
						const invalidKeys = Object.keys(body).filter(x => validDiscovery.indexOf(x) < 0).join(', ')
						assert.equal(invalidKeys, '', '24')

						server.close()
						done()
					}))
				})
			if (isOpenIdMode)
				it('03 - Should return a discovery object with \'openid\' endpoints only.', done => {
					const showResult = showIds('03')
					const logE = logTest(done)

					logE.run(co(function *() {
						const { server, app } = yield getUserInServer(userIn)
						const { status, body } = yield chai.request(app).get(`/${version}/.well-known/configuration`)

						if (showResult) console.log(body)

						assert.equal(status, 200, '01')
						assert.isOk(body, '02')
						assert.equal(body.issuer, baseUrl,'03')
						assert.equal(body.configuration_endpoint, `${baseUrl}/${version}/.well-known/configuration`,'04')
						assert.equal(body.token_endpoint, `${baseUrl}/oauth2/${version}/token`,'07')
						assert.equal(body.revocation_endpoint, `${baseUrl}/oauth2/${version}/revoke`,'08')
						assert.equal(body.introspection_endpoint, `${baseUrl}/oauth2/${version}/introspect`,'09')
						assert.equal(body.jwks_uri, `${baseUrl}/oauth2/${version}/certs`,'10')
						assert.equal(body.openidconfiguration_endpoint, `${baseUrl}/oauth2/${version}/.well-known/openid-configuration`,'11')
						assert.equal(body.userinfo_endpoint, `${baseUrl}/oauth2/${version}/userinfo`,'12')

						assert.isOk(body.grant_types_supported, '13')
						assert.equal(body.grant_types_supported.length, 4 ,'14')
						assert.equal(body.grant_types_supported[0], 'password' ,'15')
						assert.equal(body.grant_types_supported[1], 'refresh_token' ,'16')
						assert.equal(body.grant_types_supported[2], 'authorization_code' ,'17')
						assert.equal(body.grant_types_supported[3], 'client_credentials' ,'18')
						assert.isOk(body.code_challenge_methods_supported, '19')
						assert.equal(body.code_challenge_methods_supported.length, 2 ,'20')
						assert.equal(body.code_challenge_methods_supported[0], 'plain' ,'21')
						assert.equal(body.code_challenge_methods_supported[1], 'S256' ,'22')
						assert.isOk(body.response_types_supported, '23')
						assert.equal(body.response_types_supported.length, 7 ,'24')
						assert.equal(body.response_types_supported[0], 'code' ,'25')
						assert.equal(body.response_types_supported[1], 'token' ,'26')
						assert.equal(body.response_types_supported[2], 'id_token' ,'27')
						assert.equal(body.response_types_supported[3], 'code token' ,'28')
						assert.equal(body.response_types_supported[4], 'code id_token' ,'29')
						assert.equal(body.response_types_supported[5], 'token id_token' ,'30')
						assert.equal(body.response_types_supported[6], 'code token id_token' ,'31')
						assert.isOk(body.token_endpoint_auth_methods_supported, '32')
						assert.equal(body.token_endpoint_auth_methods_supported.length, 1 ,'33')
						assert.equal(body.token_endpoint_auth_methods_supported[0], 'client_secret_post' ,'34')
						assert.isOk(body.claims_supported, '35')
						assert.isOk(body.claims_supported.length,'36')
						assert.isOk(body.scopes_supported, '37')
						assert.isOk(body.scopes_supported.length,'38')

						const validDiscovery = [
							'issuer',
							'configuration_endpoint',
							'login_endpoint',
							'signup_endpoint',
							'token_endpoint',
							'revocation_endpoint',
							'grant_types_supported',
							'code_challenge_methods_supported',
							'response_types_supported',
							'token_endpoint_auth_methods_supported',
							'claims_supported',
							'scopes_supported',
							'id_token_signing_alg_values_supported',
							'introspection_endpoint',
							'jwks_uri',
							'openidconfiguration_endpoint',
							'userinfo_endpoint'
						]
						const invalidKeys = Object.keys(body).filter(x => validDiscovery.indexOf(x) < 0).join(', ')
						assert.equal(invalidKeys, '', '39')

						server.close()
						done()
					}))
				})
		})
	})
}




