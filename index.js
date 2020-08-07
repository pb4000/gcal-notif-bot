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
    auth = require('./scripts/auth'),
    guilds = require('./scripts/guilds'),
    events = require('./scripts/events'),
    Guild = require('./models/Guild'),
    EventEmitter = require('events');


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
    // init discord vars
    const client = new Discord.Client(),
        SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
    // init event vars for gcal events
    class Emitter extends EventEmitter { };
    const eventEmitter = new Emitter();

    /**
     * ======AUTH======
     */

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
        console.log('Connected to db\n\n==========\n\n');
    });

    // ===GCAL===

    // get the db entry for each guild
    const emptyGuilds = await Guild.find({}, (err, guildsOut) => {
        if (err) return console.log(err);
        console.log('Retreived empty guilds\n\n==========\n\n');
        return guildsOut;
    });
    // create oAuth clients with each token
    const guildList = auth.populateGuildList(credentials.gcal, emptyGuilds);
    console.log('Authenticated tokens\n\n==========\n\n');

    // retrieve events from each calendar and fill them into the guildList
    // for each guild
    console.log('Retrieving events...\n----------');
    await guilds.populateGuildEvents(guildList);
    console.log('Retrieved events\n\n==========\n\n');

    /**
     * ======EVENTS======
     */

    // ===DISCORD===
    events.initEvents(client, guildList, credentials, SCOPES);

    // ===GOOGLE CALENDAR===
    // when a new calendar event is created, add the event to array of cached events?
    eventEmitter.on('new-calendar-event', (event) => {
    });

    console.log('Done!\n\n');
}