
const setUpScopeAssertion = assert => {
	assert.scopes = (scope, values, idx=0) => {
		assert.isOk(scope, `${idx++}`)
		for (let value of values) 
			assert.isOk(scope.indexOf(value) >= 0, `${idx++} - scope should contain '${value}'`)
	}
}

const logTestErrors = toggle => done => {	
	const _errors = []
	return {
		run: p => p.catch(error => {
			if (toggle && _errors.length)
				_errors.forEach(e => console.log(e.stack || e.message))
			done(error)
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