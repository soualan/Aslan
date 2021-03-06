const { Guild } = require('discord.js');

Guild.prototype.translate = function (key, args) {
    const language = this.client.translations.get((this.data?.language ? this.data.language : 'de-DE'));
    if(!language) console.error(new Error("Invalid language given"))
    return language(key, args)
};

const { Message, Interaction } = require('discord.js');

Message.prototype.send = async function(embed, ping = false, buttons){
    let sent;
    if(buttons){
        if(ping) sent = await this.reply({
            embeds: [embed],
            components: buttons
        }).catch(() => {});
        else sent = await this.reply({
            embeds:[embed],
            components: buttons,
            allowedMentions: ['user']
        }).catch(() => {});
    }else{
        if(ping) sent = await this.reply({
            embeds:[embed]
        }).catch(() => {});
        else sent = await this.reply({
            embeds:[embed],
            allowedMentions: ['user']
        }).catch(() => {});
    }
    return sent;
}

Interaction.prototype.send = async function(embed, ephemeral = false, buttons){
    let sent;
    if(buttons){
        if(ephemeral) sent = await this.reply({
            embeds: [embed],
            components: buttons,
            ephemeral: true
        }).catch(() => {});
        else sent = await this.reply({
            embeds: [embed],
            components: buttons,
            ephemeral: false,
            fetchReply: true
        }).catch((e) => {console.log(e)});
    }else{
        if(ephemeral) sent = await this.reply({
            embeds: [embed],
            ephemeral: true
        }).catch(() => {});
        else sent = await this.reply({
            embeds: [embed],
            ephemeral: false,
            fetchReply: true
        }).catch(() => {});
    }
    return sent;
}
