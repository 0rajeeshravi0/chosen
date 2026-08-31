const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const logAction = require('../utils/auditLog');

const create = async (data, userId) => {
  const existing = await Patient.findOne({ phone: data.phone });
  if (existing) {
    throw ApiError.conflict('A patient with this phone number already exists');
  }

  const patient = await Patient.create(data);
  await logAction(userId, 'CREATE', 'Patient', patient._id, { phone: data.phone });
  return patient;
};

const findAll = async ({ page, limit, search }) => {
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { phone: regex },
      { email: regex },
    ];
  }

  const [docs, total] = await Promise.all([
    Patient.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Patient.countDocuments(filter),
  ]);

  return { docs, total, page, limit };
};

const findById = async (id) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }
  return patient;
};

const update = async (id, data, userId) => {
  if (data.phone) {
    const existing = await Patient.findOne({ phone: data.phone, _id: { $ne: id } });
    if (existing) {
      throw ApiError.conflict('A patient with this phone number already exists');
    }
  }

  const patient = await Patient.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  await logAction(userId, 'UPDATE', 'Patient', patient._id, data);
  return patient;
};

const remove = async (id, userId) => {
  const patient = await Patient.findByIdAndDelete(id);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  await logAction(userId, 'DELETE', 'Patient', patient._id, { phone: patient.phone });
  return patient;
};

module.exports = { create, findAll, findById, update, remove };
