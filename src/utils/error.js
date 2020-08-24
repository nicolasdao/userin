/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { validate } = require('./core')

const throwError = (message, extraData) => {
	extraData = extraData || {}
	if (!extraData || typeof(extraData) != 'object' || Object.keys(extraData).length == 0)
		throw new Error(message || '')

	let e = new Error(message || '')
	Object.assign(e, extraData)
	throw e
}

const throwIfInvalidEmail = (email, valueName, extraData) => {
	if (!validate.email(email))
		throwError(`Invalid email${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return email
}

const throwIfInvalidURL = (url, valueName, extraData) => {
	if (!validate.url(url))
		throwError(`Invalid URL${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return url
}

const throwIfUndefined = (value, valueName, extraData) => {
	if (value === undefined)
		throwError(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return value
}

const throwIfNotTruthy = (value, valueName, extraData) => {
	if (!value)
		throwError(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return value
}

const throwIfNotNumber = (value, valueName, extraData) => {
	const t = typeof(value)
	if (t != 'number' || isNaN(value))
		throwError(`Wrong argument exception. ${valueName ? ` '${valueName}'` : 'The value'} must be a number (current: ${t}).`, extraData)
	return value
}

// e.g., throwIfWrongValue(type, 'type', ['YEAR', 'MONTH'])
const throwIfWrongValue = (value, valueName, validValues, extraData) => {
	if (!value)
		throwError('Failed to test value against a list of valid value. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a list of valid value. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a list of valid value. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!validValues)
		throwError('Failed to test value against a list of valid value. Missing third required argument \'validValues\'.', extraData)

	const valid = Array.isArray(validValues) ? validValues.some(v => v == value) : value == validValues
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. Valid values are ${validValues} (current: ${value}).`, extraData)
}

const throwIfNoMatch = (value, valueName, regex, extraData) => {
	if (!value)
		throwError('Failed to test value against a regex. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a regex. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a regex. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!regex)
		throwError('Failed to test value against a regex. Missing third required argument \'regex\'.', extraData)
	if (!(regex instanceof RegExp))
		throwError('Failed to test value against a regex. Third required argument \'regex\' is not a RegExp.', extraData)

	const valid = regex.test(value)
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. It does not match regex ${regex}.`, extraData)
}

// e.g., throwIfGreaterThan(startDate, endDate, 'startDate', 'endDate')
const throwIfGreaterThan = (value1, value2, valueName1, valueName2, extraData) => {
	if (!value1)
		throwError('Failed to compare value1 with value2. No value1 was passed.', extraData)
	if (!value2)
		throwError('Failed to compare value1 with value2. No value2 was passed.', extraData)

	const valid = value1 <= value2
	if (valid)
		return [value1, value2]
	else {
		if (valueName1 && valueName2)
			throwError(`'${valueName1}' must be smaller or equal to '${valueName2}' (current: ${value1}(${valueName1}) > ${value2}(${valueName2})).`, extraData)
		else
			throwError(`'value1' must be smaller or equal to 'value2' (current: ${value1}(value1) > ${value2}(value2)).`, extraData)
	}
}

// e.g., throwIfNotBetween(age, 'age', [18, 65])
const throwIfNotBetween = (value, valueName, validValues, extraData) => {
	if (!value)
		throwError('Failed to test value against a list of valid value. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a list of valid value. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a list of valid value. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!validValues)
		throwError('Failed to test value against a list of valid value. Missing third required argument \'validValues\'.', extraData)
	if (validValues.length != 2)
		throwError('Failed to test value against a list of valid value. 3rd argument \'validValues\' must be an array with 2 values.', extraData)
	if (validValues[0] > validValues[1])
		throwError('Failed to test value against a list of valid value. 1st element of the \'validValues\' array must be smaller or equal to the 2nd element.', extraData)

	const valid = validValues[0] <= value && value <= validValues[1]
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. ${value} is not between ${validValues[0]} and ${validValues[1]}`, extraData)
}

const _formatErrors = err => {
	if (err && err.errors && err.errors[0]) {
		const errors = [err, ...err.errors]
		err.errors = null
		return [errors, null]
	} else
		return [[err],null]
}

/**
 * Makes sure that a promise marshall the error instead of failing.  How to use it:
 * 		const myAsyncFunction = () => catchErrors((async () => {
 * 			const [errors, data] = await otherAsyncFunc()
 * 			if (errors) 
 *				throw wrapErrors(`Boom! it broke for XYZ...`, errors)
 *
 *			return data
 * 		})())
 * 
 * @param  {Promise|Function}	promise 
 * @return {Error}				result[0]	Potential error. Null means no error
 * @return {Object}				result[1]	Result
 */
const catchErrors = exec => {
	if (!exec)
		try {
			throw new Error('Missing required argument \'exec\'.')
		} catch (err) {
			return _formatErrors(err)
		} 

	if (exec.then && typeof(exec.then) == 'function')
		return exec
			.then(data => ([null,data]))
			.catch(_formatErrors)

	const t = typeof(exec)
	if (t == 'function') {
		try {
			const data = exec()
			return [null, data]
		} catch (err) {
			return _formatErrors(err)
		}
	}

	try {
		throw new Error(`Invalid argument exception. Function 'catchErrors' expects a single argument of type 'Function' or 'Promise'. Found '${t}' instead.`)
	} catch (err) {
		return _formatErrors(err)
	}
}

/**
 * Create a new error that wraps others. How to use it:
 * 		const myAsyncFunction = () => catchErrors((async () => {
 * 			const [errors, data] = await otherAsyncFunc()
 * 			if (errors) 
 *				throw wrapErrors(`Boom! it broke for XYZ...`, errors)
 *
 *			return data
 * 		})())
 * 
 * @param  {String}		msg				Error message.
 * @param  {Array}		errors			Previous errors.
 * @param  {Boolean}	options.merge	Default false. If true, all the errors details are merge into a the body of the new error.
 * 
 * @return {Error}		error
 */
const wrapErrors = (msg, errors, options) => {
	errors = errors || []
	if (options && options.merge) {
		const erroMsg = [{ stack:msg }, ...errors].map(e => e.stack).join('\n')
		return new Error(erroMsg)
	} else {
		const error = new Error(msg)
		error.errors = errors
		return error
	}
}

class HttpError extends Error {
	constructor(message, code) {
		super(message)
		this.code = code || 500
	}
}

module.exports = {
	throwError,
	throwIfUndefined,
	throwIfNotTruthy,
	throwIfNotNumber,
	throwIfWrongValue,
	throwIfNoMatch,
	throwIfGreaterThan,
	throwIfNotBetween,
	throwIfInvalidURL,
	throwIfInvalidEmail,
	catchErrors,
	wrapErrors,
	HttpError
}

