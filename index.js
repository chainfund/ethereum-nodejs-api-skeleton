const express = require('express')
const bodyParser = require('body-parser')
const config = require('config')


const ethereum = require('./apis/ethereum')
const multisig = require('./apis/multisig')

const app = express()
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

ethereum(app)
multisig(app)

// Start REST API server
app.listen(config.get('server_port'), () => {
    console.log(`App listening on port ${config.get('server_port')}!`)
})
