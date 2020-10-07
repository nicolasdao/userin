const { getUrlObj } = require('./_utils')

const description = '# DISCOVERY API'

const create = (pathname) => ({
	name:'[Non OAuth] - configuration_endpoint',
	request: {
		method:'GET',
		url: getUrlObj(pathname),
		description
	}
})

module.exports = {
	create
}