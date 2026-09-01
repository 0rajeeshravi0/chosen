const Appointment = require('../models/Appointment');
const { VALID_TRANSITIONS } = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const logAction = require('../utils/auditLog');
const { isPast } = require('../utils/time');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatAppointment(apt) {
  const obj = apt.toObject ? apt.toObject() : apt;
  const formatted = { ...obj };

  if (obj.patient && typeof obj.patient === 'object') {
    formatted.patient = {
      id: obj.patient._id,
      name: `${obj.patient.firstName} ${obj.patient.lastName}`,
      phone: obj.patient.phone,
    };
  }

  if (obj.doctor && typeof obj.doctor === 'object') {
    formatted.doctor = {
      id: obj.doctor._id,
      name: obj.doctor.name,
      specialisation: obj.doctor.specialisation,
    };
  }

  return formatted;
}

async function populateAppointment(query) {
  return query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'name specialisation');
}

const create = async (data, userId) => {
  const { patientId, doctorId, appointmentDate, startTime, endTime, reason } = data;

  // 1. Validate patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw ApiError.notFound('Patient not found');
  }

  // 2. Validate doctor exists
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }

  // 3. startTime < endTime
  if (startTime >= endTime) {
    throw ApiError.badRequest('Start time must be before end time');
  }

  // 4. Not in the past — same helper the availability engine uses, so a slot
  // reported available can never be rejected here (and vice versa).
  if (isPast(appointmentDate, startTime)) {
    throw ApiError.badRequest('Cannot schedule appointments in the past');
  }

  // 5. Within doctor's working hours
  const dayOfWeek = DAYS[new Date(appointmentDate + 'T00:00:00').getDay()];
  const blocks = doctor.workingHours && doctor.workingHours[dayOfWeek];

  if (!blocks || blocks.length === 0) {
    throw ApiError.badRequest("Appointment is outside doctor's working hours");
  }

  const withinHours = blocks.some(
    (block) => startTime >= block.start && endTime <= block.end
  );
  if (!withinHours) {
    throw ApiError.badRequest("Appointment is outside doctor's working hours");
  }

  // 6. Doctor conflict
  const doctorConflict = await Appointment.findOne({
    doctor: doctorId,
    appointmentDate,
    status: { $ne: 'cancelled' },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (doctorConflict) {
    throw ApiError.conflict('Doctor already has an appointment during this time');
  }

  // 7. Patient conflict
  const patientConflict = await Appointment.findOne({
    patient: patientId,
    appointmentDate,
    status: { $ne: 'cancelled' },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (patientConflict) {
    throw ApiError.conflict('Patient already has an appointment during this time');
  }

  // 8. Create
  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    appointmentDate,
    startTime,
    endTime,
    reason: reason || '',
  });

  await logAction(userId, 'CREATE', 'Appointment', appointment._id, {
    patient: patientId,
    doctor: doctorId,
    appointmentDate,
    startTime,
    endTime,
  });

  // 9. Return populated
  const populated = await populateAppointment(Appointment.findById(appointment._id));
  return formatAppointment(populated);
};

const findAll = async (query, user) => {
  const { doctorId, patientId, date, status, page, limit } = query;
  const filter = {};

  if (doctorId) filter.doctor = doctorId;
  if (patientId) filter.patient = patientId;
  if (date) filter.appointmentDate = date;
  if (status) filter.status = status;

  // Doctor role: restrict to own appointments
  if (user.role === 'doctor') {
    filter.doctor = user.doctorId;
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    populateAppointment(
      Appointment.find(filter).sort({ appointmentDate: 1, startTime: 1 }).skip(skip).limit(limit)
    ),
    Appointment.countDocuments(filter),
  ]);

  return {
    docs: docs.map(formatAppointment),
    total,
    page,
    limit,
  };
};

const findById = async (id, user) => {
  const appointment = await populateAppointment(Appointment.findById(id));
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Doctor role: verify ownership
  if (user.role === 'doctor') {
    const aptDoctorId = appointment.doctor && typeof appointment.doctor === 'object'
      ? appointment.doctor._id.toString()
      : appointment.doctor.toString();

    if (aptDoctorId !== user.doctorId.toString()) {
      throw ApiError.forbidden('You do not have permission to view this appointment');
    }
  }

  return formatAppointment(appointment);
};

const update = async (id, data, user) => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Doctor role: verify ownership
  if (user.role === 'doctor') {
    if (appointment.doctor.toString() !== user.doctorId.toString()) {
      throw ApiError.forbidden('You do not have permission to update this appointment');
    }
  }

  // Validate status transition
  if (data.status && data.status !== appointment.status) {
    const allowed = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot transition from '${appointment.status}' to '${data.status}'`
      );
    }
    appointment.status = data.status;
  }

  if (data.reason !== undefined) {
    appointment.reason = data.reason;
  }

  await appointment.save();

  await logAction(user._id, 'UPDATE', 'Appointment', appointment._id, data);

  const populated = await populateAppointment(Appointment.findById(appointment._id));
  return formatAppointment(populated);
};

const remove = async (id, userId) => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  appointment.status = 'cancelled';
  await appointment.save();

  await logAction(userId, 'CANCEL', 'Appointment', appointment._id, {
    previousStatus: appointment.status,
  });

  const populated = await populateAppointment(Appointment.findById(appointment._id));
  return formatAppointment(populated);
};

module.exports = { create, findAll, findById, update, remove };
