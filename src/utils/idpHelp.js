const passport = require('passport')
const urlHelp = require('./url')
const { obj:{ merge } } = require('./core')
const fetch = require('./fetch')

const getCallbackUrl = (req, pathname) => urlHelp.buildUrl({ 
	protocol: req.secure ? 'https:' : 'http:', 
	host: req.headers.host, 
	pathname
})

const formatError = (onError, message) => merge(onError || {}, { error: message })

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

	const callbackURL = callbackPathname ? getCallbackUrl(req, callbackPathname) : undefined
	const handler = passport.authenticate(strategy, { callbackURL }, (err,user) => {
		// CASE 1 - IdP Failure
		if (err) {
			res.status(500).send(formatError(onError, err.message))
			next()
		}
		// CASE 2 - IdP Success
		else {
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
						if (data && data.token) 
							res.status(200).send(merge(onSuccess, data))
						else 
							res.status(422).send(formatError(onError, `The ${strategy} OAuth succeeded, HTTP GET to 'userPortal.api' ${userPortal.api} successed to but did not return a 'token' value ({ "token": null }).`))
					} else {
						const errMsg = typeof(data) == 'string' ? data : data ? (data.message || (data.error || {}).message || JSON.stringify(data)) : null
						res.status(status).send(formatError(onError, `The ${strategy} OAuth succeeded, but HTTP GET to 'userPortal.api' ${userPortal.api} failed.${errMsg ? ` Details: ${errMsg}` : ''}`))
					}
				}).catch(err => {
					res.status(500).send(formatError(onError, err.message))
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
	formatError,
	getAuthResponseHandler
}