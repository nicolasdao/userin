# userin &middot; [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
UserIn is an Express middleware to build Authorization Servers that support OAuth 2.0 workflows an integrate with the most popular Federated Identity Providers (e.g., Google, Facebook, GitHub). Its `openid` mode exposes an API that complies to the OpenID Connect specification. UserIn's goal is to let developers implement basic CRUD operations (e.g., get user by ID, insert token's claims object) using the backend storage of their choice while UserIn takes care of all the OAuth 2.0/OpenID Connect flows.

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
>		- [`create_fip_user`](#create_fip_user)
>		- [`generate_access_token`](#generate_access_token)
>		- [`generate_authorization_code`](#generate_authorization_code)
>		- [`generate_id_token`](#generate_id_token)
>		- [`generate_refresh_token`](#generate_refresh_token)
>		- [`get_access_token_claims`](#get_access_token_claims)
>		- [`get_authorization_code_claims`](#get_authorization_code_claims)
>		- [`get_client`](#get_client)
>		- [`get_config`](#get_config)
>		- [`get_end_user`](#get_end_user)
>		- [`get_fip_user`](#get_fip_user)
>		- [`get_id_token_claims`](#get_id_token_claims)
>		- [`get_identity_claims`](#get_identity_claims)
>		- [`get_refresh_token_claims`](#get_refresh_token_claims)
>		- [`process_fip_auth_response`](#process_fip_auth_response)
> * [OpenID Connect tokens & authorization code requirements](#openid-connect-tokens--authorization-code-requirements)
>	- [`id_token` requirements](#id_token-requirements)
>	- [`access_token` requirements](#access_token-requirements)
>	- [`refresh_token` requirements](#refresh_token-requirements)
>	- [Authorization `code` requirements](#authorization-code-requirements)
> * [Creating a UserIn Strategy class](#creating-a-userin-strategy-class)
>	- [Unit testing](#unit-testing)
>		- [Testing a UserIn Strategy class](#testing-a-userin-strategy-class)
>		- [`testSuite` API](#testsuite-api)
>			- [`testLoginSignup` function](#testloginsignup-function)
>			- [`testLoginSignupFIP` function](#testloginsignupfip-function)
>			- [`testOpenId` function](#testopenid-function)
>			- [`testAll` function](#testall-function)
>		- [Dependency injection](#dependency-injection)
> * [Contributing - Developer notes](#contributing---developer-notes)
>	- [Contribution guidelines](#contribution-guidelines)
>	- [Unit tests](#unit-tests)
>		- [The `logTestErrors` API](#the-logtesterrors-api)

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

		// Implement those five methods if you need to support the 'loginsignup' 
		// mode (i.e., allowing users to login/signup with their username and password only)
		this.create_end_user = (root, { user }, context) => { /* Implement your logic here */ }
		this.get_end_user = (root, { user }, context) => { /* Implement your logic here */ }
		this.generate_access_token = (root, { claims }, context) => { /* Implement your logic here */ }
		this.generate_refresh_token = (root, { claims }, context) => { /* Implement your logic here */ }
		this.get_refresh_token_claims = (root, { token }, context) => { /* Implement your logic here */ }

		// Implement those four methods if you also need to support login and signup with Identity 
		// Providers such as Facebook, Google, ...
		this.create_fip_user = (root, { strategy, user }, context) => { /* Implement your logic here */ }
		this.get_fip_user = (root, { strategy, user }, context) => { /* Implement your logic here */ }
		this.generate_authorization_code = (root, { claims }, context) => { /* Implement your logic here */ }
		this.get_authorization_code_claims = (root, { token }, context) => { /* Implement your logic here */ }

		// Implement those four methods if you also need to support all the OpenID Connect
		// APIs which would allow third-parties to use your APIs.
		this.get_identity_claims = (root, { user_id, scopes }, context) => { /* Implement your logic here */ }
		this.get_client = (root, { client_id, client_secret }, context) => { /* Implement your logic here */ }
		this.get_access_token_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.get_id_token_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.generate_id_token = (root, { claims }, context) => { /* Implement your logic here */ }
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
2. `create_fip_user`
3. `get_end_user`
4. `get_fip_user`
5. `generate_access_token`
6. `generate_authorization_code`
7. `generate_id_token`
8. `generate_refresh_token`
9. `get_access_token_claims`
10. `get_authorization_code_claims`
11. `get_id_token_claims`
12. `get_refresh_token_claims`
13. `get_client`
14. `get_identity_claims`
15. `get_config`: Automatically implemented.
16. `process_fip_auth_response`: Automatically implemented.

Each of those events, triggers a chain of event handlers. By default, only one handler is configured in that chain (the one that you should have implemented in your [UserIn Strategy](#userin-strategy)). UserIn exposes an `on` API that allows to add more handlers for each event as shown in this example:

```js
userIn.on('generate_access_token', (root, payload, context) => {
	console.log(`'generate_access_token' event fired. Payload:`)
	console.log(payload)
	console.log('Previous handler response:')
	console.log(root)
	console.log('Current context:')
	console.log(context)
})
```

`root` is the response returned by the previous event handler. If your handler does not return anything, `root` is passed to the next handler. The code above is similar to this:

```js
userIn.on('generate_access_token', (root, payload, context) => {
	console.log(`'generate_access_token' event fired. Payload:`)
	console.log(payload)
	console.log('Previous handler response:')
	console.log(root)
	console.log('Current context:')
	console.log(context)

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
- Requires five event handlers:
	1. `create_end_user`
	2. `get_end_user`
	3. `generate_access_token`
	4. `generate_refresh_token`
	5. `get_refresh_token_claims`

### `loginsignupfip` mode
#### `loginsignupfip` strategy requirements

This mode is a superset of _loginsignup_.

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
- Requires eight event handlers:
	1. `create_end_user` (same as _loginsignup_)
	2. `get_end_user` (same as _loginsignup_)
	3. `generate_access_token` (same as _loginsignup_)
	4. `generate_refresh_token` (same as _loginsignup_)
	5. `get_refresh_token_claims` (same as _loginsignup_)
	6. `create_fip_user`
	7. `get_fip_user`
	8. `generate_authorization_code`
	9. `get_authorization_code_claims`

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
- Requires eleven event handlers:
	1. `get_end_user` (same as _loginsignup_ and _loginsignupfip_)
	2. `generate_access_token` (same as _loginsignup_ and _loginsignupfip_)
	4. `generate_refresh_token` (same as _loginsignup_ and _loginsignupfip_)
	3. `get_refresh_token_claims` (same as _loginsignup_ and _loginsignupfip_)
	4. `generate_authorization_code` (same as _loginsignupfip_)
	5. `get_authorization_code_claims` (same as _loginsignupfip_)
	6. `generate_id_token`
	7. `generate_refresh_token`
	8. `get_access_token_claims`
	9. `get_id_token_claims`
	10. `get_identity_claims`
	11. `get_client`

## Event APIs
### `create_end_user`

### `create_fip_user`

### `generate_access_token`

### `generate_authorization_code`

### `generate_id_token`

### `generate_refresh_token`

### `get_access_token_claims`

### `get_authorization_code_claims`

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

### `get_id_token_claims`

### `get_identity_claims`

### `get_refresh_token_claims`

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

# Creating a UserIn Strategy class
## Unit testing
### Testing a UserIn Strategy class
UserIn ships with a suite of Mocha unit tests. To test your own strategy:

1. Install mocha and chai:
```
npm i -D mocha chai
```
2. Create a new `test` folder in your project root directory.
3. Under that `test` folder, create a new `strategy.js` (or whatever name you see fit), and paste code similar to the following:
```js
const { testSuite } = require('userin')
const { YourStrategyClass } = require('../src/yourStrategy.js')

const options = { skip:'' } // Does not skip any test.

// To test a stragegy in 'loginsignup' mode, the following minimum config is required.
const config = {
	tokenExpiry: {
		access_token: 3600
	}
}

// The required stub's value are:
const stub = {
	user: {
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
	newUserPassword: 'd32def32feq' // Add the password that will be used to test new users
}

testSuite.testLoginSignup(YourStrategyClass, config, stub, options)
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

### `testSuite` API
#### `testLoginSignup` function

```js
const { testSuite } = require('userin')
const { YourStrategyClass } = require('../src/yourStrategy.js')

// Use the 'option' value to control which test is run. By default, all tests are run.
// Valid test names are: 'all', 'strategy', 'login', 'signup'
// 
// const options = { skip:'all' } // Skips all tests in this suite.
// const options = { skip:'login' } // Skips the 'login' test in this suite.
// const options = { skip:['login', 'signup'] } // Skips the 'login' and 'signup' tests in this suite.
// const options = { only:'login' } // Only run the 'login' test in this suite.
// const options = { only:['login', 'signup'] } // Only run the 'login' and 'signup' tests in this suite.
const options = { skip:'' } // Does not skip any test.

// To test a stragegy in 'loginsignup' mode, the following minimum config is required.
const config = {
	tokenExpiry: {
		access_token: 3600
	}
}

// The required stub's value are:
const stub = {
	user: {
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
	newUserPassword: 'd32def32feq' // Add the password that will be used to test new users
}

testSuite.testLoginSignup(YourStrategyClass, config, stub, options)
```

#### `testLoginSignupFIP` function

```js
const { testSuite } = require('userin')
const { YourStrategyClass } = require('../src/yourStrategy.js')

// Use the 'option' value to control which test is run. By default, all tests are run. 
// Valid test names are: 'all', 'strategy', 'login', 'signup', 'fiploginsignup'
// 
// const options = { skip:'all' } // Skips all tests in this suite.
// const options = { skip:'login' } // Skips the 'login' test in this suite.
// const options = { skip:['login', 'signup'] } // Skips the 'login' and 'signup' tests in this suite.
// const options = { only:'login' } // Only run the 'login' test in this suite.
// const options = { only:['login', 'signup'] } // Only run the 'login' and 'signup' tests in this suite.
const options = { skip:'' } // Does not skip any test.

// To test a stragegy in 'loginsignupfip' mode, the following minimum config is required.
const config = {
	tokenExpiry: {
		access_token: 3600,
		code: 30
	}
}

// The required stub's value are:
const stub = {
	user: {
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
	fipUser: { // this user should be different from the one above.
		id: '1N7fr2yt', // ID of the user in the identity provider plaftform
		fipName: 'facebook', // Identity provider's name
		userId: 2 // ID of the user on your platform
	},
	newUserPassword: 'd32def32feq' // Add the password that will be used to test new users
}

testSuite.testLoginSignupFIP(YourStrategyClass, config, stub, options)
```

#### `testOpenId` function

```js
const { testSuite } = require('userin')
const { YourStrategyClass } = require('../src/yourStrategy.js')

// Use the 'option' value to control which test is run. By default, all tests are run. 
// Valid test names are: 'all', 'strategy', 'introspect', 'token', 'userinfo'
// 
// const options = { skip:'all' } // Skips all tests in this suite.
// const options = { skip:'introspect' } // Skips the 'introspect' test in this suite.
// const options = { skip:['introspect', 'token'] } // Skips the 'introspect' and 'token' tests in this suite.
// const options = { only:'introspect' } // Only run the 'introspect' test in this suite.
// const options = { only:['introspect', 'token'] } // Only run the 'introspect' and 'token' tests in this suite.
const options = { skip:'' } // Does not skip any test.

// To test a stragegy in 'openid' mode, the following minimum config is required.
const config = {
	openid: {
		iss: 'https://www.userin.com',
		tokenExpiry: {
			id_token: 3600,
			access_token: 3600,
			code: 30
		}
	}
}

// The required stub's value are:
const stub = {
	client: { 
		id: 'good_client', 
		secret: '98765', 
		aud: 'https://private-api@mycompany.com',
		user: { 
			id: 1,
			username: 'valid@example.com', // Valid username in your own stub data.
			password: '123456' // Valid password in your own stub data.
			claimStubs: [{ // Define the identity claims you want to support here and fill the value for the 'valid@example.com' user.
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
					phone: '+61432567890',
					phone_number_verified: false
				}
			}, {
				scope:'address',
				claims: {
					address: 'Castle in the shed'
				}
			}]
		}
	},
	altClient: { 
		id: 'existing_client_with_no_access_to_my_user', 
		secret: '3751245'
	}
}

testSuite.testOpenId(YourStrategyClass, config, stub, options)
```

#### `testAll` function

This test function tests all the previous three tests at once. Use it if you have created a UserIn Strategy class that imlements all the [event handlers](#events-and-event-handlers). The signature is the same as for the other tests. Merge all the stubs from the previous tests into a single stub object.

### Dependency injection

The test suite supports inverson of control via dependency injection. All the event handlers supports the same signature: 

`(root: Object, payload: Object, context: Object)`.

For example:

```js
YourStrategyClass.prototype.get_end_user = (root, { user }, context) => {
	const existingUser = USER_STORE.find(x => x.email == user.username)
	if (!existingUser)
		return null
	if (user.password && existingUser.password != user.password)
		throw new Error('Incorrect username or password')

	const client_ids = USER_TO_CLIENT_STORE.filter(x => x.user_id == existingUser.id).map(x => x.client_id)

	return {
		id: existingUser.id,
		client_ids
	}
}
```

This example shows that `get_end_user` depends on the `USER_STORE` and `USER_TO_CLIENT_STORE` to function. Those would typically be connectors that can perform IO queries to your backend storage. This code is not properly designed to support unit tests, especially if you are tryng to test inserts. To solve this problem, the best practice is to inject those dependencies from the outside.

This is one the purpose of the `context` object. The `context` object is the `config` object passed to the `YourStrategyClass` instance:

```js
const { testSuite } = require('userin')
const { YourStrategyClass } = require('../src/yourStrategy.js')

// To test a stragegy in 'loginsignup' mode, the following minimum config is required.
const config = {
	tokenExpiry: {
		access_token: 3600
	},
	repos: {
		user: {
			find: (userId)
		}
	}
}

// The required stub's value are:
const stub = {
	user: {
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
}

testSuite.testLoginSignup(YourStrategyClass, config, stub, options)
```

In this example, let's modified the `config` as follow:

```js
const config = {
	tokenExpiry: {
		access_token: 3600
	},
	repos: {
		user: USER_STORE,
		userToClient: USER_TO_CLIENT_STORE
	}
}
```

With this change, the `get_end_user` can be rewritten as follow:

```js
YourStrategyClass.prototype.get_end_user = (root, { user }, context) => {
	const existingUser = context.repos.user.find(x => x.email == user.username)
	if (!existingUser)
		return null
	if (user.password && existingUser.password != user.password)
		throw new Error('Incorrect username or password')

	const client_ids = context.repos.userToClient.filter(x => x.user_id == existingUser.id).map(x => x.client_id)

	return {
		id: existingUser.id,
		client_ids
	}
}
```

This design pattern is called dependency injection. It allows to replace the behaviors from the outside.

# Contributing - Developer notes
## Contribution guidelines

Coming soon...

## Unit tests
### The `logTestErrors` API

Almost all unit tests use the custom `logTestErrors` API. This API's purpose is to capture explicit error logs to display them when the developer uses the `verbose` mode. This API leverages UserIn's functional error handling style. 

```js
const { logTestErrors } = require('./_core')

const verbose = true
const logTest = logTestErrors()

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






