const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../models/User");

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, data: null, message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub)
      .select("role status name email points")
      .lean();
    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, data: null, message: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, data: null, message: "Invalid token" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, data: null, message: "Forbidden" });
  }
  next();
};

module.exports = { authenticate, authorize };

