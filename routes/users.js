const express = require("express");
const router = express.Router();
const User = require("../models/users");
const bcryptjs = require('bcryptjs');


// admin middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access Denied: Admins only");
  }
  next();
}

// signup
router.get("/signup", (req, res) => {
  const { success } = req.query;
  res.render("signup", { success, error: null });
});

// signup - POST
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.render("signup", { error: "Username already exists.", success: null });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: "staff",
      approved: false
    });

    await newUser.save();

    // redirects with set query params
    res.redirect("/signup?success=1");
  } catch (err) {
    console.error("Signup error:", err.message);
    res.render("signup", { error: "Something went wrong. Please try again.", success: null });
  }
});

//login
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).render("login", { error: "Invalid username or password." });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).render("login", { error: "Invalid username or password." });
    }

    if (user.role === "staff" && !user.approved) {
      return res.status(403).render("login", { error: "Your account is pending approval." });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role.toLowerCase()
    };

    if (user.role.toLowerCase() === "admin") {
      return res.redirect("/dashboard_admin");
    } else if (user.role.toLowerCase() === "staff") {
      return res.redirect("/dashboard_staff");
    }

    res.status(400).send("Unknown user role.");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed.");
  }
});

// admin management
router.get("/admin/pending-users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "staff", approved: false });
    res.render("admin/pending_users", { users });
  } catch (err) {
    console.error("Error fetching pending users:", err.message);
    res.status(500).send("Error loading pending users.");
  }
});

router.post("/admin/users/:id/approve", requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approved: true });
    res.redirect("/admin/pending-users");
  } catch (err) {
    console.error("Error approving user:", err.message);
    res.status(500).send("Failed to approve user.");
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admin/pending-users");
  } catch (err) {
    console.error("Error deleting user:", err.message);
    res.status(500).send("Failed to delete user.");
  }
});

// logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
