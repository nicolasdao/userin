# UserIn 2.0 &middot; [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
UserIn is an NodeJS Express middleware to build Authorization Servers that support OAuth 2.0 workflows and integrate with Identity Providers (e.g., Google, Facebook, GitHub). Its `openid` mode exposes an API that complies to the OpenID Connect specification. With UserIn, the OAuth 2.0/OpenID Connect flows are abstracted so that developers focus only on implementing basic CRUD operations (e.g., get user by username and password, insert token's claims object) using the backend storage of their choice.

To ease testing, UserIn ships with a [utility](#exporting-the-api-to-postman) that allows to export a `collection.json` to [Postman](https://www.postman.com/).  

UserIn is designed to expose web APIs that support two different flow types:
- Non-OAuth 2.0 flows. These are the ones that start with your platform's login/signup form.
- OAuth 2.0/OpenID Connect flows. These are the ones that often(1) start with your platform's consent page so that your users can leverage some or all of your plaftorm's API via an authorized third-party.

> (1) Other OAuth 2.0 authorization flows that do not require a consent page are the `password`, `client_credentials` grant type flows. Those flows are generally used for programmatic access. 

# Table of contents

> * [Getting started](#getting-started)
> * [Auth modes](#auth-modes)
>	- [`loginsignup`](#loginsignup-mode)
>	- [`loginsignupfip`](#loginsignupfip-mode)
>	- [`openid`](#openid-mode)
> * [Endpoints](#endpoints)
>	- [/.well-known/configuration](#well-knownconfiguration)
>	- [/login](#login)
>	- [/signup](#signup)
>	- [/token](#token)
>	- [/revoke](#revoke)
>	- [/.well-known/openid-configuration](#well-knownopenid-configuration)
>	- [/authorize](#authorize)
>	- [/authorizeconsent](#authorizeconsent)
>	- [/introspect](#introspect)
>	- [/userinfo](#userinfo)
>	- [/certs](#certs)
>	- [/<IdP>/authorize](#idpauthorize)
> * [Events and event handlers](#events-and-event-handlers)
>	- [Events overview](#events-overview)
>	- [Event APIs](#event-apis)
>		- [`create_end_user`](#create_end_user)
>		- [`create_fip_user`](#create_fip_user)
>		- [`generate_access_token`](#generate_access_token)
>		- [`generate_authorization_code`](#generate_authorization_code)
>		- [`generate_id_token`](#generate_id_token)
>		- [`generate_refresh_token`](#generate_refresh_token)
>		- [`generate_auth_request_code`](#generate_auth_request_code)
>		- [`generate_auth_consent_code`](#generate_auth_consent_code)
>		- [`get_access_token_claims`](#get_access_token_claims)
>		- [`get_authorization_code_claims`](#get_authorization_code_claims)
>		- [`get_auth_request_claims`](#get_auth_request_claims)
>		- [`get_auth_consent_claims`](#get_auth_consent_claims)
>		- [`get_client`](#get_client)
>		- [`get_config`](#get_config)
>		- [`get_end_user`](#get_end_user)
>		- [`get_fip_user`](#get_fip_user)
>		- [`get_id_token_claims`](#get_id_token_claims)
>		- [`get_identity_claims`](#get_identity_claims)
>		- [`get_refresh_token_claims`](#get_refresh_token_claims)
>		- [`get_jwks`](#get_jwks)
>		- [`get_claims_supported`](#get_claims_supported)
>		- [`get_scopes_supported`](#get_scopes_supported)
>		- [`get_grant_types_supported`](#get_grant_types_supported)
>		- [`delete_refresh_token`](#delete_refresh_token)
>		- [`link_client_to_user`](#link_client_to_user)
> * [OpenID Connect tokens & authorization code requirements](#openid-connect-tokens--authorization-code-requirements)
>	- [`id_token` requirements](#id_token-requirements)
>	- [`access_token` requirements](#access_token-requirements)
>	- [`refresh_token` requirements](#refresh_token-requirements)
>	- [Authorization `code` requirements](#authorization-code-requirements)
> * [Setting up an identity provider](#setting-up-an-identity-provider)
>	- [Using Passport](#using-passport)
>	- [Using an OpenID discovery endpoint](#using-an-openid-discovery-endpoint)
> * [Implementation guidelines](#implementation-guidelines)
>	- [Creating a UserIn Strategy class](#creating-a-userin-strategy-class)
>	- [Unit testing](#unit-testing)
>		- [Testing a UserIn Strategy class](#testing-a-userin-strategy-class)
>		- [`testSuite` API](#testsuite-api)
>			- [`testLoginSignup` function](#testloginsignup-function)
>			- [`testLoginSignupFIP` function](#testloginsignupfip-function)
>			- [`testOpenId` function](#testopenid-function)
>			- [`testAll` function](#testall-function)
>		- [Dependency injection](#dependency-injection)
>	- [Integration testing](#integration-testing)
>		- [Exporting the API to Postman](#exporting-the-api-to-postman)
>			- [Publishing a Postman collection as a web link](#publishing-a-postman-collection-as-a-web-link)
>			- [Export a Postman collection in a local file](#export-a-postman-collection-in-a-local-file)
>	- [Authorization code flow implementation](#authorization-code-flow-implementation)
> * [Flexible flows](#flexible-flows)
> * [Contributing - Developer notes](#contributing---developer-notes)
>	- [Contribution guidelines](#contribution-guidelines)
>	- [Unit tests](#unit-tests)
>		- [The `logTestErrors` API](#the-logtesterrors-api)
> * [FAQ](faq)
>	- [How to use UserIn in Postman?](#how-to-use-userin-in-postman)
>	- [How to deal with Facebook restriction to HTTPS redirect only when testing locally?](#how-to-deal-with-facebook-restriction-to-https-redirect-only-when-testing-locally)
>	- [When is the `client_secret` required?](#when-is-the-client_secret-required)
> * [Annex](#annex)
>	- [Jargon and concepts](#jargon-and-concepts)
>		- [Grant types](#grant-types)
>	- [Registering an application with an Identity Provider](#registering-an-application-with-an-identity-provider)
>		- [Facebook](#facebook)
>		- [Google](#google)
>		- [LinkedIn](#linkedin)
>		- [GitHub](#github)
> * [References](#references)

# Getting started

Creating a UserIn Authorization Server consists in creating an `UserInStrategy` class (which must inherit from the `Strategy` class) and then registering that class with the `UserIn` middleware. That `UserInStrategy` class must implement specific methods based on how many UserIn features must be supported. UserIn removes the burden of implementing OAuth 2.0 logic in those methods so developer focus only on simple CRUD implementations.

Install UserIn:

```
npm i userin
```

If you need to support authentication using Facebook, install the Facebook passport (more about other providers in the [Setting up an identity provider](#setting-up-an-identity-provider) section):

```
npm i passport-facebook
```

```js
const express = require('express')
const app = express()
const { UserIn, Strategy, Postman } = require('userin')
const Facebook = require('passport-facebook')

class YourStrategy extends Strategy {
	constructor(config) {
		super(config)
		this.name = 'yourstrategyname',

		// loginsignup mode
		// ================
		// 		Implement those seven methods if you need to support the 'loginsignup' 
		// 		mode (i.e., allowing users to login/signup with their username and password only)
		this.create_end_user = (root, { user }, context) => { /* Implement your logic here */ }
		this.get_end_user = (root, { user }, context) => { /* Implement your logic here */ }
		this.generate_access_token = (root, { claims }, context) => { /* Implement your logic here */ }
		this.generate_refresh_token = (root, { claims }, context) => { /* Implement your logic here */ }
		this.get_refresh_token_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.get_access_token_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.delete_refresh_token = (root, { token }, context) => { /* Implement your logic here */ }

		// loginsignupfip mode
		// ===================
		// 		Add those four methods to the above five if you also need to support login and signup with Identity 
		// 		Providers such as Facebook, Google, ...
		this.create_fip_user = (root, { strategy, user }, context) => { /* Implement your logic here */ }
		this.get_fip_user = (root, { strategy, user }, context) => { /* Implement your logic here */ }
		this.generate_authorization_code = (root, { claims }, context) => { /* Implement your logic here */ }
		this.get_authorization_code_claims = (root, { token }, context) => { /* Implement your logic here */ }

		// openid mode
		// ===================
		// 		Add those thirteen methods to the following eight if you need to support all the OpenID Connect
		// 		APIs which allow third-parties to use your APIs:
		// 			1. 'generate_access_token',
		// 			2. 'generate_authorization_code',
		// 			3. 'generate_refresh_token',
		// 			4. 'get_end_user', 
		// 			5. 'get_authorization_code_claims',
		// 			6. 'get_refresh_token_claims'
		// 			7. 'get_access_token_claims'
		// 			8. 'delete_refresh_token'
		this.get_identity_claims = (root, { user_id, scopes }, context) => { /* Implement your logic here */ }
		this.get_client = (root, { client_id, client_secret }, context) => { /* Implement your logic here */ }
		this.get_id_token_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.get_auth_request_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.get_auth_consent_claims = (root, { token }, context) => { /* Implement your logic here */ }
		this.generate_id_token = (root, { claims }, context) => { /* Implement your logic here */ }
		this.generate_auth_request_code = (root, { claims }, context) => { /* Implement your logic here */ }
		this.generate_auth_consent_code = (root, { claims }, context) => { /* Implement your logic here */ }
		this.get_claims_supported = (root) => { /* Implement your logic here */ }
		this.get_scopes_supported = (root) => { /* Implement your logic here */ }
		this.link_client_to_user = (root) => { /* Implement your logic here */ }
		// Those two OpenID event handlers are optional. If they are not implemented, the UserIn middleware uses default
		// values instead:
		// 	For 'get_jwks' UserIn uses an empty array.
		// 	For 'get_grant_types_supported' UserIn uses this array: ['password', 'client_credentials', 'authorization_code', 'refresh_token']
		this.get_jwks = (root) => { /* Implement your logic here */ }
		this.get_grant_types_supported = (root) => { /* Implement your logic here */ }

		// IMPORTANT NOTE: The above event handlers support both synchronous and Promises implementations. Both the 
		// following are correct:
		// 		this.generate_access_token = (root, { claims }, context) => { /* Implement your logic here */ }
		// 		or 
		// 		this.generate_access_token = async (root, { claims }, context) => { /* Implement your await logic here */ }
	}
}

const userin = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignup', 'loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page', 	// only required when modes contains 'openid'.
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600, 					// only required when modes contains 'openid'.
			code: 30 							// only required when modes contains 'loginsignupfip' or 'openid'.
		}
	}
})

// This code implies a app was registered with Facebook. For more details about this
// topis, please refer to the "Setting up an identity provider" section. 
userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

// Example of how to listen to events and even modify their response. 
userIn.on('generate_access_token', (root, payload, context) => {
	console.log(`'generate_access_token' event fired. Payload:`)
	console.log(payload)
	console.log('Previous handler response:')
	console.log(root)
	console.log('Current context:')
	console.log(context)
})

// Exposes an extra 'v1/'
userIn.use(new Postman('userin-my-app'))

app.use(userIn)

app.listen(3330)
```

The list of exposed endpoints is detailed under the section. That list is also discoverable via the following endpoints:
All the endpoints that the UserIn middleware exposes are discoverable at the following two endpoints:
- __`GET`__ [http://localhost:3330/v1/.well-known/configuration](http://localhost:3330/v1/.well-known/configuration): This is the non-standard OpenID discovery endpoint. It exposes the exhaustive list of all the UserIn endpoints, including both the OpenID endpoints and the non OpenID/OAuth 2.0 endpoints.
- __`GET`__ [http://localhost:3330/oauth2/v1/.well-known/openid-configuration](http://localhost:3330/oauth2/v1/.well-known/openid-configuration): This is the OpenID discovery endpoint. It only exposes OpenID/Oauth 2.0 endpoints. That endpoint is the one that your third-parties are supposed to use.
- __`GET`__ : [http://localhost:3330/v1/postman/collection.json](http://localhost:3330/v1/postman/collection.json): This endpoint is optional. It exposes a Postman collection 2.0 that helps to create a new Postman collection. Postman is used to test the UserIn API and run various integration tests. To expose it, Postman must be explicitely configured. That what the line `userIn.use(new Postman('userin-my-app'))` does. More about Postman in the [Exporting the API to Postman](#exporting-the-api-to-postman) section.

# Auth modes

The idea behind those modes is to add new non-OAuth 2.0 web APIs to complement the OAuth 2.0 specification. Indeed, the challenges that OAuth 2.0 aim to fix are not related to secure your apps using your own web APIs. OAuth 2.0 is designed to let third-parties to use your APIs on behalf of your users. But as a software engineer, you often need to perform both (usually starting with the first challenge to secure your APIs to power your apps). UserIn's aim is to offer an implementation strategy that is progressive. A usual progression would be:
1. Allow your users to login or create a new account using username and password. UserIn calls this the `loginsignup` mode. 
2. Add support for login or create new account with Identity Providers (e.g., Facebook, Google). UserIn calls this the `loginsignupfip` mode. 
3. Allow third-parties to use your API. UserIn calls this the `openid` mode. 

> Notice that until you reach the third step, you actually do not need OAuth 2.0 or OpenID.

UserIn supports multiple flows grouped in three modes which can be combined together:
1. [`loginsignup`](#loginsignup-mode): This is the simplest group of flows to implement. It only supports login and signup with username and password. Generates short-lived access_token, and optionally long-lived refresh_token upon successfull authentication. Use it to let your users login and signup to your platform using a username and password only.
2. [`loginsignupfip`](#loginsignupfip-mode): Supports login and signup with username/password and Federated Identity Providers (e.g., Facebook, Google). Generates short-lived access_token, short-lived authorization code, and optionally long-lived refresh_token upon successfull authentication. This mode is a superset of the `loginsignup` mode. Use it to let your users login and signup to your platform using a username and password as well as one or many FIPs. 
3. [`openid`](#openid-mode): Supports login (no signup) using any the OpenID Connect flows (Authorization code, Implicit, Credentials and Password). Generates short-lived access_token, short-lived authorization code, short-lived id_token, and optionally long-lived refresh_token upon successfull authentication. Use it to let others systems access your platform. OpenID Connect and OAuth 2.0 powers the following use cases:
	- Access to your platform by a third-party directly. This flow is called the `Credentials flow`.
	- Access to your platform by a third-party on behalf of one of your user. In that case, the user has given consent to that third-party system to access some resources on your platform (this consent was given via a redirection to a consent page hosted on your platform). There are two OpenID flows that can achieve this: `Authorization code flow` (recommended) and the `Implicit flow` (deprecated). 
	- Access to you platform by one of your user using their client_id, username and password (optionally their client_secret if your plaftorm is private). This OpenID flow is called the `password flow`. 

> NOTE: It is interesting to notice that OpenID Connect and OAuth 2.0 are not designed to let your users directly(1) log in or sign up. That's why UserIn supports the [`loginsignup` mode](#loginsignup-mode) and the [`loginsignupfip` mode](#loginsignupfip-mode) (though the later is a bit of a hybrid as it connects with FIPs which usually implement OAuth 2.0). If you're engineering a web API that only needs to power your web app, you only need the first or second mode. OAuth 2.0 and OpenID Connect are useful when your API needs to be accessed by third-parties. The good thing about UserIn is that its implementation lets you upgrade at any time without re-engineering everything from the ground up.

> (1) By _directly_ we mean going straight to your middleware/backend without any redirections to let your lambda users log in or create an account using their credentials. Technically, the OAuth 2.0 `password` and `client_credentials` grant types allow a user to acquire tokens in exchange of credentials via the `/token` API, but those flows are not designed to create new accounts. This is not also in their spirit to support log in. When it comes to identity, the idea behind OpenID is to allow third-parties to request identity information so that they can use them in the way they see fit, including for example, using a custom API to login their users.

## `loginsignup` mode
### `loginsignup` strategy requirements

- Constructor required fields:
	- `baseUrl`
	- `tokenExpiry.access_token`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	baseUrl: 'https://your-authorization-server-domain.com',
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
	6. `get_access_token_claims`
	7. `delete_refresh_token`

## `loginsignupfip` mode
### `loginsignupfip` strategy requirements

This mode is a superset of _loginsignup_.

- Constructor required fields:
	- `baseUrl`
	- `modes`: Must contain `'loginsignupfip'`.
	- `tokenExpiry.access_token`
	- `tokenExpiry.code`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	baseUrl: 'https://your-authorization-server-domain.com',
	>	modes:['loginsignupfip'],
	> 	tokenExpiry: {
	> 		access_token: 3600,
	> 		code: 30
	> 	}
	> })
	> ```
- Requires eleven event handlers:
	1. `create_end_user` (same as _loginsignup_)
	2. `get_end_user` (same as _loginsignup_)
	3. `generate_access_token` (same as _loginsignup_)
	4. `generate_refresh_token` (same as _loginsignup_)
	5. `get_refresh_token_claims` (same as _loginsignup_)
	6. `get_access_token_claims` (same as _loginsignup_)
	7. `delete_refresh_token` (same as _loginsignup_)
	8. `create_fip_user`
	9. `get_fip_user`
	10. `generate_authorization_code`
	11. `get_authorization_code_claims`

## `openid` mode
### `openid` strategy requirements

- Constructor required fields:
	- `baseUrl`
	- `consentPage`
	- `modes`: Must contain `'openid'`.
	- `tokenExpiry.id_token`
	- `tokenExpiry.access_token`
	- `tokenExpiry.code`
	> Example:
	> ```js
	> const strategy = new YourStrategy({ 
	>	baseUrl: 'https://your-authorization-server-domain.com',
	>	consentPage: 'https://your-app-login-for-3rd-party.com',
	>	modes:['openid'],
	> 	tokenExpiry: {
	> 		id_token: 3600,
	> 		access_token: 3600,
	> 		code: 30
	> 	}
	> })
	> ```
- Requires twenty one event handlers:
	1. `get_end_user` (same as _loginsignup_ and _loginsignupfip_)
	2. `generate_access_token` (same as _loginsignup_ and _loginsignupfip_)
	3. `generate_refresh_token` (same as _loginsignup_ and _loginsignupfip_)
	4. `get_refresh_token_claims` (same as _loginsignup_ and _loginsignupfip_)
	5. `get_access_token_claims` (same as _loginsignup_ and _loginsignupfip_)
	6. `delete_refresh_token` (same as _loginsignup_ and _loginsignupfip_)
	7. `generate_authorization_code` (same as _loginsignupfip_)
	8. `get_authorization_code_claims` (same as _loginsignupfip_)
	9. `generate_id_token`
	10. `generate_auth_request_code`
	11. `generate_auth_consent_code`
	12. `get_id_token_claims`
	13. `get_identity_claims`
	14. `get_client`
	15. `get_jwks`
	16. `get_claims_supported`
	17. `get_scopes_supported`
	18. `get_grant_types_supported`
	19. `get_auth_request_claims`
	20. `get_auth_consent_claims`
	21. `link_client_to_user`

# Endpoints

The number of endpoints exposed by UserIn depends on its modes. UserIn supports three modes which can be combined together:
1. `loginsignup`: Non-OAuth 2.0 compliant set of APIs that powers an Authorization Server that can exchange your user's username and password with an access_token, and a refresh_token. Those tokens allow your Apps to safely access your platform's API.
2. `loginsignupfip`: Same as the `loginsignup` mode with the extra ability to use an identity provider (e.g., Facebook) to access the tokens.
3. `openid`: OAuth 2.0 and OpenID Connect compliant set of APIs that powers an Authorization Server that support multiple flows to exchange your user's username and password with various tokens. The difference between this mode and the previous two is that your user is making that exchange request within the context of a third-party system which is uniquely identify by its `client_id`. That third-party system must be registered on your platform before your user can use your APIs within that context. Contrary to the first two modes, OAuth 2.0 make it possible to restrict which APIs can be used by combining the `client_id` with `scopes`. OAuth 2.0 and OpenID are not designed to support creating accounts, which explain why UserIn supports the first two modes above. The purpose of OAuth 2.0 is to let third-party systems registered on your platform with specific scopes to leverage some or all of your APIs to enhance the experience of a subset of their users that also have an account on your platform.

By default, UserIn exposes the following web APIs:

| Pathname | Mode | Method | Type | Description |
|:---------|:-----|:-------|:-----|:------------|
| `/v1/.well-known/configuration` | `All` | __`GET`__ 	| Not OAuth 2.0 | Discovery metadata JSON about all web API. |
| `/v1/postman/collection.json` | `All` | __`GET`__ 	| Not OAuth 2.0 | Postman collection 2.0 definition to create a Postman client. This endpoint is not toggled by default. To toggle it, please refer to the [Publishing a Postman collection as a web link](#publishing-a-postman-collection-as-a-web-link) section. |
| `/v1/login` | `loginsignup` & `loginsignupfip` | __`POST`__ 	| Not OAuth 2.0 | Lets user log in. |
| `/v1/signup` | `loginsignup` & `loginsignupfip` | __`POST`__ 	| Not OAuth 2.0 | Lets user sign up. |
| `/oauth2/v1/token` | `All` | __`POST`__ 	| OAuth 2.0 | Gets one or many tokens (e.g., access_token, refresh_token, id_token). |
| `/oauth2/v1/revoke` | `All` | __`POST`__ 	| OAuth 2.0 | Revokes a refresh_token. |
| `/oauth2/v1/.well-known/openid-configuration` | `openid` | __`GET`__ 	| OAuth 2.0 | Discovery metadata JSON about OpenID web API only. |
| `/oauth2/v1/authorize` | `openid` | __`GET`__ | OAuth 2.0 | Redirects to your platform's consent page to prompt user to authorize a third-party to access their resources. |
| `/oauth2/v1/authorizeconsent` | `openid` | __`GET`__ | Non-OAuth 2.0 | Processes the consent page's response. Though this is technically not part of the OAuth 2.0 specification, this API is what allows UserIn to implement the full OAuth 2.0 Authorization Code flow. That's why this API is still labelled as OAuth 2.0. |
| `/oauth2/v1/introspect` | `openid` | __`POST`__ 	| OAuth 2.0 | Introspects a token (e.g., access_token, refresh_token, id_token). |
| `/oauth2/v1/userinfo` | `openid` | __`GET`__ 	| OAuth 2.0 | Returns user's profile based on the claims associated with the access_token. |
| `/oauth2/v1/certs` | `openid` | __`GET`__ 	| OAuth 2.0 | Array of public JWK keys used to verify id_tokens. |

Additionally, for each identity provider installed on UserIn, the following new endpoint is added (this example uses Facebook):

| Pathname | Mode | Method | Type | Description |
|:---------|:-----|:-------|:-----|:------------|
| `/v1/facebook/authorize` | `loginsignupfip` | __`GET`__ 	| Not OAuth 2.0 | Redirects to Facebook consent page. |

To learn more about setting up identity providers, please refer to the [next section](#setting-up-an-identity-provider). 

## /.well-known/configuration

- Required modes: `none`. This endpoint is always available.
- OAuth 2.0 compliant: No. 
- Description: Gets a JSON object describing where all the other endpoints are located and what type of configuration is supported.
- HTTP method: `GET`
- Parameters: `none`

## /login

## /signup

## /token

- Required modes: `none`. This endpoint is always available.
- OAuth 2.0 compliant: Yes, but also support non-standard usage when the `client_id` is not required to support login/signup flows where a third-party is not involved.
- Description: Exchanges credentials for tokens.
- HTTP method: `POST`
- Parameters: Depends on the grant type and the API private configuration.

### `refresh_token` grant type 

- Supported modes: `all`
- Description: With this grant type, a refresh_token is exchanged for a new access_token and potentially a new id_token if the mode is `openid` and is the initial scopes contained `openid`.
- Body parameters:
	- `grant_type` [required]: `refresh_token`
	- `refresh_token` [required]: `<REFRESH TOKEN VALUE>`
	- `client_id` [optional]: Only required for OpenID clients. This means that the modes must contain `openid` and that the refresh_token must have been acquired via an OpenID flow (e.g., consent page).
	- `client_secret` [optional]: Only required when the client_id is required and that specific client is configured so that the client_secret is required.

### `authorization_code` grant type 

- Supported modes: `loginsignupfip` and `openid`
- Description: With this grant type, an authorization code is exchanged for an access_token and potentially:
	- An id_token if the mode is `openid` and is the initial scopes contained `openid`.
	- A refresh_token if the initial scopes contained `offline_access`. If the mode contains `openid`, then the `offline_access` scope must be explicitely supported by the client_id. This is configured on the [`get_client`](#get_client) event handler.
	That authorization code is acquired via one of the following two flows:
		1. The login/signup screen (`loginsignupfip` mode) when the user selected an identity provider (e.g., Facebook) rather than the username/password method.
		2. A third-party system redirected one of your user to your platform consent page (`openid` mode). 
- Body parameters:
	- `grant_type` [required]: `authorization_code`
	- `code` [required]: `<AUTHORIZATION CODE VALUE>`
	- `redirect_uri` [required]: This is a security precaution. This redirect uri must be the same as the one that was used by the consent page to redirect to your platform to return the authorization code. 
	- `client_id` [optional]: Only required for OpenID clients. This means that the modes must contain `openid` and that the authorization code must have been acquired via an OpenID flow (e.g., consent page).
	- `client_secret` [optional]: Only required when the client_id is required and that specific client is configured so that the client_secret is required.
	- `code_verifier` [optional]: This value is only required when the authorization code was acquired with a `code_challenge`. This security strategy is called PKCE (Proof Key for Code Exchange).

### `password` grant type 

- Supported modes: `openid`
- Description: With this grant type, a client_id, username and password are exchanged for an access_token and potentially an id_token if the scopes contain `openid`.
- Body parameters:
	- `grant_type` [required]: `password`
	- `username` [required]: `<USERNAME>`
	- `password` [required]: `<PASSWORD>`
	- `client_id` [required]: `<CLIENT_ID>`
	- `client_secret` [optional]: Only required when the client_id is required and that specific client is configured so that the client_secret is required.
	- `scope` [optional]: `<SPACE DELIMITED SCOPES>`

### `client_credentials` grant type 

- Supported modes: `openid`
- Description: With this grant type, a client_id and a client_secret are exchanged for an access_token and potentially an id_token if the scopes contain `openid`.
- Body parameters:
	- `grant_type` [required]: `client_credentials`
	- `client_id` [required]: `<CLIENT_ID>`
	- `client_secret` [required]: `<CLIENT_SECRET>`
	- `scope` [optional]: `<SPACE DELIMITED SCOPES>`

## /revoke

- Required modes: `openid`
- OAuth 2.0 compliant: Yes, but also support non-standard usage when the `client_id` is not required to support login/signup flows where a third-party is not involved.
- Description: Revokes a `refresh_token`. In theory, this method should also allow to revoke an `access_token`, but in practice this is not always possible. Usually, the access_token is self-signed, which means the only way to revoke it is to wait until it expires and prevent the refresh_token to be used to issue a new one, which is similar to revoke the refresh_token. This is why UserIn does not support revoking access_tokens.
- HTTP method: `POST`
- Header:
	- `Authorization` [required]: Must be the access_token value prefixed with the `Bearer` scheme (e.g., `Bearer 123`).
- Body parameters: 
	- `token` [required]: `<TOKEN VALUE>`
	- `client_id` [optional]: Only required for OpenID clients. This means that the modes must contain `openid` and that the refresh_token must have been acquired via an OpenID flow (e.g., consent page).
	- `client_secret` [optional]: Only required when the client_id is required and that specific client is configured so that the client_secret is required.

## /.well-known/openid-configuration

- Required modes: `openid`
- OAuth 2.0 compliant: Yes
- Description: Gets a JSON object describing where all the other OpenID endpoints are located and what type of OpenID configuration is supported.
- HTTP method: `GET`
- Parameters: `none`

## /authorize

- Required modes: `openid`
- OAuth 2.0 compliant: Yes
- Description: Redirects to your platform's consent page to prompt user to authorize a third-party to access their resources.
- HTTP method: `GET`
- Query parameters: 
	- `client_id` [required]: `<CLIENT_ID>`
	- `client_secret` [optional]: Only required when the client identified by `client_id` contains one of the following values in its `auth_methods` property: 
		- `client_secret_basic`
		- `client_secret_post`
	- `response_type` [required]: Valid values are: `code`, `id_token`, `token`, `code id_token`, `code token`, `id_token token` or `code id_token token`
	- `redirect_uri` [required]: 
	- `scope` [optional]: 
	- `state` [optional]:

## /authorizeconsent

- Required modes: `openid`
- OAuth 2.0 compliant: No
- Description: Processes the consent page's response. Though this is technically not part of the OAuth 2.0 specification, this API is what allows UserIn to implement the full OAuth 2.0 Authorization Code flow. That's why this API is still labelled as OAuth 2.0. 
- HTTP method: `GET`
- Query parameters: 
	- `client_id` [required]: `<CLIENT_ID>`
	- `response_type` [required]: Valid values are: `code`, `id_token`, `token`, `code id_token`, `code token`, `id_token token` or `code id_token token`
	- `redirect_uri` [required]: 
	- `scope` [optional]: 
	- `state` [optional]:

## /introspect

- Required modes: `openid`
- OAuth 2.0 compliant: Yes
- Description: Returns basic details about a token (e.g., active or not, expiry date, creation date, scopes). 
- HTTP method: `POST`
- Body parameters: 
	- `token` [required]: `<TOKEN VALUE>`
	- `token_type_hint` [required]: Valid values are: `access_token`, `id_token` and `refresh_token`.
	- `client_id` [required]: `<CLIENT_ID>`
	- `client_secret` [optional]: Only required when the client_id is required and that specific client is configured so that the client_secret is required.

## /userinfo

- Required modes: `openid`
- OAuth 2.0 compliant: Yes
- Description: Returns details about a user. The level of details depends on the scopes associated with the access_token.
- HTTP method: `GET`
- Header:
	- `Authorization` [required]: Must be the access_token value prefixed with the `Bearer` scheme (e.g., `Bearer 123`).

## /certs

## /<IdP>/authorize

# Events and event handlers
## Events overview

UserIn behaviors are managed via events and event handlers. Out-of-the-box, UserIn does not define any handlers to respond to those events. As a software engineer, this is your job to implement those event handlers in adequation with your business logic. The following list represents all the events that can be triggered during an authentication or authorization flow, but worry not, you are not forced to implement them all. You only have to implement the event handlers based on the [type of authentication and authorization flow you wish to support](#auth-modes).

1. [`create_end_user`](#create_end_user)
2. [`create_fip_user`](#create_fip_user)
3. [`generate_access_token`](#generate_access_token)
4. [`generate_authorization_code`](#generate_authorization_code)
5. [`generate_id_token`](#generate_id_token)
6. [`generate_refresh_token`](#generate_refresh_token)
7. [`generate_auth_request_code`](#generate_auth_request_code)
8. [`generate_auth_consent_code`](#generate_auth_consent_code)
9. [`get_access_token_claims`](#get_access_token_claims)
10. [`get_authorization_code_claims`](#get_authorization_code_claims)
11. [`get_auth_request_claims`](#get_auth_request_claims)
12. [`get_auth_consent_claims`](#get_auth_consent_claims)
13. [`get_client`](#get_client)
14. [`get_config`](#get_config)
15. [`get_end_user`](#get_end_user)
16. [`get_fip_user`](#get_fip_user)
17. [`get_id_token_claims`](#get_id_token_claims)
18. [`get_identity_claims`](#get_identity_claims)
19. [`get_refresh_token_claims`](#get_refresh_token_claims)
20. [`get_jwks`](#get_jwks)
21. [`get_claims_supported`](#get_claims_supported)
22. [`get_scopes_supported`](#get_scopes_supported)
23. [`get_grant_types_supported`](#get_grant_types_supported)
24. [`delete_refresh_token`](#delete_refresh_token)
25. [`link_client_to_user`](#link_client_to_user)
26. `get_config`: Automatically implemented.

Each of those events trigger a chain of event handlers. By default, only one handler is configured in that chain (the one that you should have implemented in your [UserIn Strategy](#userin-strategy)). UserIn exposes an `on` API that allows to add more handlers for each event as shown in this example:

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

## Event APIs
### `create_end_user`

Example of that logic encapsulated in a `create_end_user.js`:

```js
const { error: { wrapErrors } } = require('puffy')
const services = require('../services')

/**
 * Creates new user.
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.user.username		
 * @param  {String}		payload.user.password		
 * @param  {String}		payload.user...			More properties
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Object}		user					This object should always defined the following properties at a minimum.
 * @return {Object}		user.id					String ot number
 */
const handler = async (root, { user }, { repos }) => {
	// Note: The following assertions have already been checked by UserIn so this function 
	// does not need to check these again:
	// 	- 'user' is truthy. 
	// 	- 'username' is truthy
	// 	- 'password' is truthy
	// 	- 'username' does not exist already

	const errorMsg = 'Failed to create end user'

	// 1. Verify password minimal requirements
	const { valid, reason } = services.password.strongEnough(user.password)

	if (!valid)
		throw new Error(`${errorMsg}. The password is not strong enought. ${reason}`)

	const [newUserErrors, newUser] = await repos.user.insert(user)
	if (newUserErrors)
		throw wrapErrors(errorMsg, newUserErrors)

	return newUser
}

module.exports = handler
```

### `create_fip_user`

### `generate_access_token`

Example of that logic encapsulated in a `generate_access_token.js`:

```js
const { error: { wrapErrors } } = require('puffy')
const tokenManager = require('../tokenManager')

/**
 * Generates a new access_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
const handler = async (root, { claims, state }, { repos }) => {
	// Note: The following assertions have already been checked by UserIn so this function 
	// does not need to check these again:
	// 	- 'claims' is truthy and is an object
	// 
	// This function is expected to behave following the specification described at 
	// https://github.com/nicolasdao/userin#access_token-requirements
	
	const [errors, token] = await tokenManager(repos)('access_token').create(claims)
	if (errors)
		throw wrapErrors('Failed to create access_token', errors)

	return token
}

module.exports = handler
```

### `generate_authorization_code`

### `generate_id_token`

### `generate_refresh_token`

Example of that logic encapsulated in a `generate_refresh_token.js`:

```js
const { error: { wrapErrors } } = require('puffy')
const tokenManager = require('../tokenManager')

/**
 * Generates a new refresh_token. 
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.claims
 * @param  {String}		payload.state		This optional value is not strictly necessary, but it could help set some context based on your own requirements.
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {String}		token
 */
const handler = async (root, { claims, state }, { repos }) => {
	// Note: The following assertions have already been checked by UserIn so this function 
	// does not need to check these again:
	// 	- 'claims' is truthy and is an object
	// 
	// This function is expected to behave following the specification described at 
	// https://github.com/nicolasdao/userin#refresh_token-requirements
	
	const [errors, token] = await tokenManager(repos)('refresh_token').create(claims)
	if (errors)
		throw wrapErrors('Failed to create refresh_token', errors)

	return token
}

module.exports = handler
```

### `generate_auth_request_code`

### `generate_auth_consent_code`

### `get_access_token_claims`

### `get_authorization_code_claims`

### `get_auth_request_claims`

### `get_auth_consent_claims`

### `get_client`

```js
/**
 * Gets the client's audiences, scopes and auth_methods.  
 *  
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.client_id
 * @param  {String}		payload.client_secret	Optional. If specified, this method should validate the client_secret.
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {[String]}	output.audiences		Client's audiences.	
 * @return {[String]}	output.scopes			Client's scopes.	
 * @return {[String]}	output.auth_methods		Client's auth_methods.	
 * @return {[String]}	output.redirect_uris	Client's allowed redirect URIs
 */
const handler = (root, { client_id, client_secret }, context) => {
	const client = context.repos.client.find(x => x.client_id == client_id)
	
	if (!client)
		return null

	if (client_secret && client.client_secret != client_secret)
		throw new Error('Unauthorized access')

	return {
		audiences: client.audiences || [],
		scopes: client.scopes || [],
		auth_methods: client.auth_methods || [],
		redirect_uris: client.redirect_uris || []
	}
}
```

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

Example of that logic encapsulated in a `get_end_user.js`:

```js
const { error:{ InvalidCredentialsError } } = require('userin')
const { error: { wrapErrors } } = require('puffy')
const services = require('../services')

/**
 * Gets the user ID and optionnaly its associated client_ids if the 'openid' is supported.
 * If the username does not exist, a null value must be returned. However, the 'password' is optional. 
 * If the 'password' is provided, it must be verified. If the verification fails, an error of type 
 * InvalidCredentialsError must be thrown (const { error:{ InvalidCredentialsError } } = require('userin'))
 * 
 * @param  {Object} 	root					Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {String}		payload.user.username
 * @param  {String}		payload.user.password
 * @param  {String}		payload.user...			More properties
 * @param  {String}		payload.client_id		Optional. Might be useful for logging or other custom business logic.
 * @param  {String}		payload.state			Optional. Might be useful for logging or other custom business logic.
 * @param  {Object}		context					Strategy's configuration
 * 
 * @return {Object}		user					This object should always defined the following properties at a minimum.
 * @return {Object}		user.id					String ot number
 * @return {[Object]}	user.client_ids		
 */
const handler = async (root, { user, client_id, state }, { repos }) => {
	// Note: The following assertions have already been checked by UserIn so this function 
	// does not need to check these again:
	// 	- 'user' is truthy. 
	// 	- 'user.username' is truthy
	// 
	// This function is expected to behave as follow:
	// 	- If the 'username' does not exist, a null value must be returned. 
	// 	- The 'password' is optional. 
	// 	- If the 'password' is provided, it must be verified. If the verification fails, an error of type 
	// 	InvalidCredentialsError must be thrown (const { error:{ InvalidCredentialsError } } = require('userin'))

	const errorMsg = 'Failed to get end user'

	const [confirmedUserErrors, confirmedUser] = await repos.user.find({ where:{ email:user.username } })
	if (confirmedUserErrors)
		throw wrapErrors(errorMsg, confirmedUserErrors)

	if (!confirmedUser)
		return null

	if (user.password) {
		const eMsg = `${errorMsg}. Invalid username or password.`
		const saltedPassword = confirmedUser.password
		if (!saltedPassword || !confirmedUser.salt)
			throw new InvalidCredentialsError(eMsg)

		const valid = services.password.verify({ 
			password:user.password, 
			salt:confirmedUser.salt, 
			hashedSaltedPassword:confirmedUser.password 
		})

		if (!valid)
			throw new InvalidCredentialsError(eMsg) 
	}

	return {
		id: confirmedUser.id,
		client_ids:[]
	}
}

module.exports = handler
```

### `get_fip_user`

### `get_id_token_claims`

### `get_identity_claims`

### `get_refresh_token_claims`

Example of that logic encapsulated in a `get_refresh_token_claims.js`:

```js
const { error: { wrapErrors } } = require('puffy')
const tokenManager = require('../tokenManager')

/**
 * Gets the refresh_token's claims
 * 
 * @param  {Object} 	root				Previous handler's response. Occurs when there are multiple handlers defined for the same event. 
 * @param  {Object}		payload.token
 * @param  {Object}		context				Strategy's configuration
 * 
 * @return {Object}		claims				This object should always defined the following properties at a minimum.
 * @return {String}		claims.iss			
 * @return {Object}		claims.sub			String or number
 * @return {String}		claims.aud
 * @return {Number}		claims.exp
 * @return {Number}		claims.iat
 * @return {Object}		claims.client_id	String or number
 * @return {String}		claims.scope
 */
const handler = async (root, { token }, { repos }) => {
	// Note: The following assertions have already been checked by UserIn so this function 
	// does not need to check these again:
	// 	- 'token' is truthy and is a string
	// 
	// This function is expected to behave following the specification described at 
	// https://github.com/nicolasdao/userin#refresh_token-requirements
	
	const [errors, refresh_token] = await tokenManager(repos)('refresh_token').getClaims(token)
	if (errors)
		throw wrapErrors('Failed to create refresh_token', errors)

	return refresh_token
}

module.exports = handler
```

### `get_jwks`

### `get_claims_supported`

### `get_scopes_supported`

### `get_grant_types_supported`

### `delete_refresh_token`

### `link_client_to_user`

# OpenID Connect tokens & authorization code requirements

If you're implementing a UserIn strategy that supports the [`openid` mode](#openid-mode), then you must generate your tokens and authorization code following strict requirements.

## `id_token` requirements

## `access_token` requirements

## `refresh_token` requirements

## Authorization `code` requirements

# Setting up an identity provider

UserIn supports both [Passport strategies](http://www.passportjs.org/) and native OpenID providers via their `.well-known/openid-configuration` discovery endpoint (e.g., https://accounts.google.com/.well-known/openid-configuration). In both cases, an app must be registered with each identity provider. The [annex](#annex) of this document details the steps to set this up for some of the most popular provider in the [Registering an application with an Identity Provider](#registering-an-application-with-an-identity-provider) section.

## Using Passport

Example of npm Passport packages:
- Facebook: `npm i passport-facebook`
- Google: `npm i passport-google-oauth20`
- GitHub: `npm i passport-github`
- LinkedIn: `npm i passport-linkedin-oauth2`

The next example uses Facebook:

```js
const { UserIn } = require('userin')
const Facebook = require('passport-facebook')
const YourStrategy = require('./src/YourStrategy.js')

const userin = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page', 	// only required when modes contains 'openid'.
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600, 					// only required when modes contains 'openid'.
			code: 30 							// only required when modes contains 'loginsignupfip' or 'openid'.
		}
	}
})

userIn.use(Facebook, {
	clientID: '12234',
	clientSecret: '54332432',
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})
```

> NOTES:
>	- Both the `clientID` and `clientSecret` could have been omitted when the following two environment variables are set:
>		- `FACEBOOK_CLIENT_ID`
>		- `FACEBOOK_CLIENT_SECRET`
>		The convention to set up environment variables is to prefix `_CLIENT_ID` and `_CLIENT_SECRET` with the Passport's name in uppercase.
>	- The rest of the configuration is the same as what is described on the Passport package documentation. 

## Using an OpenID discovery endpoint

To this day (Oct. 2020), Google is the only major player to have adopted OpenID. The others have implemented specialized version of OAuth 2.0 (Facebook has rolled out their own implementation of OpenID Connect called Facebook Connect). 

```js
const { UserIn } = require('userin')
const YourStrategy = require('./src/YourStrategy.js')

const userin = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page', 	// only required when modes contains 'openid'.
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600, 					// only required when modes contains 'openid'.
			code: 30 							// only required when modes contains 'loginsignupfip' or 'openid'.
		}
	}
})

userIn.use({
	name:'google',
	client_id: '12234',
	client_secret: '54332432',
	discovery: 'https://accounts.google.com/.well-known/openid-configuration',
	scopes:['profile', 'email']
})
```

> NOTES:
>	- Both the `client_id` and `client_secret` could have been omitted when the following two environment variables are set:
>		- `GOOGLE_CLIENT_ID`
>		- `GOOGLE_CLIENT_SECRET`
>		The convention to set up environment variables is to prefix `_CLIENT_ID` and `_CLIENT_SECRET` with the `name` value.


# Implementation guidelines

Because OAuth 2.0 flows are not stateless we recommend to implement your UserIn strategy using [dependency injection](#dependency-injection). This will greatly help with unit testing. 

## Creating a UserIn Strategy class
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

// The required stub's properties are (change the values to your own stub):
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

The `testSuite` API exposes four different test suite, one for each mode + one that combines all the modes. Each test suite uses the same signature:
1. [`testLoginSignup` function](#testloginsignup-function) 
2. [`testLoginSignupFIP` function](#testloginsignupfip-function) 
3. [`testOpenId` function](#testopenid-function) 
4. [`testAll` function](#testall-function) 


The signature is `(YourStrategyClass: UserInStrategy, config: Object, stub: Object[, options: Object])` where:
- `YourStrategyClass` is a custom UserIn `Strategy` class (warning: do not use an instance, use the class).
- `config` is the required argument that you would pass to the `YourStrategyClass` constructor.
- `stub` is the required fake data used to unit test the `YourStrategyClass` flows. 
- `options` is the optional object that help skip some tests or show more test results:
	- `options.skip: [String]`: Array of test to skip. To skip all test, use `skip: ['all']`.
	- `options.only: [String]`: Array of test to run.
	- `options.showResults: [String]`: Array of test assertions. When this array is specified, more details about the assertion outcome are displayed. Example: `showResults:['login.handler.09,10', 'signup.handler.01']`

#### `testLoginSignup` function

Runs the following tests:
- `strategy`
- `login`
- `signup`

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
const options = { skip:'', showResults:['login.handler.09,10'] } 	// Does not skip any test and show the results of:
																	// - Test 'login.handler.09'
																	// - Test 'login.handler.10'

// To test a stragegy in 'loginsignup' mode, the following minimum config is required.
const config = {
	tokenExpiry: {
		access_token: 3600
	}
}

// The required stub's properties are (change the values to your own stub):
const stub = {
	user: {
		id: 1,
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
	newUserPassword: 'd32def32feq' // Add the password that will be used to test new users
}

testSuite.testLoginSignup(YourStrategyClass, config, stub, options)
```

#### `testLoginSignupFIP` function

Runs the following tests:
- `strategy`
- `login`
- `signup`
- `fiploginsignup`

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

// The required stub's properties are (change the values to your own stub):
const stub = {
	user: {
		id: 1,
		username: 'valid@example.com', // Valid username in your own stub data.
		password: '123456' // Valid password in your own stub data.
	},
	newUserPassword: 'd32def32feq', // Add the password that will be used to test new users
	fipUser: { // this user should be different from the one above.
		id: '1N7fr2yt', // ID of the user in the identity provider plaftform
		fipName: 'facebook', // Identity provider's name
		userId: 2 // ID of the user on your platform
	}
}

testSuite.testLoginSignupFIP(YourStrategyClass, config, stub, options)
```

#### `testOpenId` function

Runs the following tests:
- `strategy`
- `introspect`
- `token`
- `userinfo`
- `revoke`
- `discovery`
- `authorize`

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

// The required stub's properties are (change the values to your own stub):
const stub = {
	client: { 
		id: 'client_with_at_least_one_user_and_no_auth_methods',
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
		id: 'another_client_with_no_auth_methods', 
		secret: '3751245'
	},
	privateClient: { 
		// this client must have its 'auth_methods' set to ['client_secret_basic'], ['client_secret_post'] or 
		// ['client_secret_basic', 'client_secret_post']
		id: 'yet_another_client_with_auth_methods', 
		secret: '3751245'
	}
}

testSuite.testOpenId(YourStrategyClass, config, stub, options)
```

#### `testAll` function

This test function tests all the previous three tests at once. Use it if you have created a UserIn Strategy class that imlements all the [event handlers](#events-and-event-handlers). The signature is the same as for the other tests. Merge all the stubs from the previous tests into a single stub object.

### Dependency injection

The test suite supports inversion of control via dependency injection. All the event handlers supports the same signature: 

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

This example shows that `get_end_user` depends on the `USER_STORE` and `USER_TO_CLIENT_STORE` to function. Those would typically be connectors that can perform IO queries to your backend storage. This code is not properly designed to support unit testing, especially if you are tryng to test inserts. To solve this problem, the best practice is to inject those dependencies from the outside.

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

// The required stub's properties are (change the values to your own stub):
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

This design pattern is called dependency injection. It allows to replace the behaviors from the outside. The following snippet shows how to inject dependencies in the UserIn middleware rather than on the Strategy:

```js
const { someDependency } = require('../src/dependencies')
const userIn = new UserIn({
	Strategy: MockStrategy,
	modes:['loginsignup', 'loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page',
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600,
			code: 30
		}
		someDependency
	}
})
```

## Integration testing
### Exporting the API to Postman

UserIn can publish its API documentation using Postman Collection v2.1. There are two ways to export a Postman collection:
1. [Publish a new web endpoint at `{{YOUR_DOMAIN}}/v1/postman/collection.json`](#publishing-a-postman-collection-as-a-web-link) and use that link in Postman to import that collection.
2. [Export the collection in a local file](#export-a-postman-collection-in-a-local-file) and then import that file in Postman.

#### Publishing a Postman collection as a web link

Use this API:

```js
userIn.use(new Postman('your-collection-name'))
```

The full example looks like this:

```js
const express = require('express')
const app = express()
const Facebook = require('passport-facebook')
const { UserIn, Postman } = require('userin')
const YourStrategy = require('./src/YourStrategy')

const userIn = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page', 	// only required when modes contains 'openid'.
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600, 					// only required when modes contains 'openid'.
			code: 30 							// only required when modes contains 'loginsignupfip' or 'openid'.
		}
	}
})

userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

userIn.use({
	name:'google',
	discovery: 'https://accounts.google.com/.well-known/openid-configuration',
	scopes:['profile', 'email']
})

userIn.use(new Postman('userin-my-app'))

app.use(userIn)
app.listen(3330, () => console.log('UserIn listening on https://localhost:3330'))
```

#### Export a Postman collection in a local file

Once the UserIn instance has been created and configured, use the `Postman` utility as follow:

```js
Postman.export({
	userIn,
	name: 'userin-my-app',
	path: './postman-collection.json'
})
```

The full example looks like this:

```js
const express = require('express')
const app = express()
const Facebook = require('passport-facebook')
const { UserIn, Postman } = require('userin')
const YourStrategy = require('./src/YourStrategy')

const userIn = new UserIn({
	Strategy: YourStrategy,
	modes:['loginsignupfip', 'openid'], // You have to define at least one of those three values.
	config: {
		baseUrl: 'http://localhost:3330',
		consentPage: 'https://your-domain.com/consent-page', 	// only required when modes contains 'openid'.
		tokenExpiry: {
			access_token: 3600,
			id_token: 3600, 					// only required when modes contains 'openid'.
			code: 30 							// only required when modes contains 'loginsignupfip' or 'openid'.
		}
	}
})

userIn.use(Facebook, {
	scopes: ['public_profile'],
	profileFields: ['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']
})

userIn.use({
	name:'google',
	discovery: 'https://accounts.google.com/.well-known/openid-configuration',
	scopes:['profile', 'email']
})

Postman.export({
	userIn,
	name: 'userin-my-app',
	path: './postman-collection.json'
})

app.use(userIn)
app.listen(3330, () => console.log('UserIn listening on https://localhost:3330'))
```

When this code is executed, a `postman-collection.json` file is autogenerated. Use Postman to import the collection using this file.

## Authorization code flow implementation

1. User-agent browses to the `/oauth2/v1/authorize` URL passing in the query parameters the following properties:
	- `client_id` [required]
	- `response_type` [required]
	- `redirect_uri` [required] 
	- `scope` [optional]
	- `state` [optional]
	- `code_challenge` [optional]
	- `code_challenge_method` [optional]
2. UserIn validates those parameters. Upon successful validation, UserIn:
	1. Creates an opaque `code` that can be exchanged later for those parameters above.
	2. Redirects the user-agent to the consent page including the opaque `code` in the query parameters.
3. The backend behind the consent page (which is outside of UserIn control) authenticates the user (using probably the UserIn `/login` or `signup` web APIs) and prompt the user to confirm access to their resources by the third-party (aka the client_id). Upon agreeing, the consent page backend is expected to behave as follow:
	1. Creates an new opaque short-lived `consentcode` that UserIn can exchange for a `user_id`, a `username` and the original `code` from step 2.1.
	2. Redirects the user-agent to the UserIn `/v1/authorizeconsent` endpoint including the `consentcode` in the query parameters.
4. UserIn:
	1. Exchanges the `consentcode` for an object contaiing the following properties:
		- `user_id`
		- `username`
		- `code`: That's the original code created in step 2.1.
		- `exp`: A timestamp representing the number of seconds since epoch. That timestamp represents the expiration date after which this consentcode is not valid anymore.
	2. Exchanges the `code` for the original parameters from step 1.
	3. Creates an explicit link between the `client_id` and the `user.id` so that client_id can retrieve tokens without forcing the user to go throught the consent page again.
	4. Generates the tokens based on the `response_type` value from step 1.
	5. Redirects the user-agent to the `redirect_uri` URL from step 1 including in the tokens in the query parameters.

# Flexible flows

Flexible flows are those who leverage the UserIn APIs built to support the OAuth 2.0 flows but do not obey to the strict OAuth 2.0 specification. 

Generally speaking, those flows exist to power the non-third-party use cases, i.e., the ones where your API powers your own Apps directly (e.g., signing up with username and password). Those flows do not need any `client_id` (which exist to identity a third-party). UserIn's value proposition is to leverage the existing OAuth 2.0 APIs to support both standard (requires a client_id and maybe a client_secret too) and non-standard flows. To deliver this value, UserIn uses this simple approach. When users are authorized via your platform's consent page (OAuth 2.0 flow), then tokens (including the authorization code) are linked to a client_id. All subsequent flows involving those tokens require a client_id. On the other hand, When users login or signup via your login/signup page (non-OAuth 2.0 flow), then no client_id is associated with the generated tokens, and therefore the client_id is not required.

## Login/Signup flow using an third-party Identity Provider

This is the case where a user wish to use an identity provider such as Facebook to login or signup to your platform. Behind the scene, UserIn interacts with the identity provider's _OAuth 2.0 authorization code flow_ to make this happen, but this next web API is not part of the OAuth 2.0 specification.

```
GET https://YOUR_DOMAIN/v1/google/authorize?
    response_type=code&
    redirect_uri=https://YOUR_DOMAIN/v1/google/authorizecallback&
    scope=profile&
    mode=signup
```

Notice that this HTTP GET is similar to the OAuth 2.0 `/authorize` request used in the Authorization Code flow except:
- There is no `client_id` because you are serving your own users. Client IDs are generally used to identity a third-party accessing your platform. 
- The `mode` variable helps to determine whether this request aims to create a new user or to log the user in. The supported values are:
	- `login` (default)
	- `signup`

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

# FAQ
## How to use UserIn in Postman?

Please refer to [Exporting the API to Postman](#exporting-the-api-to-postman).

## How to deal with Facebook restriction to HTTPS redirect only when testing locally?

The easiest solution is to use [`ngrok`](https://ngrok.com/) which can expose a web server running on your local machine to the internet via both HTTP and HTTPS. For example, your UserIn server that is locally accessible via http://localhost:3330 will be available publicly via https://2e6c759d16cf.ngrok.io. Add that URL to the allowlist in your Facebook App and then update the `{{base_url}}` in Postman to use that new URL.

## When is the `client_secret` required?

https://developer.okta.com/blog/2019/08/22/okta-authjs-pkce
https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce

# Annex
## Jargon and concepts
### Grant types

Grant types are labels used in the `/token` API to determine how the provided credentials must be exchanged with tokens. OAuth 2.0 supports the following grant types:
- `password`
- `client_credentials`
- `authorization_code`
- `refresh_token`
- `device_code` (not supported yet by UserIn)

## Registering an application with an Identity Provider
### Facebook
#### Goal 

* Acquire an __*Client ID*__ and an __*Client Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Facebook App set up steps

1. Browse to [https://developers.facebook.com/](https://developers.facebook.com/).
2. In the top menu, expand __*My Apps*__, click on the __*Add New App*__ link and fill up the form. Once submitted, you'll be redirected to your new app dashboard page.
3. Optionally, create a test version of your new app (recommended) to ease testing during the development stage. In the top left corner, click on the app name to expand the menu. At the bottom of that menu, click on the __*Create Test App*__ button.
4. Get the __Client ID__ and the __Client Secret__. The Client ID can be found easily at the top of each page. The Client Secret is under __*Settings/Basic*__ section in the left menu. 
5. Add valid OAuth redirect URI:
	1. In the left menu, expand the __*Facebook Login*__ tab and click on __*Settings*__. 
	2. Add your authorized redirect URI under __*Valid OAuth Redirect URIs*__.

> IMPORTANT NOTE: 
> Facebook only allows HTTPS redirect URIs. This can make local development on localhost challenging. We recommend to use the [ngrok](https://ngrok.com/) to overcome this limitation. This utility offers a free plan that allows to expose your localhost to the web and uses HTTPS. 

#### Troubleshooting - Can't Load URL: The domain of this URL isn't included in the app's domains

This error happens when you've stopped testing in dev mode (i.e., using localhost) and you've either forgot to proceed to step 5 above.

<img src="https://user-images.githubusercontent.com/3425269/89261172-f72faf00-d670-11ea-8fec-3078b07491dd.png" width="400px">

The error message above should appear at the following URL: https://www.facebook.com/v3.2/dialog/oauth?response_type=code&redirect_uri=LONG_ENCODED_URL&scope=public_profile

To fix this issue:
- Copy the `LONG_ENCODED_URL`.
- Decode it (e.g., in Javascript: `decodeURIComponent(LONG_ENCODED_URL)`).
- Use that decoded URL in step 5 above.

### Google
#### Goal 

* Acquire an __*Client ID*__ and an __*Client Secret*__.
* Configure a __*Consent Screen*__. That screen acts as a disclaimer to inform the user of the implication of using Google as an IdP to sign-in to your App.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Google App set up steps

1. Sign in to your Google Cloud console at [https://console.cloud.google.com](https://console.cloud.google.com).
2. Choose the project tied to your app, or create a new one.
3. Once your project is created/selected, expand the left menu and select __*APIs & Services / Credentials*__
4. In the _Credentials_ page, select the _Credentials_ tab, click on the __*Create credentials*__ button and select __*OAuth Client ID*__. Fill up the form:
	1. _Name_: This is not really important and will not be displayed to your user. You can leave the default.
	2. _Authorized JavaScript origins_: This is optional but highly recommended before going live.
	3. _Authorized redirect URIs_: This is required.
5. After completing the step above, a confirmation screen pops up. Copy the __*client ID*__ (i.e., the Client ID) and the __*client secret*__ (i.e., the Client Secret). 
6. In the _Credentials_ page, select the _OAuth consent screen_ tab. Fill up the form depending on your requirements. Make sure you update the __*Application name*__ to your App name so that your App users see that name in the consent screen. You can also add your brand in the consent screen by uploading your App logo. Don't forget to click the __*Save*__ button at the bottom to apply your changes.

### LinkedIn
#### Goal 

* Acquire an __*Client ID*__ and an __*Client Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### LinkedIn App set up steps

1. Sign in to your LinkedIn account and then browse to [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) to either create a new App or access any existing ones. For the sake of this tutorial, the next steps only focus on creating a new App.
2. In the top right corner of the __*My Apps*__ page, click on the __*Create app*__ button.
3. Fill up the form and then click the __*Create app*__ button at the bottom.
4. Once the the App is created, you are redirected to the App's page. In that page, select the __*Auth*__ tab and copy the __*Client ID*__ (i.e., the Client ID) and the __*Client secret*__ (i.e., the Client Secret). 
5. Still in the __*Auth*__ tab, under the __*OAuth 2.0 settings*__ section, enter the redirect URI.

#### Troubleshooting - LinkedIn - Bummer, something went wrong

This error happens when you've either forgot to proceed to step 5 above or made a mistake in that step.

<img src="https://user-images.githubusercontent.com/3425269/89270120-3c0e1280-d67e-11ea-8545-a8b1664b70fc.png" width="400px">

The error message above should appear at the following URL: https://www.linkedin.com/oauth/v2/authorization?response_type=LONG_ENCODED_URLcode&redirect_uri=&scope=r_liteprofile%20r_emailaddress%20w_member_social&client_id=123456

To fix this issue:
- Copy the `LONG_ENCODED_URL`.
- Decode it (e.g., in Javascript: `decodeURIComponent(LONG_ENCODED_URL)`).
- Use that decoded URL in step 5.

### GitHub
#### Goal 

* Acquire an __*Client ID*__ and an __*Client Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### GitHub App set up steps

1. Sign in to your Github account and then browse to [https://github.com/settings/apps](https://github.com/settings/apps) to either create a new App or access any existing ones. For the sake of this tutorial, the next steps only focus on creating a new App.
2. In the top right corner of the __*GitHub Apps*__ page, click on the __*New GitHub App*__ button.
3. Fill up the form and then click the __*Create GitHub App*__ button at the bottom. The most important field to fill is the __*User authorization callback URL*__. Enter the redirect URI.

> WARNING: Up until August 2020, there is a bug in the GitHub consent page if the redirect uri is not configured properly. If it is not, UserIn won't be able to request the consent page. It will look like the browser is blocked spinning forever, waiting for a response.
> NOTE: The App creation form forces you to enter a _Homepage URL_ and a _Webhook URL_. If you don't have any, that's not important. Just enter random URIs (e.g., Homepage URL: [https://leavemealone.com](https://leavemealone.com) Webhook URL: [https://leavemealone.com](https://leavemealone.com))

4. Once the the App is created, you are redirected to the App's page. In that page, copy the __*Client ID*__ (i.e., the Client ID) and the __*Client secret*__ (i.e., the Client Secret). 

#### Troubleshooting - GitHub consent page is not reachable. Browser stays stuck after request consent page

Up until August 2020, this seems to be a GitHub bug. The expected behavior is to reach an error page with a diagnostic and some recommendations. Instead, the browser stays stuck soinning forever. As of August 2020, this issue is most likely due to a misconfigured redirect URI in your GitHub app. Please refer to step 3 above.

# References






