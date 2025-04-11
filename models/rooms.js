const mongoose = require("mongoose"); 
// imports Mongoose for database schema/model creation

const roomSchema = new mongoose.Schema({
  roomNumber: String,                           // rooms identifier (e.g., "101A")
  type: String,                                 // rooms type (e.g., "ICU", "General")
  capacity: Number,                             // max number of patients per room
  isAvailable: { type: Boolean, default: true } // availability status, starts as true
});

// exports the Mongoose model for room.. using the schema
module.exports = mongoose.model("Room", roomSchema);


