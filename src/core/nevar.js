const util = require('util');
const path = require('path');
const { GiveawaysManager } = require('discord-giveaways');
const { Client, Collection, MessageEmbed} = require('discord.js');
const { Player } = require('discord-player');
const { loadConfig } = require('../helper/loader');
const config = loadConfig();

class Nevar extends Client {
    constructor(options) {
        super(options);

        this.config = config;
        this.emotes = require("../../storage/assets/emojis.json");
        this.languages = require('../../languages/language-meta.json');

        this.commands = new Collection();
        this.aliases = new Collection();

        this.embedColor = config.embeds.color;
        this.footerText = config.embeds.footer;
        this.supportUrl = config.support.invite;
        this.website = config.general.website;
        this.wait = util.promisify(setTimeout);

        this.logger = require('../helper/logger');
        this.logs = require('../models/log');
        this.functions = require('../helper/functions');
        this.guildsData = require('../models/guild');
        this.usersData = require('../models/user');
        this.membersData = require('../models/member');
        this.mathUtils = require('../helper/mathutils');

        this.databaseCache = {};
        this.databaseCache.users = new Collection();
        this.databaseCache.guilds = new Collection();
        this.databaseCache.members = new Collection();
        this.databaseCache.bannedUsers = new Collection();

        this.filters = config.music.filters;

        this.giveawaysManager = new GiveawaysManager(this, {
            storage: './storage/giveaways.json',
            default: {
                botsCanWin: false,
                embedColor: this.embedColor,
                embedColorEnd: '#fc0a43',
                //exemptPermissions: ["ADMINISTRATOR", "MANAGE_GUILD"],
                reaction: '🎉'
            }
        })

        this.player = new Player(this, {
            leaveOnEnd: false,
            autoSelfDeaf: false,
            ytdlOptions: {
                requestOptions: {
                    headers: {
                        cookie: config.music.youtube_cookie
                    }
                }
            }
        });

        this.localeString = function(key, locale, args = []){
            const language = this.translations.get(locale);
            if(!language) console.error(new Error("Invalid language given"))
            return language(key, args)

        }

        this.format = function (integer){
            let formatter = new Intl.NumberFormat('de-DE');
            return formatter.format(integer);
        }

        this.randomKey = function(length){
            let result           = '';
            let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for ( let i = 0; i < length; i++ ) {
                result += characters.charAt(Math.floor(Math.random() *
                    charactersLength));
            }
            return result;
        }
    }
    get defaultLanguage(){
        return this.languages.find((language) => language.default).name;
    }

    translate(key, args, locale){
        if(!locale) locale = this.defaultLanguage;
        const language = this.translations.get(locale);
        if(!language) throw "Invalid language given";
        return language(key, args)
    }

    loadCommand (commandPath, commandName) {
        try {
            const props = new (require(`${commandPath}/${commandName}`))(this);
            props.conf.location = commandPath;
            if (props.init){
                props.init(this);
            }
            this.commands.set(props.help.name, props);
            props.help.aliases.forEach((alias) => {
                this.aliases.set(alias, props.help.name);
            });
            return false;
        } catch (e) {
            return `Couldn't load command ${commandName}: ${e}`;
        }
    }

    async unloadCommand (commandPath, commandName) {
        let command;
        if(this.commands.has(commandName)) {
            command = this.commands.get(commandName);
        } else if(this.aliases.has(commandName)){
            command = this.commands.get(this.aliases.get(commandName));
        }
        if(!command){
            return `Command not found: ${commandName}`;
        }
        if(command.shutdown){
            await command.shutdown(this);
        }
        delete require.cache[require.resolve(`${commandPath}${path.sep}${commandName}.js`)];
        return false;
    }

    async findOrCreateUser({ id: userID }, isLean){
        if(this.databaseCache.users.get(userID)){
            return isLean ? this.databaseCache.users.get(userID).toJSON() : this.databaseCache.users.get(userID);
        } else {
            let userData = (isLean ? await this.usersData.findOne({ id: userID }).lean() : await this.usersData.findOne({ id: userID }));
            if(userData){
                if(!isLean) this.databaseCache.users.set(userID, userData);
                return userData;
            } else {
                userData = new this.usersData({ id: userID });
                await userData.save();
                this.databaseCache.users.set(userID, userData);
                return isLean ? userData.toJSON() : userData;
            }
        }
    }


