const Joi = require('joi');
const { STATUSES } = require('../models/Appointment');

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createAppointmentSchema = Joi.object({
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  appointmentDate: Joi.string().pattern(datePattern).required()
    .messages({ 'string.pattern.base': 'appointmentDate must be in YYYY-MM-DD format' }),
  startTime: Joi.string().pattern(timePattern).required()
    .messages({ 'string.pattern.base': 'startTime must be in HH:mm format' }),
  endTime: Joi.string().pattern(timePattern).required()
    .messages({ 'string.pattern.base': 'endTime must be in HH:mm format' }),
  reason: Joi.string().optional().allow(''),
});

const updateAppointmentSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).optional(),
  reason: Joi.string().optional().allow(''),
}).min(1);

const appointmentQuerySchema = Joi.object({
  doctorId: Joi.string().optional(),
  patientId: Joi.string().optional(),
  date: Joi.string().pattern(datePattern).optional()
    .messages({ 'string.pattern.base': 'date must be in YYYY-MM-DD format' }),
  status: Joi.string().valid(...STATUSES).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentQuerySchema,
};
