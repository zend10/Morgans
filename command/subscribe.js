require('dotenv').config()

let path = require('path')
let fs = require('fs')
let cloudscraper = require('cloudscraper')
let $ = require('cheerio')
let moment = require('moment')
let CronJob = require('cron').CronJob

let methods = {}

let sitesPath = path.resolve('save', 'sites.json')
let siteList = JSON.parse(fs.readFileSync(sitesPath, 'utf8'))

let bot = null
let firebase = null
let kissanimeCache = {}
let mangadexCache = {}

let cronTime = '*/5 * * * *' // prod 5 minutes
// let cronTime = '*/15 * * * * *' // dev 15 seconds
let cron = new CronJob(cronTime, doScraping, null, false, 'UTC')

methods.handleSubs = function(ctx, query, fb) {
    firebase = fb
    siteList = JSON.parse(fs.readFileSync(sitesPath, 'utf8'))

    if (query.toLowerCase().startsWith(siteList.kissanime.name)) {
        handleKissAnime(ctx, query)
    } else if (query.toLowerCase().startsWith(siteList.mangadex.name)) {
        handleMangaDex(ctx, query)
    } else {
        ctx.reply('Wrong format, please consider reading /subs.')
    }
}

function handleKissAnime(ctx, query) {
    ctx.reply('Working on it. Please wait.')

    let animeName = query.substring(siteList.kissanime.name.length).trim().toLowerCase()
    let id = -1
    
    let checkId = animeName.split(' ')

    // check if contains ' id=<number>'
    if (checkId[checkId.length - 1].match(/^id=[0-9]+$/gi)) {
        id = parseInt(checkId[checkId.length - 1].substring('id='.length)) - 1
        checkId.pop()
        animeName = checkId.join(' ')

        // check if still in cache and valid id
        if (animeName == kissanimeCache.animeName && id < kissanimeCache.searchResult.length) {
            // bypass searching
            scrapeKissAnimePage(ctx, kissanimeCache.searchResult[id].link, kissanimeCache.searchResult[id].name)
            return
        }
    }

    let site = siteList.kissanime.site
    let url = encodeURI(site + '?s=' + animeName)
    scrapeKissAnimeList(ctx, url, animeName, id)
}

function scrapeKissAnimeList(ctx, url, animeName, id) {
    let options = {
        method: 'GET',
        url: url
    }

    cloudscraper(options)
        .then(html => {
            let items = []

            $('.odd > td', html).each(function(i) {
                let thisHtml = $(this).html()
                let item = {
                    link: thisHtml.substring(thisHtml.indexOf('"') + 1, thisHtml.lastIndexOf('"')).trim(),
                    name: thisHtml.substring(thisHtml.indexOf('>') + 1, thisHtml.lastIndexOf('<')).trim()
                }

                if (item.link && item.name) {
                    items.push(item)
                }
            })

            if (items.length == 0) {
                ctx.reply('Can\'t find that.')
            } else {
                kissanimeCache = {
                    animeName: animeName,
                    searchResult: items
                }

                // check if id is valid
                if (id < 0 || id >= items.length) {
                    // if not valid
                    let message = 'Here it is:\n'
                    items.forEach(element => {
                        message += items.indexOf(element) + 1 + ' - ' + element.name + '\n'
                    });
                    message += '\nType [!subs kissanime ' + animeName + ' id=<Number From Above>] to start subscribing.'
                    ctx.reply(message)
                } else {
                    // if valid
                    scrapeKissAnimePage(ctx, items[id].link, items[id].name)
                }                
            }
        })
        .catch(err => {
            console.log(err)
            ctx.reply('Something is stopping me from getting that information.')
        })
}

function scrapeKissAnimePage(ctx, url, animeName) {
    ctx.reply('You are subscribing to ' + animeName + '. Please wait a bit more while I\'m setting things up.')

    // check if already exists in database
    firebase.database().ref('kissanime/' + animeName).once('value').then(function(snapshot) {
        if (snapshot.val()) {
            // if already in database
            let subscribers = snapshot.val().subscribers
            if (subscribers && subscribers[ctx.chat.id]) {
                // if already a subscriber
                ctx.reply('It seems you have already subscribed to ' + animeName + '.')
            } else {
                // add new subscriber to existing entry
                addNewKissAnimeSubscriber(ctx, animeName)
            }
        } else {
            // if new entry
            let options = {
                method: 'GET',
                url: url
            }
        
            cloudscraper(options)
                .then(html => {
                    // add new entry
                    firebase.database().ref('kissanime/' + animeName).set({
                        name: animeName,
                        link: url,
                        subscribers: '',
                        lastEpisode: {
                            lastEpisode: $('.listing tr td a', html).html().trim(),
                            link: $('.listing tr td a', html).attr('href').trim()
                        },
                        lastUpdate: moment().format('YYYY-MM-DD hh:mm:ss')
                    }, function(error) {
                        if (error) {
                            console.log(err)
                            ctx.reply('Something is stopping me from getting that information.')
                        } else {
                            // add subscriber to new entry
                            addNewKissAnimeSubscriber(ctx, animeName)
                        }
                    })
                })
                .catch(err => {
                    console.log(err)
                    ctx.reply('Something is stopping me from getting that information.')
                })
        }
    })
}

