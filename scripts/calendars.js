const { google } = require('googleapis'),
    Guild = require('../models/Guild');

const methods = {};

/**
 * Gets a list of events in the specified calendar
 * @param {google.auth.OAuth2} auth oAuth2Client used to create calendar
 * @param {Object} params params to be passed to the list method
 */
methods.listEvents = async (auth, params) => {
    const calendar = google.calendar({ version: 'v3', auth: auth });
    const res = await calendar.events.list(params);
    if (!res) return console.error('Error listing events from ' + params.calendarId);
    if (!res.data.items.length) return console.log('No events found in calendar: ' + params.calendarId);
    return res.data.items;
}

/**
 * Gets a list of all calendars from the user's account
 * @param {google.auth.OAuth2} auth oAuth2Client used to create calendar object
 */
methods.listCalendars = async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth: auth });
    const res = await calendar.calendarList.list({});
    if (!res) return console.error('Error listing calendars');
    if (!res.data.items.length) return console.log('No calendars found');
    return res.data.items;
}

/**
 * Returns true if the provided calendar ID exists
 * @param {google.auth.OAuth2} auth oAuth2Client
 */
methods.validCalendar = async (auth, targetId) => {
    const calendar = google.calendar({ version: 'v3', auth: auth });
    const res = await calendar.calendarList.list({});
    if (!res) return console.error('Error getting calendars');
    if (!res.data.items.length) return false;
    return res.data.items.some(cal => cal.id == targetId);
};

methods.setCalendar = async (message, oAuth2Client) => {
    const calendarId = message.content.substring(13).trim();
    // if the provided calendar id is not valid, send an error message
    if (calendarId.length == 0 || !methods.validCalendar(oAuth2Client, calendarId)) return message.channel.send("Invalid calendar ID. Ensure your command follows the format '!setCalendar <calendarID>' and that you are using a valid calendar ID.");
    // otherwise the provided id is valid
    // find the calendar in the db
    const res = await Guild.findOne({
        guildId: message.guild.id,
        ownerId: message.guild.ownerID
    });
    if (!res) return console.error('Error retrieving guilds from db');
    if (!res) {
        console.error('Guild with id: ' + message.guild.id + ' is not in the db');
        return message.channel.send('Your server is not in my database! Kick me, then invite me back.');
    }
    // update it
    res.calendarId = calendarId;
    // save it
    const guild = await Guild.findOneAndUpdate({
        guildId: message.guild.id,
        ownerId: message.guild.ownerID
    }, res);
    if (!guild) {
        console.error('Error updating guild in db with id: ' + message.guild.id);
        return message.channel.send('Error updating your server in my db. Try kicking me, then inviting me back!');
    }
    return 'success';
};

module.exports = methods;