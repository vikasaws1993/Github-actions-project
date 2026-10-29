import { Router } from 'express';
import {
  getAssignedPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patient.controller.js';
import { optionalJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/patients/assigned - Get all patients assigned to Arogya Sevak from Admin
router.get('/assigned', optionalJWT, getAssignedPatients);

// GET /api/patients - Alias for assigned patients list
router.get('/', optionalJWT, getAssignedPatients);

// GET /api/patients/:id - Get patient details by Case ID (e.g. AM-2026-00124)
router.get('/:id', optionalJWT, getPatientById);

// PATCH /api/patients/:id - Update patient status, ward, clinical notes
router.patch('/:id', optionalJWT, updatePatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', optionalJWT, updatePatient);

export default router;
