const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clinic Management API',
      version: '1.0.0',
      description: 'Backend API for managing patients, doctors, and appointments in a clinic.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Patient: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
          },
        },
        Doctor: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            specialisation: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            workingHours: { type: 'object' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            appointmentDate: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] },
            reason: { type: 'string' },
            patient: { type: 'object' },
            doctor: { type: 'object' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@clinic.com' },
                    password: { type: 'string', example: 'Admin@123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/patients': {
        get: {
          tags: ['Patients'],
          summary: 'List patients',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Paginated list' } },
        },
        post: {
          tags: ['Patients'],
          summary: 'Create patient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'phone', 'email', 'dateOfBirth', 'gender'],
                  properties: {
                    firstName: { type: 'string', example: 'Rahul' },
                    lastName: { type: 'string', example: 'Kumar' },
                    phone: { type: 'string', example: '9876543210' },
                    email: { type: 'string', example: 'rahul@example.com' },
                    dateOfBirth: { type: 'string', example: '1998-05-12' },
                    gender: { type: 'string', example: 'male' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Patient created' }, 409: { description: 'Duplicate phone' } },
        },
      },
      '/api/patients/{id}': {
        get: {
          tags: ['Patients'],
          summary: 'Get patient by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Patient details' }, 404: { description: 'Not found' } },
        },
        put: {
          tags: ['Patients'],
          summary: 'Update patient',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Patients'],
          summary: 'Delete patient',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/api/doctors': {
        get: {
          tags: ['Doctors'],
          summary: 'List doctors',
          responses: { 200: { description: 'Paginated list' } },
        },
        post: {
          tags: ['Doctors'],
          summary: 'Create doctor (Admin only)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'specialisation', 'phone', 'email'],
                  properties: {
                    name: { type: 'string', example: 'Dr. Priya Sharma' },
                    specialisation: { type: 'string', example: 'Dermatology' },
                    phone: { type: 'string', example: '9876543210' },
                    email: { type: 'string', example: 'priya@clinic.com' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Doctor created' } },
        },
      },
      '/api/doctors/{id}': {
        get: {
          tags: ['Doctors'],
          summary: 'Get doctor by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Doctor details' } },
        },
        put: {
          tags: ['Doctors'],
          summary: 'Update doctor (Admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Doctors'],
          summary: 'Delete doctor (Admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/api/doctors/{id}/availability': {
        put: {
          tags: ['Doctors'],
          summary: 'Set doctor availability (Admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workingHours'],
                  properties: {
                    workingHours: {
                      type: 'object',
                      example: {
                        monday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
                        tuesday: [{ start: '09:00', end: '18:00' }],
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Availability updated' } },
        },
        get: {
          tags: ['Doctors'],
          summary: 'Get available slots for a date',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-09-01' } },
          ],
          responses: { 200: { description: 'Available slots' } },
        },
      },
      '/api/appointments': {
        post: {
          tags: ['Appointments'],
          summary: 'Create appointment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'doctorId', 'appointmentDate', 'startTime', 'endTime'],
                  properties: {
                    patientId: { type: 'string' },
                    doctorId: { type: 'string' },
                    appointmentDate: { type: 'string', example: '2026-09-01' },
                    startTime: { type: 'string', example: '10:00' },
                    endTime: { type: 'string', example: '10:30' },
                    reason: { type: 'string', example: 'Consultation' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Appointment created' },
            400: { description: 'Validation error / outside working hours' },
            409: { description: 'Doctor or patient conflict' },
          },
        },
        get: {
          tags: ['Appointments'],
          summary: 'List appointments',
          parameters: [
            { name: 'doctorId', in: 'query', schema: { type: 'string' } },
            { name: 'patientId', in: 'query', schema: { type: 'string' } },
            { name: 'date', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'Filtered paginated list' } },
        },
      },
      '/api/appointments/{id}': {
        get: {
          tags: ['Appointments'],
          summary: 'Get appointment by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Appointment details' } },
        },
        put: {
          tags: ['Appointments'],
          summary: 'Update appointment (status/reason)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated' },
            400: { description: 'Invalid status transition' },
          },
        },
        delete: {
          tags: ['Appointments'],
          summary: 'Cancel appointment',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Cancelled' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
