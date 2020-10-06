const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'openidconfiguration_endpoint',
	request: {
		method:'GET',
		url: getUrlObj(pathname)
	}
})

module.exports = {
	create
}