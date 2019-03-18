const passport = require('passport')
const urlHelp = require('./url')
const { obj:{ merge } } = require('./core')
const fetch = require('./fetch')
const { throwIfNotTruthy } = require('./error')

const getCallbackUrl = (req, pathname) => urlHelp.buildUrl({ 
	protocol: req.secure ? 'https:' : 'http:', 
	host: req.headers.host, 
	pathname
})

const addErrorToUrl = (url, { code, message }) => {
	let urlInfo = urlHelp.getInfo(url)
	urlInfo.query.error_msg = encodeURIComponent(message)
	urlInfo.query.error_code = code
	return urlHelp.buildUrl(urlInfo)
}

/**
 * Returns an Express handler that client indirectly request through the IdP redirection performed in response of 
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
const getAuthResponseHandler = ({ strategy, userPortal, onSuccess, onError, callbackPathname }) => (req, res, next) => {
	onSuccess = onSuccess || {}
	onError = onError || {}

	throwIfNotTruthy(onSuccess.redirectUrl, 'onSuccess.redirectUrl')
	throwIfNotTruthy(onError.redirectUrl, 'onError.redirectUrl')

	const formatErroUrl = (code, message) => addErrorToUrl(onError.redirectUrl, { code, message })

	const callbackURL = callbackPathname ? getCallbackUrl(req, callbackPathname) : undefined
	const handler = passport.authenticate(strategy, { callbackURL }, (err,user) => {
		// CASE 1 - IdP Failure
		if (err) {
			const redirectUrl = formatErroUrl(500, err.message)
			res.redirect(redirectUrl)
			next()
		}
		// CASE 2 - IdP Success
		else {
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
							if (onSuccess.cookie && onSuccess.cookie.name)
								res.cookie(onSuccess.cookie.name, JSON.stringify(data), { 
									expire: onSuccess.cookie.expire,   
									maxAge: onSuccess.cookie.maxAge,
									httpOnly: onSuccess.cookie.httpOnly
								})

							let urlInfo = urlHelp.getInfo(onSuccess.redirectUrl)
							urlInfo.hash = `#code=${encodeURIComponent(data.code)}`
							const redirectUrl = urlHelp.buildUrl(urlInfo)
							res.redirect(redirectUrl)
						}
						else {
							const redirectUrl = formatErroUrl(422, `The ${strategy} OAuth succeeded, HTTP GET to 'userPortal.api' ${userPortal.api} successed to but did not return a 'token' value ({ "token": null }).`)
							res.redirect(redirectUrl)
						}
					} else {
						const errMsg = typeof(data) == 'string' ? data : data ? (data.message || (data.error || {}).message || JSON.stringify(data)) : null
						const redirectUrl = formatErroUrl(422, `The ${strategy} OAuth succeeded, but HTTP GET to 'userPortal.api' ${userPortal.api} failed.${errMsg ? ` Details: ${errMsg}` : ''}`)
						res.redirect(redirectUrl)
					}
				}).catch(err => {
					const redirectUrl = formatErroUrl(500, err.message)
					res.redirect(redirectUrl)
				}).then(next)
			// 2.2. No external user portal defined. Return the IdP user to the client
			else {
				res.status(200).send(merge(onSuccess, { user }))
				next()
			}
		}
	})
	handler(req, res, next)
}

module.exports = {
	getCallbackUrl,
	getAuthResponseHandler
}