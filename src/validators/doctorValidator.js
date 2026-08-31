const Joi = require('joi');

const timeBlock = Joi.object({
  start: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'start must be in HH:mm format' }),
  end: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'end must be in HH:mm format' }),
});

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const workingHoursSchema = Joi.object(
  days.reduce((acc, day) => {
    acc[day] = Joi.array().items(timeBlock).default([]);
    return acc;
  }, {})
).min(1);

const createDoctorSchema = Joi.object({
  name: Joi.string().trim().required(),
  specialisation: Joi.string().trim().required(),
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be exactly 10 digits' }),
  email: Joi.string().email().required(),
});

const updateDoctorSchema = Joi.object({
  name: Joi.string().trim(),
  specialisation: Joi.string().trim(),
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .messages({ 'string.pattern.base': 'Phone must be exactly 10 digits' }),
  email: Joi.string().email(),
}).min(1);

const availabilitySchema = Joi.object({
  workingHours: workingHoursSchema.required(),
});

const availabilityQuerySchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'date must be in YYYY-MM-DD format' }),
});

module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
  availabilitySchema,
  availabilityQuerySchema,
};
