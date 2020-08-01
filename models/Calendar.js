const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
    "token": {},
    "guildId": String,
    "ownerId": String
});

module.exports = mongoose.model("Calendar", calendarSchema);