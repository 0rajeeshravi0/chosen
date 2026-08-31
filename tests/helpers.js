const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const config = require('../src/config');

const createUser = async (overrides = {}) => {
  const data = {
    name: 'Test User',
    email: `test${Date.now()}@clinic.com`,
    password: 'Test@123',
    role: 'admin',
    ...overrides,
  };
  const user = await User.create(data);
  return user;
};

const getToken = async (overrides = {}) => {
  const user = await createUser(overrides);
  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { user, token };
};

const createDoctor = async (overrides = {}) => {
  const data = {
    name: 'Dr. Test',
    specialisation: 'General',
    phone: `98765${String(Date.now()).slice(-5)}`,
    email: `dr${Date.now()}@clinic.com`,
    workingHours: {
      monday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      tuesday: [{ start: '09:00', end: '18:00' }],
      wednesday: [{ start: '09:00', end: '13:00' }],
      thursday: [{ start: '09:00', end: '18:00' }],
      friday: [{ start: '09:00', end: '18:00' }],
      saturday: [],
      sunday: [],
    },
    ...overrides,
  };
  return Doctor.create(data);
};

const createPatient = async (overrides = {}) => {
  const data = {
    firstName: 'Test',
    lastName: 'Patient',
    phone: `98765${String(Date.now()).slice(-5)}`,
    email: `patient${Date.now()}@example.com`,
    dateOfBirth: '1990-01-01',
    gender: 'male',
    ...overrides,
  };
  return Patient.create(data);
};

/**
 * Get the next occurrence of a given weekday (0=Sun..6=Sat).
 * Returns YYYY-MM-DD string for a future date.
 */
const getNextWeekday = (dayNum) => {
  const now = new Date();
  const diff = ((dayNum - now.getDay()) + 7) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return target.toISOString().split('T')[0];
};

module.exports = { createUser, getToken, createDoctor, createPatient, getNextWeekday };
