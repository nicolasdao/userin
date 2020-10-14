const { getUrlObj } = require('./_utils')

const description = `# AUTHORIZE API

This web API redirects the user-agent to this platform's consent page which prompts the resource owner to decide 
whether they want to allow a registered third-party app to access specific resources (based on scopes) or not.

__*Request example:*__

\`\`\`js
GET https://yourauthserver.com/v1/authorize?
	client_id=123&
	response_type=code&
	redirect_uri=https%3A%2F%2Fyourauthserver.com%2Fsomeredirectpath&
	scope=offline_access+profile&
	code_challenge=56789&
	code_challenge_method=plain&
	state=12345
\`\`\`

> IMPORTANT NOTES:
>	- The \`offline_access\` in the \`scope\` variable is an OAuth 2.0. convention to indicate that the \`code\` should be able to be exchanged later (via the \`/token\` API) with a \`refresh_token\`.
>	- Both \`code_challenge\` and \`code_challenge_method\` are optional, but they cannot be specified without one or the other. This is part of the PKCE security flow.
`

/**
 * Creates a Postman API. 
 * 
 * @param  {String} pathname	e.g., '/oauth2/v1/authorize'
 * @param  {String} token		e.g., '/oauth2/v1/token'
 * 	
 * @return {Object}
 */
const create = (pathname, token) => {
	const redirect_uri = 'https://oauth.pstmn.io/v1/callback'

	return {
		name:'[OAuth] - authorization_endpoint',
		request: {
			auth: {
				type: 'oauth2',
				oauth2: [{
					key: 'authUrl',
					value: getUrlObj(pathname).raw,
					type: 'string'
				}, {
					key: 'accessTokenUrl',
					value: getUrlObj(token, { redirect_uri }).raw,
					type: 'string'
				}, {
					key: 'scope',
					value: 'offline_access',
					type: 'string'
				}, {
					key: 'addTokenTo',
					value: 'header',
					type: 'string'
				}, {
					key: 'useBrowser',
					value: true,
					type: 'boolean'
				}, {
					key: 'client_authentication',
					value: 'body',
					type: 'string'
				}, {
					key: 'clientId',
					value: '{{client_id}}',
					type: 'string'
				}, {
					key: 'tokenName',
					value: 'authorize_access_token',
					type: 'string'
				}]
			},
			method:'GET',
			url: getUrlObj(pathname, {
				client_id: { value: '{{client_id}}', description: '[Required] Client ID of the App that is requesting access. If the client is private, use the Authorization header with the Basic scheme to specify both the client_id and the client_secret.' },
				response_type: { value: 'ENTER_TYPE_HERE', description: '[Required] Valid values: \'code\', \'code token\', \'token\'. This value defines what is returned when the authentication is successfull (token means access_token).' },
				redirect_uri: { value: 'ENTER_REDIRECT_URI_HERE', description: '[Required] URL where the consent page redirects after successful authentication.' },
				scope: { value: 'ENTER_SPACED_DELIMITED_SCOPES_HERE', disabled: true, description: '[Optional] Use \'offline_access\' if the code must be able to be exchanged for a refresh_token.' },
				code_challenge: { value: 'ENTER_CODE_CHALLENGE_HERE', disabled: true, description: '[Optional] Only needed when PKCE is implemented.' }, 
				code_challenge_method: { value: 'ENTER_CHALLENGE_METHOD_HERE', disabled: true, description: '[Optional] Valid values: \'plain\' or \'S256\'. Only required when \'code_challenge\' is defined.' },
				state: { value: 'ENTER_STATE_HERE', disabled: true, description: '[Optional]' }
			}),
			description: description
		}
	}
}

module.exports = {
	create
}