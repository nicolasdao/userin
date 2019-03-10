/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { app } = require('@neap/funky')

app.get('/alive', (req,res) => res.status(200).send(`'userIn' is alive`))

eval(app.listen('app', process.env.PORT || 3000))