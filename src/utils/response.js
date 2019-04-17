/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const urlHelp = require('./url')
const { error } = require('../../.userinrc.json')

const VERBOSE = error && error.mode == 'verbose'
const DEFAULT_ERROR_MSG = error && error.defaultMessage ? error.defaultMessage : 'Oops, an error happened on our end.'

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
const addErrorToUrl = (url, { code, message, verboseMessage }) => {
	let urlInfo = urlHelp.getInfo(url)
	urlInfo.query.error_msg = verboseMessage && VERBOSE ? verboseMessage : (message||'')
	urlInfo.query.error_code = code
	return urlHelp.buildUrl(urlInfo)
}

module.exports = {
	send,
	addErrorToUrl,
	defaultErrorMessage: DEFAULT_ERROR_MSG
}