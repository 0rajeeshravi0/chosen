const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect directly — this runs standalone
require('dotenv').config();
const config = require('../config');

const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Appointment.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // --- Doctors ---
    const doctor1 = await Doctor.create({
      name: 'Dr. Priya Sharma',
      specialisation: 'Dermatology',
      phone: '9876543201',
      email: 'priya@clinic.com',
      workingHours: {
        monday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
        tuesday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
        wednesday: [{ start: '09:00', end: '13:00' }],
        thursday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
        friday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
        saturday: [],
        sunday: [],
      },
    });

    const doctor2 = await Doctor.create({
      name: 'Dr. Amit Patel',
      specialisation: 'General Medicine',
      phone: '9876543202',
      email: 'amit@clinic.com',
      workingHours: {
        monday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
        tuesday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
        wednesday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
        thursday: [{ start: '10:00', end: '14:00' }],
        friday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
        saturday: [{ start: '10:00', end: '13:00' }],
        sunday: [],
      },
    });

    console.log('Created 2 doctors');

    // --- Users ---
    await User.create([
      {
        name: 'Admin User',
        email: 'admin@clinic.com',
        password: 'Admin@123',
        role: 'admin',
      },
      {
        name: 'Reception Staff',
        email: 'receptionist@clinic.com',
        password: 'Recep@123',
        role: 'receptionist',
      },
      {
        name: 'Dr. Priya Sharma',
        email: 'dr.priya@clinic.com',
        password: 'Doctor@123',
        role: 'doctor',
        doctorId: doctor1._id,
      },
      {
        name: 'Dr. Amit Patel',
        email: 'dr.amit@clinic.com',
        password: 'Doctor@123',
        role: 'doctor',
        doctorId: doctor2._id,
      },
    ]);
    console.log('Created 4 users (1 admin, 1 receptionist, 2 doctors)');

    // --- Patients ---
    const patients = await Patient.create([
      {
        firstName: 'Rahul',
        lastName: 'Kumar',
        phone: '9876543210',
        email: 'rahul@example.com',
        dateOfBirth: '1998-05-12',
        gender: 'male',
      },
      {
        firstName: 'Sneha',
        lastName: 'Reddy',
        phone: '9876543211',
        email: 'sneha@example.com',
        dateOfBirth: '1995-08-22',
        gender: 'female',
      },
      {
        firstName: 'Vikram',
        lastName: 'Singh',
        phone: '9876543212',
        email: 'vikram@example.com',
        dateOfBirth: '1990-01-15',
        gender: 'male',
      },
      {
        firstName: 'Anita',
        lastName: 'Desai',
        phone: '9876543213',
        email: 'anita@example.com',
        dateOfBirth: '1985-11-30',
        gender: 'female',
      },
      {
        firstName: 'Ravi',
        lastName: 'Menon',
        phone: '9876543214',
        email: 'ravi@example.com',
        dateOfBirth: '2000-03-08',
        gender: 'male',
      },
    ]);
    console.log('Created 5 patients');

    // --- Appointments ---
    // Use future dates relative to seeding — pick next Monday
    const today = new Date();
    const daysUntilMonday = ((1 - today.getDay()) + 7) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    const dateStr = nextMonday.toISOString().split('T')[0];

    // Tuesday
    const nextTuesday = new Date(nextMonday);
    nextTuesday.setDate(nextMonday.getDate() + 1);
    const tuesdayStr = nextTuesday.toISOString().split('T')[0];

    await Appointment.create([
      // Doctor 1, Monday — occupied slots
      {
        patient: patients[0]._id,
        doctor: doctor1._id,
        appointmentDate: dateStr,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Skin check-up',
        status: 'scheduled',
      },
      {
        patient: patients[1]._id,
        doctor: doctor1._id,
        appointmentDate: dateStr,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Acne treatment follow-up',
        status: 'confirmed',
      },
      // Cancelled appointment — slot should be available again
      {
        patient: patients[2]._id,
        doctor: doctor1._id,
        appointmentDate: dateStr,
        startTime: '11:00',
        endTime: '11:30',
        reason: 'Rash consultation',
        status: 'cancelled',
      },
      // Doctor 2, Monday
      {
        patient: patients[3]._id,
        doctor: doctor2._id,
        appointmentDate: dateStr,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'General health check',
        status: 'scheduled',
      },
      {
        patient: patients[4]._id,
        doctor: doctor2._id,
        appointmentDate: dateStr,
        startTime: '10:30',
        endTime: '11:00',
        reason: 'Fever follow-up',
        status: 'confirmed',
      },
      // Doctor 1, Tuesday
      {
        patient: patients[0]._id,
        doctor: doctor1._id,
        appointmentDate: tuesdayStr,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Follow-up skin treatment',
        status: 'scheduled',
      },
      // Doctor 2, Tuesday — completed
      {
        patient: patients[3]._id,
        doctor: doctor2._id,
        appointmentDate: tuesdayStr,
        startTime: '11:00',
        endTime: '11:30',
        reason: 'Blood pressure check',
        status: 'scheduled',
      },
    ]);
    console.log(`Created 7 appointments for ${dateStr} and ${tuesdayStr}`);

    console.log('\n--- Seed complete ---');
    console.log('Login credentials:');
    console.log('  Admin:        admin@clinic.com / Admin@123');
    console.log('  Receptionist: receptionist@clinic.com / Recep@123');
    console.log('  Doctor 1:     dr.priya@clinic.com / Doctor@123');
    console.log('  Doctor 2:     dr.amit@clinic.com / Doctor@123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
