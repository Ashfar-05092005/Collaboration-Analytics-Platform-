const { failure } = require("../response");

const errorHandler = (err, req, res, next) => {
  // Log error with context
  const timestamp = new Date().toISOString();
  const path = req.path;
  const method = req.method;
  
  console.error(
    `[error] ${timestamp} ${method} ${path}:`,
    err.message || err
  );

  // Default error response
  let status = 500;
  let message = "Internal Server Error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    console.error("[error] Validation details:", Object.keys(err.errors));
  } else if (err.name === "MongoError" || err.name === "MongoServerError") {
    status = 500;
    message = "Database error";
    console.error("[error] Database error code:", err.code);
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token expired";
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }

  // Send error response
  return failure(res, message, status);
};

module.exports = { errorHandler };

