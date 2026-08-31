const router = require('express').Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createPatientSchema, updatePatientSchema, searchQuerySchema } = require('../validators/patientValidator');
const { createPatient, getPatients, getPatient, updatePatient, deletePatient } = require('../controllers/patientController');

router.use(authenticate);

router.post('/', authorize('admin', 'receptionist'), validate(createPatientSchema), createPatient);
router.get('/', authorize('admin', 'receptionist', 'doctor'), validate(searchQuerySchema, 'query'), getPatients);
router.get('/:id', authorize('admin', 'receptionist', 'doctor'), getPatient);
router.put('/:id', authorize('admin', 'receptionist'), validate(updatePatientSchema), updatePatient);
router.delete('/:id', authorize('admin'), deletePatient);

module.exports = router;
