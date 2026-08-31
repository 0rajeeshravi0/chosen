const Joi = require('joi');

const createPatientSchema = Joi.object({
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
    .messages({ 'string.pattern.base': 'Phone must be a 10-digit number' }),
  email: Joi.string().email().required(),
  dateOfBirth: Joi.date().iso().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
});

const updatePatientSchema = Joi.object({
  firstName: Joi.string().trim(),
  lastName: Joi.string().trim(),
  phone: Joi.string().pattern(/^[0-9]{10}$/)
    .messages({ 'string.pattern.base': 'Phone must be a 10-digit number' }),
  email: Joi.string().email(),
  dateOfBirth: Joi.date().iso(),
  gender: Joi.string().valid('male', 'female', 'other'),
}).min(1);

const searchQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().optional(),
});

module.exports = { createPatientSchema, updatePatientSchema, searchQuerySchema };
