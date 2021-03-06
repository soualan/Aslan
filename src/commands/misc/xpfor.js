const Command = require('../../core/command');
const { MessageEmbed} = require('discord.js');
const {SlashCommandBuilder} = require("@discordjs/builders");
const Levels = require('discord-xp');

class Xpfor extends Command {

    constructor(client) {
        super(client, {
            name: "xpfor",
            description: "misc/xpfor:general:description",
            dirname: __dirname,
            cooldown: 5000,
            slashCommand: {
                addCommand: true,
                data: new SlashCommandBuilder()
                    .addIntegerOption(option => option.setRequired(true))
            }
        });
    }

    async run(interaction, message, args, data) {

        function secondsToTime(secs){
            secs = Math.round(secs);
            let hours = Math.floor(secs / (60 * 60));

            let divisor_minutes = secs % (60 * 60);
            let minutes = Math.floor(divisor_minutes / 60);

            let divisor_seconds = divisor_minutes % 60;
            let seconds = Math.ceil(divisor_seconds);

            return hours + 'h ' + minutes + 'm ' + seconds + 's';
        }
        let guild = interaction?.guild || message?.guild;
        let member = interaction?.member || message?.member;

        if(parseInt(args[0]) && parseInt(args[0]) >= 1){
            let neededXp = this.client.format(Levels.xpFor(parseInt(args[0])));
            let time = secondsToTime(Levels.xpFor(parseInt(args[0])) / 15 * 25);
            let embed = new MessageEmbed()
                .setAuthor({name: this.client.user.username, iconURL: this.client.user.displayAvatarURL(), url: this.client.website})
                .setDescription(guild.translate("misc/xpfor:main:text")
                    .replace('{level}', parseInt(args[0]))
                    .replace('{xp}', neededXp)
                    .replace('{count}', this.client.format(Math.round(Levels.xpFor(parseInt(args[0])) / 15)))
                    .replace('{time}', time)
                    .replace('{emotes.arrow}', this.client.emotes.arrow))
                .setColor(this.client.embedColor)
                .setFooter({text: data.guild.footer});
            if(message) return message.send(embed, false);
            if(interaction) return interaction.send(embed);

        }else{
            if(message) return message.send(this.client.usageEmbed(guild, this, data));
            if(interaction) return interaction.send(this.client.usageEmbed(guild, this, data));
        }
    }
}

module.exports = Xpfor;
