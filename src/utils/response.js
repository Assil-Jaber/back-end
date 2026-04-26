function errorResponse(res, statusCode, message, errors = null) {
  const response = {
    success: false,
    status: statusCode,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    status: statusCode,
    ...data,
  });
}

module.exports = { errorResponse, successResponse };
