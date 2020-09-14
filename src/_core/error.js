
class InvalidRequestError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'invalid_request'
	}
}

class UnsupportedGrantTypeError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'unsupported_grant_type'
	}
}

class InvalidGrantError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'invalid_grant'
	}
}

class InvalidScopeError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'invalid_scope'
	}
}

class InvalidClaimError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'invalid_claim'
	}
}

class UnauthorizedClientError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'unauthorized_client'
	}
}

class InvalidClientError extends Error {
	constructor(message) {
		super(message)
		this.code = 401
		this.category = 'invalid_client'
	}
}

class InternalServerError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.category = 'internal_server_error'
	}
}

class InvalidTokenError extends Error {
	constructor(message) {
		super(message)
		this.code = 403
		this.category = 'invalid_token'
	}
}

module.exports = {
	InvalidRequestError,
	UnsupportedGrantTypeError,
	InvalidGrantError,
	InvalidScopeError,
	InvalidClaimError,
	UnauthorizedClientError,
	InvalidClientError,
	InternalServerError,
	InvalidTokenError
}