/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const urlHelp = require('./url')

// We cannot replace the following try/catch with:
// 
// 		const { error } = require('../../.userinrc.json')
// 		
// This is because .userinrc.json is not put under source control. The above code snippet would make this project
// fail its unit test. 
let error 
try {
	error = require('../../.userinrc.json').error
} catch(e) {
	(() => error={})(e)
}

const VERBOSE = error && error.mode == 'verbose'
const DEFAULT_ERROR_MSG = error && error.defaultMessage ? error.defaultMessage : 'Oops, an error happened on our end.'
const ERROR_DATA = error && error.echoData && Array.isArray(error.echoData) ? error.echoData : []
const IS_ERROR_DATA = ERROR_DATA.length > 0

const send = (res, { code, message, verboseMessage }) => res.status(code||200).send(verboseMessage && VERBOSE ? verboseMessage : (message||''))

/**
 * Adds error messages to the url's query string. 
 * 
 * @param  {[type]} url                    [description]
 * @param  {[type]} options.code           [description]
 * @param  {[type]} options.message        [description]
 * @param  {[type]} options.verboseMessage [description]
 * @return {[type]}                        [description]
 */
const addErrorToUrl = (url, { code, message, verboseMessage, data }) => {
	let urlInfo = urlHelp.getInfo(url)
	urlInfo.query.error_msg = verboseMessage && VERBOSE ? verboseMessage : (message||'')
	urlInfo.query.error_code = code
	if (IS_ERROR_DATA && data && typeof(data) == 'object')
		ERROR_DATA.forEach(p => {
			if (data[p])
				urlInfo.query[p] = data[p]
		})

	const u = urlHelp.buildUrl(urlInfo)
	return u
}

module.exports = {
	send,
	addErrorToUrl,
	defaultErrorMessage: DEFAULT_ERROR_MSG
}