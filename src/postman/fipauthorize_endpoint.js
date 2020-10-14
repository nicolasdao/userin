const { getUrlObj } = require('./_utils')

const description = fipName => `# ${fipName.toUpperCase()} AUTHORIZE API

This web API redirects the user-agent to the ${fipName} consent page which prompts the resource owner to decide 
whether they want to allow this platform to access specific resources (based on scopes) or not.

> WARNING: Though this API looks like the standard OAuth 2.0. \`/authorize\` web API, it is no OAuth 2.0. compliant. This API
> is used to help users to log in or sign up (creating accounts is not part of the OAuth 2.0. specification) using an 
> identity provider that uses OAuth 2.0. or OpenID (e.g., Facebook, Google). Similarly to the OAuth 2.0. API, this API uses 
> redirects and generates authorization code, and tokens, but the flows are different. 

__*Request example:*__

\`\`\`js
GET https://yourauthserver.com/v1/${fipName}/authorize?
	response_type=code&
	redirect_uri=https%3A%2F%2Fyourauthserver.com%2Fsomeredirectpath&
	mode=login&
	scope=offline_access+profile&
	code_challenge=56789&
	code_challenge_method=plain&
	state=12345
\`\`\`

> IMPORTANT NOTES:
>	- Notice that contrary to the standard OAuth 2.0. \`/authorize\` API, there is no \`client_id\` involved. 
>	- The \`mode\` is a concept that does not exist in the standard OAuth 2.0. \`/authorize\` API. This optional variable only uses two values:
>		- \`login\` (default): Indicates that this API should test whether the user can login to the platform after they've successfully authenticated with the identity provider.
>		- \`signup\`: Indicates that this API should create a new user upon successfully authentication with the identity provider.
>	- The \`offline_access\` in the \`scope\` variable is an OAuth 2.0. convention to indicate that the \`code\` should be able to be exchanged later (via the \`/token\` API) with a \`refresh_token\`.
>	- Both \`code_challenge\` and \`code_challenge_method\` are optional, but they cannot be specified without one or the other. This is part of the PKCE security flow.
`

const create = (pathname, endpoint, fipName) => ({
	name:`[Non OAuth] - ${endpoint}`,
	request: {
		method:'GET',
		url: getUrlObj(pathname, {
			response_type: { value: 'ENTER_TYPE_HERE', description: '[Required] Valid values: \'code\', \'code token\', \'token\'. This value defines what is returned when the authentication is successfull (token means access_token).' },
			redirect_uri: { value: 'ENTER_REDIRECT_URI_HERE', description: '[Required] URL where the consent page redirects after successful authentication.' },
			mode: { value:'ENTER_MODE_HERE', disabled: true, description: '[Optional] Default is \'login\'. Valid values: \'login\' or \'signup\'. This value defines whether the user that has successfully been authenticated with the IdP should have an account created on your platform (signup) or should be logged in to your platform (login).' },
			scope: { value: 'ENTER_SPACED_DELIMITED_SCOPES_HERE', disabled: true, description: '[Optional] Use \'offline_access\' if the code must be able to be exchanged for a refresh_token.' },
			code_challenge: { value: 'ENTER_CODE_CHALLENGE_HERE', disabled: true, description: '[Optional] Only needed when PKCE is implemented.' }, 
			code_challenge_method: { value: 'ENTER_CHALLENGE_METHOD_HERE', disabled: true, description: '[Optional] Valid values: \'plain\' or \'S256\'. Only required when \'code_challenge\' is defined.' },
			state: { value: 'ENTER_STATE_HERE', disabled: true, description: '[Optional]' }
		}),
		description: description(fipName)
	}
})

module.exports = {
	create
}