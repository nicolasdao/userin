const { getUrlObj } = require('./_utils')

const description = '# OPENID JWK API'

const create = (pathname) => ({
	name:'[OpenID] - jwks_uri',
	request: {
		method:'GET',
		url: getUrlObj(pathname),
		description
	}
})

module.exports = {
	create
}