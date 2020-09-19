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

describe('Strategy - loginsignup mode', () => {
	const config = {
		modes:['loginsignup'],
		tokenExpiry: {
			access_token: 3600
		}
	}
	it('01 - Should fail in loginsignup mode when the no handlers have been defined', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(/must implement the (.*?) event handler/.test(err.message), '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('02 - Should fail in loginsignup mode when all handlers are defined except \'create_end_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		// strategy.create_end_user = () => null
		strategy.generate_token = () => null
		strategy.get_end_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'create_end_user\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('03 - Should fail in loginsignup mode when all handlers are defined except \'generate_token\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		strategy.create_end_user = () => null
		// strategy.generate_token = () => null
		strategy.get_end_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'generate_token\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('04 - Should fail in loginsignup mode when all handlers are defined except \'get_end_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		strategy.create_end_user = () => null
		strategy.generate_token = () => null
		// strategy.get_end_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'get_end_user\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
})

describe('Strategy - loginsignupfip mode', () => {
	const config = {
		modes:['loginsignupfip'],
		tokenExpiry: {
			access_token: 3600,
			code: 30
		}
	}
	it('01 - Should fail in loginsignupfip mode when the no handlers have been defined', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(/must implement the (.*?)event handler/.test(err.message), '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('02 - Should fail in loginsignupfip mode when all handlers are defined except \'create_end_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		// strategy.create_end_user = () => null
		strategy.generate_token = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'create_end_user\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('03 - Should fail in loginsignupfip mode when all handlers are defined except \'generate_token\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		strategy.create_end_user = () => null
		// strategy.generate_token = () => null
		strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'generate_token\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('04 - Should fail in loginsignupfip mode when all handlers are defined except \'get_end_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		strategy.create_end_user = () => null
		strategy.generate_token = () => null
		// strategy.get_end_user = () => null
		strategy.get_fip_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'get_end_user\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
	it('05 - Should fail in loginsignupfip mode when all handlers are defined except \'get_fip_user\'', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		strategy.create_end_user = () => null
		strategy.generate_token = () => null
		strategy.get_end_user = () => null
		// strategy.get_fip_user = () => null
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(err.message.indexOf('must implement the \'get_fip_user\' event handler') >= 0, '01')
				done()
			} catch(e){
				done(e)
			}
		}
	})
})

describe('Strategy - openid mode', () => {
	const config = {
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
	it('01 - Should fail in openid mode when the no handlers have been defined', done => {
		class DummyStrategy extends Strategy {
			constructor(config) {
				super(config)
				this.name = 'dummy'
			}
		}
		const strategy = new DummyStrategy(config)
		try {
			verifyStrategy(strategy)
			done(new Error('Should have failed'))
		} catch (err) {
			try {
				assert.isOk(/must implement the (.*?)event handler/.test(err.message), '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'generate_token\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'get_client\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'get_end_user\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'get_fip_user\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'get_identity_claims\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
				assert.isOk(err.message.indexOf('must implement the \'get_token_claims\' event handler') >= 0, '01')
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
		const strategy = new DummyStrategy(config)
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
})

