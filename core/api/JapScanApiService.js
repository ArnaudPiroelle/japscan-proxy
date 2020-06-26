const headers = {
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br"
}
const cloudscraper = require('cloudscraper').defaults({ headers: headers, resolveWithFullResponse: true })
const cheerio = require('cheerio')
const zlib = require('zlib')
const crypto = require('crypto')
const { webkit } = require('playwright');

class JapScanApiService {
    constructor(scraper) {
        this.scraper = scraper
        this.keysheet = "0123456789abcdefghijklmnopqrstuvwxyz"

        this.scraper.defaultParams.agentOptions = {
            ciphers: crypto.constants.defaultCipherList + ':!ECDHE+SHA:!AES128-SHA'
        }
    }

    getTotalPages() {
        return this.doGet('https://www.japscan.co/mangas/1')
            .then(this.parseHtml)
            .then(this.parseTotalPages)
    }

    getMangas(page) {
        console.log("Fetch manga page " + page)
        return this.doGet('https://www.japscan.co/mangas/' + page)
            .then(this.parseHtml)
            .then(this.parseMangas)
    }

    getDetails(manga) {
        return this.doGet('https://www.japscan.co/manga/' + manga + '/')
            .then(this.parseHtml)
            .then(this.parseDetails)
    }

    getChapters(manga) {
        console.log('Fetch chapters for manga ' + manga)

        return this.doGet('https://www.japscan.co/manga/' + manga + '/')
            .then(this.parseHtml)
            .then(this.parseChapters)
    }

    getPages(manga, chapter) {
        console.log('Fetch pages for ' + manga + ' chapter ' + chapter)

        const url = 'https://www.japscan.co/lecture-en-ligne/' + manga + '/' + chapter + '/'
        return this.loadKeysheet(url)
            .then(() => this.doGet(url))
            .then(this.parseHtml)
            .then(html => {
                return this.parsePages(html, this.keyset)
            })
    }

    getPage(context, manga, chapter, page, secured) {
        let baseUrl = 'https://c.japscan.co/'
        return this.doRequest('GET', baseUrl + context + "/" + manga + "/" + chapter + "/" + page, null)
    }

    getThumbnail(image) {
        let baseUrl = 'https://www.japscan.co'
        return this.doRequest('GET', baseUrl + '/imgs/mangas/' + image, null)
    }

    doGet(url) {
        return this.doRequest('GET', url, 'utf8')
    }

    doRequest(method, uri, encoding) {
        let self = this
        let options = {
            method,
            uri,
            encoding
        }
        return self.scraper(options).then(response => {
            return response.body
        })
    }

    async loadKeysheet(chapter) {
        const pages = await this.findDecryptedPages(chapter)
        console.log(pages)
        this.createKeysheet(pages)
    }

    createKeysheet(pages) {
        var az = "0123456789abcdefghijklmnopqrstuvwxyz".split('')
        var ks = "0123456789abcdefghijklmnopqrstuvwxyz".split('')

        const realPageUrls = pages.decryptedUrls
        const pageUrls = pages.encryptedUrls

        console.log(realPageUrls)
        console.log(pageUrls)

        realPageUrls.forEach((realurl, i) => {
            console.log(i)

            realurl.split('').forEach((url, j) => {
                if (realPageUrls[i][j] != pageUrls[i][j]) {
                    ks[az.indexOf(pageUrls[i][j])] = realPageUrls[i][j]
                }
            })
        })

        this.keysheet = ks.join("")
        console.log(this.keysheet)
    }

    parseHtml(body) {
        return cheerio.load(body, { xmlMode: false, decodeEntities: true })
    }

    parseTotalPages($) {
        return parseInt($('#main ul.pagination>li.page-item').last().text().trim())
    }

    parseMangas($) {
        var mangaElements = $('#main>div.card>div.d-flex>div')
        return mangaElements.map((i, manga) => {
            let link = $(manga).children('a[href^="/manga/"]')
            let alias = $(link).attr('href').replace('/manga/', '').replace('/', '')
            //TODO: Change to proxy url
            let thumbnail = $(link).children('img').attr('src')
            let name = $(manga).children('p').children('a').text()

            return {
                name,
                alias,
                thumbnail
            }
        }).get()
    }

