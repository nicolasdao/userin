# userin-core &middot; [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
UserIn is an Express middleware to build OAuth 2.0 workflows that support integration with the most popular Federated Identity Providers (e.g., Google, Facebook, GitHub). It also complies to the OpenID Connect specification.

# Table of contents

> * [Getting started](#getting-started)
> * [UserIn Strategy](#userin-strategy)
> * [Events management](#events-management)
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
		this.generate_token = (root, { type, claims }) => { /* Implement your logic here */ }
		this.get_end_user = (root, { user }) => { /* Implement your logic here */ }
		this.get_fip_user = (root, { strategy, user }) => { /* Implement your logic here */ }
		this.get_identity_claims = (root, { user_id, scopes }) => { /* Implement your logic here */ }
		this.get_client = (root, { client_id, client_secret }) => { /* Implement your logic here */ }
		this.get_token_claims = (root, { type, token }) => { /* Implement your logic here */ }
		this.get_config = (root) => { /* Implement your logic here */ }
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

UserIn allows to listen to certain key events as well as modify the output produced by event handlers. Each event is managed by a specific handler (originally defined in the [UserIn Strategy](#userin-strategy)). In reality, when an event is emitted, it passes a payload to a chain of handlers. Be default, that event handler chain contains only one handler. UserIn exposes an `on` API that allows to add new handlers on specific events. The supported events are:

- `generate_token`
- `get_end_user`
- `get_fip_user`
- `get_identity_claims`
- `get_client`
- `get_token_claims`
- `get_config`

To add a new handler use the `on` API on the `UserIn` instance as follow:

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









