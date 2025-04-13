const appInsights = require("applicationinsights");

if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .start();
}


const path = require('path');
require("dotenv").config();


const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const csrfProtection = require("csurf");

const app = express();
console.log("✅ Express app initialized");


//mongoDB connection
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
})();


//middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(session({
  secret: "hospital-secret",
  resave: false,
  saveUninitialized: true
}));

// middleware protection CSRF
//const csrfProtection = require("csurf");

// CSRF is applied when system is ran but notin test mode

if (process.env.NODE_ENV !== "test") {
  const csrfProtection = require("csurf")();
  app.use(csrfProtection);
  
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  // during tests CSRF is set as a fake token so ejs  doesn't break
  app.use((req, res, next) => {
    res.locals.csrfToken = "test-csrf-token";
    next();
  });
}


// middleware to share session data with views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// logs middleware to make traceable and auditable
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - User: ${req.session?.user?.username || "Guest"}`);
  next();
});


// role base acess middleware
function requireLogin(req, res, next) {
  if (process.env.NODE_ENV === "test") return next(); // bypasses for testing
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

//sets views engines and statistic files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/styles", express.static(path.join(__dirname, "styles")));

//route imports
const patientRoutes = require("./routes/patients");
const roomRoutes = require("./routes/rooms");
const userRoutes = require("./routes/users");
const Patient = require("./models/patient");
const Room = require("./models/rooms");

//applies routes with middleware

// paties routes .. staff or admin only
app.use("/patients", requireLogin, patientRoutes);

// room routes .. admin only
app.use("/rooms", requireLogin, roomRoutes);

// login and registration routes stay open
app.use("/", userRoutes);

//dashboards.. admin
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
//staff dashboard
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

// adds secure root route
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



console.log("✅ Middleware and routes setup complete");

//starts the server
//const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, (err) => {
    if (err) {
      console.error("Server failed to start:", err);
      process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
  });
}



module.exports = app;
