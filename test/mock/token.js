const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const KEY = 'supersecret'

const createToken = delay => claims => {
	claims = claims || {}
	const exp = Math.floor(Date.now()/1000) + delay
	return jwt.sign({ ...claims, exp, _key:crypto.randomBytes(10).toString('base64') }, KEY)
}

const createValid = claims => {
	claims = claims || {}
	return jwt.sign({ ...claims, _key:crypto.randomBytes(10).toString('base64') }, KEY)
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