    async findOrCreateMember({ id: memberID, guildID }, isLean){
        if(this.databaseCache.members.get(`${memberID}${guildID}`)){
            return isLean ? this.databaseCache.members.get(`${memberID}${guildID}`).toJSON() : this.databaseCache.members.get(`${memberID}${guildID}`);
        } else {
            let memberData = (isLean ? await this.membersData.findOne({ guildID, id: memberID }).lean() : await this.membersData.findOne({ guildID, id: memberID }));
            if(memberData){
                if(!isLean) this.databaseCache.members.set(`${memberID}${guildID}`, memberData);
                return memberData;
            } else {
                memberData = new this.membersData({ id: memberID, guildID: guildID });
                await memberData.save();
                const guild = await this.findOrCreateGuild({ id: guildID });
                if(guild){
                    guild.members.push(memberData._id);
                    await guild.save();
                }
                this.databaseCache.members.set(`${memberID}${guildID}`, memberData);
                return isLean ? memberData.toJSON() : memberData;
            }
        }
    }

    usageEmbed(guild, command, data){
        const { client } = require('../app')
        return new MessageEmbed()
            .setAuthor({name: client.user.username, iconURL: client.user.displayAvatarURL(), url: client.website})
            .setDescription(guild.translate("language:usage")
                .replace('{syntax}', guild.translate(command.help.category + "/" + command.help.name  + ":general:syntax"))
                .replace('{emotes.error}', client.emotes.error)
                .replace('{emotes.arrow}', client.emotes.arrow)
                .replace('{example}', guild.translate(command.help.category + "/" + command.help.name  + ":general:examples")))
            .setColor(client.embedColor)
            .setFooter({text: data.guild.footer});
    }

    async findGuild(guildId) {
        const cachedGuild = this.databaseCache.guilds.get(guildId);
        if(cachedGuild) return cachedGuild;
        return await this.guildsData.findOne({id: guildId});
    }

    async findOrCreateGuild({ id: guildID }, isLean) {
        if (this.databaseCache.guilds.get(guildID)) {
            return isLean ? this.databaseCache.guilds.get(guildID).toJSON() : this.databaseCache.guilds.get(guildID);
        } else {
            let guildData = (isLean ? await this.guildsData.findOne({id: guildID}).populate("members").lean() : await this.guildsData.findOne({id: guildID}).populate("members"));
            if (guildData) {
                if (!isLean) this.databaseCache.guilds.set(guildID, guildData);
                return guildData;
            } else {
                guildData = new this.guildsData({id: guildID});
                await guildData.save();
                this.databaseCache.guilds.set(guildID, guildData);
                return isLean ? guildData.toJSON() : guildData;
            }
        }
    }

    async resolveUser(search){
        let user = null;
        if(!search || typeof search !== "string") return;
        if(search.match(/^<@!?(\d+)>$/)){
            const id = search.match(/^<@!?(\d+)>$/)[1];
            user = this.users.fetch(id).catch(() => {});
            if(user) return user;
        }
        if(search.match(/^!?(\w+)#(\d+)$/)){
            let userTag = search.match(/^!?(\w+)#(\d+)$/)[0];
            const username = userTag.split('#')[0]
            const discriminator = userTag.split('#')[1]
            user = this.users.cache.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.discriminator === discriminator);
            if(user) return user;
        }
        user = await this.users.fetch(search).catch(() => {});
        return user;
    }

    async resolveMember(search, guild){
        let member = null;
        if(!search || typeof search !== "string") return;
        if(search.match(/^<@!?(\d+)>$/)){
            const id = search.match(/^<@!?(\d+)>$/)[1];
            member = await guild.members.fetch(id).catch(() => {});
            if(member) return member;
        }
        if(search.match(/^!?(\w+)#(\d+)$/)){
            guild = await guild.fetch();
            member = guild.members.cache.find((m) => m.user.tag === search);
            if(member) return member;
        }
        member = await guild.members.fetch(search).catch(() => {});
        return member;
    }

    async resolveRole(search, guild){
        let role = null;
        if(!search || typeof search !== "string") return;
        if(search.match(/^<@&!?(\d+)>$/)){
            const id = search.match(/^<@&!?(\d+)>$/)[1];
            role = guild.roles.cache.get(id);
            if(role) return role;
        }
        role = guild.roles.cache.find((r) => search === r.name);
        if(role) return role;
        role = guild.roles.cache.get(search);
        return role;
    }
}

module.exports = Nevar;
