/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const url = require('url')
const path = require('path')

/**
 * [description]
 * @param  {String} querystring [description]
 * @return {Object}             [description]
 */
const _breakdownQuery = querystring => {
	if (!querystring)
		return {}

	return querystring.replace(/^\?/,'').split('&').reduce((acc,keyValue) => {
		if (keyValue) {
			const [key,...values] = keyValue.split('=')
			const value = decodeURIComponent(values.join('='))
			acc[key] = value
		}
		return acc
	}, {})
}

/**
 * [description]
 * @param  {Object} query [description]
 * @return {String}       [description]
 */
const _rebuildQueryString = query => {
	if (!query)
		return ''
	const queryString = Object.keys(query).reduce((acc,key) => {
		if (key) {
			const value = query[key]
			if (value !== null && value !== '' && value !== undefined) {
				const sep = acc === '' ? '?' : '&'
				acc = `${acc}${sep}${key}=${encodeURIComponent(value)}`
			}
		}
		return acc
	},'')

	return queryString
}

/**
 * Breaks down a URI
 *
 * @param  {String}  uri    				e.g., 'https://neap.co/tech/blog/index.html?article=serverless&source=medium#conclusion'
 * @param  {Boolean} option.ignoreFailure 	[description]
 * 
 * @return {String}  results.protocol       e.g., 'https:'
 * @return {String}  results.host       	e.g., 'neap.co'
 * @return {String}  results.origin      	e.g., 'https://neap.co'
 * @return {String}  results.pathname       e.g., '/tech/blog/index.html'
 * @return {String}  results.querystring    e.g., '?article=serverless&source=medium'
 * @return {Object}  results.query    		e.g., { article: 'serverless', source: 'medium' }
 * @return {String}  results.hash       	e.g., '#conclusion'
 * @return {String}  results.uri       		e.g., 'https://neap.co/tech/blog/index.html?article=serverless&source=medium#conclusion'
 * @return {String}  results.shorturi      	e.g., 'https://neap.co/tech/blog/index.html'
 * @return {String}  results.pathnameonly   e.g., '/tech/blog'
 * @return {String}  results.contentType    e.g., 'text/html'
 */
const getUrlInfo = (uri, option={}) => {
	if (uri) {
		let u = uri.trim()
		if (u.trim().indexOf('//') == 0)
			u = `http:${uri}`
		else if (!u.match(/^http:/) && !u.match(/^https:/))
			u = `http://${u.replace(/^\//,'')}`

		try {
			const { host, protocol, origin, pathname, search:querystring, hash } = new url.URL(u)
			let ext
			try {
				ext = (pathname ? path.extname(pathname) : '') || ''
			}
			/*eslint-disable */
			catch(err) {
				/*eslint-enable */
				ext = ''
			}
			const pathnameonly = path.posix.extname(pathname) ? path.posix.dirname(pathname) : pathname
			const contentType = getContentType(ext)
			const query = _breakdownQuery(querystring)
			return { host, protocol, origin, pathname, querystring, query, hash, ext: ext, uri, shorturi: joinUrlParts(origin, pathname).replace(/\/$/, '') , pathnameonly, contentType }
		}
		catch(err) {
			if (option.ignoreFailure)
				return { host: null, protocol: null, origin: null, pathname: null, querystring: null, query: null, hash: null, ext: null, uri, shorturi: uri, pathnameonly: null, contentType: null }
			else
				return {}
		}
	}
	else
		return {}
}

/**
 * Creates a string URI based on a URI info object (usually coming from the 'getUrlInfo' method above)
 * 
 * @param  {String} uriInfo.protocol		e.g., 'http:'
 * @param  {String} uriInfo.host			e.g., 'neap.co' This overrides the 'origin' property
 * @param  {String} uriInfo.origin			e.g., 'http://neap.co' This will be ignored if a 'host' property is defined
 * @param  {String} uriInfo.pathname		e.g., '/blog/index.html' The extension will be replaced by the 'ext' property if it has been defined
 * @param  {String} uriInfo.querystring		e.g., '?hello=world' 
 * @param  {String} uriInfo.query			e.g., { hello: 'world' }
 * @param  {String} uriInfo.hash			e.g., '#boom'
 * @param  {String} uriInfo.ext				e.g., '.aspx' This overrides the the extension in the 'pathname'
 * 
 * @return {String}         				e.g., 'http://neap.co/blog/index.aspx?hello=world#boom'
 */
const buildUrl = uriInfo => {
	let { protocol, host, origin, pathname, querystring, query, hash, ext } = uriInfo || {}
	if (!host && !origin)
		return ''
	const _origin = !host ? origin : `${protocol || 'http:'}//${host}`
	const { ext:pathnameExt } = pathname ? getUrlInfo(`https://neap.co/${pathname}`)  : { ext:'' }
	let _pathname = pathname
	// if the explicit extension is the same as the one in the pathname, then keep the pathname
	// otherwise, overwrite the pathname extension with the explicit one
	if (_pathname && ext && pathnameExt != ext) {
		const _ext = /^\./.test(ext) ? ext : `.${ext}`
		_pathname = _pathname.replace(/\.[0-9a-zA-Z]*$/, _ext)
	} 
	if (query && Object.keys(query).some(x => x))
		querystring = _rebuildQueryString(query)
	
	return joinUrlParts({ origin: _origin, pathname: _pathname, querystring, hash })
}

