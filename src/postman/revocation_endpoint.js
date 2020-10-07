const { getUrlObj } = require('./_utils')

const description = '# OAUTH 2.0. REVOKE API'

const create = (pathname) => ({
	name:'[OAuth] - revocation_endpoint',
	request: {
		method:'POST',
		auth: {
			type: 'bearer',
			bearer: [{
				key: 'token',
				value: 'ENTER_ACCESS_TOKEN_HERE',
				type: 'string'
			}]
		},
		url: getUrlObj(pathname),
		body: {
			mode: 'raw',
			raw: JSON.stringify({ 
				token:'ENTER_REFRESH_TOKEN_HERE'
			}, null, '    ')
		},
		description
	}
})

module.exports = {
	create
}