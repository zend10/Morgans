const Jikan = require('jikan-node')
const mal = new Jikan()

let methods = {}

methods.findAnime = function(ctx, anime) {
    if (isNormalInteger(anime)) {
        mal.findAnime(anime)
            .then(info => {
                if (info != null) {
                    let message = getResultString(info)
                    ctx.reply(message)
                } else {
                    ctx.reply('It doesn\'t seem to exist.')
                }
            })
            .catch(err => ctx.reply('Ugghhh.. I don\'t know what\'s wrong with me!'))
    } else {
        if (anime.length < 3) {
            ctx.reply('You need to type at least 3 characters.')
            return
        }

        mal.search('anime', anime)
            .then(info => {
                if (info != null || info.results) {
                    let result = info.results[0]
                    let message = getResultString(result)
                    ctx.reply(message)
                } else {
                    ctx.reply('It doesn\'t seem to exist.')
                }
            })
            .catch(err => ctx.reply('Ugghhh.. I don\'t know what\'s wrong with me!'))
    }
}

function isNormalInteger(str) {
    let n = Math.floor(Number(str))
    return n !== Infinity && String(n) === str && n >= 0
}

function getResultString(res) {
    let message = res.title
        + '\nType: ' + res.type 
        + '\nEpisodes: ' + res.episodes 
        + '\nScore: ' + res.score
        + '\n\nLink:\n' + res.url

    return message
}

module.exports = methods