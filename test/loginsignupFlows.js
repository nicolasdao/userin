/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { testSuite } = require('../src')
const { MockStrategy, END_USER } = require('./mock/handler')

const strategy = new MockStrategy({
	tokenExpiry: {
		access_token: 3600
	}
})

testSuite.testLoginSignup({
	// skip: [
	// 	'authorize',
	// 	// 'introspect',
	// 	'token',
	// 	'userinfo'
	// ],
	verbose: true,
	strategy,
	user: {
		username: END_USER.email,
		password: END_USER.password
	}
})



