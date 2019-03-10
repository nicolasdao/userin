/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const shortid = require('shortid')

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START COLLECTION                           ////////////////////////////////

/**
 * Breaks down an array in a collection of array of size 'batchSize'.
 * 
 * @param  {Array}  col       Initial collection (e.g. [1,2,3,4,5])
 * @param  {Number} batchSize Size of each batch (e.g. 2)
 * @return {Array}           collection of array of size 'batchSize' (e.g. [[1,2], [3,4], [5]]).
 */
const batch = (col, batchSize=1) => {
	const l = (col || []).length-1
	return l < 0 ? [] : col.reduce((acc,item,idx) => {
		acc.current.value.push(item)
		acc.current.size++
		if (acc.current.size == batchSize || idx == l) {
			acc.result.push(acc.current.value)
			acc.current = { value:[], size:0 }
		}
		return acc
	},{ result:[], current: { value:[], size:0 } }).result
}

/**
 * Breaks down an array into an array with 2 items:
 * 	[0]: Head of size 'headSize' (default 'headSize' is 1)
 * 	[1]: The rest of the items
 * 	
 * @param  {Array}   a        	Original array
 * @param  {Number} headSize 	Default 1
 * @return {Array}           	Array of length 2
 */
const headTail = (a, headSize=1) => (a || []).reduce((acc, v, idx) => {
	idx < headSize ? acc[0].push(v) : acc[1].push(v)
	return acc
}, [[],[]])


const uniq = (a, fn) => {
	fn = fn || (x => x)
	return Object.keys((a || []).reduce((acc,x) => {
		const v = fn(x)
		if (!acc[v])
			acc[v] = true
		return acc
	}, {}))
}

const _objectSortBy = (obj, fn = x => x, dir='asc') => Object.keys(obj || {})
	.map(key => ({ key, value: obj[key] }))
	.sort((a,b) => {
		const vA = fn(a.value)
		const vB = fn(b.value)
		if (dir == 'asc') {
			if (vA < vB)
				return -1
			else if (vA > vB)
				return 1
			else
				return 0
		} else {
			if (vA > vB)
				return -1
			else if (vA < vB)
				return 1
			else
				return 0
		}
	}).reduce((acc,v) => {
		acc[v.key] = v.value
		return acc
	}, {})

const _arraySortBy = (arr, fn = x => x, dir='asc') => (arr || []).sort((a,b) => {
	const vA = fn(a)
	const vB = fn(b)
	if (dir == 'asc') {
		if (vA < vB)
			return -1
		else if (vA > vB)
			return 1
		else
			return 0
	} else {
		if (vA > vB)
			return -1
		else if (vA < vB)
			return 1
		else
			return 0
	}
})

const sortBy = (obj, fn = x => x, dir='asc') => Array.isArray(obj) ? _arraySortBy(obj, fn, dir) : _objectSortBy(obj, fn, dir)
const newSeed = (size=0) => Array.apply(null, Array(size))

const mergeCollection = (...collections) => {
	if (collections.length == 0)
		return []

	const lengths = collections.filter(col => col && col.length).map(col => col.length)
	if (lengths.length == 0)
		return collections
	
	const maxLength = Math.max(...collections.filter(col => col && col.length).map(col => col.length))

	return collections.map(col => {
		const l = (col || []).length
		if (l == 0) {
			return newSeed(maxLength)
		}
		if (l == maxLength)
			return col 

		const diff = maxLength - l
		return [...col, ...newSeed(diff)]
	})
}

//////////////////////////                           END COLLECTION                             ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START CONVERTER                           	////////////////////////////////

/**
 * Convert snake case to camel case
 * @param  {String} s 	e.g., "hello_world"
 * @return {String}   	e.g., "helloWorld"
 */
const s2cCase = s => (s || '').replace(/\s/g, '').toLowerCase().split(/(?=_.{1})/g).reduce((result, part) => result + (result ? (part.slice(1,2).toUpperCase() + part.slice(2)) : part), '')

/**
 * Convert camel case to snake case
 * @param  {String} s 	e.g., "helloWorld"
 * @return {String}   	e.g., "hello_world"
 */
const c2sCase = s => (s || '').replace(/\s/g, '').split(/(?=[A-Z]{1})/g).map(x => x.toLowerCase()).join('_')

