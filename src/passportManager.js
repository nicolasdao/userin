const passport = require('passport')
const { error: { catchErrors } } = require('puffy')

const DUMMY_CALLBACK_URL = 'https://example.com'

/**
 * Adds a new Passport Strategy. 
 * 
 * @param  {Strategy}	Strategy		
 * @param  {Object}		eventHandlerStore	
 * @param  {String}		config.clientID				
 * @param  {String}		config.clientSecret				
 * @param  {String}		config.callbackURL				
 * @param  {String}		config.profileFields				
 * 
 * @return {[Error]}	output[0]
 * @return {String}		output[1].name
 * @return {[String]}	output[1].scopes
 */
const install = (Strategy, eventHandlerStore, config={}) => catchErrors(() => {
	const errorMsg = 'Failed to register new Passport Strategy'
	
	if (!eventHandlerStore)
		throw new Error(`${errorMsg}. Missing required 'eventHandlerStore'.`)

	let passportStrategy
	try {
		passportStrategy = (new Strategy({ clientID:1, clientSecret:456, callbackURL:DUMMY_CALLBACK_URL, scopes:['profile'] }, () => null).name || '').toLowerCase()
	} catch(err) {
		throw new Error(`${errorMsg}. Failed to initialize the Passport's Strategy with dummy values to get the Strategy's name.`)
	}

	if (!passportStrategy)
		throw new Error(`${errorMsg}. Invalid Passport Strategy. Valid Strategy must have a 'name'.`)

	const strategyPrefix = passportStrategy.replace(/[^a-zA-Z]/g,'').toUpperCase()
	const clientID = config.clientID || process.env[`${strategyPrefix}_CLIENT_ID`]
	const clientSecret = config.clientSecret || process.env[`${strategyPrefix}_CLIENT_SECRET`]
	const profileFields = config.profileFields || (process.env[`${strategyPrefix}_PROFILE_FIELDS`] || '').split(/\s+/)
	const scopes = config.scopes || (process.env[`${strategyPrefix}_SCOPES`] || '').split(/\s+/)

	if (!clientID)
		throw new Error(`${errorMsg}. Missing required 'clientID' for ${passportStrategy} strategy. This value must either be explicitly specified or configured via the '${strategyPrefix}_CLIENT_ID' environment variable.`)
	if (!clientSecret)
		throw new Error(`${errorMsg}. Missing required 'clientSecret' for ${passportStrategy} strategy. This value must either be explicitly specified or configured via the '${strategyPrefix}_CLIENT_SECRET' environment variable.`)

	const passportConfig = {
		clientID,
		clientSecret,
		callbackURL:DUMMY_CALLBACK_URL,
		profileFields,
		scopes
	}

	passport.use(new Strategy(passportConfig, (accessToken, refreshToken, profile={}, next) => {
		const user = { ...profile, accessToken, refreshToken }
		next(null, user)
	}))

	return {
		name: passportStrategy,
		scopes
	}
})

module.exports = {
	install
}



