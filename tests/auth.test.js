const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createUser, getToken } = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

describe('POST /api/auth/login', () => {
  it('should login with valid credentials and return token', async () => {
    await createUser({ email: 'admin@clinic.com', password: 'Admin@123', role: 'admin' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinic.com', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@clinic.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should reject invalid credentials', async () => {
    await createUser({ email: 'admin@clinic.com', password: 'Admin@123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinic.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@clinic.com', password: 'Test@123' });

    expect(res.status).toBe(401);
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinic.com' });

    expect(res.status).toBe(400);
  });
});

describe('Authorization middleware', () => {
  it('should reject requests without token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
  });

  it('should allow admin access to admin routes', async () => {
    const { token } = await getToken({ role: 'admin' });

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should allow receptionist access to patient routes', async () => {
    const { token } = await getToken({ role: 'receptionist' });

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should allow doctor read access to patients', async () => {
    const { token } = await getToken({ role: 'doctor' });

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should deny doctor from creating patients', async () => {
    const { token } = await getToken({ role: 'doctor' });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Test',
        lastName: 'Patient',
        phone: '9876543210',
        email: 'test@example.com',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });

    expect(res.status).toBe(403);
  });

  it('should deny receptionist from managing doctors', async () => {
    const { token } = await getToken({ role: 'receptionist' });

    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Dr. Test',
        specialisation: 'General',
        phone: '9876543210',
        email: 'dr@clinic.com',
      });

    expect(res.status).toBe(403);
  });
});
