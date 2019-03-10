/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const throwIfUndefined = (value, valueName) => {
	if (value === undefined)
		throw new Error(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`)
	return value
}

const throwIfNotTruthy = (value, valueName) => {
	if (!value)
		throw new Error(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`)
	return value
}

const throwIfNotNumber = (value, valueName) => {
	const t = typeof(value)
	if (t != 'number')
		throw new Error(`Wrong argument exception. ${valueName ? ` '${valueName}'` : 'The value'} must be a number (current: ${t}).`)
	return value
}

// e.g., throwIfWrongValue(type, 'type', ['YEAR', 'MONTH'])
const throwIfWrongValue = (value, valueName, validValues) => {
	if (!value)
		throw new Error('Failed to test value against a list of valid value. No value was passed.')
	if (!valueName)
		throw new Error('Failed to test value against a list of valid value. Missing second argument \'valueName\'.')
	if (typeof(valueName) != 'string')
		throw new Error('Failed to test value against a list of valid value. Wrong argument exception. The second argument \'valueName\' must be a string.')
	if (!validValues)
		throw new Error('Failed to test value against a list of valid value. Missing third required argument \'validValues\'.')

	const valid = Array.isArray(validValues) ? validValues.some(v => v == value) : value == validValues
	if (valid)
		return value
	else
		throw new Error(`Value for variable '${valueName}' is invalid. Valid values are ${validValues} (current: ${value}).`)
}

const throwIfNoMatch = (value, valueName, regex) => {
	if (!value)
		throw new Error('Failed to test value against a regex. No value was passed.')
	if (!valueName)
		throw new Error('Failed to test value against a regex. Missing second argument \'valueName\'.')
	if (typeof(valueName) != 'string')
		throw new Error('Failed to test value against a regex. Wrong argument exception. The second argument \'valueName\' must be a string.')
	if (!regex)
		throw new Error('Failed to test value against a regex. Missing third required argument \'regex\'.')
	if (!(regex instanceof RegExp))
		throw new Error('Failed to test value against a regex. Third required argument \'regex\' is not a RegExp.')

	const valid = regex.test(value)
	if (valid)
		return value
	else
		throw new Error(`Value for variable '${valueName}' is invalid. It does not match regex ${regex}.`)
}

// e.g., throwIfGreaterThan(startDate, endDate, 'startDate', 'endDate')
const throwIfGreaterThan = (value1, value2, valueName1, valueName2) => {
	if (!value1)
		throw new Error('Failed to compare value1 with value2. No value1 was passed.')
	if (!value2)
		throw new Error('Failed to compare value1 with value2. No value2 was passed.')

	const valid = value1 <= value2
	if (valid)
		return [value1, value2]
	else {
		if (valueName1 && valueName2)
			throw new Error(`'${valueName1}' must be smaller or equal to '${valueName2}' (current: ${value1}(${valueName1}) > ${value2}(${valueName2})).`)
		else
			throw new Error(`'value1' must be smaller or equal to 'value2' (current: ${value1}(value1) > ${value2}(value2)).`)
	}
}

module.exports = {
	throwIfUndefined,
	throwIfNotTruthy,
	throwIfNotNumber,
	throwIfWrongValue,
	throwIfNoMatch,
	throwIfGreaterThan
}

