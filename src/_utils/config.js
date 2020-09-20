const { url } = require('puffy')

const prefixPathname = prefix => (version, pathname='/') => {
	return url.getInfo(url.buildUrl({ origin:'https://example.com', pathname:`${prefix||''}/${version||''}/${pathname}` })).pathname
}

module.exports = {
	prefixPathname
}