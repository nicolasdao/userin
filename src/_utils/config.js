const { url } = require('puffy')

const prefixPathname = (config={}, pathname='/') => {
	const { prefix, version } = config
	return url.getInfo(url.buildUrl({ origin:'https://example.com', pathname:`${prefix||''}/${version||''}/${pathname}` })).pathname
}

module.exports = {
	prefixPathname
}