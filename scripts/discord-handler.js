const calendarHandler = require('./calendar-handler'),
    Guild = require('../models/Guild');

const methods = {};

methods.initEvents = (client) => {
    /**
     * When receiving a new message
     */
    client.on('message', message => {
        // if the message is not sent by the bot
        if (message.author.id !== '735671393949319290') {
            // if the message is from a guild
            if (message.channel.type !== 'dm') {
                // otherwise the message is a dm
            } else {
                message.channel.send('dm ' + message.content);
            }
        }
    });

    /**
     * When joining a new guild
     */
    client.on('guildCreate', guild => {
        console.log('Joined guild: ' + guild.name);
        calendarHandler.newOAuth2Client(credentials);
        guild.owner.send("Hi");
    });
};

methods.verifyServerOwner = (message) => {
    let output = true;
    Guild.find({
        ownerId: message.author.id
    }, (err, guild) => {
        // if message author is a server owner and does not have a linked calendar
        if (err || !guild) output = false;
    });
    return output;
};

/**
 * Adds the token to the databse and oAuthClients array
 * @param {*} message 
 * @param {*} oAuthClients 
 */
methods.handleToken = (message, oAuthClients) => {
    if (oAuthClients.length == 0) return message.channel.send('I am not in your server!');
    // if the author is a server owner
    if (methods.verifyServerOwner(message)) {
        if (message.content.indexOf('--server') == -1) {
            console.log(message.author.id + ' made an authentication request without specifying their server');
            return message.channel.send("Looks like you forgot to add '--server <serverId>'!");
        }
        // get the code and server id
        const code = message.content.substring(6, message.content.indexOf('--server')).trim();
        const targetGuildId = message.content.substring(message.content.indexOf('--server') + 8).trim();
        // find index of target oAuth client
        let targetIndex = -1;
        for (let i = 0; i < oAuthClients.length; i++) {
            if (oAuthClients[i].ownerId == message.author.id && oAuthClients[i].guildId == targetGuildId) {
                targetIndex = i;
                break;
            }
        }
        // if the provided guild/owner id match
        if (targetIndex !== -1) {
            // get the token
            oAuthClients[targetIndex].oAuth2Client.getToken(code, (err, token) => {
                if (err) return message.channel.send('There was an error with your token code');
                // set the token in the client
                oAuthClients[targetIndex].oAuth2Client.setCredentials(token);
                // write the token to the db
                Guild.findOne({
                    ownerId: message.author.id,
                    guildId: targetGuildId
                }, (err, guild) => {
                    if (err) return console.log('Error finding guild.');
                    guild.token = token;
                    guild.save();
                    message.channel.send('Successfully linked your Google Calendar.');
                    console.log('Guild ' + guild.guildId + ' successfully authenticated their Google Calendar')
                });
            });
        }
    } else {
        message.channel.send('You are not a server owner.');
    }
    return oAuthClients;
}

module.exports = methods;