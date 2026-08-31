const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config');

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  user.password = undefined;

  return { token, user };
};

module.exports = { login };
