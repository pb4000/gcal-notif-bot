const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    "token": {},
    "guildId": String,
    "ownerId": String
});

module.exports = mongoose.model("Guild", guildSchema);