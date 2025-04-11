// middleware to allow admin users only
module.exports.requireAdmin = (req, res, next) => {
  // checks if the user is logged in and has the 'admin' role
  if (req.session.user && req.session.user.role === "admin") {
      return next(); // goes to next middleware step
  }
  // denies if not 'admin'
  return res.status(403).send("Access Denied: Admins Only");
};

// middleware to allow staff users 
module.exports.requireStaff = (req, res, next) => {
  // checks if the user is logged in and has  the 'staff'
  if (req.session.user && req.session.user.role === "staff") {
      return next(); // goes to next middleware step
  }
  // If not staff, deny access
  return res.status(403).send("Access Denied: Staff Only");
};

// middleware to ensure the user is logged in
module.exports.requireLogin = (req, res, next) => {
  // checks if the user session exists
  if (req.session.user) {
      return next(); // goes to the next middleware/route
  }
  // if not logged in, redirect to login page
  return res.redirect("/login");
};
