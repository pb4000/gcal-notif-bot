const { google } = require('googleapis'),
    Guild = require('../models/Guild');

module.exports = {
    /**
     * Iterate through calendars array, authenticating each one
     */
    authenticateTokens: (credentials, tokens) => {
        const oAuthClients = [];
        tokens.map(token => {
            const { client_secret, client_id, redirect_uris } = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0]);
            oAuth2Client.setCredentials(token);
            oAuthClients.push({
                calendarId: token.calendarId,
                guildId: token.guildId,
                ownerId: token.ownerId,
                oAuth2Client: oAuth2Client
            });
        });
        return oAuthClients;
    },
    /**
     * Returns a new oAuth2 client without a token
     */
    newOAuth2Client: (credentials) => {
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        return new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
    },

    /**
     * Checks for and removes unfinished setup
     */
    removeUnfinishedEntries: () => {
        Guild.find({}, (err, guilds) => {
            if (err) console.error('Error finding guilds to remove: ', err);
            guilds.forEach(guild => {
                if (!guild.token) {
                    Guild.findOneAndDelete({
                        guildId: guild.guildId
                    }, (err) => {
                        if (err) return console.error('Error deleing unused guild entry: ', err);
                        return console.log('Deleted unused guild entry with guildId: ' + guild.guildId);
                    });
                }
            })
        });
    },

    /**
     * Deletes the guild with the given id
     */
    deleteGuild: (guildId, ownerId) => {
        Guild.findOneAndDelete({
            guildId: guildId,
            ownerId: ownerId
        }, (err) => {
            if (err) return console.error('Error deleting guild from guild db: ', err);
        });
    },

    /**
     * Creates a new guild entry without a token, returning an oAuthClient
     */
    createGuild: async (guild, oAuth2Client) => {
        let oAuthClient;
        // add guild and its owner's ids to Guild DB
        await Guild.create({
            guildId: guild.id,
            ownerId: guild.ownerID
        }, async (err) => {
            if (err) return console.log('Failed to add new unfinished guild to db.');
            // add new oAuthClient to oAuthClients array
            oAuthClient = {
                guildId: guild.id,
                ownerId: guild.ownerID,
                oAuth2Client: oAuth2Client
            };
        });
        return oAuthClient;
    }
}