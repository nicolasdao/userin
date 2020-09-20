/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { testSuite } = require('../src')
const { LoginSignupStrategy } = require('./mock/strategy')
const { END_USER } = require('./mock/stub')

// skip values: 'all', 'strategy', 'login', 'signup'
const options = { skip:'' }

const config = {
	tokenExpiry: {
		access_token: 3600
	}
}

const stub = {
	user: {
		username: END_USER.email,
		password: END_USER.password
	},
}

testSuite.testLoginSignup(LoginSignupStrategy, config, stub, options)


