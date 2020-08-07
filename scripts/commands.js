const guilds = require('./guilds'),
    auth = require('./auth'),
    Guild = require('../models/Guild'),
    calendars = require('./calendars');

/**
 * Handles each option for a discord command
 */

module.exports = {
    /**
     * Returns the type of the given command
     */
    commandType: (command) => {
        const commands = ['bot', 'token', 'authenticate', 'setChannel', 'stop', 'run',
            'listCalendars', 'setCalendar', 'activeCalendar', 'status', 'help'];
        return commands.find(element => command.toLowerCase().indexOf('!' + element.toLowerCase()) !== -1);
    },

    /**
     * Sends a list of each calendar and its respective id to the user
     */
    listCalendars: async (message, oAuth2Client) => {
        const userCalendars = await calendars.listCalendars(oAuth2Client);
        let output = '';
        userCalendars.forEach(calendar => {
            output += '======\nName: ' + calendar.summary.trim() + '\nID: ' + calendar.id + '\n======';
        });
        message.channel.send(output);
    },

    /**
     * Sets the target calendar
     */
    setCalendar: async (message, oAuth2Client, guildList) => {
        // update db
        const output = await calendars.setCalendar(message, oAuth2Client);
        if (output !== 'success') {
            console.error('Error with the setCalendar command for guild with id: ' + message.guild.id);
            return;
        }
        const calendarId = message.content.substring(13).trim();
        // now update the calendarId in the cached guildList
        for (let i = 0; i < guildList.length; i++) {
            if (guildList[i].ownerId == message.guild.ownerID && guildList[i].guildId == message.guild.id) {
                guildList[i].calendarId = calendarId;
                guildList[i].calendarSummary = 
                message.channel.send('Calendar successfully set!');
                console.log('Calendar successfully set to ' + calendarId + ' for guild with id ' + guildList[i].guildId);
                console.log('Refreshing events now...');
                guildList[i].events = [];
                guilds.fillEvents(guildList[i]);
                console.log('Events refreshed!');
                return;
            }
        }
        console.log('Error in the setCalendar command!');
        message.channel.send('There was an error with my code. Let my creator know!');
    },

    /**
     * Returns the name and id of the calendar being actively monitored
     */
    activeCalendar: async (message, guild) => {
        const serverCalendars = await calendars.listCalendars(guild.oAuth2Client);
        for (let i = 0; i < serverCalendars.length; i++) {
            if (serverCalendars[i].id == guild.calendarId) {
                return message.channel.send(serverCalendars[i].summary + ' is the active calendar.');
            }
        }
    },

    help: (message) => {
        message.channel.send('Command list:\n==========\n\n!help  --> This menu.\n\n'
            + '!listCalendars  --> Lists the calendars in your linked account.\n\n'
            + '!setCalendar <calendarID>  --> Sets the specified calendar as your active calendar. CalendarID can be found with the !listCalendars command.\n\n'
            + '!activeCalendar  --> Shows which calendar is currently set as active.');
    }
};