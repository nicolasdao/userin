const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'jwks_uri',
	request: {
		method:'GET',
		url: getUrlObj(pathname)
	}
})

module.exports = {
	create
}