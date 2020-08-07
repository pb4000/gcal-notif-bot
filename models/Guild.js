const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    "token": {},
    "guildId": String,
    "ownerId": String,
    "calendarId": String,
    "running": Boolean
});

module.exports = mongoose.model("Guild", guildSchema);