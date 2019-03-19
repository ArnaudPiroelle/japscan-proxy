const flattenUniq = (arr) => {
    const result = arr.reduce((acc, sub) => {
        acc.push(...sub.filter((value) => !acc.map(({ alias }) => alias).includes(value.alias)))
        return [...acc];
    }, []);
    return result;
}

class MangaStore {
    constructor() {
        this.mangas = []
    }

    getMangas() {
        return this.mangas
    }

    addMangas(newMangas) {
        this.mangas = flattenUniq([this.mangas, newMangas])
    }
}


module.exports = new MangaStore()