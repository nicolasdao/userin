/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { logTestErrors } = require('./_core')
const { verifyStrategy } = require('userin-core')

/**
 * Test all the different strategy instances. 
 * 
 * @param  {UserInStrategy} data.openIdStrategy				
 * @param  {UserInStrategy} data.loginSignupStrategy				
 * @param  {UserInStrategy} data.loginSignupFipStrategy				
 * @param  {Boolean} 		skip													
 */
module.exports = function runTest (data={}, skip) {

	const fn = skip ? describe.skip : describe
	const logTest = logTestErrors()

	fn('Strategy instances', () => {
		for (let strategyName in data) {
			const type = strategyName.replace('Strategy', '').toLowerCase()
			const strategy = data[strategyName]
			
			describe(`${type} strategy`, () => {
				it(`Should pass the basic verification in ${type} mode`, done => {
					const logE = logTest(done)
					logE.run(Promise.resolve(null).then(() => {
						try {
							verifyStrategy(strategy)
							done()
						} catch(err) {
							logE.push([new Error('The openid strategy instance should have been successfully verified'),err])
							throw err
						}
					}))
				})
			})
		}
	})
}



