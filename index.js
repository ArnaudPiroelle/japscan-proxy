const RestServer = require('./server/RestServer')
const UpdateScheduler = require('./scheduler/UpdateScheduler')

//TODO: S'abonner aux flux RSS / Nouveaux chapitres
//TODO: Persistance base de données

const server = new RestServer(3000)
const updateScheduler = new UpdateScheduler()

updateScheduler.registerMangasSync()
server.start()