    parseDetails($) {
        let page = $('#main>div.card>div.card-body')

        let summary = $(page).children('p.text-justify').text()
        let infosElements = $(page).children('div.d-flex').children('div').children('p')

        let validInfos = {}

        if (infosElements.length == 0) {
            return { error: $.html() }
        } else {
            infosElements.each((i, info) => {

                let values = $(info).text()
                let keyvalues = values.split(':')

                let infoName = keyvalues[0].trim()
                let infoValue = keyvalues[1].trim()

                console.log(infoName)
                switch (infoName) {
                    case 'Origine':
                        validInfos["origin"] = infoValue
                        break
                    case 'Date Sortie':
                        validInfos["year"] = infoValue
                        break
                    case 'Type(s)':
                        validInfos["type"] = infoValue
                        break
                    case 'Genre(s)':
                        validInfos["kind"] = infoValue
                        break
                    case 'Auteur(s)':
                        validInfos["author"] = infoValue
                        break
                }
            }).get()

            return { ...validInfos, summary }
        }


    }

    parseChapters($) {
        let chapterElements = $('#chapters_list>div>div>a[href^="/lecture-en-ligne/"]').not(':has(span)')
        let result = chapterElements.map((i, link) => {
            let volumeElement = $(link).parent().parent()
            let volumeElementId = volumeElement.attr('id')
            let volumeName = $(`span[data-target="#${volumeElementId}"]`).text().trim()


            let url = $(link).attr('href')
            let name = $(link).text().trim()

            let uri = url.split('/')
            let manga = uri[2]
            let number = uri[3]

            let volumeRegex = /volume-([0-9]+)/g
            let chapterRegex = /([^:]*)( : .*)?/
            let isVolume = volumeRegex.test(number)

            let cleanName = name
            if (isVolume) {
                cleanName = volumeName
            } else {
                cleanName = name.replace(chapterRegex, `Chap. ${number}$2`)
            }

            return {
                name: cleanName,
                manga,
                number
            }

        }).get()

        return result.reverse()
    }

    parseEncryptedPages($) {
        let pagesElements = $('#pages > option:not([data-img^="(IMG__|__sy|__Add).*\.(png|jpe?g)"])')

        return pagesElements
            .map((i, page) => {
                return $(page).data('img').replace('https://c.japscan.co/', '')
            }).get()
    }

    parsePages($) {
        let isSecuredPage = $('script[src^="/js/iYFbYi_UibMqYb.js"]').length > 0
        let pagesElements = $('#pages > option:not([data-img^="(IMG__|__sy|__Add).*\.(png|jpe?g)"])')
        var regexp = new RegExp('(.*\/).*', 'i');
        var imagePath = regexp.exec($("#image").attr("data-src"))[1]
        if (imagePath.startsWith('http')) {
            imagePath = ""
        }

        let pages = pagesElements
            .map((i, page) => {
                return this.decodeImageUrl(imagePath + $(page).data('img'))
            })
            .get()
            .map((page) => {
                console.log(page)
                var imageNames = page.replace('https://c.japscan.co/', '').split('.')
                let imageName = Array.from(imageNames[0]).join("")

                return "/images/" + imageName + "." + imageNames[1]
            })

        return {
            postProcess: isSecuredPage ? "MOSAIC" : "NONE",
            pages
        }
    }

    decodeImageUrl(url) {
        var az = "0123456789abcdefghijklmnopqrstuvwxyz"
        // skip https://, cut after next slash and before extension
        var urlBase = url.substring(0, url.indexOf('/', 10) + 1)
        var extension = url.substring(url.length - 4, url.length)
        var encodedPart = url.substring(url.indexOf('/', 10) + 1, url.length - 4)

        return urlBase + encodedPart.split("").map((it) => {
            if (az.indexOf(it) < 0) {
                return it
            } else {
                return this.keysheet[az.indexOf(it)]
            }
        }).join("") + extension
    }

    async findDecryptedPages(chapter) {
        const browser = await webkit.launch();
        const page = await browser.newPage()
        var p1 = new Promise(async (resolve, reject) => {
            const pageUrls = []
            page.route('**', route => {
                const url = route.request().url()
                if (url.startsWith("https://www.japscan.co/") ||
                    url.startsWith("https://cdnjs.cloudflare.com")) {
                    route.continue();
                } else if (url.startsWith("https://c.japscan.co/")) {
                    pageUrls.push(url)
                    route.continue()
                } else {
                    route.abort()
                }

                if (pageUrls.length == 2) {
                    resolve(pageUrls)
                }
            });

        });

        await page.goto(chapter)
        const pagesElement = await page.$('#pages');
        const optionElements = await pagesElement.$$('option')
        const encryptedUrls = await Promise.all(optionElements.map((option) => option.getAttribute("data-img")))
        const decryptedUrls = await p1

        await browser.close();
        return {
            encryptedUrls,
            decryptedUrls
        }
    }
}

module.exports = new JapScanApiService(cloudscraper)