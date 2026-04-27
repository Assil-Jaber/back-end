// Custom error class with status code
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Global error-handling middleware
function errorHandler(err, req, res, next) {
  // Handle JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Invalid JSON in request body",
    });
  }

  // Handle our custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      message: err.message,
    });
  }

  // Unknown error — log and return 500
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    status: 500,
    message: "Internal server error",
  });
}

module.exports = { AppError, errorHandler };
