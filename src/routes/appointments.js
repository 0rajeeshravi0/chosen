const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentQuerySchema,
} = require('../validators/appointmentValidator');
const {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointmentController');

router.use(authenticate);

router.post('/', authorize('admin', 'receptionist'), validate(createAppointmentSchema), createAppointment);
router.get('/', authorize('admin', 'receptionist', 'doctor'), validate(appointmentQuerySchema, 'query'), getAppointments);
router.get('/:id', authorize('admin', 'receptionist', 'doctor'), getAppointment);
router.put('/:id', authorize('admin', 'receptionist', 'doctor'), validate(updateAppointmentSchema), updateAppointment);
router.delete('/:id', authorize('admin', 'receptionist'), deleteAppointment);

module.exports = router;
