# userin-core &middot; [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
UserIn is an Express middleware to build OAuth 2.0 workflows that support integration with the most popular Federated Identity Providers (e.g., Google, Facebook, GitHub). It also complies to the OpenID Connect specification.

# Table of contents

> * [Getting started](#getting-started)
> * [UserIn Strategy](#userin-strategy)
> * [Events and event handlers](#events-and-event-handlers)
>	- [Events overview](#events-overview)
>	- [Auth modes](#auth-modes)
>		- [`loginsignup`](#loginsignup-mode)
>		- [`loginsignupfip`](#loginsignupfip-mode)
>		- [`openid`](#openid-mode)
>	- [Event APIs](#event-apis)
>		- [`create_end_user`](#create_end_user)
>		- [`generate_token`](#generate_token)
>		- [`get_client`](#get_client)
>		- [`get_config`](#get_config)
>		- [`get_end_user`](#get_end_user)
>		- [`get_fip_user`](#get_fip_user)
>		- [`get_identity_claims`](#get_identity_claims)
>		- [`get_token_claims`](#get_token_claims)
>		- [`process_fip_auth_response`](#process_fip_auth_response)
> * [OpenID Connect tokens & authorization code requirements](#openid-connect-tokens--authorization-code-requirements)
>	- [`id_token` requirements](#id_token-requirements)
>	- [`access_token` requirements](#access_token-requirements)
>	- [`refresh_token` requirements](#refresh_token-requirements)
>	- [Authorization `code` requirements](#authorization-code-requirements)
> * [Creating your own UserIn strategy](#creating-your-own-userin-strategy)
>	- [Unit testing](#unit-testing)
> * [Contributing - Developer notes](#contributing---developer-notes)
>	- [Contribution guidelines](#contribution-guidelines)
>	- [Documentation](#documentation)
>		- [Unit tests](#unit-tests)
>			- [The `logTestErrors` API](#the-logtesterrors-api)

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
	constructor(config) {
		super(config)
		this.name = 'yourstrategyname',

		// Implement those three methods if you need to support the 'loginsignup' 
		// mode (i.e., allowing login and signup with their username and password only)
		this.create_end_user = (root, { user }) => { /* Implement your logic here */ }
		this.get_end_user = (root, { user }) => { /* Implement your logic here */ }
		this.generate_token = (root, { type, claims }) => { /* Implement your logic here */ }
		
		// Implement this next method if also need to support login and signup with Identity 
		// Providers such as Facebook, Google, ...
		this.get_fip_user = (root, { strategy, user }) => { /* Implement your logic here */ }
		
		// Implement those next three methods if you also need to support all the OpenID Connect
		// APIs which would allow third-parties to use your APIs.
		this.get_identity_claims = (root, { user_id, scopes }) => { /* Implement your logic here */ }
		this.get_client = (root, { client_id, client_secret }) => { /* Implement your logic here */ }
		this.get_token_claims = (root, { type, token }) => { /* Implement your logic here */ }
	}
}

const userin = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignup', 'loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		openid: {
			iss: 'http://localhost:3330',
			tokenExpiry: {
				access_token: 3600,
				id_token: 3600,
				code: 30
			}
		}
	}
})

userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

const app = express()

app.use(userIn)

app.listen(3330)
```

# UserIn Strategy

# Events and event handlers
## Events overview

UserIn behaviors are managed via events and event handlers. Out-of-the-box, UserIn does not define any handlers to respond to those events. As a software engineers, this is your job to implement those event handlers in adequation with your business logic. The following list represents all the events that can be triggered during an authentication or authorization flow, but worry not, you are not forced to implement them all. You only have to implement the event handlers based on the [type of authentication and authorization flow you wish to support](#auth-modes).

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

## Auth modes

UserIn supports multiple flows grouped in three modes:
1. [`loginsignup`](#loginsignup-mode): Supports login and signup with username and password. Generates short-lived access_token, and optionally long-lived refresh_token upon successfull authentication. Use it to let your users login and signup to your platform using a username and password only.
2. [`loginsignupfip`](#loginsignupfip-mode): Supports login and signup with username/password and Federated Identity Providers (e.g., Facebook, Google). Generates short-lived access_token, short-lived authorization code, and optionally long-lived refresh_token upon successfull authentication. This mode is a superset of the `loginsignup` mode. Use it to let your users login and signup to your platform using a username and password as well as one or many FIPs. 
3. [`openid`](#openid-mode): Supports login (no signup) using any the OpenID Connect flows (Authorization code, Implicit, Credentials and Password). Generates short-lived access_token, short-lived authorization code, short-lived id_token, and optionally long-lived refresh_token upon successfull authentication. Use it to let others systems access your platform. OpenID Connect and OAuth 2.0 powers the following use cases:
	- Access to your platform by a third-party directly. This flow is called the `Credentials flow`.
	- Access to your platform by a third-party on behalf of one of your user. In that case, the user has given consent to that third-party system to access some resources on your platform (this consent was given via a redirection to a consent page hosted on your platform). There are two OpenID flows that can achieve this: `Authorization code flow` (recommended) and the `Implicit flow` (deprecated). 
	- Access to you platform by one of your user using their client_id, username and password (optionally their client_secret if your plaftorm is private). This OpenID flow is called the `password flow`. 

> NOTE: It is interesting to notice that OpenID Connect and OAuth 2.0. are not designed to let you users directly login in or creating an account. That's why UserIn supports the [`loginsignup` mode](#loginsignup-mode) and the [`loginsignupfip` mode](#loginsignupfip-mode) (though the later is a bit of a hybrid as it connects with FIPs which usually implement OAuth 2.0). If you're engineering a web API that only needs to power your web app, you only need the first or second mode. When your API needs to be accessed by third-parties, that's when OpenID Connect becomes useful. The good thing about UserIn is that its implementation lets you upgrade at anytime without re-engineering everything from scratch.

### `loginsignup` mode
#### `loginsignup` strategy requirements

- Constructor required fields:
	- `tokenExpiry.access_token`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	modes:['loginsignup'], // this is optional as the default value is ['loginsignup']
	> 	tokenExpiry: {
	> 		access_token: 3600
	> 	}
	> })
	> ```
- Required event handlers:
	- `create_end_user`
	- `generate_token`: Must support generating an `access_token` and a `refresh_token`.
	- `get_end_user`

### `loginsignupfip` mode
#### `loginsignupfip` strategy requirements

- Constructor required fields:
	- `modes`: Must be set to `['loginsignupfip']`.
	- `tokenExpiry.access_token`
	- `tokenExpiry.code`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	modes:['loginsignupfip'],
	> 	tokenExpiry: {
	> 		access_token: 3600,
	> 		code: 30
	> 	}
	> })
	> ```
- Required event handlers:
	- `create_end_user`
	- `generate_token`: Must support generating an `access_token` a `refresh_token` and a `code`.
	- `get_end_user`
	- `get_fip_user`

### `openid` mode
#### `openid` strategy requirements

- Constructor required fields:
	- `modes`: Must be set to `['openid']`.
	- `openid.iss`
	- `openid.tokenExpiry.id_token`
	- `openid.tokenExpiry.access_token`
	- `openid.tokenExpiry.code`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	modes:['openid'],
	>	openid: {
	> 		iss: 'https://your-authorization-server-domain.com',
	> 		tokenExpiry: {
	> 			id_token: 3600,
	> 			access_token: 3600,
	> 			code: 30
	> 		}
	> 	}
	> })
	> ```
- Required event handlers:
	- `generate_token`: Must support generating all tokens: 
		- `access_token`
		- `refresh_token`
		- `code`
		- `id_token` (must be a JWT)
	- `get_end_user`
	- `get_fip_user`
	- `get_client`
	- `get_identity_claims`
	- `get_token_claims`

## Event APIs
### `create_end_user`

### `generate_token`

### `get_client`

### `get_config`

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

### `get_end_user`

Must return null when the `username` does not exists. 
Must fail when the `username` and `password` are incorrect.

### `get_fip_user`

### `get_identity_claims`

### `get_token_claims`

### `process_fip_auth_response`

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

# OpenID Connect tokens & authorization code requirements

If you're implementing a UserIn strategy that supports the [`openid` mode](#openid-mode), then you must generate your tokens and authorization code following strict requirements.

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

# Contributing - Developer notes
## Contribution guidelines

Coming soon...

## Documentation
### Unit tests
#### The `logTestErrors` API

Almost all unit tests use the custom `logTestErrors` API. This API's purpose is to capture explicit error logs to display them when the developer uses the `verbose` mode. This API leverages UserIn's functional error handling style. 

```js
const { logTestErrors } = require('./_core')

const verbose = true
const logTest = logTestErrors(verbose)

it('Should fail when something bad happens.', done => {
	const logE = logTest(done)

	logE.run(co(function *() {
		// Functional error handling style where the output is always an arrat where the first element is an array of errors
		// and the second is the exppected result. 
		const [errors, result] = yield someFunction()

		// Log errors to support the  verbose mode. 
		logE.push(errors)

		// Run the usual assertions
		assert.isOk(errors, '01')
		assert.isOk(errors.length, '02')
		assert.isOk(errors.some(e => e.message && e.message.indexOf('Missing \'get_client\' handler') >= 0), '03')
		done()
	}))
})
```

# Annex


# References






