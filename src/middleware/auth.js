const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

function auth(req, res, next) {
  // Get token from the Authorization header
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return errorResponse(res, 401, "Unauthorized");
  }

  // Expected format: "Bearer <token>"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, 401, "Unauthorized");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return errorResponse(res, 401, "Unauthorized");
  }
}

module.exports = auth;
