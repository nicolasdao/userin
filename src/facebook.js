const passport = require('passport')
const Strategy = require('passport-facebook')
const { idpHelp: { getCallbackUrl, getAuthResponseHandler } } = require('./utils')

const STRATEGY = 'facebook'
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

/**
 * Returns an Express handler used by the client to request Authorization access to the IdP
 * 
 * @return {Void}        	[description]
 */
const getAuthRequestHandler = ({ scopes }) => (req, res, next) => {
	const callbackURL = getCallbackUrl(req, OAUTH_CALLBACK_PATHNAME)
	const handler = passport.authenticate(STRATEGY, { callbackURL, scope:scopes })
	handler(req, res, next)
}

const setUp = ({ appId, appSecret, scopes, profileFields, userPortal, redirectUrls }) => {
	passport.use(new Strategy({
		clientID: process.env.FACEBOOK_APP_ID || appId,
		clientSecret: process.env.FACEBOOK_APP_SECRET || appSecret,
		profileFields: profileFields
	}, parseAuthResponse))

	const authRequestHandler = getAuthRequestHandler({ scopes })
	const authResponseHandler = getAuthResponseHandler({ strategy:STRATEGY, userPortal, redirectUrls, callbackPathname:OAUTH_CALLBACK_PATHNAME })

	return {
		authRequest: authRequestHandler,
		authResponse: authResponseHandler,
		pathname: OAUTH_PATHNAME,
		callbackPathname: OAUTH_CALLBACK_PATHNAME
	}
}


module.exports = {
	setUp,
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
}


