/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { idpHelp: { addErrorToUrl, authToUserPortal }, obj: { extractFlattenedJSON }, response:{ defaultErrorMessage } } = require('./utils')

const STRATEGY = 'default'
const OAUTH_PATHNAME = `/${STRATEGY}/oauth2`
const OAUTH_CALLBACK_PATHNAME = `/${STRATEGY}/oauth2callback`

/**
 * Returns an Express handler that client directly requests.
 *
 * @param  {String} strategy 			e.g., facebook, google, linkedin, github
 * @param  {String} userPortal.api 		URL of the API (POST) that accepts a user and returns a custom response.
 * @param  {String} userPortal.key   	API key used to safely communicate between 'UserIn' and the 'userPortal.api' endpoint.
 * @param  {Object} onSuccess   		Object defining a set of properties that are always returned in case of success
 * @param  {Object} onError   			Object defining a set of properties that are always returned in case of error
 * @return {Handler}           			[description]
 */
const getAuthResponseHandler = ({ strategy, userPortal, redirectUrls }) => {
	const { onSuccess, onError } = redirectUrls || {}
	const onErrorRedirectUrl = (onError || {}).default
	const onSuccessRedirectUrl = (onSuccess || {}).default

	return (req, res, next) => {
		req.params = req.params || {}

		const { successRedirectUrl, errorRedirectUrl } = req.params
		const { user } = extractFlattenedJSON(req.params) 
		
		let errorRedirect = decodeURIComponent(errorRedirectUrl || onErrorRedirectUrl)
		let successRedirect = decodeURIComponent(successRedirectUrl || onSuccessRedirectUrl)

		errorRedirect = errorRedirect === 'undefined' ? undefined : errorRedirect
		successRedirect = successRedirect === 'undefined' ? undefined : successRedirect

		const formatErrorUrl = errorRedirect ? args => addErrorToUrl(errorRedirect, args) : null

		if (!user) {
			const message = defaultErrorMessage
			const verboseMessage = 'Missing required payload property. POST request must contain a \'user\' property in its JSON payload.'

			if (formatErrorUrl)
				res.redirect(formatErrorUrl({ code: 400, message, verboseMessage }))
			else
				res.status(400).send(verboseMessage)

			next()
			return 
		}

		if (typeof(user) != 'object') {		
			const message = defaultErrorMessage	
			const verboseMessage = `Invalid payload. The type of the 'user' property in the JSON payload must be 'object' (current: '${typeof(user)}').`

			if (formatErrorUrl)
				res.redirect(formatErrorUrl({ code: 400, message, verboseMessage }))
			else
				res.status(400).send(verboseMessage)

			next()
			return 
		}

		authToUserPortal({ user, userPortal, strategy, successRedirect, formatErrorUrl, res, next })
	}
}

const setUp = ({ userPortal, redirectUrls }) => {

	const authRequestHandler = getAuthResponseHandler({ strategy:STRATEGY, userPortal, redirectUrls })
	const authResponseHandler = getAuthResponseHandler({ strategy:STRATEGY, userPortal, redirectUrls })

	return {
		authRequest: authRequestHandler,
		authResponse: authResponseHandler,
		pathname: OAUTH_PATHNAME,
		callbackPathname: OAUTH_CALLBACK_PATHNAME
	}
}


module.exports = {
	setUp,
	scopes: []
}


