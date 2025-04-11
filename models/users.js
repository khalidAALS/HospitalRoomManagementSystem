const mongoose = require("mongoose");
// imports the Mongoose for MongoDB

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // unique username (required)
  password: { type: String, required: true },               // hashed password (required)
  role: {
    type: String,
    enum: ["admin", "staff"],                               // role must be 'admin' or 'staff'
    default: "staff"                                        // default role is 'staff'
  },
  approved: { type: Boolean, default: false }               // admin approval status, default is false untill approved
});

// exports Mongoose model for user
module.exports = mongoose.model("User", userSchema);
