let path = require('path')
let fs = require('fs')

let methods = {}

let sitesPath = path.resolve('save', 'sites.json')
let siteList = JSON.parse(fs.readFileSync(sitesPath, 'utf8'))

let firebase = null

methods.showSubsList = function(ctx, fb) {
    firebase = fb
    firebase.database().ref('subscribers/' + ctx.chat.id).once('value').then(function(snapshot) {
        let subsList = snapshot.val()
        if (subsList) {
            let replyStr = 'You are subscribed to:\nKissanime:'
            if (subsList.kissanime) {
                let count = 0
                for (anime in subsList.kissanime) {
                    replyStr += '\n' + (++count) + ' - ' + anime
                }
            } else {
                replyStr += '\n-'
            }

            replyStr += '\n\nMangadex:'
            if (subsList.mangadex) {
                let count = 0
                for (manga in subsList.mangadex) {
                    replyStr += '\n' + (++count) + ' - ' + manga
                }
            } else {
                replyStr += '\n-'
            }

            ctx.reply(replyStr)
        } else {
            ctx.reply('You are not subscribed to anything.')
        }
    })
}

methods.handleUnsubs = function(ctx, query, fb) {
    firebase = fb

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

    let id = -1
    let checkId = query.toLowerCase().split(' ')

    // check if containts ' id=<number>'
    if (checkId.length == 2 && checkId[1].match(/^id=[0-9]+$/gi)) {
        id = parseInt(checkId[checkId.length - 1].substring('id='.length)) - 1

        firebase.database().ref('subscribers/' + ctx.chat.id + '/kissanime/').once('value').then(function(snapshot) {
            let subsList = snapshot.val()
            let subsArray = []
            for (subs in subsList) {
                subsArray.push(subs)
            }
            
            if (subsArray && id >= 0 && subsArray.length > id) {
                ctx.reply('You are no longer subscribed to ' + subsArray[id] + '.')
                firebase.database().ref('subscribers/' + ctx.chat.id + '/kissanime/' + subsArray[id]).remove()
                firebase.database().ref('kissanime/' + subsArray[id] + '/subscribers/' + ctx.chat.id).remove()
            } else {
                ctx.reply('That id does not exist.')
            }
        })

    } else {
        ctx.reply('Wrong format, please consider reading /subs.')
    }
}

function handleMangaDex(ctx, query) {
    ctx.reply('Working on it. Please wait.')

    let id = -1
    let checkId = query.toLowerCase().split(' ')

    // check if containts ' id=<number>'
    if (checkId.length == 2 && checkId[1].match(/^id=[0-9]+$/gi)) {
        id = parseInt(checkId[checkId.length - 1].substring('id='.length)) - 1

        firebase.database().ref('subscribers/' + ctx.chat.id + '/mangadex/').once('value').then(function(snapshot) {
            let subsList = snapshot.val()
            let subsArray = []
            for (subs in subsList) {
                subsArray.push(subs)
            }
            
            if (subsArray && id >= 0 && subsArray.length > id) {
                ctx.reply('You are no longer subscribed to ' + subsArray[id] + '.')
                firebase.database().ref('subscribers/' + ctx.chat.id + '/mangadex/' + subsArray[id]).remove()
                firebase.database().ref('mangadex/' + subsArray[id] + '/subscribers/' + ctx.chat.id).remove()
            } else {
                ctx.reply('That id does not exist.')
            }
        })

    } else {
        ctx.reply('Wrong format, please consider reading /subs.')
    }
}

module.exports = methods