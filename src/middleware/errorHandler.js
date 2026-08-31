const ApiError = require('../utils/ApiError');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest(messages.join('. '));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = ApiError.conflict(`A record with this ${field} already exists`);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    error = ApiError.badRequest('Invalid ID format');
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  if (config.nodeEnv === 'development' && !error.isOperational) {
    console.error('ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
