const patientService = require('../services/patientService');
const { success, created, paginated } = require('../utils/response');

const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.create(req.body, req.user._id);
    created(res, patient, 'Patient created successfully');
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const result = await patientService.findAll(req.query);
    paginated(res, result);
  } catch (error) {
    next(error);
  }
};

const getPatient = async (req, res, next) => {
  try {
    const patient = await patientService.findById(req.params.id);
    success(res, patient);
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.update(req.params.id, req.body, req.user._id);
    success(res, patient, 'Patient updated successfully');
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    await patientService.remove(req.params.id, req.user._id);
    success(res, null, 'Patient deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { createPatient, getPatients, getPatient, updatePatient, deletePatient };
