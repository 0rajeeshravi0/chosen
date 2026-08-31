const request = require('supertest');
const app = require('../src/app');
const Appointment = require('../src/models/Appointment');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { getToken, createDoctor, createPatient, getNextWeekday, createUser } = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe('Appointment Management', () => {
  let adminToken, doctor, patient, monday;

  beforeEach(async () => {
    const { token } = await getToken({ role: 'admin' });
    adminToken = token;
    doctor = await createDoctor();
    patient = await createPatient();
    monday = getNextWeekday(1); // Doctor works Monday
  });

  const createAppointment = (overrides = {}) => {
    return request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        appointmentDate: monday,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Checkup',
        ...overrides,
      });
  };

  // --- Create Appointment ---

  it('should create an appointment', async () => {
    const res = await createAppointment();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.startTime).toBe('09:00');
    expect(res.body.data.status).toBe('scheduled');
  });

  it('should reject appointment outside working hours', async () => {
    const res = await createAppointment({
      startTime: '13:15',
      endTime: '13:45',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/working hours/i);
  });

  it('should reject appointment on a non-working day', async () => {
    const sunday = getNextWeekday(0);
    const res = await createAppointment({
      appointmentDate: sunday,
      startTime: '10:00',
      endTime: '10:30',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/working hours/i);
  });

  it('should detect doctor conflict (overlapping)', async () => {
    await createAppointment({ startTime: '10:00', endTime: '10:30' });

    const patient2 = await createPatient();
    const res = await createAppointment({
      patientId: patient2._id.toString(),
      startTime: '10:15',
      endTime: '10:45',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/doctor already has/i);
  });

  it('should allow adjacent appointments (no overlap)', async () => {
    await createAppointment({ startTime: '10:00', endTime: '10:30' });

    const patient2 = await createPatient();
    const res = await createAppointment({
      patientId: patient2._id.toString(),
      startTime: '10:30',
      endTime: '11:00',
    });

    expect(res.status).toBe(201);
  });

  it('should detect patient conflict', async () => {
    await createAppointment({ startTime: '09:00', endTime: '09:30' });

    const doctor2 = await createDoctor();
    const res = await createAppointment({
      doctorId: doctor2._id.toString(),
      startTime: '09:00',
      endTime: '09:30',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/patient already has/i);
  });

  it('should reject invalid time range (start >= end)', async () => {
    const res = await createAppointment({
      startTime: '10:30',
      endTime: '10:00',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/before end time/i);
  });

  it('should reject past appointments', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split('T')[0];

    const res = await createAppointment({
      appointmentDate: pastDate,
      startTime: '10:00',
      endTime: '10:30',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past/i);
  });

  // --- Cancel & Availability ---

  it('should cancel an appointment', async () => {
    const createRes = await createAppointment();
    const aptId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('should make cancelled slot available again', async () => {
    const createRes = await createAppointment({ startTime: '09:00', endTime: '09:30' });
    const aptId = createRes.body.data._id;

    // Cancel it
    await request(app)
      .delete(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Check availability
    const res = await request(app)
      .get(`/api/doctors/${doctor._id}/availability?date=${monday}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const slot = res.body.data.slots.find((s) => s.start === '09:00');
    expect(slot.available).toBe(true);
  });

  // --- Status Transitions ---

  it('should allow valid status transitions', async () => {
    const createRes = await createAppointment();
    const aptId = createRes.body.data._id;

    // scheduled → confirmed
    let res = await request(app)
      .put(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');

    // confirmed → completed
    res = await request(app)
      .put(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('should reject invalid status transitions', async () => {
    const createRes = await createAppointment();
    const aptId = createRes.body.data._id;

    // Cancel it first
    await request(app)
      .put(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });

    // cancelled → completed should fail
    const res = await request(app)
      .put(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot transition/i);
  });

  // --- Filtering ---

  it('should filter appointments by doctor', async () => {
    await createAppointment({ startTime: '09:00', endTime: '09:30' });

    const doctor2 = await createDoctor();
    const patient2 = await createPatient();
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient2._id.toString(),
        doctorId: doctor2._id.toString(),
        appointmentDate: monday,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Test',
      });

    const res = await request(app)
      .get(`/api/appointments?doctorId=${doctor._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('should filter appointments by status', async () => {
    const createRes = await createAppointment({ startTime: '09:00', endTime: '09:30' });
    // Confirm it
    await request(app)
      .put(`/api/appointments/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    const patient2 = await createPatient();
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient2._id.toString(),
        doctorId: doctor._id.toString(),
        appointmentDate: monday,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Test',
      });

    const res = await request(app)
      .get('/api/appointments?status=confirmed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('confirmed');
  });

  it('should include patient and doctor info in response', async () => {
    const res = await createAppointment();

    expect(res.body.data.patient).toBeDefined();
    expect(res.body.data.patient.name).toBeDefined();
    expect(res.body.data.patient.phone).toBeDefined();
    expect(res.body.data.doctor).toBeDefined();
    expect(res.body.data.doctor.name).toBeDefined();
    expect(res.body.data.doctor.specialisation).toBeDefined();
  });
});

describe('Doctor Resource-Level Authorization', () => {
  it('should prevent a doctor from viewing another doctor appointments', async () => {
    // Create two doctors
    const Doctor = require('../src/models/Doctor');
    const doctor1 = await createDoctor();
    const doctor2 = await createDoctor();

    // Create doctor user linked to doctor1
    const { token: doc1Token } = await getToken({
      role: 'doctor',
      doctorId: doctor1._id,
    });

    // Create admin and make appointment for doctor2
    const { token: adminToken } = await getToken({ role: 'admin' });
    const patient = await createPatient();
    const monday = getNextWeekday(1);

    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient._id.toString(),
        doctorId: doctor2._id.toString(),
        appointmentDate: monday,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Test',
      });

    const aptId = createRes.body.data._id;

    // Doctor1 tries to view doctor2's appointment
    const res = await request(app)
      .get(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${doc1Token}`);

    expect(res.status).toBe(403);
  });

  it('should allow a doctor to view own appointments', async () => {
    const doctor = await createDoctor();
    const { token: docToken } = await getToken({
      role: 'doctor',
      doctorId: doctor._id,
    });
    const { token: adminToken } = await getToken({ role: 'admin' });
    const patient = await createPatient();
    const monday = getNextWeekday(1);

    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        appointmentDate: monday,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Test',
      });

    const res = await request(app)
      .get(`/api/appointments/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${docToken}`);

    expect(res.status).toBe(200);
  });
});
