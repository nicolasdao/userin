const { getUrlObj } = require('./_utils')

const create = (pathname) => ({
	name:'introspection_endpoint',
	request: {
		method:'POST',
		url: getUrlObj(pathname),
		body: {
			mode: 'raw',
			raw: JSON.stringify({ 
				client_id: '{{client_id}}',
				token:'ENTER_TOKEN_HERE', 
				token_type_hint:'CHOOSE_TOKEN_TYPE' 
			}, null, '    ')
		}
	}
})

module.exports = {
	create
}