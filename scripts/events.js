const guilds = require('./guilds'),
    auth = require('./auth'),
    Guild = require('../models/Guild'),
    commands = require('./commands');

module.exports = {
    initEvents: (client, guildList, credentials, SCOPES) => {

        /**
         * ======DISCORD EVENTS======
         */

        /**
         * When receiving a new message
         */
        client.on('message', message => {
            // if the message is not sent by the bot
            if (message.author.id !== client.user.id) {
                // if the message is from a guild
                if (message.channel.type !== 'dm') {
                    // find the guild object
                    const guild = guildList.find(element => element.guildId == message.guild.id
                        && element.ownerId == message.guild.ownerID);
                    // if the message author is an admin or the server owner, then respond to the command
                    if (message.member.roles.cache.some(role => role.name.toLowerCase() == 'admin') || message.author.id == guild.ownerId) {
                        switch (commands.commandType(message.content)) {
                            case 'bot':
                                message.channel.send(message.content.substring(5) + " ");
                                break;
                            case 'listCalendars':
                                if (!guild.oAuth2Client.credentials) return message.channel.send('You must link a Google account to do that!');
                                commands.listCalendars(message, guild.oAuth2Client);
                                break;
                            case 'setCalendar':
                                if (!guild.oAuth2Client.credentials) return message.channel.send('You must link a Google account to do that!');
                                commands.setCalendar(message, guild.oAuth2Client, guildList);
                                break;
                            case 'activeCalendar':
                                if (!guild.oAuth2Client.credentials) return message.channel.send('You must link a Google account to do that!');
                                commands.activeCalendar(message, guild);
                                break
                            case 'help':
                                commands.help(message);
                                break;
                            default:
                                break;
                        }
                    }
                    // otherwise the message is a dm
                } else {
                    switch (commands.commandType(message.content)) {
                        case 'token':
                            auth.handleToken(message, guildList);
                            break;
                        case 'authenticate':
                            break;
                        default:
                            break;
                    }
                }
            }
        });

        /**
         * When joining a new guild
         */
        client.on('guildCreate', async guild => {
            console.log('Joined guild: ' + guild.name);
            // add new guild to the db
            Guild.create({
                guildId: guild.id,
                ownerId: guild.ownerID,
                calendarId: 'primary',
                running: true
            }, (err) => {
                if (err) return console.log('Failed to add new unfinished guild to db.');
                // add new oAuthClient to guildList array
                guildList.push({
                    guildId: guild.id,
                    ownerId: guild.ownerID,
                    oAuth2Client: auth.newOAuth2Client(credentials.gcal)
                });
                // prompt guild owner to provide a token for their google calendar
                guild.owner.send('Authorize this app by visiting: ' + guildList[guildList.length - 1].oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: SCOPES
                }));
                guild.owner.send("Please reply here with '!token <token> --server " + guild.id + "' with <token> being the code you received from the link.");
            });
        });

        /**
         * When leaving a guild
         */
        client.on('guildDelete', guild => {
            console.log('Guild left: ' + guild.name);
            guilds.deleteGuild(guild.id, guild.ownerID);
        });

        client.once('ready', () => {
            console.log('Ready!');
        });
    }
}