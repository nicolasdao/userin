const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'userinfo_endpoint',
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
		url: getUrlObj(pathname)
	}
})

module.exports = {
	create
}