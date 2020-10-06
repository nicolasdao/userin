const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'signup_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'raw',
			raw: JSON.stringify({ 
				username:'ENTER_USERNAME_HERE', 
				password:'ENTER_PASSWORD_HERE', 
				otherPropOfYourChoice01: 'FOR_EXAMPLE_FIRST_NAME',
				otherPropOfYourChoice02: 'FOR_EXAMPLE_LAST_NAME' 
			}, null, '    ')
		}
	}
})

module.exports = {
	create
}