const joinUrlParts = (...values) => {
	const v = values.filter(x => x)
	if (!v.some(x => x))
		return ''

	if (typeof(v[0]) == 'object') {
		let { origin, pathname, querystring, hash } = v[0]
		if (origin && pathname) {
			origin = origin.replace(/\/*$/, '')
			pathname = pathname.replace(/^\/*/, '')
		}
		const o = path.posix.join(...[origin, pathname].filter(x => x))
		return `${o}${querystring||''}${hash||''}`.replace(/:\/((?!\/)|\/\/+)/, '://')
	} else 
		return path.posix.join(...v.map(x => /:\/+$/.test(x) ? x : x.replace(/(^\/+|\/+$)/g, ''))).replace(/:\/((?!\/)|\/\/+)/, '://')
}

const isPopularWebPageExt = ext => 
	!ext ||
	ext == '.asp' ||
	ext == '.aspx' ||
	ext == '.axd' ||
	ext == '.asx' ||
	ext == '.asmx' ||
	ext == '.ashx' ||
	ext == '.yaws' ||
	ext == '.html' ||
	ext == '.htm' ||
	ext == '.xhtml' ||
	ext == '.jhtml' ||
	ext == '.jsp' ||
	ext == '.jspx' ||
	ext == '.pl' ||
	ext == '.php' ||
	ext == '.php4' ||
	ext == '.php3' ||
	ext == '.phtml' ||
	ext == '.py' ||
	ext == '.rb' ||
	ext == '.rhtml' ||
	ext == '.shtml'

const isPopularImgExt = ext => 
	ext == '.ai' ||
	ext == '.bmp' ||
	ext == '.gif' ||
	ext == '.ico' ||
	ext == '.jpeg' ||
	ext == '.jpg' ||
	ext == '.png' ||
	ext == '.ps' ||
	ext == '.psd' ||
	ext == '.svg' ||
	ext == '.tif' ||
	ext == '.tiff' ||
	ext == '.webp'

const isPopularFontExt = ext => 
	ext == '.eot' ||
	ext == '.woff2' ||
	ext == '.woff' ||
	ext == '.ttf' ||
	ext == '.otf'

const makePageHtml = uri => {
	if (!uri)
		return 'index.html'
	const { origin, pathname, querystring, hash, ext } = getUrlInfo(uri)
	const u = `${origin}${pathname}`.replace(/\/*$/, '')
	if (!ext)
		return `${u}/index.html${querystring || ''}${hash || ''}`
	else if (!ext || ext == '.html' || ext == '.htm')
		return uri 
	else
		return `${origin}${pathname.split('.').slice(0,-1).join('.')}.html${querystring || ''}${hash || ''}`

}

const _supportedContentType = {
	// web pages
	'.asp': 'text/html',
	'.aspx': 'text/html',
	'.axd': 'text/html',
	'.asx': 'text/html',
	'.asmx': 'text/html',
	'.ashx': 'text/html',
	'.yaws': 'text/html',
	'.html': 'text/html',
	'.htm': 'text/html',
	'.xhtml': 'text/html',
	'.jhtml': 'text/html',
	'.jsp': 'text/html',
	'.jspx': 'text/html',
	'.pl': 'text/html',
	'.php': 'text/html',
	'.php4': 'text/html',
	'.php3': 'text/html',
	'.phtml': 'text/html',
	'.py': 'text/html',
	'.rb': 'text/html',
	'.rhtml': 'text/html',
	'.shtml': 'text/html',
	// web files
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.xml': 'application/xhtml+xml',
	'.rss': 'application/rss+xml',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.ppt': 'application/vnd.ms-powerpoint',
	'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'.csv': 'text/csv',
	// images
	'.ai': 'application/postscript',
	'.bmp': 'image/bmp',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.ps': 'application/postscript',
	'.psd': 'application/octet-stream',
	'.svg': 'image/svg+xml',
	'.tif': 'image/tiff',
	'.tiff': 'image/tiff',
	'.webp': 'image/webp',
	// font
	'.eot': 'application/vnd.ms-fontobject',
	'.woff2': 'font/woff2',
	'.woff': 'application/font-woff',
	'.ttf': 'application/font-sfnt',
	'.otf': 'application/font-sfnt',
	// text
	'.txt': 'text/plain',
	'.md': 'text/plain'
}
const getContentType = (ext) => {
	if (!ext)
		return 'application/octet-stream'

	const contentType = _supportedContentType[ext.toLowerCase()]	
	return contentType || 'application/octet-stream'
}

/**
 * Makes a URI ready to be 'regexified'. Example: const uriRegEx = new RegExp(regexReadyUri(uri), 'g')
 * 
 * @param  {String} uri [description]
 * @return {String}     [description]
 */
const regexReadyUri = uri => (uri || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

module.exports = {
	getInfo: getUrlInfo,
	join: joinUrlParts,
	makeHtml: makePageHtml,
	buildUrl,
	regexReadyUri,
	ext:{
		isPage: isPopularWebPageExt,
		isImg: isPopularImgExt,
		isFont: isPopularFontExt,
		getContentType
	}
}
