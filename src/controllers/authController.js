const authService = require('../services/authService');
const { success } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    return success(res, data, 'Login successful');
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
