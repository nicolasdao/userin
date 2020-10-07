const { Postman } = require('./postman')
module.exports = {
	UserIn: require('./UserIn.js'),
	Postman,
	...require('userin-core'),
	testSuite: require('../src/_test')
}



