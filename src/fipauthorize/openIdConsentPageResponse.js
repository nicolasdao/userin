const { error: { catchErrors }, fetch } = require('puffy')
const { error:userInError } = require('userin-core')
const jwt = require('jsonwebtoken')
const getResponseHandler = require('./getResponseHandler')
const { request: { getUrlInfo } } = require('../_utils')

const TRACE_ON = process.env.LOG_LEVEL == 'trace'


const getUserDataFromTokenEndpoint = ({ token_endpoint, client_id, client_secret }) => 
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
	(req, res, strategy, redirect_uri) => catchErrors((async () => {
		const errorMsg = `Failed to retrieve ${strategy} user and tokens when querying ${redirect_uri}`

		if (TRACE_ON)
			console.log(`INFO - Exchanging ${strategy} Authorization code for a user object (incl. tokens)`)

		const requestUrlInfo = getUrlInfo(req)
		const { code } = requestUrlInfo.query || {}

		if (!code)
			throw new userInError.InvalidRequestError(`${errorMsg}. Missing required 'code' in the ${strategy} response.`)

		const { status:tokenStatus, data:tokenData } = await fetch.post({
			uri: token_endpoint,
			headers: {
				'Content-Type': 'application/json'
			},
			body: {
				code,
				client_id,
				client_secret,
				grant_type:'authorization_code',
				redirect_uri
			}
		})

		if (tokenStatus == 404)
			throw new Error(`${errorMsg}. HTTP POST ${token_endpoint} not found (status: 404)`)
		if (tokenStatus >= 400)
			throw new Error(`${errorMsg}. HTTP POST ${token_endpoint} failed (status: ${tokenStatus}).${tokenData ? typeof(tokenData) == 'string' ? tokenData : JSON.stringify(tokenData) : ''}`)

		const { access_token, id_token, refresh_token } = tokenData || {}

		if (!access_token)
			throw new Error(`${errorMsg}. HTTP POST ${token_endpoint} with grant_type 'authorization_code' did not return an 'access_token'.`)
		if (!id_token)
			throw new Error(`${errorMsg}. HTTP POST ${token_endpoint} with grant_type 'authorization_code' did not return an 'id_token'.`)

		const profile = jwt.decode(id_token)

		if (!profile)
			throw new Error(`${errorMsg}. The id_token returned by the ${strategy} ${token_endpoint} is not a JWT. id_token value: ${id_token}`)			

		return { ...profile, access_token, refresh_token, id: profile.sub }
	})())

module.exports = ({ token_endpoint, client_id, client_secret }) => {
	const errorMsg = 'Failed to create consent page response handler'
	if (!token_endpoint)
		throw new Error(`${errorMsg}. Missing required 'token_endpoint'.`)
	if (!client_id)
		throw new Error(`${errorMsg}. Missing required 'client_id'.`)

	const getUserData = getUserDataFromTokenEndpoint({ token_endpoint, client_id, client_secret })
	return getResponseHandler(getUserData)
}





