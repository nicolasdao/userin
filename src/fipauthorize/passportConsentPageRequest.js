const passport = require('passport')
const { error: { catchErrors, wrapErrors } } = require('puffy')
const getRequestHandler = require('./getRequestHandler')

const redirectToConfigurableConsentPage = () => 
	/**
	 * Configures a request/response handler that can redirect to a specific FIP authorization endpoint. 
	 * 
	 * @param  {String}		redirect_uri	Redirect URI that the FIP should use to redirect the user after they have accepted the terms of the consent screen.
	 * @param  {String}		state			State value that the FIP should return in the query params ot the 'redirect_uri'.
	 * @param  {String}		openIdServer	Name of the Passport strategy that manages this flow. 
	 * @param  {[String]} 	scopes			Scopes requested to the FIP. 
	 * 
	 * @return {Function}	handler			(req: Request, res: Response): Void
	 */
	({ redirect_uri, state, openIdServer, scopes=[] }) => 
		/**
		 * Processes the authorization request an redirect it to the FIP authorization endpoint (which
		 * will most likely redirect to the FIP consent screen). 
		 * 
		 * @param  {Request}	req	
		 * @param  {Response}	res		
		 * @return {Void}		
		 */
		(req,res) => catchErrors(() => {
			const errorMsg = `Failed to redirect to ${redirect_uri} (OAuth 2.0 Auth server: ${openIdServer})`
			try {
				passport.authenticate(openIdServer, { callbackURL:redirect_uri, scope:scopes, state })(req, res)
			} catch(err) {
				throw wrapErrors(errorMsg, [err])
			}
		})

/**
 * Creates a 'getConsentPageRequestHandler' function.
 *
 * @param	{Void}		
 *
 * @return	{Function}	getConsentPageRequestHandler		(endpoint: String, name: String, endpointRedirectRef: String, scopes: [String], verifyClientId: Boolean)
 */
module.exports = () => {
	const configureRedirect = redirectToConfigurableConsentPage()
	return getRequestHandler(configureRedirect)
}




