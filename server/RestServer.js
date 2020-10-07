const express = require('express')
const helmet = require('helmet');
const https = require('https');
const compression = require('compression')
const fs = require('fs')
const morgan = require('morgan')
const mangasRouter = require('./router/MangasRouter')

const clientAuthMiddleware = () => (req, res, next) => {
    if (!req.client.authorized) {
        return res.status(401).send('Invalid client certificate authentication.');
    }
    return next();
};

module.exports = class RestServer {
    constructor(port, sslFolder) {
        this.port = port
        this.sslFolder = sslFolder
        this.app = express()

        this.app.use(helmet())
        this.app.use(compression())
        this.app.use(morgan('combined'))
        this.app.use(clientAuthMiddleware())
        this.app.use(mangasRouter)
    }

    start() {
        https.createServer(
            {
              // ...
              cert: fs.readFileSync(this.sslFolder + '/server.crt'),
              key: fs.readFileSync(this.sslFolder +'/server.key'),
              requestCert: true,
              rejectUnauthorized: false,
              ca: fs.readFileSync(this.sslFolder + '/ca.pem'),
        
              // ...
            },
            this.app
          ).listen(this.port, function () {
            console.log(`JapScan proxy listening on port ${this.port}!`)
        })
    }
}