// Transforms { helloWorld: 'Nic' } to { hello_world: 'Nic' }
const objectC2Scase = obj => {
	if (!obj || typeof(obj) != 'object') 
		return obj 

	return Object.keys(obj).reduce((acc, key) => {
		const v = obj[key]
		const p = c2sCase(key)
		if (v && typeof(v) == 'object') {
			if (Array.isArray(v))
				acc[p] = v.map(x => objectC2Scase(x))
			else
				acc[p] = objectC2Scase(v)
		} else
			acc[p] = v 
		return acc
	}, {})
}

// Transforms { hello_world: 'Nic' } to { helloWorld: 'Nic' }
const objectS2Ccase = obj => {
	if (!obj || typeof(obj) != 'object') 
		return obj 

	return Object.keys(obj).reduce((acc, key) => {
		const v = obj[key]
		const p = s2cCase(key)
		if (v && typeof(v) == 'object') {
			if (Array.isArray(v))
				acc[p] = v.map(x => objectS2Ccase(x))
			else
				acc[p] = objectS2Ccase(v)
		} else
			acc[p] = v 
		return acc
	}, {})
}

const _supportedEncoding = { 'hex': true, 'utf8': true, 'base64': true, 'ascii': true, 'buffer': true }
// Examples: 
//	encoder('Hello').to('buffer')
//	encoder('Hello').to('base64')
//	encoder('SGVsbG8=', { type:'base64' }).to('utf8')
//	encoder(buffer).to('utf8')
const encoder = (obj, options) => {
	let { type } = options || {}
	type = type || 'utf8'
	const o = obj || ''
	const isString = typeof(o) == 'string'
	const isBuffer = o instanceof Buffer
	if (!isString && !isBuffer)
		throw new Error(`Wrong argument exception. The 'encoder' method only accept input of type 'string' or 'Buffer' (current: ${typeof(o)})`)
	if (!_supportedEncoding[type])
		throw new Error(`Wrong argument exception. The 'encoder' method only accept the following encoding types: 'hex', 'utf8', 'base64', 'buffer' and 'ascii' (current: ${type})`)
	return {
		to: encoding => {
			encoding = encoding || 'utf8'
			if (!_supportedEncoding[encoding])
				throw new Error(`Wrong argument exception. The 'encoder.to' method only accept the following encoding types: 'hex', 'utf8', 'base64', 'buffer' and 'ascii' (current: ${encoding})`)

			if (isString) {
				if (encoding == 'buffer')
					return o ? Buffer.from(o, type) : new Buffer(0)
				else
					return Buffer.from(o, type).toString(encoding)
			}
			else if (encoding == 'buffer')
				return o 
			else
				return o.toString(encoding)
		}
	}
}

//////////////////////////                           END CONVERTER	                            ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START LOG              	               ////////////////////////////////

const _log = ({ transId, parentId, operationId, name, payload, type }) => {
	const args = [{ type: type, name, transId, parentId, operationId, payload, created: new Date().toISOString() }]
	if (process.env.NODE_ENV == 'dev') {
		args.push(null)
		args.push(' ')
	}
	console.log(JSON.stringify(...args))
	return newId()
}

const logTransaction = ({ transId, parentId, operationId, name, payload }) => _log({ transId, parentId, operationId, name, payload, type: 'info' })

const logError = ({ transId, parentId, operationId, name, payload }) => _log({ transId, parentId, operationId, name, payload, type: 'error' })

const logMemoryUsage = () => {
	const used = process.memoryUsage()
	console.log()
	console.log('\x1b[36mMEMORY USAGE\x1b[0m')
	console.log('\x1b[36m============\x1b[0m')
	for (let key in used) {
		console.log(`\x1b[36m   ${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB\x1b[0m`)
	}
	console.log()
}

//////////////////////////                           END LOG         		                    ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           END DATETIME HELPER                        ////////////////////////////////

const getDateUtc = (date) => {
	const now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
	return new Date(now_utc)
}

const addZero = nbr => ('0' + nbr).slice(-2)

const getTimestamp = (options={ short:true }) => {
	const d = getDateUtc(new Date())
	const main = `${d.getUTCFullYear()}${addZero(d.getUTCMonth()+1)}${addZero(d.getUTCDate())}`
	if (options.short)
		return main
	else 
		return `${main}-${addZero(d.getUTCHours())}${addZero(d.getUTCMinutes())}${addZero(d.getUTCSeconds())}`
}

