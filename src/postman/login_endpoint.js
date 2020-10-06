const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'login_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'raw',
			raw: JSON.stringify({ 
				username:'ENTER_USERNAME_HERE', 
				password:'ENTER_PASSWORD_HERE' 
			}, null, '    ')
		}
	}
})

module.exports = {
	create
}