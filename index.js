const RestServer = require('./server/RestServer')
const UpdateScheduler = require('./scheduler/UpdateScheduler')
const PORT = process.env.PORT || 5000
const SSL_FOLDER = process.env.SSL_FOLDER || "./ssl"

//TODO: S'abonner aux flux RSS / Nouveaux chapitres
//TODO: Persistance base de données

const server = new RestServer(PORT, SSL_FOLDER)
const updateScheduler = new UpdateScheduler()

updateScheduler.registerMangasSync()
server.start()
