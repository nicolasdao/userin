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
const { MockStrategy } = require('./mock/handler')

const strategy = new MockStrategy()

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
	// 	'introspect',
	// 	'token',
	// 	'userinfo'
	// ],
	verbose: true,
	strategy,
	client: { 
		id: 'default', 
		secret: 123, 
		user: { 
			id: 1,
			username: 'nic@cloudlessconsulting.com', 
			password: 123456
		},
		fipUser: { 
			id: 23, 
			fip: 'facebook'
		}
	},
	altClient: { 
		id: 'fraudster', 
		secret: 456 
	},
	claimStubs: [{
		scope:'profile',
		claims: {
			given_name: 'Nic',
			family_name: 'Dao',
			zoneinfo: 'Australia/Sydney'
		}
	}, {
		scope:'email',
		claims: {
			email: 'nic@cloudlessconsulting.com',
			email_verified: true
		}
	}, {
		scope:'phone',
		claims: {
			phone: '+6112345678',
			phone_number_verified: false
		}
	}, {
		scope:'address',
		claims: {
			address: 'Some street in Sydney'
		}
	}]
})



