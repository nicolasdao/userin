
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

module.exports = {
	setUpScopeAssertion,
	logTestErrors
}