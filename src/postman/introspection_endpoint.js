const { getUrlObj } = require('./_utils')

const description = '# OAUTH 2.0. INTROSPECT API'

const create = (pathname) => ({
	name:'[OAuth] - introspection_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'urlencoded',
			urlencoded: [{
				key: 'client_id',
				value: '{{client_id}}',
				type: 'text',
				description: '[Required]',
			}, {
				key: 'client_secret',
				value: '{{client_secret}}',
				type: 'text',
				description: '[Optional] Only required when this endpoint is private.',
				disabled: true
			}, {
				key: 'token',
				value: 'ENTER_TOKEN_HERE',
				type: 'text',
				description: '[Required] Token'
			}, {
				key: 'token_type_hint',
				value: 'CHOOSE_TOKEN_TYPE',
				type: 'text',
				description: '[Required] Valid values: \'access_token\', \'refresh_token\' or \'id_token\'.'
			}]
		},
		description
	}
})

module.exports = {
	create
}