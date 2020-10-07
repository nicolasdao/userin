const { url: { getInfo, buildUrl } } = require('puffy')

/**
 * Creates a Postman url object. 
 * 
 * @param  {String} 	pathname			e.g., '/hello/world?name=yep#query'
 * @param  {Object} 	queryParams			e.g., { name:'Nic' } or { name: { value:'Nic', disabled:true, description: 'First name' } }
 * 
 * @return {String}		urlObj.raw			e.g., '{{base_url}}/hello/world?name=yep#query'
 * @return {[String]}	urlObj.host			e.g., ['example', 'com']
 * @return {[String]}	urlObj.path			e.g., ['hello', 'world']
 * @return {[Object]}	urlObj.query		e.g., [{ key:'name', value:'yep' }]
 * @return {String}		urlObj.hash			e.g., 'query'
 */
const getUrlObj = (pathname, queryParams={}) => {
	const info = getInfo(buildUrl({ origin:'{{base_url}}', pathname }))
	const queryArgs = Object.keys(queryParams).reduce((acc,key) => {
		const val = queryParams[key]
		const t = typeof(val)
		if (t == 'object') {
			const noEscape = /^{{(.*?)}}$/.test(val.value||'')
			acc[key] = { ...val, noEscape } 
		} else if (t == 'string')
			acc[key] = { noEscape:/^{{(.*?)}}$/.test(val), value:val }
		
		return acc
	}, {})
	const query = { ...(info.query||{}), ...queryArgs }
	const raw = buildUrl({ ...info, query }).replace(/^http[s]{0,1}:\/\//,'')
	const urlObj = {
		raw,
		host: info.host.split('.')
	}

	if (info.pathname) 
		urlObj.path = info.pathname.split('/').filter(x => x)
	if (query && Object.keys(query).length) 
		urlObj.query = Object.keys(query).map(key => {
			const value = query[key]
			if (value === null || value === undefined || value === '')
				return

			const t = typeof(value)
			if (t == 'string')
				return { key, value:encodeURIComponent(value) }
			else if (t == 'object') {
				const { noEscape, value:v, disabled, description } = value
				return { key, disabled, description, value: noEscape ? v : encodeURIComponent(typeof(v) == 'string' ? v : `${v}`) }
			} else
				return { key, value }
		}).filter(x => x)
	if (info.hash)
		urlObj.hash = info.hash.replace('#','')

	return urlObj
}

module.exports = {
	getUrlObj
}