const path = require('path')
const { co } = require('core-async')
const template = require('simple-template-utils')

/**
 * Returns an HTML page that allows interaction with the OAuth2 endpoints. 
 *
 * @param  {String} endpoints.openidconfiguration_endpoint
 * @param  {String} endpoints.browse_endpoint
 * @param  {String} endpoints.browse_redirect_endpoint
 * @param  {String} endpoints.token_endpoint
 * @param  {String} endpoints.userinfo_endpoint
 * @param  {String} endpoints.introspection_endpoint
 * @param  {String} endpoints.authorization_facebook_endpoint
 * @param  {String} endpoints.authorization_google_endpoint
 * @param  {String} endpoints.authorization_github_endpoint
 * @param  {String} endpoints.authorization_linkedin_endpoint
 * 
 * @param  {String} options.state
 * @param  {String} options.code
 * @param  {String} options.access_token
 * @param  {String} options.id_token
 * @param  {String} options.nonce
 * @param  {String} options.error
 * @param  {String} options.error_description
 * 
 * @return {String} html
 */
const getBrowseHtml = (endpoints, oidcEndpoints) => co(function *() {
	endpoints = endpoints || {}
	const { token_endpoint, browse_endpoint, browse_redirect_endpoint, userinfo_endpoint, introspection_endpoint, openidconfiguration_endpoint } = endpoints

	const defaultRedirectUrl = browse_redirect_endpoint || browse_endpoint || null

	const authorizationEndpoints = Object.keys(endpoints).reduce((acc, endpoint) => {
		const strategy = (endpoint.match(/authorization_(.*?)_endpoint/) || [])[1]
		if (strategy && endpoints[endpoint] && endpoints[endpoint])
			acc.push({ strategy, url:endpoints[endpoint], defaultRedirectUrl })
		return acc
	}, [])

	const authorizationEndpointsHtml = yield authorizationEndpoints.map(data => {
		return template.compile({
			template: path.join(__dirname, '../_page/authorizationSection.html'),
			data
		})
	})

	return yield template.compile({
		template: path.join(__dirname, '../_page/browse.html'),
		data: {
			openidConfigurationEndpoint: openidconfiguration_endpoint,
			tokenEndpoint: token_endpoint,
			userInfoEndpoint: userinfo_endpoint,
			introspectionEndpoint: introspection_endpoint,
			authorizationEndpointsHtml: authorizationEndpointsHtml.join('\n'),
			openidConfiguration: JSON.stringify(oidcEndpoints, null, '  ')
		}
	})
})

const getBrowseRedirectHtml = async browseEndpointUrl => {
	return await template.compile({
		template: path.join(__dirname, '../_page/browseRedirect.html'),
		data: {
			browseEndpointUrl
		}
	})
}


module.exports = {
	getBrowseHtml,
	getBrowseRedirectHtml
}



