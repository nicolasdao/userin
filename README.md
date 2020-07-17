# UserIn &middot;  [![Tests](https://travis-ci.org/nicolasdao/userin.svg?branch=master)](https://travis-ci.org/nicolasdao/userin) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)

__*UserIn*__ is an open source 3-legged OAuth2 workflow implementation that lets your users in your App as quickly as possible and with minimum friction. It is a REST API built in NodeJS that lets App Engineers implement custom login/register middleware using Identity Providers (IdPs) such as Facebook, Google, Github and many others. __*UserIn*__ is an open source alternative to Auth0, Firebase Authentication and AWS Cognito. It is initially designed to be hosted as a microservice (though any NodeJS system could integrate its codebase) in a serverless architecture (e.g., AWS Lambda, Google Functions, Google App Engine, ...).

As for the other alternatives, UserIn requires a good understanding of OAuth2. This topic is not trivial. This document contains a high-level introduction to OAuth2 in the [Theory & Concepts](#-theory--concepts) section. If using IdPs is new to you, we recommend reading that section. The section named [The UserIn Auth Workflow](#the-userin-auth-workflow) is especially useful to understand OAuth workflows in general. 

Finally, we've also added some high-level documentation about IdPs APIs, as you may need to interact with them after acquiring their access token via UserIn. This documentation is located under the [Annex](#annex) section.

# Table Of Contents
> * [Getting Started](#getting-started)
> 	- [1. Clone UserIn](#1-clone-userin)
> 	- [2. Create an App In Each IdP You Want To Support](#2-create-an-app-in-each-idp-you-want-to-support)
> 	- [3. Create & Configure the `.userinrc.json`](#3-create--configure-the-userinrcjson)
> 	- [4. Add a new web endpoint into your existing App](#4-add-a-new-web-endpoint-into-your-existing-app)
>	- [5. Conclusion](#5-conclusion)
> * [The `.userinrc.json` File](#the-userinrcjson-file)
> * [UserIn Forms](#userin-forms)
> * [Maintaining App secrets](#maintaining-app-secrets)
> * [Configuring access token's scopes](#configuring-access-tokens-scopes)
> * [FAQ](#faq)
> 	- [How To Create An App In Facebook?](#how-to-create-an-app-in-facebook)
> 	- [How To Create An App In Google?](#how-to-create-an-app-in-google)
> 	- [How To Create An App In LinkedIn?](#how-to-create-an-app-in-linkedin)
> 	- [How To Create An App In GitHub?](#how-to-create-an-app-in-github)
>	- [How To Generate API Key?](#how-to-generate-api-key)
>	- [How To Set Up CORS?](#how-to-set-up-cors)
>	- [How To Override The Redirect URIs?](#how-to-override-the-redirect-uris)
>	- [How To Secure Redirect URIs?](#how-to-secure-redirect-uris)
>	- [How To Troubleshoot?](#how-to-troubleshoot)
>	- [How To Return Info To The Error Redirect URI?](#how-to-return-info-to-the-error-redirect-uri)
>	- [How To Return More Data To The Redirect URIs?](#how-to-return-more-data-to-the-redirect-uris)
>	- [How to update the scope of an IdP?](#how-to-update-the-scope-of-an-idp)
>	- [How Does OAuth2 Work?](#how-does-oauth2-work)
>	- [How Does The `default` Scheme Work?](#how-does-the-default-scheme-work)
> * [Theory & Concepts](#theory--concepts)
> 	- [Identity Provider](#identity-provider)
> 	- [What UserIn Does & Does Not](#what-userin-does--does-not)
>	- [The UserIn Auth Workflow](#the-userin-auth-workflow)
>	- [Redirect URI](#redirect-uri)
>	- [The UserIn Auth Workflow](#the-userin-auth-workflow)
> * [Annex](#annex)
>	- [LinkedIn API](#linkedin-api)
>	- [Facebook API](#facebook-api)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)

# Getting Started

Assuming that you're testing __*UserIn*__ locally on port 3000, the following 4 steps:

- [1. Clone UserIn](#1-clone-userin)
- [2. Create an App In Each IdP You Want To Support](#2-create-an-app-in-each-idp-you-want-to-support)
- [3. Create & Configure the `.userinrc.json`](#3-create--configure-the-userinrcjson)
- [4. Add a new web endpoint into your existing App](#4-add-a-new-web-endpoint-into-your-existing-app)

expose 3 endpoints:

1. POST [http://localhost:3000/default/oauth2](http://localhost:3000/default/oauth2)
2. GET [http://localhost:3000/facebook/oauth2](http://localhost:3000/facebook/oauth2)
3. GET [http://localhost:3000/facebook/oauth2callback](http://localhost:3000/facebook/oauth2callback)

As you can see, this demo only exposes a `default` endpoint to manage your own username/password authentication and a `facebook` endpoint pair to manage the Facebook OAuth2. Exposing more endpoints to support more IdPs (e.g., Google, LinkedIn, Github) is a simple config (more about this configuration in [3. Create & Configure the `.userinrc.json`](#3-create--configure-the-userinrcjson)).

> NOTE: The `default` scheme(#1 above) is a POST rather than a GET because it does not use an IdP. Instead, it plugs straight into your own API to authenticate your user (e.g., supporting username with password). In that case, the user credentials are POSTed to your ow API via __UserIn__. To know more about this topic, please refer to the article [How Does The `default` Scheme Work?](#how-does-the-default-scheme-work) under the [FAQ](#faq) section.

## 1. Clone UserIn

```
git clone https://github.com/nicolasdao/userin.git
cd userin
```

## 2. Create an App In Each IdP You Want To Support

Login to your IdP. We've detailed how to configure an new App for all the following IdPs:

- [How To Create An App In Facebook?](#how-to-create-an-app-in-facebook)
- [How To Create An App In Google?](#how-to-create-an-app-in-google)
- [How To Create An App In LinkedIn?](#how-to-create-an-app-in-linkedin)
- [How To Create An App In GitHub?](#how-to-create-an-app-in-github)

> IMPORTANT: Read carefully the note on how to set up the redirect URI.

## 3. Create & Configure the `.userinrc.json`

Add the `.userinrc.json` in the root folder. Use the App ID and the App secret collected in the previous step. Here is an example:

```js
{
	"userPortal": {
		"api": "http://localhost:3500/user/in",
		"key": "EhZVzt1r9POWyV99Y3D3029k3tnkTApG6xInATpj"
	},
	"schemes": {
		"default": true,
		"facebook": {
			"appId": "1234567891011121314",
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		}
	},
	"redirectUrls": {
		"onSuccess": {
			"default": "http://localhost:3500/success"
		},
		"onError": {
			"default": "http://localhost:3500/login"
		}
	},
	"CORS": {
		"origins": ["http://localhost:3500"]
	},
	"devPort": 3000
}
```

> TIPS: The app secrets can also be stored in environment variables instead of stored in the `.userinrc.json`. For more details about this approach, please refer to the [Maintaining App secrets](#maintaining-app-secrets) section.

Where:

| Property 					| Required 	| Description 														|
|:--------------------------|:----------|:------------------------------------------------------------------|
| `userPortal.api` 			| YES 		| HTTP POST endpoint. Expect to receive a `user` object. Creating this web endpoint is the App Engineer's responsibility. [http://localhost:3500/user/in](http://localhost:3500/user/in) is an example used in this tutorial to link this step with the next one. |
| `userPortal.key`			| NO 		| Though it is optional, this field is highly recommended. This key allows to secure the communication between `userIn` and the `userPortal.api`. When specified, a header named `x-api-key` is passed during the HTTP POST. The App Engineer should only allow POST requests if that header is set with the correct value, or return a 403. |
| `schemes.default` 		| NO 		| This flag determines if __*UserIn*__ supports custom Authentication powered by you own API (i.e., `userPortal.api`). In this case, you fullfill the responsibility of the IdP to verify the user's identity. The typical use case for this option is to support your own username password authentication. If set to `true`, __*UserIn*__ exposes an auth endpoint (in this example, it is hosted at [http://localhost:3000/default/oauth2](http://localhost:3000/default/oauth2)) that accepts a `user` object in its payload. |
| `schemes.facebook` 		| NO 		| This object represents the Identity Provider. It contains two properties: `appId` and `appSecret`. All IdPs follow the same schema. Currently supported IdPs: `facebook`, `google`, `linkedin` and `github`. |
| `redirectUrls.onSuccess.default` 	| YES 		| URL (GET endpoint) used to redirect the user once he/she is successfully authenticated. [http://localhost:3500/success](http://localhost:3500/success) is an example used in this tutorial to link this step with the next one. |
| `redirectUrls.onError.default` 	| YES 		| URL (GET endpoint) used to redirect the user if an error occured during the authentication process. [http://localhost:3500/error](http://localhost:3500/error) is an example used in this tutorial to link this step with the next one.|
| `CORS.origins` 	| NO 		| Though it is optional, this field is highly recommended. This setup only allows access to the __*UserIn*__ from this websites list. More about CORS setup in section [How To Set Up CORS?](#how-to-set-up-cors).|
| `devPort` | NO | Local port used in dev. If not specified, the default port is 3000. |

> WARNING: `onSuccess.redirectUrl` and `onError.redirectUrl` are __NOT__ the redirect URLs that must be specified during the IdP configuration in the step 2. Please refer to step 2 to properly configure the redirect URL for each IdP. 

## 4. Add a new web endpoint into your existing App

This section explains the overall design requirements to engineer an Web API that acts as your __UserIn__ backend, shows an example of such API and finally details how to test that demo API. This content is broken down as follow

- [4.1. Overview](#41-overview)
- [4.2. Code Sample](#42-code-sample)
- [4.3. Test](#43-test)

### 4.1. Overview
This step can be implemented however you want using any technology you feel comfortable with as long as the technology you're using allows to create web APIs.

Based on what is configured in the previous step, the minimum requirement is to engineer a single web endpoint such as:
- It accepts HTTP POST at URL [http://localhost:3500/user/in](http://localhost:3500/user/in).
- It accepts a JSON payload similar to: 
	```js
	{
		"user": {
			"id": 1,
			"email": "nic@neap.co",
			"strategy": "facebook",
			"firstName": "Nicolas",
			"lastName": "Dao",
			"profileImg": "https://someprofile.com/to-a-face.jpeg"
		}
	}
	```
- It returns a JSON payload similar to:
	```js
	{
		"code": "123456789"
	}
	```

To keep this tutorial simple, it is assumed that the current system is a web API hosted in NodeJS using Express. The API will be secured using a JWT token. Securing the API this way is not the responsibility of __*UserIn*__. There are many other ways to secure a web API, but this technique is quite common.

### 4.2. Code Sample

```js
const { app } = require('@neap/funky')

app.get('/sensitive/data', (req,res) => res.status(200).send('Special data for logged in users only'))

eval(app.listen(3500))
```

Run this code, and then use curl to query the web endpoint:

```
node index.js
```
```
curl http://localhost:3500/sensitive/data
```

As you can see, the `/sensitive/data` endpoint is not protected, and anybody can access the sensitive data.

Now, let's change the code as follow:

```js
const { app } = require('@neap/funky')
const Encryption = require('jwt-pwd')
const { bearerHandler } = new Encryption({ jwtSecret: '5NJqs6z4fMxvVK2IOTaePyGCPWvhL9MMX/o7nk2/9Ko/5jYuX+hUdfkmIzVAj6awtWk=' })

app.get('/sensitive/data', bearerHandler(), (req,res) => res.status(200).send('Special data for logged in users only'))

eval(app.listen(3500))
```

Run:
```
node index.js
```
```
curl http://localhost:3500/sensitive/data
```

This time, you'll receive a 403 response with this error message: `Unauthorized access. Missing bearer token. Header 'Authorization' not found.`

To access to this GET endpoint, you'll need to get a JWT token first, and then pass it to the `x-token` header.  

Let's add a new web endpoint to obtain a JWT token:

__*Final index.js*__

```js
const { app } = require('@neap/funky')
const Encryption = require('jwt-pwd')
const { apiKeyHandler, bearerHandler, jwt } = new Encryption({ jwtSecret: '5NJqs6z4fMxvVK2IOTaePyGCPWvhL9MMX/o7nk2/9Ko/5jYuX+hUdfkmIzVAj6awtWk=' })

const _userStore = []

const _getUser = (id, strategy) => _userStore.find(u => u && u.id == id && u.strategy ==  strategy)
const _getUserByUsername = username => _userStore.find(u => u && u.username == username)

// userPortal.api => http://localhost:3500/user/in
app.post('/user/in', apiKeyHandler({ key:'x-api-key', value:'EhZVzt1r9POWyV99Y3D3029k3tnkTApG6xInATpj' }), (req,res) => {
	const { user } = req.params || {}
	const { id, strategy, email, password, username } = user || {}
	
	let u
	// Processing the 'default' scheme
	if (strategy == 'default') {
		if (!username)
			return res.status(500).send('Failed to authenticate. Missing username.')
		if (!password)
			return res.status(500).send('Failed to authenticate. Missing password.')

		u = _getUserByUsername(username)
		if (u && u.password != password)
			return res.status(500).send('Failed to authenticate. Invalid username or password.')
	} 
	// Processing the standard Identity Provider ('facebook', 'google', ...) schemes
	else
		u = _getUser(id, strategy)

	if (!u)
		_userStore.push(user)
	
	jwt.create({ id, strategy, email }).then(token => res.status(200).send({ code:token }))
})

// onSuccess.redirectUrl => http://localhost:3500/success
app.get('/success', (req,res) => res.status(200).send(`
	<!DOCTYPE html>
	<html>
	<head><title>UserIn Demo</title></head>
	<body>
		<h1>Welcome To UserIn Demo</h1>
		<div id="container"></div>
		<script type="text/javascript">
			var urlParams = new URLSearchParams(window.location.search)
			var code = urlParams.get('code')
			if (code) {
				var xhttp = new XMLHttpRequest()
				xhttp.onreadystatechange = function() {
					if (xhttp.readyState == XMLHttpRequest.DONE)
						document.getElementById('container').innerText = xhttp.responseText
				}
				xhttp.open('GET', '/sensitive/data', true)
				xhttp.setRequestHeader('Authorization', 'Bearer ' + code)
				xhttp.send()
			}
		</script>
	</body>
	</html>`))

app.get('/sensitive/data', bearerHandler(), (req,res) => res.status(200).send('Special data for logged in users only'))

eval(app.listen(3500))
```

The web endpoint hosted at `http://localhost:3500/user/in` is the one used in the previous section to define the property `userPortal.api` in the `userinrc.json`. Notice that the `apiKeyHandler` restricts access to requests containing the correct API key value in the `x-api-key` header. This API key value is also the same as the one defined in the previous section for property `userPortal.key` in the `.userinrc.json`.

As for the web endpoint hosted at `http://localhost:3500/success`, this is the one used in the previous section to define the property `onSuccess.redirectUrl` in the `.userinrc.json`. 

### 4.3. Test
#### Testing Facebook Scheme
To test this code, configure one IdP (let's say facebook) in __*UserIn*__ and configure it as explained in [3. Create & Configure the `.userinrc.json`](#3-create--configure-the-userinrcjson). Once properly configured, run the project with:

```
npm start
```

This will host __*UserIn*__ on port 3000. 

Create another npm project and paste the code above in an `index.js`, then run:

```
node index.js
```

This will host the test API on port 3500.

To test the connection between those 2 systems, open your browser and browse to [http://localhost:3000/facebook/oauth2](http://localhost:3000/facebook/oauth2). If successfull, this test should display a web page. 

#### Testing Default Scheme (Username/Password)

Because the `default` scheme uses an HTTP POST instead of an HTTP GET, you cannot test the above code using your browser (to know more about the rational behind this design, please refer to the [FAQ](#faq) section, [How Does The `default` Scheme Work?](#how-does-the-default-scheme-work)). 

To test the `default` scheme, use `curl` as follow:

```
curl -d '{"user.username":"nic","user.password":"123"}' -H "Content-Type: application/json" -X POST http://localhost:3000/default/oauth2
```

An alternative way is using:

```
curl -d '{"user":{"username":"nic","password":"123"}}' -H "Content-Type: application/json" -X POST http://localhost:3000/default/oauth2
```

## 5. Conclusion

The workflow is clearer now. _UserIn_ authorizes the usage of an IdP to provide identity details (_pseudo authentication_). When those details have been successfully acquired, _UserIn_ POSTs them (the payload must be as follow `{ "user": Object }`) to your 3rd party web endpoint `http://localhost:3500/user/in`, which in turns decides whether to create a new user or get an existing one. The response from the `http://localhost:3500/user/in` is a JSON payload similar to `{ "code": "some_value" }`. Finally, _UserIn_ redirects the client to `http://localhost:3500/success?code=some_value`. In the example above the `success` endpoint returns HTML containing a script which proceed to an AJAX request to the `sensitive/data` endpoint, passing an Bearer token to the Authorization header.

# The `.userinrc.json` File

This file is required to run __*UserIn*__. The `.userinrc.json` file must be located in the root directory of your _UserIn_ project. Here is an example of a configuration that includes all the properties:

```json
{
	"userPortal": {
		"api": "http://localhost:3500/user/in",
		"key": "some-api-key"
	},
	"schemes": {
		"default": true,
		"facebook": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		},
		"google": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		},
		"linkedin": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		},
		"github": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		}
	},
	"redirectUrls": {
		"onSuccess": {
			"default": "http://localhost:3500/success",
			"authorized": ["http://localhost:3500/success"]
		},
		"onError": {
			"default": "http://localhost:3500/login",
			"authorized": ["http://localhost:3500/login"]
		}
	},
	"CORS": {
		"origins": ["*"],
		"allowedHeaders": ["Authorization", "Accept", "your-custom-allowed-header"]
	},
	"error": {
		"mode": "verbose",
		"defaultMessage": "Your own custom error message.",
		"echoData": ["firstName", "lastName"]
	},
	"devPort": 3300
}
```

Where:

| Property 					| Required 	| Description 														|
|:--------------------------|:----------|:------------------------------------------------------------------|
| `userPortal.api` 			| YES 		| HTTP POST endpoint. Expect to receive a `user` object. Creating this web endpoint is the App Engineer's responsibility. [http://localhost:3500/user/in](http://localhost:3500/user/in) is an example used in this tutorial to link this step with the next one. |
| `userPortal.key`			| NO 		| Though it is optional, this field is highly recommended. This key allows to secure the communication between `userIn` and the `userPortal.api`. When specified, a header named `x-api-key` is passed during the HTTP POST. The App Engineer should only allow POST requests if that header is set with the correct value, or return a 403. |
| `schemes.default` 		| NO 		| This flag determines if __*UserIn*__ supports custom Authentication powered by you own API (i.e., `userPortal.api`). If set to `true`, __*UserIn*__ exposes an auth endpoint (hosted ) that accepts a `user` object in its payload. |
| `schemes.facebook` 		| NO 		| This object represents the Identity Provider. It contains two properties: `appId` and `appSecret`. All IdPs follow the same schema. Currently supported IdPs: `facebook`, `google`, `linkedin` and `github`. |
| `redirectUrls.onSuccess.default` 	| YES 		| URL used to redirect the user once he/she is successfully authenticated. [http://localhost:3500/success](http://localhost:3500/success) is an example used in this tutorial to link this step with the next one. |
| `redirectUrls.onSuccess.authorized` 	| NO 		| This array restricts the URIs that can be used as a redirect URI. It is used for security reasons to prevent malicious hackers to redirect nefarious websites. |
| `redirectUrls.onError.default` 	| YES 		| URL used to redirect the user if an error occured during the authentication process. [http://localhost:3500/error](http://localhost:3500/error) is an example used in this tutorial to link this step with the next one.|
| `redirectUrls.onError.authorized` 	| NO 		| This array restricts the URIs that can be used as a redirect URI. It is used for security reasons to prevent malicious hackers to redirect nefarious websites. |
| `CORS.origins` 	| NO 		| Though it is optional, this field is highly recommended. This setup only allows access to the __*UserIn*__ from this websites list. More about CORS setup in section [How To Set Up CORS?](#how-to-set-up-cors).|
| `CORS.allowedHeaders` 	| NO 		| Helps to configure which request headers are allowed in CORS.|
| `error.mode` | NO | Typically used in development mode. When set to `verbose`, error messages are verbose rather than short (disable this in production to prevent your users to be overwhelmed by technical messages). More information about this setting under the [How To Troubleshoot?](#how-to-troubleshoot) section. |
| `error.defaultMessage` | NO | When `error.mode` is not set to `verbose`, a generic message is returned to the user in case of unexpected server error. The default message is `Oops, an error happened on our end.`. This property is used to override this default error message. |
| `error.echoData` | NO | This array defined any user's properties that must be returned in the redirect error URI's query string. This can help the client to displa error messages to and user. |
| `devPort` | NO | Default dev port is 3000. This property overides the default. |

> __NOT__ WARNING: Neither `onSuccess.redirectUrl` nor `onError.redirectUrl` are the redirect URLs that must be specified during the IdP configuration in the step 2. Please refer to step 2 to properly configure the redirect URL for each IdP. 

# UserIn Forms

__*UserIn Forms*__ are web forms typically built in HTML, CSS and Javacript that uses the __*UserIn*__ REST APIs. 

|Name      | Link													|
|----------|------------------------------------------------------------------------------------------------------------|
|__Gray Quail__|[https://github.com/nicolasdao/userin-form-gray-quail](https://github.com/nicolasdao/userin-form-gray-quail)|

# Maintaining App secrets
## Using the `.userinrc.json`

As explained earlier, the easiest way to maintain IdP's secrets is to do it via the `.userinrc.json` file as follow:

```js
{
	"userPortal": {
		"api": "http://localhost:3500/user/in",
		"key": "SECRET-01"
	},
	"schemes": {
		"default": true,
		"facebook": {
			"appId": "FB-ID-SECRET",
			"appSecret": "FB-SECRET"
		},
		"google": {
			"appId": "GOOG-ID-SECRET",
			"appSecret": "GOOG-SECRET"
		},
		"linkedin": {
			"appId": "LINK-ID-SECRET",
			"appSecret": "LINK-SECRET"
		}
		"github": {
			"appId": "GIT-ID-SECRET",
			"appSecret": "GIT-SECRET"
		}
	},
	"redirectUrls": {
		"onSuccess": {
			"default": "http://localhost:3500/success"
		},
		"onError": {
			"default": "http://localhost:3500/login"
		}
	},
	"CORS": {
		"origins": ["http://localhost:3500"]
	},
	"devPort": 3000
}
```

## Using environment variables

Because those secrets are highly sensitive, maintaining them in the `.userinrc.json` file could be against your organization security policy (especially if that file is put under source-control). For that reason, UserIn also supports storing each secret in environment variables. The table below maps the secret type with its environment variable name:

| Secret | Environment variable |
|:-------|:---------------------|
| `userPortal.key` | `USERPORTAL_KEY` |
| `facebook.appId` | `FACEBOOK_APP_ID` |
| `facebook.appSecret` | `FACEBOOK_APP_SECRET` |
| `google.appId` | `GOOGLE_APP_ID` |
| `google.appSecret` | `GOOGLE_APP_SECRET` |
| `linkedin.appId` | `LINKEDIN_APP_ID` |
| `linkedin.appSecret` | `LINKEDIN_APP_SECRET` |
| `github.appId` | `GITHUB_APP_ID` |
| `github.appSecret` | `GITHUB_APP_SECRET` |

> IMPORTANT: The `schemes` section in the `.userinrc.json` file must still be explicitly specified even when the secrets are stored in environment variables. Otherwise, the IdP OAuth2 endpoint and callback are not activated. For example, when the Facebook secrets are stored in their environment variables, the `schemes` section of the `.userinrc.json` should be written as follow:
>	```js
>		"schemes": {
>			"facebook": {}
>		}
>	```

# Configuring access token's scopes

Out-of-the-box, all IdPs are pre-configured with the following scopes and profileFields (for those who support profileFields):

- __`Facebook`__:
	- `scopes`: `null`
	- `profileFields`:`['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name']`
	- Exhaustive list of all scopes: https://developers.facebook.com/docs/permissions/reference#manage-pages
- __`GitHub`__:
	- `scopes`: `['r_basicprofile', 'r_emailaddress']`
	- `profileFields`: Not applicable
- __`Google`__:
	- `scopes`: `['profile', 'email']`
	- `profileFields`: Not applicable
- __`LinkedIn`__:
	- `scopes`: `['r_liteprofile', 'r_emailaddress']`
	- `profileFields`: Not applicable

To override an IdP's default settings, use the `.userinrc.json` file as follow:

```js
"schemes": {
	"default": true,
	"facebook": {
		"appId": "FB-ID-SECRET",
		"appSecret": "FB-SECRET",
		"scopes": ["public_profile", "publish_action"],
		"profileFields": ["first_name", "last_name", "email"]
	}
}
```

# FAQ
## How To Create An App In Facebook?
#### Goal 

* Acquire an __*App ID*__ and an __*App Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Steps

1. Browse to [https://developers.facebook.com/](https://developers.facebook.com/).
2. In the top menu, expand __*My Apps*__, click on the __*Add New App*__ link and fill up the form. Once submitted, you'll be redirected to your new app dashboard page.
3. Optionally, create a test version of your new app (recommended) to ease testing during the development stage. In the top left corner, click on the app name to expand the menu. At the bottom of that menu, click on the __*Create Test App*__ button.
4. Get the __App ID__ and the __App Secret__
	1. The App ID is easily foundable at the top of each page.
	2. The App Secret is under __*Settings/Basic*__ section in the left menu. 
	3. Create or configure the `.userinrc.json` file under the `userin` root folder as follow:

	```js
	{
		"schemes": {
			"facebook": {
				"appId": "your-app-id",
				"appSecret": "your-app-secret"
			}
		}
	}
	```

5. Add valid OAuth redirect URI :
	1. In the left menu, expand the __*Facebook Login*__ tab and click on __*Settings*__. 
	2. Under __*Valid OAuth Redirect URIs*__, enter [your-origin/facebook/oauth2callback](your-origin/facebook/oauth2callback), where `your-origin` depends on your hosting configuration. In development mode, _userIn_ is probably hosted on your local machine and the redirect URI probably looks like [http://localhost:3000/facebook/oauth2callback](http://localhost:3000/facebook/oauth2callback). When releasing your app in production, _userIn_ will most likely be hosted under your custom domain (e.g., youcool.com). You will have to change the redirect URI to [https://youcool.com/facebook/oauth2callback](https://youcool.com/facebook/oauth2callback).

> NOTE: Step 5 is not required in Development mode (this is the default when the App is created). This assumes that your app is hosted locally using _http://localhost_. When going live, step 5 is required.

## How To Create An App In Google?
#### Goal 

* Acquire an __*App ID*__ and an __*App Secret*__.
* Configure a __*Consent Screen*__. That screen acts as a disclaimer to inform the user of the implication of using Google as an IdP to sign-in to your App.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Steps

1. Sign in to your Google Cloud console at [https://console.cloud.google.com](https://console.cloud.google.com).
2. Choose the project tied to your app, or create a new one.
3. Once your project is created/selected, expand the left menu and select __*APIs & Services / Credentials*__
4. In the _Credentials_ page, select the _Credentials_ tab, click on the __*Create credentials*__ button and select __*OAuth Client ID*__. Fill up the form:
	1. _Name_: This is not really important and will not be displayed to your user. You can leave the default.
	2. _Authorized JavaScript origins_: This is optional but highly recommended before going live.
	3. _Authorized redirect URIs_: This is required. Enter [your-origin/google/oauth2callback](your-origin/google/oauth2callback), where `your-origin` depends on your hosting configuration. In development mode, _userIn_ is probably hosted on your local machine and the redirect URI probably looks like [http://localhost:3000/google/oauth2callback](http://localhost:3000/google/oauth2callback). When releasing your app in production, _userIn_ will most likely be hosted under your custom domain (e.g., youcool.com). You will have to change the redirect URI to [https://youcool.com/google/oauth2callback](https://youcool.com/google/oauth2callback).
5. After completing the step above, a confirmation screen pops up. Copy the __*client ID*__ (i.e., the App ID) and the __*client secret*__ (i.e., the App Secret). Create or configure the `.userinrc.json` file under the `userin` root folder as follow:

	```js
	{
		"schemes": {
			"google": {
				"appId": "your-app-id",
				"appSecret": "your-app-secret"
			}
		}
	}
	```
6. In the _Credentials_ page, select the _OAuth consent screen_ tab. Fill up the form depending on your requirements. Make sure you update the __*Application name*__ to your App name so that your App users see that name in the consent screen. You can also add your brand in the consent screen by uploading your App logo. Don't forget to click the __*Save*__ button at the bottom to apply your changes.

## How To Create An App In LinkedIn?
#### Goal 

* Acquire an __*App ID*__ and an __*App Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Steps

1. Sign in to your LinkedIn account and then browse to [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) to either create a new App or access any existing ones. For the sake of this tutorial, the next steps only focus on creating a new App.
2. In the top right corner of the __*My Apps*__ page, click on the __*Create app*__ button.
3. Fill up the form and then click the __*Create app*__ button at the bottom.
4. Once the the App is created, you are redirected to the App's page. In that page, select the __*Auth*__ tab and copy the __*Client ID*__ (i.e., the App ID) and the __*Client secret*__ (i.e., the App Secret). Create or configure the `.userinrc.json` file under the `userin` root folder as follow:

	```js
	{
		"schemes": {
			"linkedin": {
				"appId": "your-app-id",
				"appSecret": "your-app-secret"
			}
		}
	}
	```
5. Still in the __*Auth*__ tab, under the __*OAuth 2.0 settings*__ section, enter the redirect URI [your-origin/linkedin/oauth2callback](your-origin/linkedin/oauth2callback), where `your-origin` depends on your hosting configuration. In development mode, _userIn_ is probably hosted on your local machine and the redirect URI probably looks like [http://localhost:3000/linkedin/oauth2callback](http://localhost:3000/linkedin/oauth2callback). When releasing your app in production, _userIn_ will most likely be hosted under your custom domain (e.g., youcool.com). You will have to change the redirect URI to [https://youcool.com/linkedin/oauth2callback](https://youcool.com/linkedin/oauth2callback).

## How To Create An App In GitHub?
#### Goal 

* Acquire an __*App ID*__ and an __*App Secret*__.
* Configure __*Redirect URIs*__ (more info about redirect URIs under section [Concepts & Jargon](#concepts--jargon) / [Redirect URI](#redirect-uri)). 

#### Steps

1. Sign in to your Github account and then browse to [https://github.com/settings/apps](https://github.com/settings/apps) to either create a new App or access any existing ones. For the sake of this tutorial, the next steps only focus on creating a new App.
2. In the top right corner of the __*GitHub Apps*__ page, click on the __*New GitHub App*__ button.
3. Fill up the form and then click the __*Create GitHub App*__ button at the bottom. The most important field to fill is the __*User authorization callback URL*__. Enter the redirect URI [your-origin/github/oauth2callback](your-origin/github/oauth2callback), where `your-origin` depends on your hosting configuration. In development mode, _userIn_ is probably hosted on your local machine and the redirect URI probably looks like [http://localhost:3000/github/oauth2callback](http://localhost:3000/github/oauth2callback). When releasing your app in production, _userIn_ will most likely be hosted under your custom domain (e.g., youcool.com). You will have to change the redirect URI to [https://youcool.com/github/oauth2callback](https://youcool.com/github/oauth2callback).

> NOTE: The App creation form forces you to enter a _Homepage URL_ and a _Webhook URL_. If you don't have any, that's not important. Just enter random URIs (e.g., Homepage URL: [https://leavemealone.com](https://leavemealone.com) Webhook URL: [https://leavemealone.com](https://leavemealone.com))

4. Once the the App is created, you are redirected to the App's page. In that page, copy the __*Client ID*__ (i.e., the App ID) and the __*Client secret*__ (i.e., the App Secret). Create or configure the `.userinrc.json` file under the `userin` root folder as follow:

	```js
	{
		"schemes": {
			"github": {
				"appId": "your-app-id",
				"appSecret": "your-app-secret"
			}
		}
	}
	```

## How To Add a Authentication Method To UserIn?

This can be done by adding one or many of the following supported scheme in the `.userinrc.json`:
- __*default*__
- __*facebook*__
- __*google*__
- __*linkedin*__
- __*github*__

where _default_ represent the standard username/password authentication method.

Configuring an authentication portal that supports both Facebook and the default username/password would require a `.userinrc.json` file similar to the following:

```js
{
	"schemes": {
		"default":true,
		"facebook": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		},
		"google": {
			"appId": 987654321,
			"appSecret": "zfcwfceefeqfrceffre"
		}
	}
}
```

## How To Generate API Key?

There are various way to do it. The quickest way is to use the native NodeJS core library `crypto` as follow:

```js
require('crypto').randomBytes(50).toString('base64')
````

Alternatively, there are plenty of websites that generate random key such as [https://keygen.io/](https://keygen.io/) or [https://randomkeygen.com/](#https://randomkeygen.com/).

## How To Set Up CORS?

By default, CORS is setup as follow:

- Allowed Methods: 'GET', 'POST', 'OPTIONS', 'HEAD'
- Allowed Headers: 'Authorization', 'Origin', 'X-Requested-With', 'Content-Type', 'Accept'
- Origins: `'*'` 

`Allowed Headers` and `Origins` can be overidden in the `.userinrc.json` as follow:

```js
{
	"userPortal": {...},
	"schemes": {...},
	"redirectUrls": {...},
	"CORS": {
		"origins": ["https://only-safe-domain.com"],
		"allowedHeaders": ["Authorization", "Accept", "your-custom-allowed-header"]
	}
}
```

> NOTE: The `Allowed Methods` cannot be configured as the default configuration is required to operate __*UserIn*__.

## How To Override The Redirect URIs?

__*UserIn*__ allows its clients (web apps, mobile apps, ...) to define custom redirect URIs. To do so, instead of using a URIs similar to `https://your-userin-origin/<scheme>/oauth2`, use `https://your-userin-origin/<scheme>/oauth2/<your-uriencoded-successuri>/<your-uriencoded-error-uri>`. To see an explicit example, refer to the [__*UserIn Forms*__](#userin-forms) [__*Gray Quail*__](https://github.com/nicolasdao/userin-form-gray-quail#standard-config).

## How To Secure Redirect URIs?

The previous sections shows that __*UserIn*__ allows its clients (web apps, mobile apps, ...) to define custom redirect URIs. To prevent nefarious use of your __*UserIn*__ API, it is highly recommended to restrict the number of allowed redirect URIs. Here is a `.userinrc.json` configuration example:

```js
{
	"userPortal": {...},
	"schemes": {...},
	"redirectUrls": {
		"onSuccess": {
			"default": "http://localhost:3500/success",
			"authorized": ["http://localhost:3500/success"]
		},
		"onError": {
			"default": "http://localhost:3500/login",
			"authorized": ["http://localhost:3500/login"]
		}
	},
}
```

## How To Troubleshoot?

Bu default, __*UserIn*__ returns very few details about errors, which makes troubleshooting hard. To toggle more verbose error messages, add the following configuration in the `.userinrc.json`:

```json
"error": {
	"mode": "verbose"
}
```

It is also possible to replace the default non-verbose message `Oops, an error happened on our end.` with your own message as follow:

```json
"error": {
	"mode": "verbose",
	"defaultMessage": "Your own custom error message."
}
```

## How To Return Info To The Error Redirect URI?

By default, when an error occurs in __*UserIn*__, the error code and the error message are both passed in the query string of the error redirect URI. The respective parameters are `error_msg` and `error_code` (e.g., [http://localhost:3520/auth?error_msg=The%20default%20OAuth%20succeeded%2C%20but%20HTTP%20GET%20to%20%27userPortal.api%27%20http%3A%2F%2Flocalhost%3A3520%2Fuser%2Fin%20failed.%20Details%3A%20Invalid%20username%20or%20password.&error_code=400](http://localhost:3520/auth?error_msg=The%20default%20OAuth%20succeeded%2C%20but%20HTTP%20GET%20to%20%27userPortal.api%27%20http%3A%2F%2Flocalhost%3A3520%2Fuser%2Fin%20failed.%20Details%3A%20Invalid%20username%20or%20password.&error_code=400)).

It is possible to pass additional user's parameters (e.g., firstName, lastName, email, etc). To toggle this setting, add a `echoData` property in the `.userinrc.json` file as follow:

```json
{
	"error": {
		"echoData": ["firstName", "lastName", "email"]
	}
}
```

You can add any properties as long as they exist in the `user` object passed to __*UserIn*__ during the authentication step.

## How To Return More Data To The Redirect URIs?

As explained above, using the `echoData` property in the `.userinrc.json` allows to return user's data back to the error redirect URI. However, there are situations where more non-user related data are useful to be passed to either the success or error redirect URIs. Out-of-the-box, __*UserIn*__ does not provide any configuration to support this feature. However, one possible hack is to pass the desired parameters in the redirect URIs' query string. You can achieve this setup either in the `.userinrc.json` as follow:

```json
{
	"userPortal": {...},
	"schemes": {...},
	"redirectUrls": {
		"onSuccess": {
			"default": "http://localhost:3500/success?hello=world"
		},
		"onError": {
			"default": "http://localhost:3500/login?some_custom_var=yayyyy"
		}
	},
}
```

or use the same trick from the client (refer to section [How To Override The Redirect URIs?](#how-to-override-the-redirect-uris)).

## How to update the scope of an IdP?

Please refer to the [Configuring access token's scopes](#configuring-access-tokens-scopes) section.

## How Does OAuth2 Work?

OAuth2 fits multiple workflows. __*UserIn*__ implements one of the most common workflow. It is described in the [Theory & Concepts](#theory--concepts) section under [The UserIn Auth Workflow](#the-userin-auth-workflow). This should provide enough context to the reader.

## How Does The `default` Scheme Work?

__*UserIn*__ was designed to support _pseudo authentication_ using IdPs. However, in the vast majority of cases, authenticating with an IdP is a add-on to authenticating with a traditional method such as username/password. That traditional method involves explicitly capturing a user's credentials and sending them to your server where those credentials can be validated. An IdP adds an extra step in order to capture those credentials. With __*UserIn*__, in both cases, you server receive a user's credentials. That's why __*UserIn*__ support a `default` scheme. That scheme simply bypass the IdP step and sends the user's credentials directly to your server. That explains why the `default` scheme is implemented with an HTTP POST rather than an HTTP GET. If this is still not clear, let's compare the `default` scheme to the `facebook` scheme:

> We assume that _UserIn_ is hosted locally at [http://localhost:3000](http://localhost:3000).

| OAuth2 Scheme | HTTP Method 	| Endpoint 																			| Payload	|
|:--------------|:--------------|:----------------------------------------------------------------------------------|:----------|
| `facebook`	| GET 			| [http://localhost:3000/facebook/oauth2](http://localhost:3000/facebook/oauth2) 	| N.A. 		|
| `default` 	| POST 			| [http://localhost:3000/default/oauth2](http://localhost:3000/default/oauth2) 		| `{ user: { username:"nic", password:"abc123" } }` |

With the `facebook` scheme, the user is redirected to Facebook in order to capture the `user` object, and then redirect to your server via the combo __*UserIn*__ + your browser. With the `default` scheme, the `user` object is explicitly provided by your user and sent to your server via __*UserIn*__.

> TRICK: The `default` scheme must be passed a JSON payload with a `user` property. Because it is quite common to to use __*UserIn*__ in a form, __*UserIn*__ also support passing a JSON payload similar to:
>	```json
>	{
>		"user.email": "nic@neap.co",
>		"user.password": "abc123"
>	}
>	```
>
>	instead of 
>
>	```json
>	{
>		"user": { 
>			"email": "nic@neap.co",
>			"password": "abc123"
>		}
>	}
>	```
>
>	This makes building forms using __*UserIn*__ easier:
>
>	```html
> 	<form action="http://localhost:3000/default/oauth2" method="post" enctype="application/json">
> 		<input type="email" name="user.email" placeholder="Email" required>
> 		<input type="password" name="user.password" placeholder="Password" required>
> 		<input type="submit" value="Continue">
> 	</form>
>	```

# Theory & Concepts
## Identity Provider

In the broad sense of the term, an identity provider (IdP) is an entity that can issue a referral stating that a user is indeed the owner of an identity piece (e.g., email address). The most well known IdPs are Facebook, Google, LinkedIn and Github. Those IdPs are also sometimes referred as __*Federated Idendity Providers*__ (FIP) as they help to federate identity across multiple apps. FIP is often contrasted with __*Single Sign On*__ (SSO) which is usually used to authorize access to multiple apps within the same context. In reality FIP is a form of SSO, but with a broader scope, as the Apps' context does not matter as much.

## OAuth is an _Authorization Protocol_ NOT an _Authentication Protocol_

Contrary to [OpenID](https://en.wikipedia.org/wiki/OpenID) which is a pure authentication protocol, OAuth's main purpose is to authorize 3rd parties to be granted limited access to APIs. When an App offers its user to register using his/her Facebook or Google account, that does not mean the user proves his/her identity through Facebook or Google. Instead, that means that the user grants that App limited access to his/her Facebook or Google account. However, as of today (2019), gaining limiting access to an Identity Provider's API is considered _good enough_ to prove one's identity. That's what is referred to as a __*pseudo authentication*__ method. This project aims at facilitating the implementation of such _pseudo authentication_ method.

## What UserIn Does & Does Not
### What It Does

__*UserIn*__ interfaces between the client (e.g., browser), configured IdPs (e.g., Facebook, Google, LinkedIn, ...) and the App middleware (Web API). The end goal is to share the user's identity details contained in the IdP with the App middleware so that the App middleware can either create a new user or let an existing user in without using a password or ask for extra details. 

### What It Does Not

__*UserIn*__ does NOT secure the App middleware using OAuth. Securing the App middleware has nothing to do with _UserIn_ nor does it have anything to do with Auth0, Firebase Authentication, or AWS Cognito. Controlling the App middleware access (with, for example, a JWT token) is a task that the App Engineer must implement separately from integrating with _UserIn_.

## Redirect URI

A _Redirect URI_ is a URI that receives the IdP's response with the user details after successful authorizations. That URI is configured in your code. Because, in theory, any URI can be configured, the IdP wants to guarentee the App Engineer that they can control the permitted Redirect URI. Therefore, most IdPs require the App Engineers to whitelist their redirect URIs durin the App creation step.

## The UserIn Auth Workflow

As with most OAuth worklows relying in IdPs, the key idea to understand is that the browser spends its time redirecting between all the parties involved (i.e., IdP and App middleware). This usually happens very fast, which makes it look like it happens behind the scene.

The usual user sign-in process with __*UserIn*__ is as follow. 

#### 1. UserIn Form (Browser)
The user lands on a __*[UserIn Forms](#userin-forms)*__ which offers multiple ways to sign in to the App (e.g., Facebook, Google, username/password, ...).

#### 2. IdP Authentication & Authorization (Browser To UserIn Back To Browser Then To IdP)
When the user uses Facebook for example, the browser sends an HTTP GET to __*UserIn*__, which in turn responds back to the browser with a redirect to the Facebook login page. This step might not be visible is the user is already logged in to Facebook. To witness it, make sure you're not logged in, or open your browser in incognito mode.

#### 3. Sharing User Details With The App (IdP Back To UserIn Then To App Middleware Back To UserIn)
Upon successfull authentication to Facebook, Facebook redirects the user to __*UserIn*__, which in turn POST the user's identity to a web endpoint that the App Engineer has to provide. The App Engineer is free to implement that web endpoint using any method or technology, as long as this endpoint accepts a JSON payload with as `user` property describing the user's identity and returns a JSON payload with a `code` property representing any string useful to the App Engineer (e.g., a JWT token, or a short-lived token that allows to access a JWT token through another REST API).

#### 4. Letting The User In The App (UserIn To App)
Upon successful reception of that `code`, __*UserIn*__ redirects the user to the configured `onSuccess.redirectUrl` (which is typically the App). The `code` acquired through the App middleware in the previous step is included in the `redirectUrl` as a search parameters (e.g., [https://example.com/success?code=123456789](https://example.com/success?code=123456789)). A similar behavior occurs in case of failure. The redirect URL is determined by the `onError.redirectUrl` parameter. Details about the error are passed in the query string (e.g., [https://example.com/error?error_msg=something_bad_happened&code=500](https://example.com/error?error_msg=something_bad_happened&code=500)).

#### 5. Authenticating/Authorizing Access To The App (Outside of UserIn's Scope!)
Though the user seems to be in the App now, no authentication and authorization to access the app have been performed yet. Indeed, __*UserIn*__ has just skipped the pre-screening queue (no need to provide explicit user details and password) but the user still needs to show an ID to enter the party. That ID is contained in the search parameter of the current URI (that's the `code` parameter acquired in the previous step). In this step, the App Engineer is required to extract that code from the URI and use it to authenticate and authroize the user. This step can be done in any way the App Engineer wishes to. 

#### Conclusion
As you can see, the __*UserIn*__'s scope does not cover securing your App's API. This job is left to you. __*UserIn*__'s scope stops after the user is either created in your system or successfully authenticated and has landed on the `onSuccess.redirectUrl`. Using the `code` in that redirect URL, you're free to secure your App however you want.

# Annex
## LinkedIn API

> The home page for the LinkedIn API documentation is https://docs.microsoft.com/en-us/linkedin/marketing/.

Once you have the access token, simply call the API by passing the usual `Authorization: Bearer <ACCESS-TOKEN>` in the header.

- Key concepts to understand: https://docs.microsoft.com/en-us/linkedin/shared/api-guide/concepts/urns?context=linkedin/marketing/context
- How to create a post: https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api#post-shares
- There is no long-lived refresh token, but the access token last a while (60 days). [It can be refreshed](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin/marketing/context#refreshing-a-token), and you can check its current expiry date with this API: https://docs.microsoft.com/en-us/linkedin/shared/authentication/token-introspection?context=linkedin/marketing/context

## Facebook API

The Facebook API is huge! It is broken down in various product types. The list below is far from exhaustive:

- [User API (e.g.,creating posts)](https://developers.facebook.com/docs/graph-api/reference)
- [Page API](https://developers.facebook.com/docs/pages/guides)
- [Access token debug tool](https://developers.facebook.com/tools/debug/accesstoken)

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### GraphQL
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-authorize*__](https://github.com/nicolasdao/graphql-authorize.git): Authorization middleware for [graphql-serverless](https://github.com/nicolasdao/graphql-serverless). Add inline authorization straight into your GraphQl schema to restrict access to certain fields based on your user's rights.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### General Purposes
* [__*core-async*__](https://github.com/nicolasdao/core-async): JS implementation of the Clojure core.async library aimed at implementing CSP (Concurrent Sequential Process) programming style. Designed to be used with the npm package 'co'.
* [__*jwt-pwd*__](https://github.com/nicolasdao/jwt-pwd): Tiny encryption helper to manage JWT tokens and encrypt and validate passwords using methods such as md5, sha1, sha256, sha512, ripemd160.

#### Google Cloud Platform
* [__*google-cloud-bucket*__](https://github.com/nicolasdao/google-cloud-bucket): Nodejs package to manage Google Cloud Buckets and perform CRUD operations against them.
* [__*google-cloud-bigquery*__](https://github.com/nicolasdao/google-cloud-bigquery): Nodejs package to manage Google Cloud BigQuery datasets, and tables and perform CRUD operations against them.
* [__*google-cloud-tasks*__](https://github.com/nicolasdao/google-cloud-tasks): Nodejs package to push tasks to Google Cloud Tasks. Include pushing batches.

# License
Copyright (c) 2017-2019, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>



