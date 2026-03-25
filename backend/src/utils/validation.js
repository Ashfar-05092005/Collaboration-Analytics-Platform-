const { validationResult } = require("express-validator");

/**
 * Enhanced validation middleware that catches and formats errors
 * Usage: app.post('/api/users', validateRequest(), createUser)
 */
const validateRequest =() => (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));
    
    console.warn(`[validation] Request validation failed for ${req.method} ${req.path}`);
    
    return res.status(400).json({
      success: false,
      data: null,
      message: "Request validation failed",
      errors: formattedErrors,
    });
  }
  next();
};

/**
 * Sanitize and validate pagination parameters
 * Returns: { page: number, limit: number, skip: number }
 */
const getPagination = (query, maxLimit = 100) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || 20));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return String(id).match(/^[0-9a-fA-F]{24}$/) !== null;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

/**
 * Check if value is defined and not null/empty
 */
const isDefined = (value) => {
  return value !== null && value !== undefined && value !== "";
};

/**
 * Sanitize query parameters to prevent injection
 */
const sanitizeQuery = (query) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      // Remove potential injection patterns while keeping useful operators
      sanitized[key] = value.slice(0, 255); // Limit string length
    } else if (typeof value === "number") {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((v) => String(v).slice(0, 255));
    }
  }
  return sanitized;
};

module.exports = {
  validateRequest,
  getPagination,
  isValidObjectId,
  isValidEmail,
  isDefined,
  sanitizeQuery,
};