const addDaysToDate = (d, v=0) => {
	const t = new Date(d)
	t.setDate(d.getDate() + v)
	return t
}

const addMonthsToDate = (d, v=0) => {
	const t = new Date(d)
	t.setMonth(d.getMonth() + v)
	return t
}

const addYearsToDate = (d, v=0) => {
	const t = new Date(d)
	t.setYear(d.getFullYear() + v)
	return t
}

const addHoursToDate = (d, v=0) => {
	const t = new Date(d)
	t.setHours(d.getHours() + v)
	return t
}

const addMinutesToDate = (d, v=0) => {
	const t = new Date(d)
	t.setMinutes(d.getMinutes() + v)
	return t
}

const addSecondsToDate = (d, v=0) => {
	const t = new Date(d)
	t.setSeconds(d.getSeconds() + v)
	return t
}


const _dateFormatBreakDown = (format='yyyy-mm-dd') => {
	const _format = format.toLowerCase()

	const yyyyIdx = _format.indexOf('yyyy')
	const mmIdx = _format.indexOf('mm')
	const ddIdx = _format.indexOf('dd')
	
	if (yyyyIdx < 0)
		throw new Error(`Invalid argument 'format' ${format}. It is missing the required 'yyyy' placeholder (e.g., 'dd-mm-yyyy')`)
	if (mmIdx < 0)
		throw new Error(`Invalid argument 'format' ${format}. It is missing the required 'mm' placeholder (e.g., 'dd-mm-yyyy')`)
	if (ddIdx < 0)
		throw new Error(`Invalid argument 'format' ${format}. It is missing the required 'dd' placeholder (e.g., 'dd-mm-yyyy')`)

	const breakDown = {
		yyyy: { pos: yyyyIdx < mmIdx && yyyyIdx < ddIdx ? 0 : yyyyIdx < mmIdx || yyyyIdx < ddIdx ? 1 : 2, idx: yyyyIdx },
		mm: { pos: mmIdx < yyyyIdx && mmIdx < ddIdx ? 0 : mmIdx < yyyyIdx || mmIdx < ddIdx ? 1 : 2, idx: mmIdx },
		dd: { pos: ddIdx < mmIdx && ddIdx < yyyyIdx ? 0 : ddIdx < mmIdx || ddIdx < yyyyIdx ? 1 : 2 , idx: ddIdx },
		build: (yyyy, mm, dd) => {
			const y = yyyy * 1
			const m = mm * 1
			const d = dd * 1
			const year = 
				y < 10 ? `000${y}` : 
					y < 100 ? `00${y}` : 
						y < 1000 ? `0${y}` : 
							y > 10000 ? '9999' : `${y}`
			const month = 
				m < 10 ? `0${m}` :
					m > 12 ? '12' : `${m}`
			const day = 
				d < 10 ? `0${d}` :
					d > 31 ? '31' : `${d}`
			
			return _format.replace('yyyy', year).replace('mm', month).replace('dd', day)
		}
	}

	return breakDown
}

/**
 * Convert a date into a specific short date string format
 * 
 * @param  {Date} 	date    		e.g., 2018-11-22T00:00:00.000Z
 * @param  {Object} options.format 	Default 'dd-mm-yyyy'
 * @return {String}         		e.g., 22-11-2018
 */
const convertDateToShortDateString = (date, options={}) => {
	if (!date)
		return null
	if (date instanceof Date) {
		const parts = _dateFormatBreakDown(options.format)
		const [yyyy, mm, dd] = date.toISOString().split('T')[0].split('-')
		return parts.build(yyyy, mm, dd)
	}

	throw new Error('Wrong argument exception. \'date\' is expected to be a Date')
}




/**
 * [description]
 * @param  {String} date    		e.g., 22/11/2018
 * @param  {String} options.format 	e.g., dd/mm/yyyy or dd-mm-yyyy (the separator can be different to the one used in the 'date' input)
 * @return {Date}         			2018-11-22T00:00:00.000Z
 */
