require("dotenv").config(); 
const path = require('path');
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const csrfProtection = require("csurf");

console.log("✅ Express app initialized");

let telemetryClient = null;

// app insights setup - only if connection string is provided
if (process.env.APPINSIGHTS_CONNECTION_STRING) {
  const appInsights = require("applicationinsights");

  appInsights.setup(process.env.APPINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoDependencyCorrelation(true)
    .setInternalLogging(false, false)
    .setSendLiveMetrics(true)
    .start();

  telemetryClient = appInsights.defaultClient;
  telemetryClient.trackTrace({ message: "Application Insights initialized" });
}

const app = express();
app.set('trust proxy', 1);


// MongoDB connection
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    if (telemetryClient) {
      telemetryClient.trackTrace({ message: "MongoDB connected successfully - telemetry active" });
    }

    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
})();

// middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(session({
  secret: "hospital-secret",
  resave: false,
  saveUninitialized: true
}));

// CSRF protection middleware
if (process.env.NODE_ENV !== "test") {
  const csrf = require("csurf")();
  app.use(csrf);
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  // fake CSRF token for testing
  app.use((req, res, next) => {
    res.locals.csrfToken = "test-csrf-token";
    next();
  });
}

// middlware to share session with views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// login middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - User: ${req.session?.user?.username || "Guest"}`);
  next();
});

// role-based access middleware
function requireLogin(req, res, next) {
  if (process.env.NODE_ENV === "test") return next();
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV === "test") return next();
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access Denied: Admins only");
  }
  next();
}

function requireStaff(req, res, next) {
  if (process.env.NODE_ENV === "test") return next();
  if (!req.session.user || req.session.user.role !== "staff") {
    return res.status(403).send("Access Denied: Staff only");
  }
  next();
}

// sets view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/styles", express.static(path.join(__dirname, "styles")));

// route imports
const patientRoutes = require("./routes/patients");
const roomRoutes = require("./routes/rooms");
const userRoutes = require("./routes/users");
const Patient = require("./models/patient");
const Room = require("./models/rooms");

// applies routes with middleware
app.use("/patients", requireLogin, patientRoutes);
app.use("/rooms", requireLogin, roomRoutes);
app.use("/", userRoutes);

// admin dashboard route
app.get("/dashboard_admin", requireAdmin, async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalRooms = await Room.countDocuments();
    const isolatedPatients = await Patient.countDocuments({ isIsolated: true });
    const availableRooms = await Room.countDocuments({ isAvailable: true });

    res.render("dashboard_admin", {
      totalPatients,
      totalRooms,
      isolatedPatients,
      availableRooms
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).send("Error loading dashboard.");
  }
});

// stafff dashboard route
app.get("/dashboard_staff", requireStaff, async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const isolatedPatients = await Patient.countDocuments({ isIsolated: true });
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ isAvailable: true });

    res.render("dashboard_staff", {
      totalPatients,
      isolatedPatients,
      totalRooms,
      availableRooms
    });
  } catch (err) {
    console.error("Staff Dashboard error:", err.message);
    res.status(500).send("Error loading staff dashboard.");
  }
});

// securee root route
app.get("/", (req, res) => {
  console.log("Root route hit");

  if (!req.session.user) {
    console.log("Unauthenticated user, redirecting to /login");
    return res.redirect("/login");
  }

  const role = req.session.user.role;
  console.log(`Authenticated user (${role}), redirecting to dashboard`);

  if (role === "admin") {
    return res.redirect("/dashboard_admin");
  } else if (role === "staff") {
    return res.redirect("/dashboard_staff");
  } else {
    return res.status(403).send("Unauthorized role");
  }
});

console.log("Middleware and routes setup complete");

// server export for testing
module.exports = app;
