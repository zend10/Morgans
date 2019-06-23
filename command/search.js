const Jikan = require('jikan-node')
const mal = new Jikan()

let methods = {}

methods.searchAnime = function(ctx, anime) {
    if (anime.length < 3) {
        ctx.reply('You need to type at least 3 characters.')
        return
    }

    mal.search('anime', anime)
        .then(info => {
            if (info != null || info.results) {
                let counter = 0
                let message = "Search Result:\n"
                info.results.forEach(element => {
                    if (counter == 10) return
                    message += "(" + element.mal_id + ") - " + element.title + " (" + element.type + ")\n"
                    counter++
                });
                ctx.reply(message)
            } else {
                ctx.reply('It doesn\'t seem to exist.')
            }
        })
        .catch(err => ctx.reply('Ugghhh.. I don\'t know what\'s wrong with me!'))
}

methods.searchManga = function(ctx, manga) {
    if (manga.length < 3) {
        ctx.reply('You need to type at least 3 characters.')
        return
    }

    mal.search('manga', manga)
        .then(info => {
            if (info != null || info.results) {
                let counter = 0
                let message = "Search Result:\n"
                info.results.forEach(element => {
                    if (counter == 10) return
                    message += "(" + element.mal_id + ") - " + element.title + " (" + element.type + ")\n"
                    counter++
                });
                ctx.reply(message)
            } else {
                ctx.reply('It doesn\'t seem to exist.')
            }
        })
        .catch(err => ctx.reply('Ugghhh.. I don\'t know what\'s wrong with me!'))
}

module.exports = methods