const convertShortDateStringToDate = (date, options={}) => {
	if (!date)
		return null
	if (typeof(date) != 'string')
		throw new Error('Wrong argument exception. \'date\' is expected to be a string representing a date similar to \'22/11/2018\'')

	const _date = date.replace(/\s/g, '')
	const separators = uniq(_date.match(/[^0-9]/g) || [], x => x)
	if (separators && separators.length > 1) 
		throw new Error(`Invalid date string format. Multiple separators detected in '${date}'. There should only be one, or none at all.`)
	
	const sep = !separators ? '' : separators[0]
	const parts = _dateFormatBreakDown(options.format)

	if (sep) {
		const values = _date.split(sep).map(x => {
			const n = x*1
			return n < 10 ? `0${n}` : `${n}`
		})
		if (values.some(x => !x))
			throw new Error(`Invalid date string ${date}`)

		const yyyy = values[parts.yyyy.pos]
		const mm = values[parts.mm.pos]
		const dd = values[parts.dd.pos]
		return new Date(`${yyyy}-${mm}-${dd}`)
	} else {
		const yyyy = _date.slice(parts.yyyy.idx, parts.yyyy.idx+4)
		const mm = _date.slice(parts.mm.idx, parts.mm.idx+2)
		const dd = _date.slice(parts.dd.idx, parts.dd.idx+2)
		return new Date(`${yyyy}-${mm}-${dd}`)
	}
}

//////////////////////////                           END DATETIME HELPER                        ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START IDENTITY                             ////////////////////////////////

/**
 * Returns a unique identifier (default length 10)
 * @param  {Boolean} options.short 		Default false. If set to true, the id length will be 5
 * @param  {Boolean} options.long 		Default false. If set to true, the id length will be 20
 * @param  {String}  options.sep 		Default ''. Not valid when options.short is true
 * @param  {Boolean} options.lowerCase 		Default false.
 * @param  {Boolean} options.uriReady 		Default false. When true, this will encode the id so that it can be used into a URI
 * @return {String}         			[description]
 */
const newId = (options={}) => {
	const sep = options.sep || ''
	const getId = options.lowerCase 
		? () => shortid.generate().replace(/-/g, 'r').replace(/_/g, '9').toLowerCase().slice(0,5)
		: () => shortid.generate().replace(/-/g, 'r').replace(/_/g, '9').slice(0,5)

	const id = options.short ? getId() : options.long ? `${getId()}${sep}${getId()}${sep}${getId()}${sep}${getId()}` : `${getId()}${sep}${getId()}`
	return options.uriReady ? encodeURIComponent(id) : id
}

//////////////////////////                           START IDENTITY                             ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                             START MATH                                ///////////////////////////////

/**
 * Calculates the average of a specific field on an array objects
 * 
 * @param  {Array}   	arr 	e.g. [{ name: 'Nic', age: 36 }, { name: 'Boris', age: 30 }]
 * @param  {Function} 	fn  	e.g. x => x.age
 * @return {Number}       		e.g. 33
 */
const avg = (arr=[], fn) => {
	if (arr.length == 0) 
		return null 
	const f = fn || (x => x) 
	return arr.reduce((a,v) => a + f(v), 0)/arr.length
}

/**
 * Calculates the standard deviation of a specific field on an array objects
 * 
 * @param  {Array}   	arr 	e.g. [{ name: 'Nic', age: 36 }, { name: 'Boris', age: 30 }]
 * @param  {Function} 	fn  	e.g. x => x.age
 * @return {Number}       		e.g. 33
 */
const stdDev = (arr=[], fn) => {
	if (arr.length == 0) 
		return null
	const f = fn || (x => x)
	const { result, resultSquare } = arr.reduce((a,v) => {
		const val = f(v)
		return { result: a.result + val, resultSquare: a.resultSquare + Math.pow(val,2) }
	}, { result:0, resultSquare:0 })

	const l = arr.length
	return Math.sqrt((resultSquare/l) - Math.pow((result/l), 2))
}

/**
 * Calculates the median deviation of a specific field on an array objects
 * 
 * @param  {Array}   	arr 	e.g. [{ name: 'Nic', age: 36 }, { name: 'Boris', age: 30 }]
 * @param  {Function} 	fn  	e.g. x => x.age
 * @return {Number}       		e.g. 33
 */
