const { error: { catchErrors } } = require('puffy')
const { InvalidScopeError, UnauthorizedClientError, InvalidClaimError, InvalidTokenError, InternalServerError, InvalidClientError, InvalidRequestError } = require('./error')

const RESPONSE_TYPES = ['code', 'id_token', 'token']

/**
 * Converts a URL encoded string into an array of strings. 
 * 
 * @param  {String}		thing		
 * 
 * @return {[String]}	things
 */
const thingToThings = thing => {
	const things = (thing ? decodeURIComponent(thing).split(' ') : []).reduce((acc,s) => {
		if (s)
			acc.push(...s.split('+').filter(x => x))
		return acc
	}, [])

	return things
}

const thingsToThing = things => (things || []).filter(x => x).join(' ')

const parseToOIDCClaims = ({ iss, client_id, user_id, audiences, scopes, extra={} }) => {
	return {
		iss,
		sub: user_id||null,
		aud: thingsToThing(audiences),
		client_id,
		scope: thingsToThing(scopes),
		...extra
	}
}

const verifyScopes = ({ scopes=[], serviceAccountScopes=[] }) => catchErrors(() => {
	const scopesWithoutOpenId = scopes.filter(s => s != 'openid')
	if (scopesWithoutOpenId.length) {
		const invalidScopes = scopesWithoutOpenId.filter(s => serviceAccountScopes.indexOf(s) < 0)
		const l = invalidScopes.length
		if (l)
			throw new InvalidScopeError(`Access to scope${l > 1 ? 's' : ''} ${invalidScopes.join(', ')} is not allowed.`)
	}
})

const verifyAudiences = ({ audiences=[], serviceAccountAudiences=[] }) => catchErrors(() => {
	if (audiences.length) {
		const invalidAudiences = audiences.filter(s => serviceAccountAudiences.indexOf(s) < 0)
		const l = invalidAudiences.length
		if (l)
			throw new UnauthorizedClientError(`Access to audience${l > 1 ? 's' : ''} ${invalidAudiences.join(', ')} is not allowed.`)
	}
})

const areClaimsExpired = claims => catchErrors(() => {
	if (!claims || !claims.exp || isNaN(claims.exp*1))
		throw new InvalidClaimError('Claim is missing required \'exp\' field')

	const exp = claims.exp*1000
	if (Date.now() > exp)
		throw new InvalidTokenError('Token or code has expired')
})

const verifyClientIds = ({ client_id, user_id, user_client_ids=[] }) => catchErrors(() => {
	if (!user_client_ids.length)
		throw new InternalServerError(`Corrupted data. Failed to associate client_ids with user_id ${user_id}.`)
	
	if (!user_client_ids.some(id => id == client_id))
		throw new InvalidClientError('Invalid client_id')
})

/**
 * Decodes the the OAuth2 response_type into an array of respnse types. 
 * 
 * @param  {String}		responseType	e.g., 'code+id_token'
 * @return {[String]}   responseTypes	e.g., ['code', 'id_token']
 */
const responseTypeToTypes = responseType => catchErrors(() => {
	const errorMsg = 'Invalid \'response_type\''
	if (!responseType) 
		throw new InvalidRequestError(`${errorMsg}. 'response_type' is required.`)


	const responseTypes = thingToThings(responseType, {  })
	if (!responseTypes.length)
		throw new InvalidRequestError(`${errorMsg}. No value found in 'response_type'.`)

	const invalidTypes = responseTypes.filter(t => !RESPONSE_TYPES.some(x => x == t))
	if (invalidTypes.length)
		throw new InvalidRequestError(`${errorMsg}. The value '${responseType}' is not a supported OIDC 'response_type'.`)

	return responseTypes
})

const objectToBase64 = obj => Buffer.from(JSON.stringify(obj||{})).toString('base64')
const base64ToObject = str64 => catchErrors(() => {
	try {
		return JSON.parse(Buffer.from(str64||'', 'base64').toString())
	} catch(err) {
		throw new InvalidRequestError(`Failed to decode 'state' query parameter (value: ${str64})`)
	}
})

module.exports = {
	convert: {
		thingToThings,
		thingsToThing,
		toOIDCClaims: parseToOIDCClaims,
		responseTypeToTypes,
		objectToBase64,
		base64ToObject
	},
	verify: {
		scopes: verifyScopes,
		audiences: verifyAudiences,
		claimsExpired: areClaimsExpired,
		clientId: verifyClientIds
	}
}