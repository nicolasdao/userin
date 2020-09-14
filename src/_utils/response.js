/**
 * Copyright (c) 2020, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { url:urlHelp } = require('puffy')
const { errorCode } = require('./error')

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

const formatResponseError = (errors, res) => {
	let code = errorCode.internal_server_error.code
	let category = errorCode.internal_server_error.text
	let error_description = 'Unknown'
	if (errors && errors.length) {
		errors.forEach(error => console.log(error.stack || error.message))
		category = (errors.find(e => e.category) || {}).category || category
		code = (errors.find(e => e.code) || {}).code || code
		error_description = errors
			.filter(x => x && x.message)
			.map(x => x.message)
			.slice(0,5)
			.join(' - ') || error_description
	}

	res.status(code).send({
		error: category,
		error_description
	})
}

module.exports = {
	send,
	addErrorToUrl,
	defaultErrorMessage: DEFAULT_ERROR_MSG,
	formatResponseError
}