const mongoose = require("mongoose"); 
// imports the Mongoose library for MongoDB 

const patientSchema = new mongoose.Schema({
  name: String,                        // patientss name
  age: Number,                         // patients age
  condition: String,                   // condition severity: Low, Medium, High
  symptoms: [String],                 // list of symptoms
  infectionRisk: Boolean,             // whether or not the patient poses infection risk
  isIsolated: { type: Boolean, default: false }, // flags for isolation, starts as false
  room: { type: String, default: null }          // assigned room ID/name, null if none
});

// exports the Mongoose model for patients.. using the schema
module.exports = mongoose.model("Patient", patientSchema);
