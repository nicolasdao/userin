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
 * Build a new URI made of the current request domain, a pathname, and optional request paramaters 'successRedirectUrl', 'errorRedirectUrl' 
 * @param  {Request} req      	Request object. 
 * @param  {String}  pathname 	Custom pathname
 * @return {String}  			New URI
 */
const getCallbackUrl = (req, pathname) => {
	const { successRedirectUrl, errorRedirectUrl } = req.params || {}
	return urlHelp.buildUrl({ 
		protocol: req.secure ? 'https:' : 'http:', 
		host: req.headers.host, 
		pathname: (successRedirectUrl && errorRedirectUrl) ? join(pathname, successRedirectUrl, errorRedirectUrl) : pathname
	})
}

const authToUserPortal = ({ user, userPortal, strategy, successRedirect, formatErrorUrl, res, next }) => {
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
					let urlInfo = urlHelp.getInfo(successRedirect)
					urlInfo.query.code = data.code
					const redirectUrl = urlHelp.buildUrl(urlInfo)
					res.redirect(redirectUrl)
				}
				else {
					const redirectUrl = formatErrorUrl({
						code:400, 
						message: defaultErrorMessage,
						verboseMessage: `The ${strategy} OAuth succeeded, HTTP GET to 'userPortal.api' ${userPortal.api} successed to but did not return a 'token' value ({ "token": null }).`,
						data:user
					})
					res.redirect(redirectUrl)
				}
			} else {
				const errMsg = typeof(data) == 'string' ? data : data ? (data.message || (data.error || {}).message || JSON.stringify(data)) : null
				const redirectUrl = formatErrorUrl({
					code:400, 
					message: errMsg || defaultErrorMessage,
					verboseMessage: `The ${strategy} OAuth succeeded, but HTTP GET to 'userPortal.api' ${userPortal.api} failed.${errMsg ? ` Details: ${errMsg}` : ''}`,
					data:user
				})
				res.redirect(redirectUrl)
			}
		}).catch(err => {
			const redirectUrl = formatErrorUrl({
				code: 500, 
				message: defaultErrorMessage,
				verboseMessage: err.message,
				data: user
			})
			res.redirect(redirectUrl)
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
 * @param  {String} strategy 			e.g., facebook, google, linkedin, github
 * @param  {String} userPortal.api 		URL of the API (POST) that accepts a user and returns a custom response.
 * @param  {String} userPortal.key   	API key used to safely communicate between 'UserIn' and the 'userPortal.api' endpoint.
 * @param  {Object} onSuccess   		Object defining a set of properties that are always returned in case of success
 * @param  {Object} onError   			Object defining a set of properties that are always returned in case of error
 * @param  {String} callbackPathname 	Only required for facebook. Otherwise, it throws a 'missing_redirect_uri' exception.
 * @return {Handler}           			[description]
 */
const getAuthResponseHandler = ({ strategy, userPortal, redirectUrls, callbackPathname }) => {
	const { onSuccess, onError } = redirectUrls || {}
	const onErrorRedirectUrl = (onError || {}).default
	const onSuccessRedirectUrl = (onSuccess || {}).default

	return (req, res, next) => {
		const { successRedirectUrl, errorRedirectUrl } = req.params || {}
		const errorRedirect = decodeURIComponent(errorRedirectUrl || onErrorRedirectUrl)
		const successRedirect = decodeURIComponent(successRedirectUrl || onSuccessRedirectUrl)
		if (!errorRedirect) {
			send(res, {
				code:500,
				message: defaultErrorMessage,
				verboseMessage: 'Missing required redirect error url. This redirect url is neither defined under the .userinrc.json nor in the request payload.'
			})
			next()
			return
		}
		if (!successRedirect) {
			send(res, {
				code:500,
				message: defaultErrorMessage,
				verboseMessage: 'Missing required redirect success url. This redirect url is neither defined under the .userinrc.json nor in the request payload.'
			})
			next()
			return
		}

		const formatErrorUrl = ({ code, message, verboseMessage, data }) => addErrorToUrl(errorRedirect, { code, message, verboseMessage, data })

		const callbackURL = callbackPathname ? getCallbackUrl(req, callbackPathname) : undefined
		const handler = passport.authenticate(strategy, { callbackURL }, (err,user) => {
			// CASE 1 - IdP Failure
			if (err) {
				const redirectUrl = formatErrorUrl({
					code:500, 
					message: defaultErrorMessage,
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