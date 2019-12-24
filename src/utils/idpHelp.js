/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const passport = require('passport')
const { join } = require('path')
const urlHelp = require('./url')
const fetch = require('./fetch')
const { send, addErrorToUrl, defaultErrorMessage } = require('./response')
	
/**
 * Build a new URI made of the current request domain, a pathname, and optional request paramaters 
 * 'successRedirectUrl', 'errorRedirectUrl', or 'success', 'failed'. The difference between the combo
 * 'successRedirectUrl'/'errorRedirectUrl' and 'success'/'failed' is that the first one are URIs string encoded
 * in the pathname while the last one are URIs passed in teh query params. The 2 can be mixed.
 * 
 * @param  {Request} req      							Request object. 
 * @param  {String}  pathname 							Custom pathname
 * @param  {Boolean} options.redirectsWithQueryParams 	Default false. If true, the onSuccess and onError URIs are passed
 *														as query parameters rather than encoded paths. This is because some
 *														IdPs fail to support redirects that contain encoded string in their pathname.
 * @return {String}  			New URI
 */
const getCallbackUrl = (req, pathname, options) => {
	const { redirectsWithQueryParams } = options || {}
	const { successRedirectUrl, errorRedirectUrl, success, failed } = req.params || {}
	const onSuccessURI = successRedirectUrl || success
	const onErrorURI = errorRedirectUrl || failed
	let urlParams = { 
		protocol: req.secure ? 'https:' : 'http:', 
		host: req.headers.host
	}

	if (redirectsWithQueryParams) {
		if (onSuccessURI && onErrorURI) 
			urlParams.query = {
				success:decodeURIComponent(onSuccessURI),
				failed:decodeURIComponent(onErrorURI)
			}
		urlParams.pathname = pathname
	} else 
		urlParams.pathname = (successRedirectUrl && errorRedirectUrl) ? join(pathname, successRedirectUrl, errorRedirectUrl) : pathname

	return urlHelp.buildUrl(urlParams, { noEncoding:true })
}

const authToUserPortal = ({ user, userPortal, strategy, successRedirect, errorRedirect, res, next }) => {
	user = user || {}
	user.strategy = strategy

	// 2.1. An external user portal has been configured. Use it to manage the user
	if (userPortal && userPortal.api)
		fetch.post({
			uri: userPortal.api,
			headers: {
				'content-type': 'application/json',
				'x-api-key': userPortal.key
			},
			body: JSON.stringify({ user })
		}).then(({ status, data }) => {
			if (status < 300) {
				if (data && data.code) {
					if(successRedirect) {
						const urlInfo = urlHelp.getInfo(successRedirect)
						urlInfo.query = urlInfo.query || {}
						urlInfo.query.code = data.code
						res.redirect(urlHelp.buildUrl(urlInfo))
					}
					else
						res.status(200).send(data.code);	
				}
				else {
					const message = `${defaultErrorMessage} (code 001)`
					const verboseMessage = `The ${strategy} OAuth succeeded, HTTP GET to 'userPortal.api' ${userPortal.api} successed to but did not return a 'token' value ({ "token": null }).`	
					
					if (errorRedirect)
						res.redirect(addErrorToUrl(errorRedirect, { code: 400, message, verboseMessage }))
					else
						res.status(400).send(verboseMessage)
				}
			} else {
				const message = typeof(data) == 'string' ? data : data ? (data.message || (data.error || {}).message || JSON.stringify(data)) : null
				const verboseMessage = `The ${strategy} OAuth succeeded, but HTTP GET to 'userPortal.api' ${userPortal.api} failed.${message ? ` Details: ${message}` : ''}`;

				if (errorRedirect)
					res.redirect(
						addErrorToUrl(errorRedirect, {
							code: 400,
							message: message || `${defaultErrorMessage} (code 002)`,
							verboseMessage
						})
					)
				else 
					res.status(400).send(verboseMessage)
			}
		}).catch(err => {
			if (errorRedirect)
				res.redirect(
					addErrorToUrl(errorRedirect, {
						code: 500,
						message: `${defaultErrorMessage} (code 003)`,
						verboseMessage: err.message
					})
				)
			else 
				res.status(500).send(err.message)
		}).then(next)
	// 2.2. No external user portal defined. Return the IdP user to the client
	else {
		res.status(200).send({ user })
		next()
	}
}

/**
 * Returns an Express handler that the client indirectly requests through the IdP redirection performed in response of 
 * an Authorization access request (done previously through the 'authRequestHandler' handler)
 *
 * @param  {String} strategy 							e.g., facebook, google, linkedin, github
 * @param  {String} userPortal.api 						URL of the API (POST) that accepts a user and returns a custom response.
 * @param  {String} userPortal.key   					API key used to safely communicate between 'UserIn' and the 'userPortal.api' endpoint.
 * @param  {Object} onSuccess   						Object defining a set of properties that are always returned in case of success
 * @param  {Object} onError   							Object defining a set of properties that are always returned in case of error
 * @param  {String} callbackPathname 					Only required for certain IdPs (e.g., facebook). Otherwise, it throws a 
 *                                        				'missing_redirect_uri' exception.
 * @param  {Boolean} options.redirectsWithQueryParams 	Default false. If true, the onSuccess and onError URIs are passed
 *														as query parameters rather than encoded paths. This is because some
 *														IdPs fail to support redirects that contain encoded string in their pathname.
 *														
 * @return {Handler}           							[description]
 */
const getAuthResponseHandler = ({ strategy, userPortal, redirectUrls, callbackPathname, redirectsWithQueryParams }) => {
	const { onSuccess, onError } = redirectUrls || {}
	const onErrorRedirectUrl = (onError || {}).default
	const onSuccessRedirectUrl = (onSuccess || {}).default

	return (req, res, next) => {
		const { successRedirectUrl, errorRedirectUrl, success, failed } = req.params || {}
		const errorRedirect = decodeURIComponent(failed || errorRedirectUrl || onErrorRedirectUrl)
		const successRedirect = decodeURIComponent(success || successRedirectUrl || onSuccessRedirectUrl)
		if (!errorRedirect) {
			send(res, {
				code:500,
				message: `${defaultErrorMessage} (code 004)`,
				verboseMessage: 'Missing required redirect error url. This redirect url is neither defined under the .userinrc.json nor in the request payload.'
			})
			next()
			return
		}
		if (!successRedirect) {
			send(res, {
				code:500,
				message: `${defaultErrorMessage} (code 005)`,
				verboseMessage: 'Missing required redirect success url. This redirect url is neither defined under the .userinrc.json nor in the request payload.'
			})
			next()
			return
		}

		const formatErrorUrl = ({ code, message, verboseMessage, data }) => addErrorToUrl(errorRedirect, { code, message, verboseMessage, data })

		const callbackURL = callbackPathname ? getCallbackUrl(req, callbackPathname, { redirectsWithQueryParams }) : undefined
		const handler = passport.authenticate(strategy, { callbackURL }, (err,user) => {
			// CASE 1 - IdP Failure
			if (err) {
				const redirectUrl = formatErrorUrl({
					code:500, 
					message: `${defaultErrorMessage} (code 006)`,
					verboseMessage: err.message
				})
				res.redirect(redirectUrl)
				next()
			}
			// CASE 2 - IdP Success
			else 
				authToUserPortal({ user, userPortal, strategy, successRedirect, formatErrorUrl, res, next })
		})
		handler(req, res, next)
	}
}

module.exports = {
	authToUserPortal,
	getCallbackUrl,
	addErrorToUrl,
	getAuthResponseHandler
}
