const jwt = require('jsonwebtoken')

const KEY = 'supersecret'

const createToken = delay => claims => {
	claims = claims || {}
	const exp = Math.floor(Date.now()/1000) + delay
	return {
		token: jwt.sign({ ...claims, exp }, KEY),
		expires_in: delay	
	} 
}

const createValid = claims => {
	claims = claims || {}
	const expires_in = (claims.exp||0) - Math.floor(Date.now()/1000)

	return {
		token: jwt.sign(claims, KEY),
		expires_in: expires_in < 0 ? 0 : expires_in
	}
}

const decryptToken = token => jwt.decode(token)

const areClaimsExpired = claims => {
	if (!claims || !claims.exp || isNaN(claims.exp*1))
		return true

	const exp = claims.exp*1000
	return Date.now() > exp
}

module.exports = {
	createValid,
	createExpired: createToken(-3600),
	decrypt: decryptToken,
	claims: {
		expired: areClaimsExpired
	}
}