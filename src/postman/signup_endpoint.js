const { getUrlObj } = require('./_utils')

const description = `# SIGNUP API

This web API is used to sign up new users using their username and password. This API is not part of the OAuth 2.0. specification.

__*Request example:*__

\`\`\`js
POST https://yourauthserver.com/v1/signup
body
    username: 'you@example.com'
    password: 'superstrongpwd123'
    scope: "offline_access"
\`\`\`

> Notice:
>	- The optional \`scope\` value. Though this API is not a standard OAuth 2.0. API, UserIn uses the OAuth 2.0. convention to get a \`refresh_token\` back. Without the \`offline_access\` scope, only the \`access_token\` is returned.
>	- More values can be passed to the body (e.g., \`firstName\`, \`lastName\`). This is entirely up to you to decide what the signup form must request from the user. 

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
	name:'[Non OAuth] - signup_endpoint',
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
			}, {
				key: 'otherPropOfYourChoice01',
				value: 'FOR_EXAMPLE_FIRST_NAME',
				type: 'text',
				description: '[Optional] This property could be renamed \'firstName\' for example.',
				disabled: true
			}, {
				key: 'otherPropOfYourChoice02',
				value: 'FOR_EXAMPLE_LAST_NAME',
				type: 'text',
				description: '[Optional] This property could be renamed \'lastName\' for example.',
				disabled: true
			}]
		},
		description
	}
})

module.exports = {
	create
}