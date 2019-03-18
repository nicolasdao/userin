/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { app } = require('@neap/funky')
const { obj: { merge } } = require('./src/utils')
const authMethods = require('./src')
const { schemes, onSuccess, onError, userPortal } = require('./userinrc.json')

const throwMissing = ([prop, propName]) => {
	if (!prop) throw new Error(`Missing required '${propName}' property in the userinrc.json`)
}

const requiredConfigs = [[schemes, 'schemes'], [onSuccess, 'onSuccess'], [onError, 'onError'], [onSuccess.redirectUrl, 'onSuccess.redirectUrl'], [onError.redirectUrl, 'onError.redirectUrl']]
requiredConfigs.forEach(throwMissing)

const SUPPORTED_SCHEMES = Object.keys(schemes)

Object.keys(schemes).forEach(scheme => {
	const authMethod = authMethods[scheme]
	if (authMethod) {
		const oauth = authMethod.setUp(merge({ 
			scopes:authMethod.scopes,
			onSuccess,
			onError,
			userPortal
		}, schemes[scheme]))

		// Create endpoints. To test, use: curl -X GET http://localhost:3000/<scheme>/oauth2
		app.get(oauth.pathname, oauth.authRequest)
		app.get(oauth.callbackPathname, oauth.authResponse)
	}
})

app.get('/alive', (req,res) => res.status(200).send('\'userIn\' is alive'))
app.get('/oauth2/schemes', (req,res) => res.status(200).send(SUPPORTED_SCHEMES))

eval(app.listen(process.env.PORT || 3000))




