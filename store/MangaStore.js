class MangaStore {
    constructor() {
        this.mangas = []
    }

    getMangas() {
        return this.mangas
    }

    addMangas(mangas) {
        this.mangas = this.mangas.concat(mangas)
    }
}

module.exports = new MangaStore()