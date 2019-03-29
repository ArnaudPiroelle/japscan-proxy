const cloudscraper = require('cloudscraper')
const cheerio = require('cheerio')

class JapScanApiService {
    constructor(scraper) {
        this.scraper = scraper
    }

    getTotalPages() {
        return this.doGet('https://www.japscan.to/mangas/1')
            .then(this.parseHtml)
            .then(this.parseTotalPages)
    }

    getMangas(page) {
        console.log("Fetch manga page " + page)
        return this.doGet('https://www.japscan.to/mangas/' + page)
            .then(this.parseHtml)
            .then(this.parseMangas)
    }

    getDetails(manga) {
        return this.doGet('https://www.japscan.to/manga/' + manga + '/')
            .then(this.parseHtml)
            .then(this.parseDetails)
    }

    getChapters(manga) {
        console.log('Fetch chapters for manga ' + manga)

        return this.doGet('https://www.japscan.to/manga/' + manga + '/')
            .then(this.parseHtml)
            .then(this.parseChapters)
    }

    getPages(manga, chapter) {
        console.log('Fetch pages for ' + manga + ' chapter ' + chapter)

        return this.doGet('https://www.japscan.to/lecture-en-ligne/' + manga + '/' + chapter + '/')
            .then(this.parseHtml)
            .then(this.parsePages)
    }

    getPage(manga, chapter, page, secured) {
        let baseUrl = 'https://c.japscan.to/lel/'
        return this.doRequest('GET', baseUrl + manga + "/" + chapter + "/" + page, null)
    }

    doGet(url) {
        return this.doRequest('GET', url, 'utf8')
    }

    doRequest(method, uri, encoding) {
        let self = this
        let options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
            },
            method,
            uri,
            encoding
        }
        return self.scraper(options)
    }

    parseHtml(body) {
        return cheerio.load(body, { xmlMode: false })
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
            let thumbnail = 'https://www.japscan.to' + $(link).children('img').attr('src')
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
        infosElements.each((i, info) => {

            let values = $(info).text()
            let keyvalues = values.split(':')

            let infoName = keyvalues[0].trim()
            let infoValue = keyvalues[1].trim()

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

    parsePages($) {
        var pagesElements = $('#pages > option:not([data-img^="(IMG__|__sy|__Add).*\.(png|jpe?g)"])')
        var image = $('#image')
        let src = image.data("src")

        let isSecuredPage = $('script[src^="/js/iYFbYi_UibMqYb.js"]').length > 0
        let uri = src.replace('https://c.japscan.to/lel/', '').split('/')

        let pages = pagesElements
            .map((i, page) => {
                let imageName = $(page).data('img')
                return "/images/" + uri[0] + "/" + uri[1] + "/" + imageName
            }).get()

        return {
            postProcess: isSecuredPage ? "MOSAIC" : "NONE",
            pages
        }
    }
}

module.exports = new JapScanApiService(cloudscraper)