function addNewKissAnimeSubscriber(ctx, animeName) {
    firebase.database().ref('kissanime/' + animeName + '/subscribers/' + ctx.chat.id).set({
        id: ctx.chat.id,
        name: ctx.chat.first_name
    }, function(error) {
        if (error) {
            console.log(err)
            ctx.reply('Something is stopping me from getting that information.')
        } else {
            ctx.reply('You have been successfully subscribed to ' + animeName + '.')
        }
    })

    firebase.database().ref('subscribers/' + ctx.chat.id + '/kissanime/' + animeName).set({
        name: animeName
    })
}

function handleMangaDex(ctx, query) {
    ctx.reply('Working on it. Please wait.')

    let mangaName = query.substring(siteList.mangadex.name.length).trim().toLowerCase()
    let id = -1
    
    let checkId = mangaName.split(' ')

    // check if containts ' id=<number>'
    if (checkId[checkId.length - 1].match(/^id=[0-9]+$/gi)) {
        id = parseInt(checkId[checkId.length - 1].substring('id='.length)) - 1
        checkId.pop()
        mangaName = checkId.join(' ')

        // check if still in cache and valid id
        if (mangaName == mangadexCache.mangaName && id < mangadexCache.searchResult.length) {
            // bypass searching
            scrapeMangaDexPage(ctx, mangadexCache.searchResult[id].link, mangadexCache.searchResult[id].name)
            return
        }
    }

    let site = siteList.mangadex.site
    let url = encodeURI(site + 'search?title=' + mangaName)
    scrapeMangaDexList(ctx, url, mangaName, id)
}

function scrapeMangaDexList(ctx, url, mangaName, id) {
    let options = {
        method: 'GET',
        url: url,
        headers: { 'Cookie': process.env.MANGADEX_COOKIE, 'User-Agent': process.env.MANGADEX_USERAGENT },
    }

    cloudscraper(options)
        .then(html => {
            let items = []

            $('.ml-1.manga_title.text-truncate', html).each(function(i) {
                let item = {
                    link: siteList.mangadex.site + $(this).attr('href').trim(),
                    name: $(this).attr('title').trim()
                }

                if (item.link && item.name) {
                    items.push(item)
                }
            })

            if (items.length == 0) {
                ctx.reply('Can\'t find that.')
            } else {
                mangadexCache = {
                    mangaName: mangaName,
                    searchResult: items
                }

                // check if id is valid
                if (id < 0 || id >= items.length) {
                    // if not valid
                    let message = 'Here it is:\n'
                    items.forEach(element => {
                        message += items.indexOf(element) + 1 + ' - ' + element.name + '\n'
                    });
                    message += '\nType [!subs mangadex ' + mangaName + ' id=<Number From Above>] to start subscribing.'
                    ctx.reply(message)
                } else {
                    // if valid
                    scrapeMangaDexPage(ctx, items[id].link, items[id].name)
                }                
            }
        })
        .catch(err => {
            console.log(err)
            ctx.reply('Something is stopping me from getting that information.')
        })
}

function scrapeMangaDexPage(ctx, url, mangaName) {
    ctx.reply('You are subscribing to ' + mangaName + '. Please wait a bit more while I\'m setting things up.')

    // check if already exists in database
    firebase.database().ref('mangadex/' + mangaName).once('value').then(function(snapshot) {
        if (snapshot.val()) {
            // if already in database
            let subscribers = snapshot.val().subscribers
            if (subscribers && subscribers[ctx.chat.id]) {
                // if already a subscriber
                ctx.reply('It seems you have already subscribed to ' + mangaName + '.')
            } else {
                // add new subscriber to existing entry
                addNewMangaDexSubscriber(ctx, mangaName)
            }
        } else {
            // if new entry
            let options = {
                method: 'GET',
                url: url
            }
        
            cloudscraper(options)
                .then(html => {
                    // add new entry
                    let lastCh = $('div[data-lang=1]', html).data()

                    firebase.database().ref('mangadex/' + mangaName).set({
                        name: mangaName,
                        link: url,
                        subscribers: '',
                        lastChapter: {
                            lastChapter: lastCh.chapter,
                            link: 'https://mangadex.org/chapter/' + lastCh.id + '/1'
                        },
                        lastUpdate: moment().format('YYYY-MM-DD hh:mm:ss')
                    }, function(error) {
                        if (error) {
                            console.log(err)
                            ctx.reply('Something is stopping me from getting that information.')
                        } else {
                            // add subscriber to new entry
                            addNewMangaDexSubscriber(ctx, mangaName)
                        }
                    })
                })
                .catch(err => {
                    console.log(err)
                    ctx.reply('Something is stopping me from getting that information.')
                })
        }
    })
}

