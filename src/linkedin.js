const passport = require('passport')
const Strategy = require('passport-linkedin-oauth2').Strategy
const { idpHelp: { getCallbackUrl, getAuthResponseHandler } } = require('./utils')

const STRATEGY = 'linkedin'
const OAUTH_PATHNAME = `/${STRATEGY}/oauth2`
const OAUTH_CALLBACK_PATHNAME = `/${STRATEGY}/oauth2callback`

const parseAuthResponse = (accessToken, refreshToken, profile, next) => {
	const id = profile.id
	const { givenName: firstName, middleName, familyName: lastName } = profile.name || {}
	const email = ((profile.emails || [])[0] || {}).value || null
	const profileImg = ((profile.photos || [])[0] || {}).value

	const user = { id, firstName, middleName, lastName, email, profileImg, accessToken, refreshToken }
	next(null, user)
}

let _passportConfigured = false
const configurePassport = ({ appId, appSecret, callbackURL, scopes }) => 
	passport.use(new Strategy({
		clientID: appId,
		clientSecret: appSecret,
		callbackURL,
		profileFields: [
			'id',
			'first-name',
			'last-name',
			'email-address',
			//'headline',
			//'summary',
			//'industry',
			'picture-url',
			//'positions',
			'public-profile-url',
			//"location"
		],
		scope: scopes
	}, parseAuthResponse))

/**
 * Returns an Express handler used by the client to request Authorization access to the IdP
 * 
 * @return {Void}        	[description]
 */
const getAuthRequestHandler = ({ appId, appSecret, scopes }) => (req, res, next) => {
	if (!_passportConfigured) {
		const callbackURL = getCallbackUrl(req, OAUTH_CALLBACK_PATHNAME)
		configurePassport({ appId, appSecret, callbackURL, scopes })
		_passportConfigured = true
	}

	const handler = passport.authenticate(STRATEGY)
	handler(req, res, next)
}

const setUp = ({ appId, appSecret, scopes, userPortal, redirectUrls }) => {

	const authRequestHandler = getAuthRequestHandler({ appId, appSecret, scopes })
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
	scopes: ['r_liteprofile', 'r_emailaddress']
}


