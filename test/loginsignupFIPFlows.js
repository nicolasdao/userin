/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { testSuite } = require('../src')
const { LoginSignupFIPStrategy } = require('./mock/strategy')
const { END_USER, FIP_USER_TO_STRATEGY } = require('./mock/stub')

// skip values: 'all', 'strategy', 'login', 'signup', 'fiploginsignup'
const options = { skip:'' }

const config = {
	tokenExpiry: {
		access_token: 3600,
		code: 30
	}
}

const stub = {
	user: {
		username: END_USER.email,
		password: END_USER.password
	},
	fipUser: {
		id: FIP_USER_TO_STRATEGY.strategy_user_id,
		fipName: FIP_USER_TO_STRATEGY.strategy,
		userId: FIP_USER_TO_STRATEGY.user_id
	}
}

testSuite.testLoginSignupFIP(LoginSignupFIPStrategy, config, stub, options)



