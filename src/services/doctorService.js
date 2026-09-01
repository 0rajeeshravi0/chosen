const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const logAction = require('../utils/auditLog');
const config = require('../config');
const { addMinutes, isPast } = require('../utils/time');

const create = async (data, userId) => {
  const doctor = await Doctor.create(data);
  await logAction(userId, 'CREATE', 'Doctor', doctor._id, data);
  return doctor;
};

const findAll = async ({ page = 1, limit = 10 }) => {
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Doctor.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Doctor.countDocuments(),
  ]);

  return { docs, total, page, limit };
};

const findById = async (id) => {
  const doctor = await Doctor.findById(id);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  return doctor;
};

const update = async (id, data, userId) => {
  const doctor = await Doctor.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  await logAction(userId, 'UPDATE', 'Doctor', doctor._id, data);
  return doctor;
};

const remove = async (id, userId) => {
  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  await logAction(userId, 'DELETE', 'Doctor', doctor._id, {});
  return doctor;
};

const setAvailability = async (doctorId, workingHours, userId) => {
  const doctor = await Doctor.findByIdAndUpdate(
    doctorId,
    { workingHours },
    { new: true, runValidators: true }
  );
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  await logAction(userId, 'UPDATE_AVAILABILITY', 'Doctor', doctor._id, { workingHours });
  return doctor;
};

const getAvailableSlots = async (doctorId, date) => {
  const doctor = await findById(doctorId);

  const dayOfWeek = new Date(date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();

  const blocks = (doctor.workingHours && doctor.workingHours[dayOfWeek]) || [];
  const duration = config.defaultAppointmentDuration; // 30

  // Generate all slots from working-hour blocks
  const slots = [];
  for (const block of blocks) {
    let current = block.start;
    while (true) {
      const end = addMinutes(current, duration);
      if (end > block.end) break;
      slots.push({ start: current, end, available: true });
      current = end;
    }
  }

  // Fetch non-cancelled appointments for this doctor on this date
  const appointments = await Appointment.find({
    doctor: doctorId,
    appointmentDate: date,
    status: { $ne: 'cancelled' },
  });

  // Mark slots that overlap an existing appointment, or that have already
  // passed, as unavailable. A slot reported available must be bookable.
  for (const slot of slots) {
    if (isPast(date, slot.start)) {
      slot.available = false;
      continue;
    }
    for (const apt of appointments) {
      // slot [slotStart, slotEnd) overlaps appointment [aptStart, aptEnd)
      if (slot.start < apt.endTime && slot.end > apt.startTime) {
        slot.available = false;
        break;
      }
    }
  }

  return { date, doctorId, slots };
};



module.exports = {
  create,
  findAll,
  findById,
  update,
  remove,
  setAvailability,
  getAvailableSlots,
};
