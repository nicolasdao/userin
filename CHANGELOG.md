# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.16.0](https://github.com/nicolasdao/userin/compare/v1.15.0...v1.16.0) (2020-10-13)

## [1.15.0](https://github.com/nicolasdao/userin/compare/v1.14.0...v1.15.0) (2020-10-13)


### Features

* Add support for the '/authorize' endpoint ([4d22aed](https://github.com/nicolasdao/userin/commit/4d22aed16c82e4d2c6829bbe727caae3e66536ca))

## [1.14.0](https://github.com/nicolasdao/userin/compare/v1.13.1...v1.14.0) (2020-10-12)


### Features

* Add support for toggling when the client_secret is required or not based on the client's auth_methods property + add unit tests ([9b17734](https://github.com/nicolasdao/userin/commit/9b17734cc7557809fc51efbacc9b088f83ea1477))

### [1.13.1](https://github.com/nicolasdao/userin/compare/v1.13.0...v1.13.1) (2020-10-10)


### Bug Fixes

* The issuer is not set in the discovery endpoint ([530aafb](https://github.com/nicolasdao/userin/commit/530aafbf9adf24ac6f2ae57243125494ae3d3663))

## [1.13.0](https://github.com/nicolasdao/userin/compare/v1.12.4...v1.13.0) (2020-10-10)

### [1.12.4](https://github.com/nicolasdao/userin/compare/v1.12.3...v1.12.4) (2020-10-07)

### [1.12.3](https://github.com/nicolasdao/userin/compare/v1.12.2...v1.12.3) (2020-10-07)


### Bug Fixes

* Remove file from gitignore ([b42fa00](https://github.com/nicolasdao/userin/commit/b42fa00e63f9e8c1bb37c9b011005e20aa3e01c8))

### [1.12.2](https://github.com/nicolasdao/userin/compare/v1.12.1...v1.12.2) (2020-10-07)


### Bug Fixes

* Build server does not understand file with no extensino ([0a46d61](https://github.com/nicolasdao/userin/commit/0a46d61d83ef402feb7a739a934a666893a34840))

### [1.12.1](https://github.com/nicolasdao/userin/compare/v1.12.0...v1.12.1) (2020-10-07)

## [1.12.0](https://github.com/nicolasdao/userin/compare/v1.11.0...v1.12.0) (2020-10-07)


### Features

* Add support for publishing API doc to Postman ([ef10f68](https://github.com/nicolasdao/userin/commit/ef10f683316b90c6aab371d4bd482631e0b7e68b))

## [1.11.0](https://github.com/nicolasdao/userin/compare/v1.10.0...v1.11.0) (2020-10-06)


### Features

* Add support to export APIs to Postman ([9416972](https://github.com/nicolasdao/userin/commit/941697221dc59be3fdb80243b291c1b18e3fc3ea))

## [1.10.0](https://github.com/nicolasdao/userin/compare/v1.9.0...v1.10.0) (2020-10-03)


### Features

* Add support for registering external OpenID providers using their discovery endpoint only ([7cac6dd](https://github.com/nicolasdao/userin/commit/7cac6dd5b69c682c32dfd510af0664b6e02dc251))

## [1.9.0](https://github.com/nicolasdao/userin/compare/v1.8.0...v1.9.0) (2020-10-02)


### Features

* Add support for revoking refresh_token ([9eccd27](https://github.com/nicolasdao/userin/commit/9eccd2778e703d3c192b442f86d125d65048eac0))

## [1.8.0](https://github.com/nicolasdao/userin/compare/v1.7.0...v1.8.0) (2020-10-01)


### Features

* Add support for preventing invalid redirect_uri in the authorization_code grant type flow ([eee8d8a](https://github.com/nicolasdao/userin/commit/eee8d8afdb3177f592f99178512ab033e03ba65a))

## [1.7.0](https://github.com/nicolasdao/userin/compare/v1.6.0...v1.7.0) (2020-09-30)


### Features

* Add support for jwks_uri in the discovery endpoint ([c06db94](https://github.com/nicolasdao/userin/commit/c06db940209eacf395b2d08ee0392d3e17da58a4))


### Bug Fixes

* The PKCE flow is invalid. It should require a valid 'code_challenge_method' ([b7cdcb2](https://github.com/nicolasdao/userin/commit/b7cdcb2e88faccd5a5e30b32adbca967bd1c8691))

## [1.6.0](https://github.com/nicolasdao/userin/compare/v1.5.3...v1.6.0) (2020-09-23)


### Features

* Add support for PKCE and nonce ([5f6223b](https://github.com/nicolasdao/userin/commit/5f6223bbadf31e94df2e994fc99f1275620bb416))

### [1.5.3](https://github.com/nicolasdao/userin/compare/v1.5.2...v1.5.3) (2020-09-21)


### Features

* Add support for outputing the raw result of a test ([0634fc9](https://github.com/nicolasdao/userin/commit/0634fc98651a9e5030ca65eaa394a5021b870c18))

### [1.5.2](https://github.com/nicolasdao/userin/compare/v1.5.1...v1.5.2) (2020-09-21)


### Features

* Add support for testing custom password for new user creation ([c97f2d9](https://github.com/nicolasdao/userin/commit/c97f2d9a46589d608ae1c900ef7d35d21cbacd9e))

### [1.5.1](https://github.com/nicolasdao/userin/compare/v1.5.0...v1.5.1) (2020-09-21)


### Bug Fixes

* The incorrect username password message is not being caught in a deterministic way ([ed0bb6b](https://github.com/nicolasdao/userin/commit/ed0bb6b70dd788daba68962844081e499268f6a1))

## [1.5.0](https://github.com/nicolasdao/userin/compare/v1.4.0...v1.5.0) (2020-09-21)


### Features

* Add support for dependency injestion for all event handlers so they are more easily testable ([298bbb3](https://github.com/nicolasdao/userin/commit/298bbb3fac8d78db0a7854de7a64f43a0e9e0a3e))

## [1.4.0](https://github.com/nicolasdao/userin/compare/v1.3.1...v1.4.0) (2020-09-20)

### [1.3.1](https://github.com/nicolasdao/userin/compare/v1.3.0...v1.3.1) (2020-09-20)


### Features

* Add better separation of concerns between the three different modes: loginsignup, loginsignupfip and openid ([320effa](https://github.com/nicolasdao/userin/commit/320effa6043d86bc27ccaf2f078744b8958afe5b))
* Break down the generate_token and get_token_claims into seperate method for each token type + add unit tests + add support for new create_fip_user event ([5a8b040](https://github.com/nicolasdao/userin/commit/5a8b04016b4951c603513f3235bc9e4234833b95))

## [1.3.0](https://github.com/nicolasdao/userin/compare/v1.2.0...v1.3.0) (2020-09-16)


### Features

* Add test suite to help unit test custom strategies ([73b6a7b](https://github.com/nicolasdao/userin/commit/73b6a7bc75998203e51b4950071443f2f1cdf399))

## [1.2.0](https://github.com/nicolasdao/userin/compare/v1.1.0...v1.2.0) (2020-09-15)


### Bug Fixes

* Linting issue ([0a6727b](https://github.com/nicolasdao/userin/commit/0a6727b8088e4a46a70ffc94bc0ee39df6759f63))

## [1.1.0](https://github.com/nicolasdao/userin/compare/v1.0.2...v1.1.0) (2020-09-15)


### Features

* Add support for configuring the token expiry time ([59dc5c2](https://github.com/nicolasdao/userin/commit/59dc5c2653867879e1f4de3a0b0dd9f2532d94ef))

### [1.0.2](https://github.com/nicolasdao/userin/compare/v1.0.1...v1.0.2) (2020-09-14)

### [1.0.1](https://github.com/nicolasdao/userin-core/compare/v1.0.0...v1.0.1) (2020-09-14)

## [1.0.0](https://github.com/nicolasdao/userin-core/compare/v0.1.3...v1.0.0) (2020-09-14)


### Features

* Add support for environment variables and scopes configuration for each IdP ([76ab6f1](https://github.com/nicolasdao/userin-core/commit/76ab6f17638b7794168a2aceaeff5b1bd04b0916))
* Full major redesign. ([6716a52](https://github.com/nicolasdao/userin-core/commit/6716a5219a2a1703747a820fb07006012a5dd083))


### Bug Fixes

* vulnerability ([0ad55a4](https://github.com/nicolasdao/userin-core/commit/0ad55a42b532207de5cd5378e1e5cc3395883f31))
* Vulnerability + force using HTTPS on calback URLs ([517683c](https://github.com/nicolasdao/userin-core/commit/517683c7d7c3b8f935b9eba5c685b9723e0bd66f))
* Vulnerability issues related to standard-version ([710a358](https://github.com/nicolasdao/userin-core/commit/710a358fbd53256929e84c0830503d47cff73412))
