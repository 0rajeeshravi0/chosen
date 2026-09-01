require('dotenv').config();

// Scheduling compares wall-clock times ("is 17:30 today still bookable?"), so
// the process must run on the clinic's clock rather than whatever timezone the
// host happens to use. Hostinger and most PaaS hosts default to UTC, which
// would leave already-passed evening slots advertised as available.
// Set before any Date is constructed, since this module is loaded first.
const clinicTimezone = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';
process.env.TZ = clinicTimezone;

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
  defaultAppointmentDuration: parseInt(process.env.DEFAULT_APPOINTMENT_DURATION) || 30,
  clinicTimezone,
};
