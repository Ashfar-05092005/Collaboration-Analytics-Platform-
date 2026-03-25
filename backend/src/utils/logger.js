/**
 * Structured logging utility for consistent error, warning, and info logging
 */

const logLevels = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const formatLog = (level, context, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logString = `[${timestamp}] [${context}] ${message}`;
  
  if (data) {
    return `${logString}\n${JSON.stringify(data, null, 2)}`;
  }
  return logString;
};

/**
 * Log error with context
 */
const logError = (context, message, error = null) => {
  const formatted = formatLog(logLevels.ERROR, context, message, error);
  console.error(formatted);
};

/**
 * Log warning with context
 */
const logWarn = (context, message, data = null) => {
  const formatted = formatLog(logLevels.WARN, context, message, data);
  console.warn(formatted);
};

/**
 * Log info with context
 */
const logInfo = (context, message, data = null) => {
  const formatted = formatLog(logLevels.INFO, context, message, data);
  console.log(formatted);
};

/**
 * Log debug info (only in development)
 */
const logDebug = (context, message, data = null) => {
  if (process.env.NODE_ENV === "development") {
    const formatted = formatLog(logLevels.DEBUG, context, message, data);
    console.log(formatted);
  }
};

/**
 * Log API request
 */
const logRequest = (method, path, statusCode, duration = 0) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${path} - ${statusCode} (${duration}ms)`);
};

/**
 * Log database operation
 */
const logDB = (operation, collection, duration = 0, error = null) => {
  const timestamp = new Date().toISOString();
  const status = error ? "FAILED" : "OK";
  console.log(`[${timestamp}] [DB] ${operation} on ${collection} - ${status} (${duration}ms)`);
  if (error) {
    console.error(`[${timestamp}] [DB] Error:`, error.message);
  }
};

module.exports = {
  logError,
  logWarn,
  logInfo,
  logDebug,
  logRequest,
  logDB,
};
