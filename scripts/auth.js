const Guild = require('../models/Guild'),
    { google } = require('googleapis');

/**
 * ======AUTH======
 * Handles actions relating to authorization
 */

const methods = {};

/**
 * Returns true if the message was sent by the owner of a guild
 * @param {*} message 
 */
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
 * Adds the token to the database and guildList array
 * @param {*} message 
 * @param {*} guildList 
 */
methods.handleToken = (message, guildList) => {
    if (guildList.length == 0) return message.channel.send('I am not in your server!');
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
        for (let i = 0; i < guildList.length; i++) {
            if (guildList[i].ownerId == message.author.id && guildList[i].guildId == targetGuildId) {
                targetIndex = i;
                break;
            }
        }
        // if the provided guild/owner id match
        if (targetIndex !== -1) {
            // get the token
            guildList[targetIndex].oAuth2Client.getToken(code, (err, token) => {
                if (err) return message.channel.send('There was an error with your token code');
                // set the token in the client
                guildList[targetIndex].oAuth2Client.setCredentials(token);
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
};

/**
 * Returns an guildList array given credentials and tokens
 * Previously: authenticateTokens
 * @param {*} gcalCredentials 
 * @param {*} emptyGuilds 
 */
methods.populateGuildList = (gcalCredentials, emptyGuilds) => {
    const guildList = [];
    emptyGuilds.map(guild => {
        const oAuth2Client = methods.newOAuth2Client(gcalCredentials);
        oAuth2Client.setCredentials(guild.token);
        guildList.push({
            calendarId: guild.calendarId,
            guildId: guild.guildId,
            ownerId: guild.ownerId,
            oAuth2Client: oAuth2Client,
            events: []
        });
    });
    return guildList;
};

/**
 * Returns a new oAuth2Client given proper credentials
 * @param {*} gcalCredentials 
 */
methods.newOAuth2Client = (gcalCredentials) => {
    const { client_secret, client_id, redirect_uris } = gcalCredentials.installed;
    return new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
};

module.exports = methods;