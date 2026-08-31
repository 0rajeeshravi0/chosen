const appointmentService = require('../services/appointmentService');
const { success, created, paginated } = require('../utils/response');

const createAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.create(req.body, req.user._id);
    return created(res, appointment, 'Appointment created successfully');
  } catch (err) {
    next(err);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.findAll(req.query, req.user);
    return paginated(res, result);
  } catch (err) {
    next(err);
  }
};

const getAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.findById(req.params.id, req.user);
    return success(res, appointment);
  } catch (err) {
    next(err);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.update(req.params.id, req.body, req.user);
    return success(res, appointment, 'Appointment updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.remove(req.params.id, req.user._id);
    return success(res, appointment, 'Appointment cancelled successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
};
