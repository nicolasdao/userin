const { getUrlObj } = require('./_utils')

const description = '# OPENID DISCOVERY API'

const create = (pathname) => ({
	name:'[OpenID] - openidconfiguration_endpoint',
	request: {
		method:'GET',
		url: getUrlObj(pathname),
		description
	}
})

module.exports = {
	create
}