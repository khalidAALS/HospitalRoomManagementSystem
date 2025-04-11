const express = require("express");
const router = express.Router();
const Room = require("../models/rooms.js");
const Patient = require("../models/patient.js");


// room assign route 

// form to assign room to specific person
router.get("/assign/:patientId", async (req, res) => {
  try {
    const rooms = await Room.find({ isAvailable: true });
    const patient = await Patient.findById(req.params.patientId);

    if (!patient) {
      return res.status(404).send("Patient not found.");
    }

    res.render("rooms/assign", { rooms, patient });
  } catch (err) {
    console.error("Error loading room assignment form:", err.message);
    res.status(500).send("Failed to load assignment page.");
  }
});

// assign room for all patients
router.get("/assign", async (req, res) => {
  try {
    const rooms = await Room.find({ isAvailable: true });
    const patients = await Patient.find({ room: null });
    res.render("rooms/assign", { rooms, patients }); 
  } catch (err) {
    console.error("Error loading room assignment page:", err.message);
    res.status(500).send("Failed to load assignment page.");
  }
});


// handles room assignment
router.post("/assign", async (req, res) => {
  try {
    const { patientId, roomNumber } = req.body;

    // assigns the patient to the room
    await Patient.findByIdAndUpdate(patientId, { room: roomNumber });

    // calculates how many patients are assigned
    const assignedCount = await Patient.countDocuments({ room: roomNumber });

    const room = await Room.findOne({ roomNumber });

    // sets isAvailable as false if room is full so shows as unavailable
    const isNowAvailable = assignedCount < room.capacity;
    room.isAvailable = isNowAvailable;
    await room.save();

    res.redirect("/patients");
  } catch (err) {
    console.error("Error assigning room:", err.message);
    res.status(500).send("Failed to assign room.");
  }
});

//rrom management

// viuew all rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.render("rooms/index", { rooms });
  } catch (err) {
    console.error("Error getting rooms:", err.message);
    res.status(500).send("Failed to load rooms.");
  }
});

// edit room form
router.get("/:id/edit", async (req, res) => {
  try {
    const roomToEdit = await Room.findById(req.params.id);
    res.render("rooms/edit", { room: roomToEdit });
  } catch (err) {
    console.error("Error loading room:", err.message);
    res.status(404).send("Room not found.");
  }
});

// updates the room
router.put("/:id", async (req, res) => {
  try {
    const { roomNumber, type, capacity } = req.body;
    await Room.findByIdAndUpdate(req.params.id, { roomNumber, type, capacity });
    res.redirect("/rooms");
  } catch (err) {
    console.error("Error updating room:", err.message);
    res.status(500).send("Failed to update room.");
  }
});

// form to add new rooms
router.get("/new", (req, res) => {
  res.render("rooms/new");
});

// adds the room
router.post("/", async (req, res) => {
  try {
    const { roomNumber, type, capacity } = req.body;
    const newRoom = new Room({ roomNumber, type, capacity });
    await newRoom.save();
    res.redirect("/rooms");
  } catch (err) {
    console.error("Error adding room:", err.message);
    res.status(500).send("Failed to add room.");
  }
});

// ability to view a single room
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json(room); //JSON for test
    }

    res.render("rooms/show", { room }); //normal user view
  } catch (err) {
    console.error("Error loading room details:", err.message);
    res.status(404).send("Room not found.");
  }
});


// deletes room
router.delete("/:id", async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.redirect("/rooms");
  } catch (err) {
    console.error("Error deleting room:", err.message);
    res.status(500).send("Failed to delete room.");
  }
});


module.exports = router;
