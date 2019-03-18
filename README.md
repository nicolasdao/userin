# UserIn &middot;  [![Tests](https://travis-ci.org/nicolasdao/userin.svg?branch=master)](https://travis-ci.org/nicolasdao/userin) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)

__*UserIn*__ aims to let your users in your App as quickly as possible and with minimum friction. __*UserIn*__ is an open source middleware REST API built in NodeJS. __*UserIn*__ lets App Engineers implement custom login/register middleware using Identity Providers (IdPs) such as Facebook, Google, Github and many others. __*UserIn*__ aims to be an open source alternative to Auth0, Firebase Authentication and AWS Cognito. It is initially designed to be hosted as a microservice (though any NodeJS system could integrate its codebase) in a serverless architecture (e.g., AWS Lambda, Google Functions, Google App Engine, ...).

The reason for this project is to offer alternatives to SaaS such as Auth0, Firebase Authentication, AWS Cognito which require by default to store App's users in their data store. __*UserIn*__ helps App Engineers to control the use of IdPs to access their App fully.

Because the workflows involved in using OAuth and IdPs might not be completely obvious to all App Engineers, this document contains extra information regarding this topic under the [Theory & Concepts](#-theory--concepts) section. If you're new to using IdPs, we recommend reading that section. The section named [The UserIn Auth Workflow](#the-userin-auth-workflow) is especially useful to understand OAuth workflows in general.

# Table Of Contents
> * [Getting Started](#getting-started)
> 	- [1. Clone UserIn](#1-clone-userin)
> 	- [2. Create an App In Each IdP You Want To Support](#2-create-an-app-in-each-idp-you-want-to-support)
> 	- [3. Create & Configure the `userinrc.json`](#3-create-&-configure-the-userinrcjson)
> 	- [4. Add a new web endpoint into your existing App](#4-add-a-new-web-endpoint-into-your-existing-app)
> * [UserIn Forms](#userin-forms)
> * [How To](#how-to)
> 	- [How To Create An App In Facebook?](#how-to-create-an-app-in-facebook)
> 	- [How To Create An App In Google?](#how-to-create-an-app-in-google)
> 	- [How To Create An App In LinkedIn?](#how-to-create-an-app-in-linkedin)
> 	- [How To Create An App In GitHub?](#how-to-create-an-app-in-github)
> * [Theory & Concepts](#-theory--concepts)
> 	- [Identity Provider](#identity-provider)
> 	- [What UserIn Does & Does Not](#what-userin-does--does-not)
>	- [The UserIn Auth Workflow](#the-userin-auth-workflow)
>	- [Redirect URI](#redirect-uri)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)

# Getting Started
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

## 3. Create & Configure the `userinrc.json`

Add the `userinrc.json` in the root folder. Use the App ID and the App secret collected in the previous step. Here is an example:

```js
{
	"userPortal": {
		"api": "http://localhost:3500/user/in",
		"key": "EhZVzt1r9POWyV99Y3D3029k3tnkTApG6xInATpj"
	},
	"schemes": {
		"facebook": {
			"appId": 1234567891011121314,
			"appSecret": "abcdefghijklmnopqrstuvwxyz"
		},
		"google": {
			"appId": 987654321,
			"appSecret": "zfcwfceefeqfrceffre"
		}
	},
	"onSuccess": {
		"redirectUrl": "http://localhost:3500/success"
	},
	"onError": {
		"redirectUrl": "http://localhost:3500/error"
	}
}
```

Where:

| Property 					| Description |
|---------------------------|-------------|
| `userPortal.api` 			| HTTP POST endpoint. Expect to receive a `user` object. Creating this web endpoint is the App Engineer's responsibility. [http://localhost:3500/user/in](http://localhost:3500/user/in) is an example used in this tutorial to link this step with the next one. |
| `userPortal.key`			| Optional, but highly recommended. This key allows to secure the communication between `userIn` and the `userPortal.api`. When specified, a header named `x-api-key` is passed during the HTTP POST. The App Engineer should only allow POST requests if that header is set with the correct value, or return a 403. |
| `schemes.facebook` 		| This object represents the Identity Provider. It contains two properties: `appId` and `appSecret`. All IdPs follow the same schema. Currently supported IdPs: `facebook`, `google`, `linkedin` and `github`. |
| `onSuccess.redirectUrl` 	| Required URL used to redirect the user once he/she is successfully authenticated. [http://localhost:3500/success](http://localhost:3500/success) is an example used in this tutorial to link this step with the next one. |
| `onError.redirectUrl` 	| Required URL used to redirect the user if an error occured during the authentication process. [http://localhost:3500/error](http://localhost:3500/error) is an example used in this tutorial to link this step with the next one.|

> WARNING: Neither `onSuccess.redirectUrl` nor `onError.redirectUrl` are the redirect URLs that must be specified during the IdP configuration in the step 2. Please refer to step 2 to properly configure the redirect URL for each IdP. 

## 4. Add a new web endpoint into your existing App

This step can be implemented however you want using any technology you feel comfortable with as long as the technology you're using allows to create web APIs.

Based on what is configured in the previous step, the minimum requirement is to engineer a web endpoint such as:
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

```js
const { app } = require('@neap/funky')
const Encryption = require('jwt-pwd')
const { apiKeyHandler, bearerHandler, jwt } = new Encryption({ jwtSecret: '5NJqs6z4fMxvVK2IOTaePyGCPWvhL9MMX/o7nk2/9Ko/5jYuX+hUdfkmIzVAj6awtWk=' })

const _userStore = []

const _getUser = (id, strategy) => _userStore.find(u => u && u.id == id && u.strategy ==  strategy)

// userPortal.api => http://localhost:3500/user/in
app.post('/user/in', apiKeyHandler({ key:'x-api-key', value:'EhZVzt1r9POWyV99Y3D3029k3tnkTApG6xInATpj' }), (req,res) => {
	const { user } = req.params || {}
	const { id, strategy, email } = user || {}
	const u = _getUser(id, strategy)
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
			var code = (window.location.hash || '').replace('#','').split('=')[1]
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

The web endpoint hosted at `http://localhost:3500/user/in` is the one used in the previous section to define the property `userPortal.api` in the `userinrc.json`. Notice that the `apiKeyHandler` restricts access to requests containing the correct API key value in the `x-api-key` header. This API key value is also the same as the one defined in the previous section for property `userPortal.key` in the `userinrc.json`.

As for the web endpoint hosted at `http://localhost:3500/success`, this is the one used in the previous section to define the property `onSuccess.redirectUrl` in the `userinrc.json`. 

The workflow is clearer now. _UserIn_ authorizes the usage of an IdP to provide identity details (_pseudo authentication_). When those details have been successfully acquired, _UserIn_ POSTs them (the payload must be as follow `{ "user": Object }`) to your 3rd party web endpoint `http://localhost:3500/user/in`, which in turns decides whether to create a new user or get an existing one. The response from the `http://localhost:3500/user/in` is a JSON payload similar to `{ "code": "some_value" }`. Finally, _UserIn_ redirects the client to `http://localhost:3500/success#code=some_value`. In the example above the `success` endpoint returns HTML containing a script which proceed to an AJAX request to the `sensitive/data` endpoint, passing an Bearer token to the Authorization header.

To test this code, configure one IdP (let's say facebook) in __*UserIn*__ and configure it as explained in [3. Create & Configure the `userinrc.json`](#3-create--configure-the-userinrcjson). Once properly configured, run the project with:

```
npm start
```

This will host __*UserIn*__ on port 3000. 

Create another npm project and paste the code above in an `index.js`, then run:

```
node index.js
```

This will host the test API on port 3500.

To test the connection between those 2 systems, open your browser and browse to [http://localhost:3000/facebook/oauth2](http://localhost:3000/facebook/oauth2). A successfull test should display a web page

# UserIn Forms

__*UserIn Forms*__ are web forms typically built in HTML, CSS and Javacript that uses the __*UserIn*__ REST APIs. 

More documentation coming soon.

# How To
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
	3. Create or configure the `userinrc.json` file under the `userin` root folder as follow:

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
5. After completing the step above, a confirmation screen pops up. Copy the __*client ID*__ (i.e., the App ID) and the __*client secret*__ (i.e., the App Secret). Create or configure the `userinrc.json` file under the `userin` root folder as follow:

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
4. Once the the App is created, you are redirected to the App's page. In that page, select the __*Auth*__ tab and copy the __*Client ID*__ (i.e., the App ID) and the __*Client secret*__ (i.e., the App Secret). Create or configure the `userinrc.json` file under the `userin` root folder as follow:

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

4. Once the the App is created, you are redirected to the App's page. In that page, copy the __*Client ID*__ (i.e., the App ID) and the __*Client secret*__ (i.e., the App Secret). Create or configure the `userinrc.json` file under the `userin` root folder as follow:

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

This can be done by adding one or many of the following supported scheme in the `userinrc.json`:
- __*default*__
- __*facebook*__
- __*google*__
- __*linkedin*__
- __*github*__

where _default_ represent the standard username/password authentication method.

Configuring an authentication portal that supports both Facebook and the default username/password would require a `userinrc.json` file similar to the following:

```js
{
	"schemes": {
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
__*UserIn*__ ships with a utility that generates API keys. In your terminal, browse to the _UserIn_ root folder, and run the following command:

```
npm run key
```

> You're free to generate your API using any method you want. The command above is provided to users for convenience.

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
Upon successful reception of that `code`, __*UserIn*__ redirects the user to the configured `onSuccess.redirectUrl` (which is typically the App). The `code` acquired through the App middleware in the previous step is included in the `redirectUrl` as a search parameters (e.g., [https://example.com/success#code=123456789](https://example.com/success#code=123456789)). A similar behavior occurs in case of failure. The redirect URL is determined by the `onError.redirectUrl` parameter. Details about the error are passed in the query string (e.g., [https://example.com/error?error_msg=something_bad_happened&code=500](https://example.com/error?error_msg=something_bad_happened&code=500)).

#### 5. Authenticating/Authorizing Access To The App (Outside of UserIn's Scope!)
Though the user seems to be in the App now, no authentication and authorization to access the app have been performed yet. Indeed, __*UserIn*__ has just skipped the pre-screening queue (no need to provide explicit user details and password) but the user still needs to show an ID to enter the party. That ID is contained in the search parameter of the current URI (that's the `code` parameter acquired in the previous step). In this step, the App Engineer is required to extract that code from the URI and use it to authenticate and authroize the user. This step can be done in any way the App Engineer wishes to. 

#### Conclusion
As you can see, the __*UserIn*__'s scope does not cover securing your App's API. This job is left to you. __*UserIn*__'s scope stops after the user is either created in your system or successfully authenticated and has landed on the `onSuccess.redirectUrl`. Using the `code` in that redirect URL, you're free to secure your App however you want.

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



