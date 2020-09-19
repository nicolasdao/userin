const express = require('express')
const Facebook = require('passport-facebook')
const app = express()
const { UserIn } = require('./src')
const { MockStrategy } = require('./test/mock/strategy')
const { FIP_USER_TO_STRATEGY } = require('./test/mock/stub')

const strategy = new MockStrategy({
	tokenExpiry: {
		id_token: 3600,
		access_token: 3600,
		code: 30
	}
})

const userIn = new UserIn(strategy)
userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

// userIn.use(MockStrategy)

const log = (eventName, root, args) => {
	console.log(`${eventName} FIRED`)
	console.log('root')
	console.log(root)
	console.log('args')
	console.log(args)
}

// userIn.on('generate_token', (root, args) => log('generate_token', root, args))
// userIn.on('get_identity_claims', (root, args) => log('get_identity_claims', root, args))
// userIn.on('get_end_user', (root, args) => log('get_end_user', root, args))
// userIn.on('get_fip_user', (root, args) => log('get_fip_user', root, args))
// userIn.on('get_client', (root, args) => log('get_client', root, args))
// userIn.on('get_token_claims', (root, args) => log('get_token_claims', root, args))
userIn.on('process_fip_auth_response', (root, args) => {
	log('process_fip_auth_response', root, args)
	return { id: FIP_USER_TO_STRATEGY.strategy_user_id, firstName:'Mike', lastName:'Nichols' }
})

app.use(userIn)

// curl -d '{"username":"nic@cloudlessconsulting.com", "password":"123456"}' -H "Content-Type: application/json" -X POST http://localhost:3330/v1/login
app.listen(3330, () => console.log('UserIn listening on https://localhost:3330'))