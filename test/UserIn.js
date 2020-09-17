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
const { UserIn } = require('../src')

describe('UserIn', () => {
	describe('constructor', () => {
		it('Should inherits from Express Router', () => {
			assert.isOk(UserIn.prototype instanceof express.Router, '01')
		})
	})
})
