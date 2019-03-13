/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { app } = require('@neap/funky')
const { obj: { merge } } = require('./src/utils')
const { facebook, google } = require('./src')
const { schemes, onSuccess, onError, userPortalAPI, apiKey } = require('./userinrc.json')

const facebookOAuth = facebook.setUp(merge({ 
	scopes:['id', 'displayName', 'photos', 'email', 'first_name', 'middle_name', 'last_name'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.facebook))

const googleOAuth = google.setUp(merge({ 
	scopes:['email', 'profile'],
	onSuccess,
	onError,
	userPortalAPI, 
	apiKey
}, schemes.google))

app.get('/alive', (req,res) => res.status(200).send('\'userIn\' is alive'))

// curl -X GET http://localhost:3000/facebook/oauth2
app.get(facebookOAuth.pathname, facebookOAuth.authRequest)
app.get(facebookOAuth.callbackPathname, facebookOAuth.authResponse)

// curl -X GET http://localhost:3000/google/oauth2
app.get(googleOAuth.pathname, googleOAuth.authRequest)
app.get(googleOAuth.callbackPathname, googleOAuth.authResponse)

eval(app.listen('app', process.env.PORT || 3000))




