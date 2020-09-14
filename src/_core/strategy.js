
const SUPPORTED_EVENTS = [
	'generate_token', 
	'get_identity_claims', 
	'get_end_user', 
	'get_fip_user', 
	'get_service_account',
	'get_token_claims'
]

class Strategy {
	constructor() {

	}
}

const verifyStrategy = strategy => {
	if (!strategy)
		throw new Error('strategy is not defined')
	const t = typeof(strategy)
	if (t != 'object')
		throw new Error(`strategy is expected to be an object, found ${t} instead`)
	if (!(strategy instanceof Strategy)) 
		throw new Error('strategy is not an instance of Strategy. strategy must inherit from a Strategy created from rhe userin-core package.')
	if (!strategy.name)
		throw new Error('strategy is missing its required \'name\' property')

	SUPPORTED_EVENTS.forEach(eventName => {
		if (!strategy[eventName])
			throw new Error(`strategy is missing its '${eventName}' event handler implementation`)
		const tf = typeof(strategy[eventName])
		if (tf != 'function')
			throw new Error(`strategy's '${eventName}' event handler is not a function. Found ${tf} instead.`)
	})
}

module.exports = {
	Strategy, 
	verifyStrategy,
	SUPPORTED_EVENTS
}


