/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { app, cors } = require('@neap/funky')
const { obj: { merge } } = require('./src/utils')
const authMethods = require('./src')
const { schemes, redirectUrls, userPortal, CORS, devPort } = require('./.userinrc.json')

const CORSconfig = CORS || {}

const corsAccess = cors({
	methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
	allowedHeaders: CORSconfig.allowedHeaders || ['Authorization', 'Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
	origins: CORSconfig.origins || ['*']
})
app.use(corsAccess)

const throwMissing = ([prop, propName]) => {
	if (!prop) throw new Error(`Missing required '${propName}' property in the .userinrc.json`)
}

const requiredConfigs = [[schemes, 'schemes']]
requiredConfigs.forEach(throwMissing)

const SUPPORTED_SCHEMES = Object.keys(schemes)

Object.keys(schemes).forEach(scheme => {
	const authMethod = authMethods[scheme]
	if (authMethod) {
		const oauth = authMethod.setUp(merge({ 
			scopes:authMethod.scopes,
			redirectUrls,
			userPortal
		}, scheme == 'default' ? {} : schemes[scheme]))

		// Create endpoints. To test, use: curl -X GET http://localhost:3000/<scheme>/oauth2
		// NOTE: We've added 2 endpoints for both the auth request and the auth callback request. The 1st is the default, while the 2nd
		// 		 allows the client to explicitly determine the success URI and the error URI
		const authEndpoints = [oauth.pathname, `${oauth.pathname}/:successRedirectUrl/:errorRedirectUrl`]
		const authCallbackEndpoints = [oauth.callbackPathname, `${oauth.callbackPathname}/:successRedirectUrl/:errorRedirectUrl`]
		if (scheme == 'default') {
			app.options(authEndpoints, corsAccess)
			app.post(authEndpoints, oauth.authRequest)
		} else {
			app.get(authEndpoints, oauth.authRequest)
			app.get(authCallbackEndpoints, oauth.authResponse)
		}
	}
})

app.get('/alive', (req,res) => res.status(200).send('\'userIn\' is alive'))
app.get('/oauth2/schemes', (req,res) => res.status(200).send(SUPPORTED_SCHEMES))

eval(app.listen(process.env.PORT || devPort || 3000))




