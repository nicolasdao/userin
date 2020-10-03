const passport = require('passport')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const getResponseHandler = require('./getResponseHandler')

const TRACE_ON = process.env.LOG_LEVEL == 'trace'

/**
 * Gets the user details from the IdP. This should also include OIDC tokens such as a refreshToken and an accessToken. 
 * 
 * @param  {Request}	req				This request object contained the secret 'code' in its query params. Without 
 *                          			that 'code', it would not be possible to get the user details. 	
 * @param  {Response}	res				To be honest, this one is useless here.
 * @param  {String}		strategy
 * @param  {String}		redirect_uri
 * 
 * @return {[Error]}	output[0]
 * @return {Object}		output[1]		IdP User	
 */
const getUserData = (req, res, strategy, redirect_uri) => catchErrors(new Promise((onSuccess, onFailure) => {
	const errorMsg = `Failed to retrieve ${strategy} user and tokens when querying ${redirect_uri}`

	if (TRACE_ON)
		console.log(`INFO - Exchanging ${strategy} Authorization code for a user object (incl. tokens)`)

	try {
		passport.authenticate(strategy, { callbackURL:redirect_uri }, (err,user) => {
			// CASE 1 - IdP Failure
			if (err) 
				onFailure(wrapErrors(errorMsg, [err]))
			// CASE 2 - IdP Success
			else 
				onSuccess(user)
		})(req, res)
	} catch (err) {
		onFailure(wrapErrors(errorMsg, [err]))
	}
}))

module.exports = () => getResponseHandler(getUserData)





