
# What Is UserIn

UserIn is an Open Source middleware REST API built in NodeJS with Express. UserIn let's App engineers to implement custom login/register feature using Identity Providers (IdPs) such as Facebook, Google, Github.  

The reason for this project was to stop relying on SaaS such as Auth0, Firebase Authentication, AWS Cognito which require by default to store the App's users in their own data store. UserIn assumes that software engineers are comfortable to build CRUD REST APIs to store and manage users (e.g., GET users by ID, POST create new users) and securing those APIs with an API key. This design means that the responsibility of storing user's data are in the software engineers' hands while the boilerplate to exchange OAuth messages between all parties is abstracted behing UserIn. 

UserIn main goal is to be simple. UserIn does not do analytics, or support gazillions of scenarios. It also assumes that the App is secured using a JWT token.

# What App Engineers Must Still Do Manually
## 1. Create an App In The IdP

## 2. Configuring The UserIn Middleware With The IdP Secrets

## 3. Generate a UserIn API Key To Communicate Safely With The App System

## 4. Add a Few REST APIs In Their App To Communicate With The UserIn Middleware

# Theory & Concepts
## The Basics
### Identity Provider

In the broad sense of the term, an identity provider (IdP) is an entity that can issue a referral stating that a user is indeed the owner of an identity piece (e.g., email address). The most well known IdPs are Facebook, Google and Github.

### OAuth is an _Authorization Protocol_ NOT an _Authentication Protocol_

Contrary to [OpenID](https://en.wikipedia.org/wiki/OpenID) which is a pure authentication protocol, OAuth's main purpose is to authorize 3rd parties to be granted limited access to APIs. When an App offers its user to register using his/her Facebook or Google account, that does not mean the user proves his/her identity through Facebook or Google. Instead, that means that the user grants that App limited access to his/her Facebook or Google account. However, as of today (2019), gaining limiting access to an Identity Provider's API is considered _good enough_ to prove one's identity. That's what is referred to as a __*pseudo authentication*__ method. This project aims at facilitating the implementation of such _pseudo authentication_ method.

### OAuth Generates IdP OAuth Token NOT App Tokens

Contrary to what a lot of people believe, OAuth is not used to login users to Apps. Instead, it represents a shortcut to capture user's details so that THE APP CAN GENERATE ITS OWN AUTH TOKEN. Yes, you read correctly. OAuth does not magically absolve the app to perform any authentication and authorization processing. The app still has to:
1. Generate its own token (whatever this token is).
2. Validate that token for each request.

Those two steps have nothing to do with OAuth, and no secured apps are free from implementing them in one way or the other. So why do we need OAuth then? There are two main reasons:
1. Users usually hate to create a new username and memorize passwords. Instead of asking them to do so, we can ask an IdP the user is already connected to to send details about him/her and use those details to create a new account or let them access the app without entering a password. 
2. The app may need to access certain IdP's APIs. In which case, the app will need an OAuth token issued by the IdP.

## Workflow To Use OAuth To Help Users To Login 

Regardless of the IdP (e.g., Facebook. Google, Github), the _pseudo authentication_ workflow is the same:
1. Use OAuth to delegate identity verification to an IdP. This identity is relative to the IdP. That means that OAuth should return an IdP ID which uniquely identify that user for that specific IdP (e.g., Facebook ID, Google ID, ...). This ID can then be stored in your own user database when the user is created for the first time. For a user using Facebook as an IdP, next time that user logs in to the app using Facebook, that Facebook ID will be used to retrieve the app user's details.
2. Create a new security token based on the App's user details. This step is post OAuth and has nothing to do with OAuth. At this stage, either the user is new and details have been collected, or the user is an existing one and his details have been retrieved from the App's database using the IdP ID. Using those credentials, the App is responsible to create a new token using any method. 

Authenticating and authorizing users to an App require the 2 steps above. The first one uses OAuth, and the second one uses an arbitrary method based on what the App engineers want to accomplish. 

This project aims at automating the first OAuth step, and facilitating the second.

Regardless of the IdP (e.g., Facebook. Google, Github), the _pseudo authentication_ workflow is the same:
1. Click _login with <IdP>_
	1. This step redirect the App to the IdP specific page for deal with authorization requests.
	2. If the user is already logged in to the IdP, the IdP redirects to the App's redirect URL (more about this later). If the user is not logged in, then he/she must log in. Upon successful login, the IdP redirects to the App's redirect URL. In both cases, the IdP passes mutliple pieces of data to the App's redirect URL:
		1. An IdP token (OAuth token) that can be used to access the IdP's API.
		2. A token expiry date that defines when the OAuth token expires.
		3. A renewal token that can be used to renew the Oauth token after it has expired.
		4. Claims regarding the current IdP's user (e.g., email, first name, last name, ...). The type of claims depend on the type of access the App is requesting in the first place. More details about this in section 

2. Receive IdP authorization confirmation with user's data.
3. Create a new account or let the user in:
	1. Now the user's data have been collected,

## App OAuth Setups Prerequisites

Before an App can request 

# How To
## How To Add a Authentication Method?

This can be done by adding one or many of the following supported scheme in the `userinrc.json`:
- __*default*__
- __*facebook*__
- __*google*__
- __*github*__

where _default_ represent the standard username/password authentication method.

Configuring an authentication portal that supports both Facebook and the default username/password would require a `userinrc.json` file similar to the following:

```js
{
	"schemes": [
		"default",
		"facebook"
	]
}
```