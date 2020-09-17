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
const { UserIn, verifyStrategy, runTestSuite } = require('../src')
const { MockStrategy, GOOD_CLIENT, BAD_CLIENT, END_USER, FIP_USER_TO_STRATEGY } = require('./mock/handler')

const strategy = new MockStrategy({
	modes:['openid'],
	openid: {
		iss: 'https://www.userin.com',
		tokenExpiry: {
			id_token: 3600,
			access_token: 3600,
			code: 30
		}
	}
})

describe('UserIn', () => {
	describe('constructor', () => {
		it('Should inherits from Express Router', () => {
			assert.isOk(UserIn.prototype instanceof express.Router, '01')
		})
	})
})

describe('MockStrategy', () => {
	it('Should pass the basic verification', done => {
		try {
			verifyStrategy(strategy)
			assert.isOk('MockStrategy passes the basic veriication step', '01')
			done()
		} catch (err) {
			done(err)
		}
	})
})

runTestSuite({
	// skip: [
	// 	'authorize',
	// 	// 'introspect',
	// 	'token',
	// 	'userinfo'
	// ],
	verbose: true,
	strategy,
	client: { 
		id: GOOD_CLIENT.client_id, 
		secret: GOOD_CLIENT.client_secret, 
		aud: GOOD_CLIENT.audiences.join(' '),
		user: { 
			id: END_USER.id,
			username: END_USER.email, 
			password: END_USER.password
		},
		fipUser: { 
			id: FIP_USER_TO_STRATEGY.user_id,
			fipUserId: FIP_USER_TO_STRATEGY.strategy_user_id, 
			fip: FIP_USER_TO_STRATEGY.strategy
		}
	},
	altClient: { 
		id: BAD_CLIENT.client_id, 
		secret: BAD_CLIENT.client_secret
	},
	claimStubs: [{
		scope:'profile',
		claims: {
			given_name: END_USER.given_name,
			family_name: END_USER.family_name,
			zoneinfo: END_USER.zoneinfo
		}
	}, {
		scope:'email',
		claims: {
			email: END_USER.email,
			email_verified: END_USER.email_verified
		}
	}, {
		scope:'phone',
		claims: {
			phone: END_USER.phone,
			phone_number_verified: END_USER.phone_number_verified
		}
	}, {
		scope:'address',
		claims: {
			address: END_USER.address
		}
	}]
})