function addNewMangaDexSubscriber(ctx, mangaName) {
    firebase.database().ref('mangadex/' + mangaName + '/subscribers/' + ctx.chat.id).set({
        id: ctx.chat.id,
        name: ctx.chat.first_name
    }, function(error) {
        if (error) {
            console.log(err)
            ctx.reply('Something is stopping me from getting that information.')
        } else {
            ctx.reply('You have been successfully subscribed to ' + mangaName + '.')
        }
    })

    firebase.database().ref('subscribers/' + ctx.chat.id + '/mangadex/' + mangaName).set({
        name: mangaName
    })
}

function doScraping() {
    firebase.database().ref('kissanime').once('value').then(function(snapshot) {
        let animeList = snapshot.val()
        for (anime in animeList) {
            let animeEntry = animeList[anime]
            let options = {
                method: 'GET',
                url: animeEntry.link
            }

            cloudscraper(options)
                .then(html => {
                    let lastEp = $('.listing tr td a', html).html().trim()
                    let lastLink = $('.listing tr td a', html).attr('href').trim()

                    if (animeEntry.lastEpisode.lastEpisode != lastEp) {
                        for (sub in animeEntry.subscribers) {
                            bot.telegram.sendMessage(sub, 'New episode of ' + animeEntry.name + ' is out!'+
                                '\nWatch ' + lastEp + ' here: \n' + lastLink)
                        }

                        let updates = {}
                        updates['/lastUpdate'] = moment().format('YYYY-MM-DD hh:mm:ss')
                        updates['/lastEpisode'] = {
                            lastEpisode: lastEp,
                            link: lastLink
                        }

                        firebase.database().ref('kissanime/' + animeEntry.name).update(updates, function(err) {
                            if (err) {
                                console.log(err)
                            } else {
                                console.log(animeEntry.name + ' updated')
                            }
                        })
                    } else {
                        console.log('Same old episode: ' + animeEntry.lastEpisode.lastEpisode)
                    }
                })
                .catch(err => {
                    console.log(err)
                })
        }
    })

    firebase.database().ref('mangadex').once('value').then(function(snapshot) {
        let mangaList = snapshot.val()
        for (manga in mangaList) {
            let mangaEntry = mangaList[manga]
            let options = {
                method: 'GET',
                url: mangaEntry.link
            }

            cloudscraper(options)
                .then(html => {
                    let lastCh = $('div[data-lang=1]', html).data()

                    if (mangaEntry.lastChapter.lastChapter < lastCh.chapter) {
                        for (sub in mangaEntry.subscribers) {
                            bot.telegram.sendMessage(sub, 'New chapter of ' + mangaEntry.name + ' is out!'+
                                '\nRead ' + lastCh.chapter + ' here: \n' + 'https://mangadex.org/chapter/' + lastCh.id + '/1')
                        }

                        let updates = {}
                        updates['/lastUpdate'] = moment().format('YYYY-MM-DD hh:mm:ss')
                        updates['/lastChapter'] = {
                            lastChapter: lastCh.chapter,
                            link: 'https://mangadex.org/chapter/' + lastCh.id + '/1'
                        }

                        firebase.database().ref('mangadex/' + mangaEntry.name).update(updates, function(err) {
                            if (err) {
                                console.log(err)
                            } else {
                                console.log(mangaEntry.name + ' updated')
                            }
                        })
                    } else {
                        console.log('Same old chapter: ' + mangaEntry.name + ' ' + mangaEntry.lastChapter.lastChapter)
                    }
                })
                .catch(err => {
                    console.log(err)
                })
        }
    })
}

methods.startCron = function(b, ctx, fb) {
    bot = b
    firebase = fb
    cron.start()
    ctx.reply('I\'m up and running!')
}

methods.stopCron = function(b, ctx, fb) {
    bot = b
    firebase = fb
    cron.stop()
    ctx.reply('See ya!')
}

module.exports = methods