const schedule = require('node-schedule');
const sequential = require('promise-sequential');

const japScanApiService = require('../core/api/JapScanApiService')
const mangaStore = require('../store/MangaStore')

module.exports = class UpdateScheduler {
    constructor() {

    }

    registerMangasSync() {
        let self = this
        return self.fetchMangas()
            .then(res =>
                // retry
                self.fetchMangas()
            ).then(res => {
                self.mangasSync = schedule.scheduleJob('0 * * * *', self.fetchMangas);
            })
    }

    unregisterMangaSync() {
        if (this.mangasSync) {
            this.mangasSync.cancel()
        } else {
            console.warn('job mangaSync isn\'t scheduled')
        }
    }

    fetchMangas() {
        return japScanApiService.getTotalPages()
            .then(totalPages => {
                console.log(`${totalPages} page to fetch`)
                let pages = []
                var currentPage = 1
                for (currentPage = 1; currentPage <= totalPages; currentPage++) {
                    pages.push(currentPage)
                }

                return pages
            })
            .then(pages => {
                let promises = pages.map(index => { return () => japScanApiService.getMangas(index).then(res => mangaStore.addMangas(res)) })
                return sequential(promises)
            })
            .catch(e => console.log(e))
    }
}
