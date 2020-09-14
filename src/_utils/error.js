// https://developer.okta.com/docs/reference/error-codes/#example-errors-for-openid-connect-and-social-login

const invalid_request = [400, 'invalid_request']
invalid_request.code = invalid_request[0]
invalid_request.text = invalid_request[1]

const unsupported_grant_type = [400, 'unsupported_grant_type']
unsupported_grant_type.code = unsupported_grant_type[0]
unsupported_grant_type.text = unsupported_grant_type[1]

const invalid_grant = [400, 'invalid_grant']
invalid_grant.code = invalid_grant[0]
invalid_grant.text = invalid_grant[1]

const invalid_scope = [400, 'invalid_scope']
invalid_scope.code = invalid_scope[0]
invalid_scope.text = invalid_scope[1]

const invalid_claim = [400, 'invalid_claim']
invalid_claim.code = invalid_claim[0]
invalid_claim.text = invalid_claim[1]

const unauthorized_client = [400, 'unauthorized_client']
unauthorized_client.code = unauthorized_client[0]
unauthorized_client.text = unauthorized_client[1]

const invalid_client = [401, 'invalid_client']
invalid_client.code = invalid_client[0]
invalid_client.text = invalid_client[1]

const internal_server_error = [500, 'internal_server_error']
internal_server_error.code = internal_server_error[0]
internal_server_error.text = internal_server_error[1]

const invalid_token = [401, 'invalid_token']
invalid_token.code = invalid_token[0]
invalid_token.text = invalid_token[1]

/**
 * Converts an array of errors into an HTTP OAuth2 error 
 * 
 * @param  {[Error]}	errors
 * 
 * @return {Number}		output.status
 * @return {String}		output.data.error
 * @return {String}		output.data.error_description
 */
const formatOauth2Error = errors => {
	if (errors && Array.isArray(errors) && errors.length) {
		let { code, category, message } = errors.find(e => e && e.code && e.category && e.message) || {}
		if (code)
			return { 
				status: code, 
				data: { 
					error: category, 
					error_description:message 
				} 
			}
		else
			return { 
				status: internal_server_error.code, 
				data: { 
					error: internal_server_error.text, 
					error_description: errors.slice(0,2).map(e => e.message).join(' - ')
				} 
			}
	} else
		return { 
			status: internal_server_error.code, 
			data: { 
				error: internal_server_error.text, 
				error_description:'Unknown error' 
			} 
		}
}

class InvalidRequestError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_request.code
		this.category = invalid_request.text
	}
}

class UnsupportedGrantTypeError extends Error {
	constructor(message) {
		super(message)
		this.code = unsupported_grant_type.code
		this.category = unsupported_grant_type.text
	}
}

class InvalidGrantError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_grant.code
		this.category = invalid_grant.text
	}
}

class InvalidScopeError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_scope.code
		this.category = invalid_scope.text
	}
}

class InvalidClaimError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_claim.code
		this.category = invalid_claim.text
	}
}

class UnauthorizedClientError extends Error {
	constructor(message) {
		super(message)
		this.code = unauthorized_client.code
		this.category = unauthorized_client.text
	}
}

class InvalidClientError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_client.code
		this.category = invalid_client.text
	}
}

class InternalServerError extends Error {
	constructor(message) {
		super(message)
		this.code = internal_server_error.code
		this.category = internal_server_error.text
	}
}

class InvalidTokenError extends Error {
	constructor(message) {
		super(message)
		this.code = invalid_token.code
		this.category = invalid_token.text
	}
}

module.exports = {
	formatOauth2Error,
	// https://developer.okta.com/docs/reference/error-codes/#example-errors-for-openid-connect-and-social-login
	errorCode: {
		invalid_request,
		unsupported_grant_type,
		invalid_grant,
		invalid_scope,
		unauthorized_client,
		invalid_client,
		internal_server_error,
		invalid_token
	},
	InvalidRequestError,
	UnsupportedGrantTypeError,
	InvalidGrantError,
	InvalidScopeError,
	InvalidClaimError,
	UnauthorizedClientError,
	InvalidClientError,
	InternalServerError,
	InvalidTokenError,
}