/**
* Invite link:
* https://discord.com/api/oauth2/authorize?client_id=735671393949319290&permissions=198656&scope=bot
*/

/**
 * ======IMPORTS======
 */
const Discord = require('discord.js'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    { google } = require('googleapis'),
    discordHandler = require('./scripts/discord-handler.js'),
    calendarHandler = require('./scripts/calendar-handler'),
    Guild = require('./models/Guild');


// read credentials and login to discord
fs.readFile('credentials.json', (err, content) => {
    /**
     * ======AUTH======
     */
    // check credentials
    if (err) return console.error('No credentials found.', err);
    main(JSON.parse(content)).catch(e => {
        console.error(e);
        throw e;
    });
});

async function main(credentials) {
    // init vars
    const client = new Discord.Client(),
        SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

    // ===DISCORD===
    // login the client with discord bot token
    client.login(credentials.discord_token);

    // ===MONGODB===
    // connect to server containing gcal tokens
    await mongoose.connect('mongodb+srv://' + credentials.mongo.username + ':' + credentials.mongo.password + '@yelpcamp-production.ezt6p.mongodb.net/discord-gcal?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('Connected to db');
    });

    // ===GCAL===

    // get a token for each calendar
    const tokens = await Guild.find({}, (err, guilds) => {
        if (err) return console.log(err);
        console.log('Retreived guilds');
        return guilds;
    });
    // create oAuth clients with each token
    let oAuthClients = calendarHandler.authenticateTokens(credentials.gcal, tokens);
    console.log('Authenticated tokens');

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
                if (message.content.indexOf('!bot')) {
                    message.channel.send(message.content.substring(5));
                }
                // otherwise the message is a dm
            } else {
                // if dm message is a token code
                if (message.content.substring(0, 7).trim() == '!token') {
                    /**
                     * Handle a token command
                     */
                    oAuthClients = discordHandler.handleToken(message, oAuthClients);
                } else if (message.content.substring(0, 14).trim() == '!authenticate') {
                    // verify server owner, delete previous entries, send new auth link
                }
            }
        }
    });

    /**
     * When joining a new guild
     */
    client.on('guildCreate', async guild => {
        console.log('Joined guild: ' + guild.name);
        // add guild and its owner's ids to Guild DB, as well as link the calendar
        Guild.create({
            guildId: guild.id,
            ownerId: guild.ownerID,
        }, (err) => {
            if (err) return console.log('Failed to add new unfinished guild to db.');
            // add new oAuthClient to oAuthClients array
            oAuthClients.push({
                guildId: guild.id,
                ownerId: guild.ownerID,
                oAuth2Client: calendarHandler.newOAuth2Client(credentials.gcal)
            });
            // prompt guild owner to provide a token for their google calendar
            guild.owner.send('Authorize this app by visiting: ' + oAuthClients[oAuthClients.length - 1].oAuth2Client.generateAuthUrl({
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
        calendarHandler.deleteGuild(guild.id, guild.ownerID);
    });

    client.once('ready', () => {
        console.log('Ready!');
    });
}