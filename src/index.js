const { Postman } = require('./postman')
module.exports = {
	UserIn: require('./UserIn'),
	Postman,
	...require('userin-core'),
	testSuite: require('../src/_test')
}



