const { USER_STORE, USER_TO_CLIENT_STORE, USER_TO_FIP_STORE, CLIENT_STORE, REFRESH_TOKEN_STORE } = require('./stub')

module.exports = {
	user: USER_STORE,
	userToClient: USER_TO_CLIENT_STORE,
	userToFip: USER_TO_FIP_STORE,
	client:CLIENT_STORE,
	refreshToken: REFRESH_TOKEN_STORE
}