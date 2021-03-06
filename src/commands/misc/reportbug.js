const Command = require('../../core/command');
const { MessageEmbed} = require('discord.js');
const {SlashCommandBuilder} = require("@discordjs/builders");
const moment = require('moment');

class Reportbug extends Command {

    constructor(client) {
        super(client, {
            name: "reportbug",
            description: "misc/reportbug:general:description",
            dirname: __dirname,
            aliases: ["reportbugs", "bug", "bugreport", "report-bug"],
            cooldown: 5000,
            slashCommand: {
                addCommand: true,
                data: new SlashCommandBuilder()
                    .addStringOption(option => option.setRequired(true))
            }
        });
    }
    async run(interaction, message, args, data){
        const guild = interaction?.guild || message.guild;
        const member = interaction?.member || message.member;

        if(!args[0]){
            if(message) return message.send(this.client.usageEmbed(guild, this, data));
            if(interaction) return interaction.send(this.client.usageEmbed(guild, this, data));
        }

        let date = moment.tz(Date.now(), guild.translate("language:timezone")).format(guild.translate("language:dateformat"))
        let privateEmbed = new MessageEmbed()
            .setAuthor({name: this.client.user.username, iconURL: this.client.user.displayAvatarURL(), url: this.client.website})
            .setDescription(guild.translate("misc/reportbug:main:bugPrivate")
                .replace('{bug}', args.join(' '))
                .replace('{emotes.bug}', this.client.emotes.badges.bughunter_2))
            .setColor(this.client.embedColor)
            .setFooter({text: guild.translate("misc/reportbug:main:privateFooter")
                    .replace('{user}', member.user.tag)
                    .replace('{userId}', member.user.id)
                    .replace('{guild}', guild.name)
                    .replace('{guildId}', guild.id)
                    .replace('{time}', date), iconURL: member.user.displayAvatarURL()});

        let publicEmbed = new MessageEmbed()
            .setAuthor({name: this.client.user.username, iconURL: this.client.user.displayAvatarURL(), url: this.client.website})
            .setDescription(guild.translate("misc/reportbug:main:bugPublic")
                .replace('{bug}', args.join(' '))
                .replace('{emotes.bug}', this.client.emotes.badges.bughunter_1))
            .setColor(this.client.embedColor)
            .setFooter({text: data.guild.footer});

        if(message) message.send(publicEmbed);
        if(interaction) interaction.send(publicEmbed);

        let supportGuild = await this.client.guilds.fetch(this.client.config.support.id);
        let logChannel = await supportGuild.channels.fetch(this.client.config.support.bot_log);
        if(logChannel) logChannel.send({embeds: [privateEmbed]});
    }
}

module.exports = Reportbug;
