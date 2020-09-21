
const setUpScopeAssertion = assert => {
	assert.scopes = (scope, values, idx=0) => {
		assert.isOk(scope, `${idx++}`)
		for (let value of values) 
			assert.isOk(scope.indexOf(value) >= 0, `${idx++} - scope should contain '${value}'`)
	}
}

class WrapperError extends Error {
	constructor(message, stack) {
		super(message)
		this.stack = stack
	}
}

const logTestErrors = () => done => {	
	const _errors = []
	return {
		run: p => p.catch(error => {
			const totalErrors = [error, ..._errors]
			const stack = totalErrors.map(e => e.stack).join('\n')
			done(new WrapperError(error.message, stack))
		}),
		push: errors => {
			if (!errors)
				return
			if (Array.isArray(errors))
				_errors.push(...errors)
			else
				_errors.push(errors)
		} 
	}
}

const createShowTestResultFn = (showResults, ...args) =>  {
	const prefix = args.join('.')
	const idsToBeShown = showResults && Array.isArray(showResults) && showResults.length
		? showResults.filter(v => v && v.indexOf(prefix) >= 0).reduce((acc,v) => {
			const ids = v.replace(`${prefix}.`,'').split(',').filter(x => x && !isNaN(x*1)).map(x => x*1)
			acc.push(...ids)
			return acc
		}, [])
		: []

	return idx => idsToBeShown.indexOf(idx*1) >= 0
}

module.exports = {
	setUpScopeAssertion,
	logTestErrors,
	createShowTestResultFn
}