require('dotenv').config()
let fs = require('fs')
let path = require('path')
let Telegraf = require('telegraf')
let firebase = require('firebase/app')
require('firebase/database')

let commands = require(path.resolve('cmdlist.js'))
let anime = require(path.resolve('command', 'anime.js'))
let manga = require(path.resolve('command', 'manga.js'))
let search = require(path.resolve('command', 'search.js'))
let subscribe = require(path.resolve('command', 'subscribe.js'))
let unsubscribe = require(path.resolve('command', 'unsubscribe.js'))

let firebaseConfig = {
    apiKey: process.env.FIREBASE_APIKEY,
    authDomain: process.env.FIREBASE_AUTHDOMAIN,
    databaseURL: process.env.FIREBASE_DBURL,
    projectId: process.env.FIREBASE_PROJECTID,
    storageBucket: process.env.FIREBASE_STORAGEBUCKET,
    messagingSenderId: process.env.FIREBASE_SENDERID,
    appId: process.env.FIREBASE_APPID
}

firebase.initializeApp(firebaseConfig)

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.start((ctx) => {
    let welcomeText = fs.readFileSync(path.resolve('save', 'welcome.sav'), 'utf8')
    ctx.reply(welcomeText)
})

bot.help((ctx) => {
    let helpText = fs.readFileSync(path.resolve('save', 'help.sav'), 'utf8')
    ctx.reply(helpText)
})

bot.command('anime', ({reply}) => {
    let helpAnimeText = fs.readFileSync(path.resolve('save', 'help_anime.sav'), 'utf8')
    reply(helpAnimeText)
})

bot.command('manga', ({reply}) => {
    let helpMangaText = fs.readFileSync(path.resolve('save', 'help_manga.sav'), 'utf8')
    reply(helpMangaText)
})

bot.command('search', ({reply}) => {
    let helpSearchText = fs.readFileSync(path.resolve('save', 'help_search.sav'), 'utf8')
    reply(helpSearchText)
})

bot.command('subs', ({reply}) => {
    let helpSubsText = fs.readFileSync(path.resolve('save', 'help_subscribe.sav'), 'utf8')
    reply(helpSubsText)
})

bot.on('text', (ctx) => {
    if (checkString(ctx, commands.ANIME)) {
        anime.findAnime(ctx, getQuery(ctx, commands.ANIME))
    } 
    else if (checkString(ctx, commands.MANGA)) {
        manga.findManga(ctx, getQuery(ctx, commands.MANGA))
    } 
    else if (checkString(ctx, commands.SANIME)) {
        search.searchAnime(ctx, getQuery(ctx, commands.SANIME))
    } 
    else if (checkString(ctx, commands.SMANGA)) {
        search.searchManga(ctx, getQuery(ctx, commands.SMANGA))
    } 
    else if (checkString(ctx, commands.SUBS)) {
        subscribe.handleSubs(ctx, getQuery(ctx, commands.SUBS), firebase)
    } 
    else if (checkString(ctx, commands.UNSUBS)) {
        unsubscribe.handleUnsubs(ctx, getQuery(ctx, commands.UNSUBS), firebase)
    } 
    else if (ctx.message.text.toLowerCase() == commands.MYSUBS) {
        unsubscribe.showSubsList(ctx, firebase)
    }
    else if (ctx.message.text.toLowerCase() == commands.START) {
        if (ctx.chat.id == process.env.BOT_OWNER) {
            subscribe.startCron(bot, ctx, firebase)
        }
    }
    else if (ctx.message.text.toLowerCase() == commands.STOP) {
        if (ctx.chat.id == process.env.BOT_OWNER) {
            subscribe.stopCron(bot, ctx, firebase)
        }
    }
    else if (ctx.message.text.startsWith('!')) {
        ctx.reply('Hmm?')
    }
    
})

function checkString(ctx, command) {
    return ctx.message.text.toLowerCase().startsWith(command) && ctx.message.text.substring(command.length).trim != ''
}

function getQuery(ctx, command) {
    return ctx.message.text.substring(command.length).trim()
}

bot.launch()