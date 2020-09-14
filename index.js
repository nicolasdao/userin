const express = require('express')
const Facebook = require('passport-facebook')
const app = express()
const UserIn = require('./src')
const { MockStrategy } = require('./test/mock/handler')

const userIn = new UserIn()
userIn.use(MockStrategy)
userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

const log = (eventName, root, args) => {
	console.log(`${eventName} FIRED`)
	console.log('root')
	console.log(root)
	console.log('args')
	console.log(args)
}

userIn.on('generate_token', (root, args) => log('generate_token', root, args))
userIn.on('get_identity_claims', (root, args) => log('get_identity_claims', root, args))
userIn.on('get_end_user', (root, args) => log('get_end_user', root, args))
userIn.on('get_fip_user', (root, args) => log('get_fip_user', root, args))
userIn.on('get_service_account', (root, args) => log('get_service_account', root, args))
userIn.on('get_token_claims', (root, args) => log('get_token_claims', root, args))
userIn.on('process_fip_auth_response', (root, args) => {
	log('process_fip_auth_response', root, args)
	return { id: 23, firstName:'Mike', lastName:'Nichols' }
})

app.use(userIn)

app.listen(3330)