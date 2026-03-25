const { failure } = require("../response");

const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Server error";
  failure(res, message, status);
};

module.exports = { errorHandler };

