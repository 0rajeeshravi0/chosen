const express = require('express');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/authValidator');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
