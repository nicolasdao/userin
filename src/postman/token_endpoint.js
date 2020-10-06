const { getUrlObj } = require('./_utils')

const create = (payload, description) => pathname => ({
	name:'token_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'raw',
			raw: JSON.stringify(payload, null, '    ')
		},
		description: description || ''
	}
})

const common = {
	client_id: '{{client_id}}', 
	client_secret: '{{client_secret}}',
	scope: 'ADD_SPACED_DELIMITED_SCOPES_HERE'
}

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

const createAuthorizationCode = create({ 
	...common,
	grant_type:'authorization_code',
	code: 'ENTER_CODE_HERE',
	redirect_uri: 'ENTER_REDIRECT_URI_USED_TO_PREVIOUSLY_GET_CODE_HERE'
}, `# TOKEN API - Grant type: authorization_code

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
>	- The \`redirect_uri\` is required for security reason. This URI must be the same as the \`redirect_uri\` used during the authorization request. This security constraint helps to reduce attack vectors.
${commonFooter}
`)

const createRefreshToken = create({ 
	...common,
	grant_type:'refresh_token',
	refresh_token: 'ENTER_REFRESH_TOKEN_HERE'
}, `# TOKEN API - Grant type: refresh_token

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

const createPassword = create({ 
	...common,
	grant_type:'password',
	username: 'ENTER_USERNAME_HERE',
	password: 'ENTER_PASSWORD_HERE'
}, `# TOKEN API - Grant type: authorization_code

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

const createClientCredentials = create({ 
	...common,
	grant_type:'client_credentials'
}, `# TOKEN API - Grant type: authorization_code

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