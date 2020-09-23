/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'

const { assert } = require('chai')
const { oauth2Params } = require('../src/_utils')

describe('oauth2Params', () => {
	describe('convert', () => {
		describe('codeVerifierToChallenge', () => {
			it('01 - Should convert a code verifier into a hashed SHA-256 code challenge that fits the PKCE specs (https://tools.ietf.org/html/rfc7636#section-4.2)', () => {
				const codeChallenge = oauth2Params.convert.codeVerifierToChallenge('M25iVXpKU3puUjFaYWg3T1NDTDQtcW1ROUY5YXlwalNoc0hhakxifmZHag', 'S256')
				assert.equal(codeChallenge, 'qjrzSW9gMiUgpUvqgEPE4_-8swvyCtfOVvg55o5S_es')
			})
		})
	})
})
