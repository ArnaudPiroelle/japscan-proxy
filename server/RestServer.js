const express = require('express')
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan')
const mangasRouter = require('./router/MangasRouter')

module.exports = class RestServer {
    constructor(port) {
        this.port = port
        this.app = express()

        this.app.use(helmet())
        this.app.use(compression())
        this.app.use(morgan('combined'))
        this.app.use(mangasRouter)
    }

    start() {
        this.app.listen(this.port, function () {
            console.log(`JapScan proxy listening on port ${this.port}!`)
        })
    }
}