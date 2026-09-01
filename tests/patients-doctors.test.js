const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { getToken, createDoctor, createPatient, getNextWeekday } = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe('Patient CRUD', () => {
  let adminToken;

  beforeEach(async () => {
    const { token } = await getToken({ role: 'admin' });
    adminToken = token;
  });

  it('should create a patient', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Rahul',
        lastName: 'Kumar',
        phone: '9876543210',
        email: 'rahul@example.com',
        dateOfBirth: '1998-05-12',
        gender: 'male',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Rahul');
  });

  it('should reject duplicate phone number', async () => {
    await createPatient({ phone: '9876543210' });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Another',
        lastName: 'Patient',
        phone: '9876543210',
        email: 'another@example.com',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });

    expect(res.status).toBe(409);
  });

  it('should get a patient by id', async () => {
    const patient = await createPatient();

    const res = await request(app)
      .get(`/api/patients/${patient._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(patient._id.toString());
  });

  it('should search patients by name', async () => {
    await createPatient({ firstName: 'Rahul', lastName: 'Kumar', phone: '1111111111' });
    await createPatient({ firstName: 'Sneha', lastName: 'Reddy', phone: '2222222222' });

    const res = await request(app)
      .get('/api/patients?search=rahul')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].firstName).toBe('Rahul');
  });

  it('should paginate patients', async () => {
    for (let i = 0; i < 15; i++) {
      await createPatient({ phone: `${String(i).padStart(10, '0')}` });
    }

    const res = await request(app)
      .get('/api/patients?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination.total).toBe(15);
    expect(res.body.pagination.pages).toBe(3);
  });
});

describe('Doctor Availability', () => {
  let adminToken;
  let doctor;

  beforeEach(async () => {
    const { token } = await getToken({ role: 'admin' });
    adminToken = token;
    doctor = await createDoctor();
  });

  it('should configure doctor availability', async () => {
    const res = await request(app)
      .put(`/api/doctors/${doctor._id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '10:00', end: '14:00' }],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.workingHours.monday[0].start).toBe('09:00');
  });

  it('should retrieve available slots for a date', async () => {
    // Doctor already has Monday 09:00-13:00, 14:00-18:00
    const monday = getNextWeekday(1);

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${monday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    // All slots should be available (no appointments yet)
    expect(res.body.data.slots.every((s) => s.available === true)).toBe(true);
  });

  it('should return no slots on a day with no working hours', async () => {
    const sunday = getNextWeekday(0);

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${sunday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(0);
  });

  it('should mark slots as unavailable when appointments exist', async () => {
    const monday = getNextWeekday(1);
    const Appointment = require('../src/models/Appointment');

    // Create an appointment 09:00-09:30
    await Appointment.create({
      patient: (await createPatient())._id,
      doctor: doctor._id,
      appointmentDate: monday,
      startTime: '09:00',
      endTime: '09:30',
      status: 'scheduled',
    });

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${monday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const slot0900 = res.body.data.slots.find((s) => s.start === '09:00');
    expect(slot0900.available).toBe(false);

    const slot0930 = res.body.data.slots.find((s) => s.start === '09:30');
    expect(slot0930.available).toBe(true);
  });

  it('should show cancelled appointment slots as available', async () => {
    const monday = getNextWeekday(1);
    const Appointment = require('../src/models/Appointment');

    await Appointment.create({
      patient: (await createPatient())._id,
      doctor: doctor._id,
      appointmentDate: monday,
      startTime: '10:00',
      endTime: '10:30',
      status: 'cancelled',
    });

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${monday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const slot1000 = res.body.data.slots.find((s) => s.start === '10:00');
    expect(slot1000.available).toBe(true);
  });

  it('should mark already-passed slots unavailable for today', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayKey = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ][now.getDay()];

    // Open the doctor for the entire day so slots exist on both sides of "now"
    await request(app)
      .put(`/api/doctors/${doctor._id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workingHours: { [dayKey]: [{ start: '00:00', end: '23:30' }] } });

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${today}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { slots } = res.body.data;
    expect(slots.length).toBeGreaterThan(0);

    // Invariant: nothing reported available may start at or before now
    for (const slot of slots.filter((s) => s.available)) {
      expect(new Date(`${today}T${slot.start}:00`).getTime()).toBeGreaterThan(Date.now());
    }

    // And every slot that has passed must be reported unavailable
    const passed = slots.filter(
      (s) => new Date(`${today}T${s.start}:00`).getTime() <= Date.now()
    );
    expect(passed.every((s) => s.available === false)).toBe(true);
  });

  it('should keep all slots available on a future date', async () => {
    const monday = getNextWeekday(1);

    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${monday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.every((s) => s.available === true)).toBe(true);
  });

  it('should never report a slot that appointment creation would reject as past', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dayKey = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ][now.getDay()];

    await request(app)
      .put(`/api/doctors/${doctor._id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workingHours: { [dayKey]: [{ start: '00:00', end: '23:30' }] } });

    const avail = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${today}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const firstFree = avail.body.data.slots.find((s) => s.available);
    if (!firstFree) return; // no time left today; nothing to assert

    const patient = await createPatient();
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        appointmentDate: today,
        startTime: firstFree.start,
        endTime: firstFree.end,
        reason: 'availability/create consistency',
      });

    expect(res.status).toBe(201);
  });

  it('should deny non-admin from setting availability', async () => {
    const { token: receptionistToken } = await getToken({ role: 'receptionist' });

    const res = await request(app)
      .put(`/api/doctors/${doctor._id}/availability`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ workingHours: { monday: [{ start: '09:00', end: '17:00' }] } });

    expect(res.status).toBe(403);
  });
});
