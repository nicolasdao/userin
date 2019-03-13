const urlHelp = require('./url')
const { obj:{ merge } } = require('./core')

const getCallbackUrl = (req, pathname) => urlHelp.buildUrl({ 
	protocol: req.secure ? 'https:' : 'http:', 
	host: req.headers.host, 
	pathname
})

const formatError = (onError, message) => merge(onError || {}, { error: message })

module.exports = {
	getCallbackUrl,
	formatError
}