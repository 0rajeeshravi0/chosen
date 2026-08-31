const doctorService = require('../services/doctorService');
const { success, created, paginated } = require('../utils/response');

const createDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.create(req.body, req.user._id);
    created(res, doctor);
  } catch (err) {
    next(err);
  }
};

const getDoctors = async (req, res, next) => {
  try {
    const result = await doctorService.findAll(req.query);
    paginated(res, result);
  } catch (err) {
    next(err);
  }
};

const getDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.findById(req.params.id);
    success(res, doctor);
  } catch (err) {
    next(err);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.update(req.params.id, req.body, req.user._id);
    success(res, doctor, 'Doctor updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteDoctor = async (req, res, next) => {
  try {
    await doctorService.remove(req.params.id, req.user._id);
    success(res, null, 'Doctor deleted successfully');
  } catch (err) {
    next(err);
  }
};

const setAvailability = async (req, res, next) => {
  try {
    const doctor = await doctorService.setAvailability(
      req.params.id,
      req.body.workingHours,
      req.user._id
    );
    success(res, doctor, 'Availability updated successfully');
  } catch (err) {
    next(err);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const result = await doctorService.getAvailableSlots(req.params.id, req.query.date);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  setAvailability,
  getAvailableSlots,
};
