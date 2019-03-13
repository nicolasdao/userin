const passport = require('passport')
const Strategy = require('passport-linkedin-oauth2').Strategy
const { fetch, obj:{ merge }, idpHelp: { getCallbackUrl, formatError } } = require('./utils')

const STRATEGY = 'linkedin'
const OAUTH_PATHNAME = `/${STRATEGY}/oauth2`
const OAUTH_CALLBACK_PATHNAME = `/${STRATEGY}/oauth2callback`

const parseAuthResponse = (accessToken, refreshToken, profile, next) => {
	const id = profile.id
	const { givenName: firstName, middleName, familyName: lastName } = profile.name || {}
	const email = ((profile.emails || [])[0] || {}).value || null
	const profileImg = ((profile.photos || [])[0] || {}).value

	const user = { id, firstName, middleName, lastName, email, profileImg }
	next(null, user)
}

let _passportConfigured = false
const configurePassport = ({ appId, appSecret, callbackURL, scopes }) => 
	passport.use(new Strategy({
		clientID: appId,
		clientSecret: appSecret,
		callbackURL,
		scope: scopes
	}, parseAuthResponse))

/**
 * Returns an Express handler used by the client to request Authorization access to the IdP
 * 
 * @return {Void}        	[description]
 */
const getAuthRequestHandler = ({ appId, appSecret, scopes }) => (req, res, next) => {
	console.log('REQUEST HANDLER')
	if (!_passportConfigured) {
		const callbackURL = getCallbackUrl(req, OAUTH_CALLBACK_PATHNAME)
		configurePassport({ appId, appSecret, callbackURL, scopes })
		_passportConfigured = true
	}

	const handler = passport.authenticate(STRATEGY)
	handler(req, res, next)
}

/**
 * Returns an Express handler that client indirectly request through the IdP redirection performed in response of 
 * an Authorization access request (done previously through the 'authRequestHandler' handler)
 * 
 * @param  {String} userPortalAPI 	URL of the API (POST) that accepts a user and returns a custom response.
 * @param  {String} apiKey   		API key used to safely communicate between 'UserIn' and the 'userPortalAPI' endpoint.
 * @return {Handler}           		[description]
 */
const getAuthResponseHandler = ({ userPortalAPI, apiKey, onSuccess, onError }) => (req, res, next) => {
	onSuccess = onSuccess || {}
	onError = onError || {}

	console.log('RESPONSE HANDLER')
	const handler = passport.authenticate(STRATEGY, {}, (err,user) => {
		// CASE 1 - IdP Failure
		if (err) {
			res.status(500).send(formatError(onError, err.message))
			next()
		}
		// CASE 2 - IdP Success
		else {
			// 2.1. An external user portal has been configured. Use it to manage the user
			if (userPortalAPI && apiKey)
				fetch.post({
					uri: userPortalAPI,
					headers: {
						'content-type': 'application/json',
						'x-api-key': apiKey
					},
					body: JSON.stringify(user)
				}).then(({ status, data }) => {
					if (status < 300) {
						if (data && data.token) 
							res.status(200).send(merge(onSuccess, data))
						else 
							res.status(422).send(formatError(onError, `The ${STRATEGY} OAuth succeeded, HTTP GET to 'userPortalAPI' ${userPortalAPI} successed to but did not return a 'token' value ({ "token": null }).`))
					} else 
						res.status(status).send(formatError(onError, `The ${STRATEGY} OAuth succeeded, but HTTP GET to 'userPortalAPI' ${userPortalAPI} failed.`))
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

const setUp = ({ appId, appSecret, scopes, userPortalAPI, apiKey, onSuccess, onError }) => {

	const authRequestHandler = getAuthRequestHandler({ appId, appSecret, scopes })
	const authResponseHandler = getAuthResponseHandler({ userPortalAPI, apiKey, onSuccess, onError })

	return {
		authRequest: authRequestHandler,
		authResponse: authResponseHandler,
		pathname: OAUTH_PATHNAME,
		callbackPathname: OAUTH_CALLBACK_PATHNAME
	}
}


module.exports = {
	setUp
}


