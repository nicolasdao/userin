const { getUrlObj } = require('./_utils')

const description = '# OAUTH 2.0. USERINFO API'

const create = (pathname) => ({
	name:'[OAuth] - userinfo_endpoint',
	request: {
		method:'GET',
		auth: {
			type: 'bearer',
			bearer: [{
				key: 'token',
				value: 'ENTER_ACCESS_TOKEN_HERE',
				type: 'string'
			}]
		},
		url: getUrlObj(pathname),
		description
	}
})

module.exports = {
	create
}