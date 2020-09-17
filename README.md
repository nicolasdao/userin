# userin-core &middot; [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
UserIn is an Express middleware to build OAuth 2.0 workflows that support integration with the most popular Federated Identity Providers (e.g., Google, Facebook, GitHub). It also complies to the OpenID Connect specification.

# Table of contents

> * [Getting started](#getting-started)
> * [UserIn Strategy](#userin-strategy)
> * [Events management](#events-management)
>	- [`create_end_user`](#create_end_user)
>	- [`generate_token`](#generate_token)
>	- [`get_client`](#get_client)
>	- [`get_config`](#get_config)
>	- [`get_end_user`](#get_end_user)
>	- [`get_fip_user`](#get_fip_user)
>	- [`get_identity_claims`](#get_identity_claims)
>	- [`get_token_claims`](#get_token_claims)
>	- [`process_fip_auth_response`](#process_fip_auth_response)
> * [Tokens & Authorization code requirements](#tokens--authorization-code-requirements)
>	- [`id_token` requirements](#id_token-requirements)
>	- [`access_token` requirements](#access_token-requirements)
>	- [`refresh_token` requirements](#refresh_token-requirements)
>	- [Authorization `code` requirements](#authorization-code-requirements)
> * [Creating your own UserIn strategy](#creating-your-own-userin-strategy)
>	- [Unit testing](#unit-testing)

# Getting started

Install UserIn:

```
npm i userin
```

If you need to support authentication using Facebook, install the Facebook passport:

```
npm i passport-facebook
```

```js
const express = require('express')
const { UserIn, Strategy } = require('userin')
const Facebook = require('passport-facebook')

class YourStrategy extends Strategy {
	constructor() {
		super()
		this.name = 'yourstrategyname',
		this.create_end_user = (root, user) => { /* Implement your logic here */ }
		this.generate_token = (root, { type, claims }) => { /* Implement your logic here */ }
		this.get_end_user = (root, { user }) => { /* Implement your logic here */ }
		this.get_fip_user = (root, { strategy, user }) => { /* Implement your logic here */ }
		this.get_identity_claims = (root, { user_id, scopes }) => { /* Implement your logic here */ }
		this.get_client = (root, { client_id, client_secret }) => { /* Implement your logic here */ }
		this.get_token_claims = (root, { type, token }) => { /* Implement your logic here */ }
	}
}

const userIn = new UserIn()
userIn.use(YourStrategy)
userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

const app = express()

app.use(userIn)

app.listen(3330)
```

# UserIn Strategy

# Events management

UserIn behaviors are managed via events and event handlers. Specific events are emitted to power OAuth 2.0 flows. Out-of-the-box, UserIn does not define any handlers to respond to those events. As a software engineers, this is your job to implement those event handlers in adequation with your own custom business logic. The following list represents all the events that can be triggered during an authentication or authorization flow, but worry not, you are not forced to implement them all:

1. `create_end_user`
2. `generate_token`
3. `get_client`
4. `get_config`: Automatically implemented.
5. `get_end_user`
6. `get_fip_user`
7. `get_identity_claims`
8. `get_token_claims`
9. `process_fip_auth_response`: Automatically implemented.

Each of those events, triggers a chain of event handlers. By default, only one handler is configured in that chain (the one that you should have implemented in your own [UserIn Strategy](#userin-strategy)). UserIn exposes an `on` API that allows to add more handlers for each event as shown in this example:

```js
userIn.on('generate_token', (root, payload) => {
	console.log(`'generate_token' event fired. Payload:`)
	console.log(payload)
	console.log('Previous handler response:')
	console.log(root)
})
```

`root` is the response returned by the previous event handler. If your handler does not return anything, `root` is passed to the next handler. The code above is similar to this:

```js
userIn.on('generate_token', (root, payload) => {
	console.log(`'generate_token' event fired. Payload:`)
	console.log(payload)
	console.log('Previous handler response:')
	console.log(root)
	return root
})
```

If, on the other hand, your handler returns a response, that response overrides `root`. 

## `create_end_user`

## `generate_token`

## `get_client`

## `get_config`

```js
/**
 * Gets the strategy's configuration object. 
 * 
 * @param  {Object} 	root							Previous handler's response. Occurs when there 
 *                              						are multiple handlers defined for the same event. 
 * @return {String}		output.iss		
 * @return {Number}		output.expiry.id_token			
 * @return {Number}		output.expiry.access_token		
 * @return {Number}		output.expiry.refresh_token		
 * @return {Number}		output.expiry.code	
 */
const get_config = (root) => {
	console.log('get_config fired')
	console.log('Previous handler response:')
	console.log(root)
	
	return {
		iss: 'https://userin.com',
		expiry: {
			id_token: 3600,
			access_token: 3600,
			code: 30
		}
	}
}
```

## `get_end_user`

## `get_fip_user`

## `get_identity_claims`

## `get_token_claims`

## `process_fip_auth_response`

```js
const handler = (root, { accessToken, refreshToken, profile }) => {
	console.log('process_fip_auth_response fired')
	console.log('Previous handler response:')
	console.log(root)
	
	const id = profile.id
	const { givenName: firstName, middleName, familyName: lastName } = profile.name || {}
	const email = ((profile.emails || [])[0] || {}).value || null
	const profileImg = ((profile.photos || [])[0] || {}).value

	const user = { id, firstName, middleName, lastName, email, profileImg, accessToken, refreshToken }

	return user
}
```

# Tokens & Authorization code requirements
## `id_token` requirements

## `access_token` requirements

## `refresh_token` requirements

## Authorization `code` requirements

# Creating your own UserIn strategy
## Unit testing

UserIn ships with a suite of Mocha unit tests. To test your own strategy:

1. Install mocha and chai:
```
npm i -D mocha chai
```
2. Create a new `test` folder in your project root directory.
3. Under that folder, create a new `strategy.js` (or whatever name you see fit), and paste the following code:
```js
const { runTestSuite } = require('userin')
const { YourStrategy } = require('../src/yourStrategy.js')

const strategy = new YourStrategy()

runTestSuite({
	verbose: true,
	strategy,
	client: { 
		id: 'default', 
		secret: 123, 
		user: { 
			id: 1,
			username: 'nic@cloudlessconsulting.com', 
			password: 123456
		},
		fipUser: { 
			id: 23, 
			fip: 'facebook'
		}
	},
	altClient: { 
		id: 'fraudster', 
		secret: 456 
	},
	claimStubs: [{
		scope:'profile',
		claims: {
			given_name: 'Nic',
			family_name: 'Dao',
			zoneinfo: 'Australia/Sydney'
		}
	}, {
		scope:'email',
		claims: {
			email: 'nic@cloudlessconsulting.com',
			email_verified: true
		}
	}, {
		scope:'phone',
		claims: {
			phone: '+6112345678',
			phone_number_verified: false
		}
	}, {
		scope:'address',
		claims: {
			address: 'Some street in Sydney'
		}
	}]
})
```
4. Add a new `test` script in your `package.json`:
```js
	"scripts": {
		"test": "mocha --exit"
	}
```
5. Run the test:
```
npm test
```









