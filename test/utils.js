/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

/* global describe */
/* global it */

const { assert } = require('chai')
const { url } = require('../src/utils')

describe('utils', () => {
	describe('#url.getInfo', () => {
		it('Should deconstruct any URI', () => {
			const uri_01 = url.getInfo('https://neap.co')
			assert.equal(uri_01.host, 'neap.co', '01')
			assert.equal(uri_01.protocol, 'https:', '02')
			assert.equal(uri_01.origin, 'https://neap.co', '03')
			assert.equal(uri_01.pathname, '/', '04')
			assert.equal(uri_01.querystring, '', '05')
			assert.equal(Object.keys(uri_01.query).length, 0, '06')
			assert.equal(uri_01.hash, '', '07')
			assert.equal(uri_01.ext, '', '08')
			assert.equal(uri_01.uri, 'https://neap.co', '09')
			assert.equal(uri_01.shorturi, 'https://neap.co', '10')
			assert.equal(uri_01.pathnameonly, '/', '11')
			assert.equal(uri_01.contentType, 'application/octet-stream', '12')

			const uri_02 = url.getInfo(`https://www.linkedin.com/search/results/people/index.js?facetGeoRegion=%5B%22au%3A0%22%5D&origin=FACETED_SEARCH&title=${encodeURIComponent('director of marketing')}#hello`)
			assert.equal(uri_02.host, 'www.linkedin.com', '13')
			assert.equal(uri_02.protocol, 'https:', '14')
			assert.equal(uri_02.origin, 'https://www.linkedin.com', '15')
			assert.equal(uri_02.pathname, '/search/results/people/index.js', '16')
			assert.equal(uri_02.querystring, '?facetGeoRegion=%5B%22au%3A0%22%5D&origin=FACETED_SEARCH&title=director%20of%20marketing', '17')
			assert.equal(Object.keys(uri_02.query).length, 3, '18')
			assert.equal(uri_02.query.facetGeoRegion, '["au:0"]', '19')
			assert.equal(uri_02.query.origin, 'FACETED_SEARCH', '20')
			assert.equal(uri_02.query.title, 'director of marketing', '21')
			assert.equal(uri_02.hash, '#hello', '22')
			assert.equal(uri_02.ext, '.js', '23')
			assert.equal(uri_02.uri, 'https://www.linkedin.com/search/results/people/index.js?facetGeoRegion=%5B%22au%3A0%22%5D&origin=FACETED_SEARCH&title=director%20of%20marketing#hello', '24')
			assert.equal(uri_02.shorturi, 'https://www.linkedin.com/search/results/people/index.js', '25')
			assert.equal(uri_02.pathnameonly, '/search/results/people', '26')
			assert.equal(uri_02.contentType, 'text/javascript', '27')
		})
		it('Should rebuild URI', () => {
			const uri_01 = url.getInfo(`https://www.linkedin.com/search/results/people/index.js?facetGeoRegion=%5B%22au%3A0%22%5D&origin=FACETED_SEARCH&title=${encodeURIComponent('director of marketing')}#hello`)
			const new_uri_01 = url.buildUrl(Object.assign(uri_01, { 
				host:'neap.co', 
				pathname: '/search/splash.js', 
				ext:'.html',
				query: Object.assign(uri_01.query, { title: 'founder & director', age:37 })
			}))
			assert.equal(new_uri_01, 'https://neap.co/search/splash.html?&facetGeoRegion=%5B%22au%3A0%22%5D&origin=FACETED_SEARCH&title=founder%20%26%20director&age=37#hello', '01')
		})
	})
})









