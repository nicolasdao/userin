/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { Strategy } = require('userin-core')
const { assert } = require('chai')
const { verifyStrategy  } = require('../src')
const { MockStrategy } = require('./mock/handler')

const openIdConfig = {
	modes:['openid'],
	openid: {
		iss: 'https://www.userin.com',
		tokenExpiry: {
			id_token: 3600,
			access_token: 3600,
			code: 30
		}
	}
}

describe('Strategy - openid mode', () => {
	it('01 - Should fail in openid mode when the no handlers have been defined', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(/strategy is missing its(.*?)event handler implementation/.test(err.message), '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('02 - Should fail in openid mode when all handlers are defined except \'generate_token\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		// strategy.generate_token = () => null
		strategy.get_client = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'generate_token\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('03 - Should fail in openid mode when all handlers are defined except \'get_client\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		// strategy.get_client = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'get_client\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('04 - Should fail in openid mode when all handlers are defined except \'get_end_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		strategy.get_client = () => null
		// strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'get_end_user\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('05 - Should fail in openid mode when all handlers are defined except \'get_fip_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		strategy.get_client = () => null
		strategy.get_end_user = () => null
		// strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'get_fip_user\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('06 - Should fail in openid mode when all handlers are defined except \'get_identity_claims\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		strategy.get_client = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		// strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'get_identity_claims\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('07 - Should fail in openid mode when all handlers are defined except \'get_token_claims\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		strategy.get_client = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		// strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.equal(err.message, 'strategy is missing its \'get_token_claims\' event handler implementation', '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('08 - Should succeed in openid mode when all handlers are defined', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(openIdConfig)
		strategy.generate_token = () => null
		strategy.get_client = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		strategy.get_identity_claims = () => null
		strategy.get_token_claims = () => null
		try {
			verifyStrategy(strategy)
			done()
		} catch (err) {
			done(err)
		}
	})

	describe('MockStrategy', () => {
		it('Should pass the basic verification in openid mode', done => {
			const strategy = new MockStrategy(openIdConfig)
			try {
				verifyStrategy(strategy)
				assert.isOk('MockStrategy passes the basic veriication step', '01')
				done()
			} catch (err) {
				done(err)
			}
		})
	})
})

