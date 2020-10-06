const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'revocation_endpoint',
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
		}
	}
})

module.exports = {
	create
}