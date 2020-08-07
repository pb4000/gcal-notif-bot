const Guild = require('../models/Guild'),
    calendars = require('./calendars');

/**
 * ======GUILD HANDLER======
 * Handles actions relating to manipulation of the Guild db
 */

const methods = {};

/**
 * Removes any Guild entries in the db without a token
 */
methods.removeUnfinishedEntries = () => {
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
};

/**
 * Deletes a specified guild from the db. Used when leaving a guild
 * @param {*} guildId Id of the guild
 * @param {*} ownerId Id of the owner of said guild
 */
methods.deleteGuild = (guildId, ownerId) => {
    Guild.findOneAndDelete({
        guildId: guildId,
        ownerId: ownerId
    }, (err) => {
        if (err) return console.error('Error deleting guild from guild db: ', err);
    });
};

/**
 * Creates a new guild entry in the db and returns an oAuthClient to be added to the array
 * @param {*} guild Guild object provided when joining a new guild
 * @param {*} oAuth2Client oAuth2 object to associate with said guild
 */
methods.createGuild = (guild, oAuth2Client) => {
    const oAuthClient = {};
    // add guild and its owner's ids to Guild DB
    Guild.create({
        guildId: guild.id,
        ownerId: guild.ownerID,
        calendardId: 'primary'
    }, (err) => {
        if (err) return console.log('Failed to add new unfinished guild to db.');
        // add new oAuthClient to guildList array
        oAuthClient.guildId = guild.id;
        oAuthClient.ownerId = guild.ownerID;
        oAuthClient.calendardId = guild.calendardId;
        oAuthClient.oAuth2Client = oAuth2Client;
        oAuthClient.events = [];
    });
    return oAuthClient;
};

/**
 * Retrieves the events for each calendar, saving it in the guildList object
 * @param {*} guildList List of all connected guilds
 */
methods.fillEvents = async (guild) => {
    if (guild.oAuth2Client && guild.oAuth2Client.credentials) {
        // retrieve all events within the next 7 days
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 7);
        const events = await calendars.listEvents(guild.oAuth2Client, {
            calendarId: guild.calendarId,
            timeMin: (new Date()).toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: false
        });
        if (!events) {
            console.log('No events found in calendar with id: ' + guild.calendarId + ' for server with id: ' + guild.guildId);
            return guild;
        }
        events.forEach(event => {
            guild.events.push(event);
        });
    }
    return guild;
}

methods.populateGuildEvents = async (guildList) => {
    for (let i = 0; i < guildList.length; i++) {
        console.log('Retrieving events for guild with id: ' + guildList[i].guildId);
        const guild = await methods.fillEvents(guildList[i]);
        guildList[i] = guild;
    }
}

module.exports = methods;