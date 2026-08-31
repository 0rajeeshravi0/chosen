const router = require('express').Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createDoctorSchema,
  updateDoctorSchema,
  availabilitySchema,
  availabilityQuerySchema,
} = require('../validators/doctorValidator');
const doctorController = require('../controllers/doctorController');

router.use(authenticate);

router
  .route('/')
  .post(authorize('admin'), validate(createDoctorSchema), doctorController.createDoctor)
  .get(authorize('admin', 'receptionist', 'doctor'), doctorController.getDoctors);

router
  .route('/:id')
  .get(authorize('admin', 'receptionist', 'doctor'), doctorController.getDoctor)
  .put(authorize('admin'), validate(updateDoctorSchema), doctorController.updateDoctor)
  .delete(authorize('admin'), doctorController.deleteDoctor);

router
  .route('/:id/availability')
  .put(authorize('admin'), validate(availabilitySchema), doctorController.setAvailability)
  .get(
    authorize('admin', 'receptionist', 'doctor'),
    validate(availabilityQuerySchema, 'query'),
    doctorController.getAvailableSlots
  );

module.exports = router;