const median = (arr=[], fn) => {
	const f = fn || (x => x)
	const l = arr.length
	if (l == 0)
		return null
	// odd length
	else if (l & 1) 
		return arr.map(x => f(x)).sort((a,b) => a >= b)[Math.floor(l/2)]
	// even length
	else {
		const idx_1 = Math.floor(l/2)
		const idx_0 = idx_1 - 1
		const a = arr.map(x => f(x)).sort((a,b) => a >= b)
		return (a[idx_0] + a[idx_1])/2
	}
}

const getRandomNumber = ({ start, end }) => {
	const endDoesNotExist = end === undefined
	if (start == undefined && endDoesNotExist)
		return Math.random()
	
	const _start = start >= 0 ? Math.round(start) : 0
	const _end = end >= 0 ? Math.round(end) : 0
	const size = endDoesNotExist ? _start : (_end - _start)
	const offset = endDoesNotExist ? 0 : _start
	return offset + Math.floor(Math.random() * size)
}

const getRandomNumbers = ({ start, end, size }) => {
	const _start = start >= 0 ? Math.round(start) : 0
	const _end = end >= 0 ? Math.round(end) : 0
	const _size = _start <= _end ? (_end - _start) : 0
	size = size || 0
	if (size > _size)
		throw new Error(`Wrong argument exception. The interval [${_start}, ${_end}] does not contain enough elements to return ${size} random numbers`)
	
	if (size <= 0 || _size <= 0)
		return [getRandomNumber({ start: _start, end: _end })]

	const _series = newSeed(_size).map((_,idx) => idx)
	return newSeed(size).reduce((acc) => {
		const index = getRandomNumber({ start: 0, end: acc.s })
		acc.data.push(_start + _series[index])
		_series.splice(index,1) // remove that number
		acc.s-- 
		return acc
	}, { data: [], s: _size }).data
}

//////////////////////////                              END MATH                                 ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                         START OBJECT HELPERS                                 ////////////////////////

const mergeObj = (...objs) => objs.reduce((acc, obj) => { //Object.assign(...objs.map(obj => JSON.parse(JSON.stringify(obj))))
	obj = obj || {}
	if (typeof(obj) != 'object' || Array.isArray(obj) || (obj instanceof Date))
		return acc
	
	Object.keys(obj).forEach(property => {
		const val = obj[property]
		const originVal = acc[property]
		const readyToMerge = !originVal || !val || typeof(val) != 'object' || Array.isArray(val) || typeof(originVal) != 'object' || Array.isArray(originVal)
		acc[property] = readyToMerge ? val : mergeObj(originVal, val)	
	})

	return acc
}, {})

const isEmptyObj = obj => {
	if (!obj)
		return true 
	try {
		const o = JSON.stringify(obj)
		return o == '{}'
	} catch(e) {
		return (() => false)(e)
	}
}

const isObj = obj => {
	if (!obj || typeof(obj) != 'object' || Array.isArray(obj) || (obj instanceof Date))
		return false 

	try {
		const o = JSON.stringify(obj) || ''
		return o.match(/^\{(.*?)\}$/)
	} catch(e) {
		return (() => false)(e)
	}
}

const getDiff = (orig={}, current={}) => {
	return Object.keys(current).reduce((acc, key) => {
		const val = current[key]
		const origVal = orig[key]
		if (val == undefined || origVal == val) 
			return acc
		
		const origValIsObj = isObj(origVal)

		if (!origValIsObj && origVal != val) {
			acc[key] = val
			return acc
		} 

		const valIsObj = isObj(val)

		if (origValIsObj && valIsObj) {
			const objDiff = getDiff(origVal, val)
			if (!isEmptyObj(objDiff))
				acc[key] = objDiff
			return acc
		}

		if (origVal != val) {
			acc[key] = val
			return acc
		} 
		return acc
	}, {})
}

/**
 * [description]
 * @param  {Object} o_1     			That can be anything, incl. primitive type
 * @param  {Object} o_2     			That can be anything, incl. primitive type
 * @param  {Object} options.throwError 	Default false. If set to true, a failed test throws an exception with the details.
 * @return {Boolean}         			Whether or not the test passes
 */
