const express = require("express");
const router = express.Router();
const Patient = require("../models/patient");
const Room = require("../models/rooms");

// updates room availability based on patient count & capacity
async function updateRoomAvailability(roomNumber) {
  const room = await Room.findOne({ roomNumber });
  if (!room) return;

  const assignedCount = await Patient.countDocuments({ room: roomNumber });
  room.isAvailable = assignedCount < room.capacity;
  await room.save();
}

//isolation priority evaluation
router.get("/isolation/evaluate", async (req, res) => {
  try {
    const patients = await Patient.find();
    for (const patient of patients) {
      const shouldIsolate =
        patient.condition === "High" ||
        (patient.symptoms && patient.symptoms.includes("Fever")) ||
        patient.infectionRisk === true;

      await Patient.findByIdAndUpdate(patient._id, { isIsolated: shouldIsolate });
    }
    res.redirect("/patients");
  } catch (err) {
    console.error("Error evaluating isolation:", err.message);
    res.status(500).send("Failed to evaluate isolation.");
  }
});

//view only isolated patients 
router.get("/isolation/list", async (req, res) => {
  try {
    const isolatedPatients = await Patient.find({ isIsolated: true });
    res.render("patients/index", { patients: isolatedPatients, uniqueConditions: [], query: {} });
  } catch (err) {
    console.error("Error loading isolation list:", err.message);
    res.status(500).send("Failed to load isolated patients.");
  }
});

// filter and lists all
router.get("/", async (req, res) => {
  try {
    const queryObj = {};
    if (req.query.name) queryObj.name = { $regex: req.query.name, $options: "i" };
    if (req.query.condition) queryObj.condition = req.query.condition;
    if (["true", "false"].includes(req.query.isIsolated)) {
      queryObj.isIsolated = req.query.isIsolated === "true";
    }
    if (req.query.room) queryObj.room = req.query.room;

    const patients = await Patient.find(queryObj);
    const uniqueConditions = await Patient.distinct("condition");

    res.render("patients/index", {
      patients,
      uniqueConditions,
      query: req.query
    });
  } catch (err) {
    console.error("Error fetching patients:", err.message);
    res.render("patients/index", { patients: [], uniqueConditions: [], query: {} });
  }
});

// form to add new patient
router.get("/new", (req, res) => {
  res.render("patients/new");
});

// add patient
router.post("/", async (req, res) => {
  try {
    const { name, age, condition, symptoms, infectionRisk } = req.body;

    const parsedSymptoms = symptoms ? symptoms.split(",").map(s => s.trim()) : [];
    const infectionFlag = infectionRisk === "true";

    const shouldIsolate =
      condition === "High" ||
      parsedSymptoms.includes("Fever") ||
      infectionFlag;

    const newPatient = new Patient({
      name,
      age,
      condition,
      symptoms: parsedSymptoms,
      infectionRisk: infectionFlag,
      isIsolated: shouldIsolate
    });

    await newPatient.save();
    res.redirect("/patients");
  } catch (err) {
    console.error("Error adding new patient:", err.message);
    res.status(500).send("Failed to add patient.");
  }
});

// view patient details
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json(patient); //JSON for the test
    }

    res.render("patients/show", { patient }); // normal user flow
  } catch (err) {
    console.error("Error retrieving patient:", err.message);
    res.status(404).send("Patient not found");
  }
});



// form to edit patient
router.get("/:id/edit", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    res.render("patients/edit", { patient });
  } catch (err) {
    console.error("Error loading the edit form:", err.message);
    res.status(404).send("Patient not found.");
  }
});

// updates the patient
router.put("/:id", async (req, res) => {
  try {
    const { name, age, condition, room } = req.body;
    await Patient.findByIdAndUpdate(req.params.id, { name, age, condition, room });
    res.redirect("/patients");
  } catch (err) {
    console.error("Error updating patient:", err.message);
    res.status(500).send("Failed to update patient.");
  }
});

// ability to assign patient from room
router.post("/:id/unassign", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient || !patient.room) return res.redirect("/patients");

    const oldRoom = patient.room;
    patient.room = null;
    await patient.save();

    await updateRoomAvailability(oldRoom);
    res.redirect("/patients");
  } catch (err) {
    console.error("Error unassigning room:", err.message);
    res.status(500).send("Failed to unassign room.");
  }
});

// discharges/deletes patient
router.post("/:id/discharge", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.redirect("/patients");

    const roomToUpdate = patient.room;
    await Patient.findByIdAndDelete(req.params.id);

    if (roomToUpdate) await updateRoomAvailability(roomToUpdate);
    res.redirect("/patients");
  } catch (err) {
    console.error("Error discharging patient:", err.message);
    res.status(500).send("Failed to discharge patient.");
  }
});

// deletes the patient with 'DELETE' _method
router.delete("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    const roomToUpdate = patient?.room;

    await Patient.findByIdAndDelete(req.params.id);

    if (roomToUpdate) await updateRoomAvailability(roomToUpdate);
    res.redirect("/patients");
  } catch (err) {
    console.error("Error deleting patient:", err.message);
    res.status(500).send("Failed to delete patient.");
  }
});

module.exports = router;
