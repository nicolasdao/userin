/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { app } = require('@neap/funky')
const { obj: { merge } } = require('./src/utils')
const { facebook, google, linkedin, github } = require('./src')
const { schemes, onSuccess, onError, userPortalAPI, apiKey } = require('./userinrc.json')

const facebookOAuth = facebook.setUp(merge({ 
	scopes:['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.facebook))

const googleOAuth = google.setUp(merge({ 
	scopes:['profile', 'email'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.google))

const linkedinOAuth = linkedin.setUp(merge({ 
	scopes:['r_basicprofile', 'r_emailaddress'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.linkedin))

const githubOAuth = github.setUp(merge({ 
	scopes:['r_basicprofile', 'r_emailaddress'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.github))

app.get('/alive', (req,res) => res.status(200).send('\'userIn\' is alive'))

// curl -X GET http://localhost:3000/facebook/oauth2
app.get(facebookOAuth.pathname, facebookOAuth.authRequest)
app.get(facebookOAuth.callbackPathname, facebookOAuth.authResponse)

// curl -X GET http://localhost:3000/google/oauth2
app.get(googleOAuth.pathname, googleOAuth.authRequest)
app.get(googleOAuth.callbackPathname, googleOAuth.authResponse)

// curl -X GET http://localhost:3000/linkedin/oauth2
app.get(linkedinOAuth.pathname, linkedinOAuth.authRequest)
app.get(linkedinOAuth.callbackPathname, linkedinOAuth.authResponse)

// curl -X GET http://localhost:3000/github/oauth2
app.get(githubOAuth.pathname, githubOAuth.authRequest)
app.get(githubOAuth.callbackPathname, githubOAuth.authResponse)

eval(app.listen('app', process.env.PORT || 3000))