const objAreSame = (o_1, o_2, options={}) => {
	const failed = msg => {
		if (options.throwError)
			throw new Error(msg)
		else
			return false
	}
	if (o_1 === o_2)
		return true
	
	if (o_1 === null || o_1 === undefined)
		return failed('The first object is non-truthy while the second is truthy')

	if (o_2 === null || o_2 === undefined)
		return failed('The second object is non-truthy while the first is truthy')
	
	const o_1_type = o_1 instanceof Date ? 'date' : Array.isArray(o_1) ? 'array' : typeof(o_1)
	const o_2_type = o_2 instanceof Date ? 'date' : Array.isArray(o_2) ? 'array' : typeof(o_2)

	if (o_1_type != o_2_type)
		return failed(`Object types do not match (${o_1_type} != ${o_2_type})`)

	if (o_1_type == 'date')
		return o_1.toString() == o_2.toString() ? true : failed(`Dates don't match (${o_1} != ${o_2})`)

	if (o_1_type == 'object') {
		const o_1_keys = Object.keys(o_1)
		const o_2_keys = Object.keys(o_2)
		if (o_1_keys.length > o_2_keys.length) {
			const additionalKey = o_1_keys.find(key => !o_2_keys.some(k => k == key))
			return failed(`Property '${additionalKey}' in the first object does not exit in the second`)
		}

		if (o_1_keys.length < o_2_keys.length) {
			const additionalKey = o_2_keys.find(key => !o_1_keys.some(k => k == key))
			return failed(`Property '${additionalKey}' in the second object does not exit in the first`)
		}

		const additionalKey = o_2_keys.find(key => !o_1_keys.some(k => k == key))
		if (additionalKey)
			return failed(`Property '${additionalKey}' in the second object does not exit in the first`)

		return o_1_keys.reduce((isSame, key) => {
			if (!isSame)
				return isSame
			const o_1_val = o_1[key]
			const o_2_val = o_2[key]
			try {
				return objAreSame(o_1_val, o_2_val, { throwError: true })
			} catch(err) {
				return failed(`Differences in property '${key}': ${err.message}`)
			}
		}, true)
	}
	
	if (o_1_type == 'array') {
		if (o_1.length != o_2.length) {
			return failed('Arrays don\'t have the same amount of items')
		}

		return o_1.reduce((isSame, obj_1) => {
			if (!isSame)
				return isSame
			return o_2.some(obj_2 => objAreSame(obj_1, obj_2)) ? true : failed(`No objects in the second array can match object ${JSON.stringify(obj_1, null, ' ')}`)
		}, true)
	}

	return failed(`Those 2 objects are not equal: ${o_1}, ${o_2}`) 
}

//////////////////////////                         START OBJECT HELPERS                                 ////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                         START VALIDATE HELPERS                               ////////////////////////

const validateUrl = (value='') => /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value)

const validateEmail = (value='') => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(value)

const validateIsDate = (d, options={ exception: { toggle: false, message: null } }) => { 
	const test = d && typeof(d.getTime) == 'function' && !isNaN(d.getTime())
	if (!test && options.exception.toggle)
		throw new Error(options.exception.message || `${d} is not a Date object.`)
	return test
}

//////////////////////////                          END VALIDATE HELPERS                                ////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	collection: {
		batch,
		uniq,
		headTail,
		sortBy,
		seed: newSeed,
		merge: mergeCollection
	},
	converter: {
		s2cCase,
		c2sCase,
		objectC2Scase,
		objectS2Ccase,
		encoder
	},
	date: {
		timestamp: getTimestamp,
		addDays: addDaysToDate,
		addMonths: addMonthsToDate,
		addYears: addYearsToDate,
		addHours: addHoursToDate,
		addMinutes: addMinutesToDate,
		addSeconds: addSecondsToDate,
		toShort: convertDateToShortDateString,
		parseShort: convertShortDateStringToDate
	},
	identity: {
		'new': newId
	},
	log: {
		transaction: logTransaction,
		error: logError,
		memory: logMemoryUsage
	},
	math: {
		avg,
		stdDev,
		median,
		randomNumber: getRandomNumber,
		randomNumbers: getRandomNumbers
	},
	obj: {
		merge: mergeObj,
		isEmpty: isEmptyObj,
		isObj,
		diff: getDiff,
		same: objAreSame
	},
	validate: {
		url: validateUrl,
		date: validateIsDate,
		email: validateEmail
	}
}
