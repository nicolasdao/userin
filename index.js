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
const { schemes, redirectUrls, userPortal, CORS } = require('./.userinrc.json')

const corsAccess = cors({
	allowedHeaders: (CORS || {}).allowedHeaders || ['Authorization', 'Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
	origins: (CORS || {}).origins || ['*']
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
		if (scheme == 'default') {
			app.options([oauth.pathname, `${oauth.pathname}/:successRedirectUrl/:errorRedirectUrl`], corsAccess)
			app.post([oauth.pathname, `${oauth.pathname}/:successRedirectUrl/:errorRedirectUrl`], oauth.authRequest)
		} else {
			app.options([oauth.pathname, `${oauth.pathname}/:successRedirectUrl/:errorRedirectUrl`], corsAccess)
			app.get([oauth.pathname, `${oauth.pathname}/:successRedirectUrl/:errorRedirectUrl`], oauth.authRequest)
			app.options([oauth.callbackPathname, `${oauth.callbackPathname}/:successRedirectUrl/:errorRedirectUrl`], corsAccess)
			app.get([oauth.callbackPathname, `${oauth.callbackPathname}/:successRedirectUrl/:errorRedirectUrl`], oauth.authResponse)
		}
	}
})

app.get('/alive', (req,res) => res.status(200).send('\'userIn\' is alive'))
app.get('/oauth2/schemes', (req,res) => res.status(200).send(SUPPORTED_SCHEMES))

eval(app.listen(process.env.PORT || 3000))




