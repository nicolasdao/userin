const { url: urlHelp, error: { catchErrors, wrapErrors } } = require('puffy')
const getRequestHandler = require('./getRequestHandler')

const redirectToConfigurableConsentPage = ({ authorization_endpoint, client_id }) => 
	/**
	 * Configures a request/response handler that can redirect to a specific FIP authorization endpoint. 
	 * 
	 * @param  {String}		redirect_uri	Redirect URI that the FIP should use to redirect the user after they have accepted the terms of the consent screen.
	 * @param  {String}		state			State value that the FIP should return in the query params ot the 'redirect_uri'.
	 * @param  {String}		openIdServer	Name of the FIP. Only used for logging purpose. No real functional use in this case.
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
			const scope = Array.from(new Set([...scopes,'openid'])).filter(x => x).join(' ')
			try {
				const fullAuthServerUri = urlHelp.buildUrl({
					origin: authorization_endpoint,
					query: {
						client_id,
						response_type: 'code',
						scope,
						state,
						redirect_uri
					}
				})

				res.redirect(fullAuthServerUri)
			} catch(err) {
				throw wrapErrors(errorMsg, [err])
			}
		})

/**
 * Creates a 'getConsentPageRequestHandler' function.
 *
 * @param	{String}	authorization_endpoint				URL 
 * @param	{String}	client_id							
 *
 * @return	{Function}	getConsentPageRequestHandler		(endpoint: String, name: String, endpointRedirectRef: String, scopes: [String], verifyClientId: Boolean)
 */
module.exports = ({ authorization_endpoint, client_id }) => {
	const errorMsg = 'Failed to create redirect to consent page handler'
	if (!authorization_endpoint)
		throw new Error(`${errorMsg}. Missing required 'authorization_endpoint'.`)
	if (!client_id)
		throw new Error(`${errorMsg}. Missing required 'client_id'.`)

	const configureRedirect = redirectToConfigurableConsentPage({ authorization_endpoint, client_id })
	return getRequestHandler(configureRedirect)
}




