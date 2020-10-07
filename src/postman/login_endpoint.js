const { getUrlObj } = require('./_utils')

const description = `# LOGIN API

This web API is used to log existing user in with a username and password. This API is not part of the OAuth 2.0. specification.

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/v1/login
body
    username: 'you@example.com'
    password: 'superstrongpwd123'
    scope: "offline_access"
\`\`\`

> Notice the optional \`scope\` value. Though this API is not a standard OAuth 2.0. API, UserIn uses the OAuth 2.0. convention to get a \`refresh_token\` back. Without the \`offline_access\` scope, only the \`access_token\` is returned.

__*Response example:*__

\`\`\`js
// HTTP 200
{
	access_token: '1234',
	token_type: 'bearer',
	expires_in: 3600, // Unit is seconds
	refresh_token: '4567',
	scope: 'offline_access'
}
\`\`\`
`

const create = (pathname) => ({
	name:'[Non OAuth] - login_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'urlencoded',
			urlencoded: [{
				key: 'username',
				value: 'ENTER_USERNAME_HERE',
				type: 'text'
			}, {
				key: 'password',
				value: 'ENTER_PASSWORD_HERE',
				type: 'text'
			}]
		},
		description
	}
})

module.exports = {
	create
}