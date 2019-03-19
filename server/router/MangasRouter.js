const express = require('express');
const fs = require('fs')
const path = require('path')
const fsPromises = fs.promises;
const japScanApiService = require('../../core/api/JapScanApiService')
const mangaStore = require('../../store/MangaStore')


var router = express.Router();
router.get('/mangas', (req, res, next) => {
    res.json(mangaStore.getMangas().sort((a, b) => {
        if (a.name < b.name) { return -1 }
        if (a.name > b.name) { return 1 }
        return 0
    }))
})

router.get('/mangas/:alias', (req, res, next) => {
    japScanApiService.getDetails(req.params.alias)
        .then(details => res.json(details))
        .catch(next)
})

router.get('/mangas/:alias/chapters', (req, res, next) => {
    japScanApiService.getChapters(req.params.alias)
        .then(chapters => res.json(chapters))
        .catch(next)
})

router.get('/mangas/:alias/chapters/:number', (req, res, next) => {
    japScanApiService.getPages(req.params.alias, req.params.number)
        .then(pages => res.json(pages))
        .catch(next)
})

router.get('/images/:manga/:number/:page', (req, res, next) => {
    let image = "/images/" + req.params.manga + "/" + req.params.number + "/" + req.params.page

    if (fs.existsSync(image)) {
        // Return image from cache
        fsPromises.readFile(image)
            .then(body => {
                res.end(body, 'binary')
            })
    } else {
        // Return immage from japscan website and store there in
        japScanApiService.getPage(req.params.manga, req.params.number, req.params.page, false)
            .then(body => {
                return fs.promises.mkdir(path.dirname(image), { recursive: true })
                    .then(() => {
                        return fsPromises.writeFile(image, body)
                    })
                    .then(() => body)
            })
            .then(body => {
                res.end(body, 'binary')
            })
            .catch(next)
    }
})

router.get('/images-secured/:manga/:number/:page', (req, res, next) => {
    let image = "/images/" + req.params.manga + "/" + req.params.number + "/" + req.params.page

    if (fs.existsSync(image)) {
        // Return image from cache
        fsPromises.readFile(image)
            .then(body => {
                res.end(body, 'binary')
            })
    } else {
        // Return immage from japscan website and store there in
        japScanApiService.getPage(req.params.manga, req.params.number, req.params.page, true)
            .then(body => {
                return fs.promises.mkdir(path.dirname(image), { recursive: true })
                    .then(() => {
                        return fsPromises.writeFile(image, body)
                    })
                    .then(() => body)
            })
            .then(body => {
                res.end(body, 'binary')
            })
            .catch(next)
    }
})
module.exports = router