/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

module.exports = Object.assign(require('./core'), {
	error: require('./error'),
	fetch: require('./fetch'),
	promise: require('./promise'),
	url: require('./url')
})