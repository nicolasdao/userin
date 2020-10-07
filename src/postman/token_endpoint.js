const { getUrlObj } = require('./_utils')

const create = (payload=[], description, auth) => {
	/**
	 * Creates a Postman API. 
	 * 
	 * @param  {String} pathname							e.g., '/oauth2/v1/token'
	 * @param  {String} authorize.identityProviderName		e.g., 'google'
	 * @param  {String} authorize.endpointName				e.g., 'authorization_google_endpoint'
	 * @param  {String} authorize.pathname					e.g., '/v1/authorization_google_endpoint'
	 * 	
	 * @return {Object}
	 */
	return (pathname, authorize={}) => {
		let label
		// Deep clone the 'auth' because it is going to be mutated
		const _auth = auth ? JSON.parse(JSON.stringify(auth)) : null
		if (_auth && _auth.oauth2 && _auth.oauth2.length && authorize.identityProviderName && authorize.endpointName && authorize.pathname) {
			label = authorize.identityProviderName
			const authUrl = _auth.oauth2.find(x => x.key == 'authUrl')
			const accessTokenUrl = _auth.oauth2.find(x => x.key == 'accessTokenUrl')
			const redirect_uri = 'https://oauth.pstmn.io/v1/callback'
			if (authUrl) {
				// The other query params are defined in the 'auth.oauth2' object. The 'redirect_uri'
				// is automatically set to 'https://oauth.pstmn.io/v1/callback' by Postman. That what the 
				// auth.oauth2[key="useBrowser"] true does.
				const { raw } = getUrlObj(authorize.pathname, { mode: 'login' }) 
				authUrl.value = raw
			}
			if (accessTokenUrl)
				accessTokenUrl.value = getUrlObj(pathname, { redirect_uri }).raw
		}

		const grantType = (payload.find(x => x.key == 'grant_type') || {}).value || 'unknown'
		return {
			name:`token_endpoint - ${grantType}${label ? ` (${label})` : ''}`,
			request: {
				auth:_auth,
				method:'POST',
				url: getUrlObj(pathname),
				body: {
					mode: 'urlencoded',
					urlencoded: payload
				},
				description: description || ''
			}
		}
	}
}

const common = [{
	key: 'client_id',
	value: '{{client_id}}',
	type: 'text',
	description: '[Optional] Only required when UserIn mode contains \'openid\'.',
	disabled: true
}, {
	key: 'client_secret',
	value: '{{client_secret}}',
	type: 'text',
	description: '[Optional] Only required when UserIn mode contains \'openid\' and this endpoint is private.',
	disabled: true
}, {
	key: 'scope',
	value: 'ADD_SPACED_DELIMITED_SCOPES_HERE',
	type: 'text',
	description: '[Optional]',
	disabled: true
}]

const commonFooter = 
`>	- Both \`client_id\` and the \`client_secret\` might be optional. When UserIn is configured in \`loginsignup\` or \`loginsignupfip\` mode, the \`client_id\` and the \`client_secret\` are ignored. In \`openid\` mode, \`client_id\` is required. \`client_secret\` is required when at least one of the following conditions is met:
>		- The \`tokenApi.mode\` is set to \`private\`.
>		- The \`tokenApi.mode\` is set to \`pkce\` and no \`code_challenge\` has been requested by the user-agent.
>	- To return an \`id_token\` the scopes must contain \`openid\`. 
>	- To return a \`refresh_token\` the scopes must contain \`offline_access\`. 

__*Response example:*__

\`\`\`js
// HTTP 200
{
	access_token: '1234',
	token_type: 'bearer',
	expires_in: 3600, // Unit is seconds
	refresh_token: '4567',
	id_token: '8910',
	scope: 'openid offline_access profile email'
}
\`\`\`
`

const createAuthorizationCode = create([
	// the 'scope' is not used in the 'authorization_grant' because 
	// it uses the ones that were associated with the 'code' in the 
	// '/authorize' request.
	...common.filter(x => x.key != 'scope'), { 
		key: 'grant_type',
		value: 'authorization_code',
		type: 'text',
		description: '[Required]'
	}, {
		key: 'code',
		value: 'ENTER_CODE_HERE',
		type: 'text',
		description: '[Required]'
	}, {
		key: 'redirect_uri',
		value: 'ENTER_REDIRECT_URI_HERE',
		type: 'text',
		description: '[Required] This URL is required for security reasons. This URI must be the same as the `redirect_uri` used during the authorization request. This security constraint helps to reduce attack vectors.'
	}, {
		key: 'code_verifier',
		value: 'ENTER_CODE_VERIFIER_HERE',
		type: 'text',
		description: '[Optional] Only required when the authorization code used a \'code_challenge\'.',
		disabled: true
	}
], `# OAUTH 2.0. TOKEN API - Grant type: authorization_code

This OAuth 2.0. web API is used to exchange a \`code\` with one or many tokens. 

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/oauth2/v1/token
body
	grant_type: 'authorization_code'
	code: '12345'
	client_id: 'abc'
	client_secret: '1234567'
	redirect_uri: 'https://https://yourauthserver.com/oauth2/v1/authorizecallback'
\`\`\`

> IMPORTANT NOTES:
>	- This request does not specify any scopes. That's because the \`code\` was associated with scopes during the authorization request. 
>	- The \`redirect_uri\` is required for security reasons. This URI must be the same as the \`redirect_uri\` used during the authorization request. This security constraint helps to reduce attack vectors.
>	- The optional \`code_verifier\` is only required when the authorization code used a \`code_challenge\`.
${commonFooter}
`, {
	type: 'oauth2',
	oauth2: [{
		key: 'authUrl',
		value: 'ENTER_AUTHORIZE_URL_HERE',
		type: 'string'
	}, {
		key: 'accessTokenUrl',
		value: 'ENTER_TOKEN_URL_HERE',
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
	}]
})

const createRefreshToken = create([ 
	...common, {
		key: 'grant_type',
		value: 'refresh_token',
		type: 'text',
		description: '[Required]'
	}, {
		key: 'refresh_token',
		value: 'ENTER_REFRESH_TOKEN_HERE',
		type: 'text',
		description: '[Required]'
	}
], `# OAUTH 2.0. TOKEN API - Grant type: refresh_token

This OAuth 2.0. web API is used to exchange a \`refresh_token\` with one or many tokens. 

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/oauth2/v1/token
body
	grant_type: 'refresh_token'
	refresh_token: '987654'
	client_id: 'abc'
	client_secret: '1234567'
	scope: 'openid offline_access profile email'
\`\`\`

> IMPORTANT NOTES:
${commonFooter}
`)

const createPassword = create([ 
	...common, {
		key: 'grant_type',
		value: 'password',
		type: 'text',
		description: '[Required]'
	}, {
		key: 'username',
		value: 'ENTER_USERNAME_HERE',
		type: 'text',
		description: '[Required]'
	}, {
		key: 'password',
		value: 'ENTER_PASSWORD_HERE',
		type: 'text',
		description: '[Required]'
	}
], `# OAUTH 2.0. TOKEN API - Grant type: authorization_code

This OAuth 2.0. web API is used to exchange a \`password\` with one or many tokens. 

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/oauth2/v1/token
body
	grant_type: 'password'
	username: 'nic@cloudlessconsulting.com'
	password: '123456'
	client_id: 'abc'
	client_secret: '1234567'
	scope: 'openid offline_access profile email'
\`\`\`

> IMPORTANT NOTES:
${commonFooter}
`)

const createClientCredentials = create([ 
	...common, {
		key: 'grant_type',
		value: 'client_credentials',
		type: 'text',
		description: '[Required]'
	}
], `# OAUTH 2.0. TOKEN API - Grant type: authorization_code

This OAuth 2.0. web API is used to exchange a \`client_credentials\` with one or many tokens. 

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/oauth2/v1/token
body
	grant_type: 'client_credentials'
	client_id: 'abc'
	client_secret: '1234567'
	scope: 'openid offline_access profile email'
\`\`\`

> IMPORTANT NOTE:
> 	- With this grant type, both \`client_id\` and \`client_secret\` are required.
>	- To return an \`id_token\` the scopes must contain \`openid\`. 
>	- To return a \`refresh_token\` the scopes must contain \`offline_access\`. 

__*Response example:*__

\`\`\`js
// HTTP 200
{
	access_token: '1234',
	token_type: 'bearer',
	expires_in: 3600, // Unit is seconds
	refresh_token: '4567',
	id_token: '8910',
	scope: 'openid offline_access profile email'
}
\`\`\`
`)

module.exports = {
	authorization_code: {
		create: createAuthorizationCode	
	}, 
	refresh_token: {
		create: createRefreshToken	
	}, 
	password: {
		create: createPassword	
	}, 
	client_credentials: {
		create: createClientCredentials	
	}
}