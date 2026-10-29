import { Router } from 'express';
import {
  createHospital,
  bulkCreateHospitals,
  getAllHospitals,
  getHospitalById,
  getHospitalSevaks,
  updateHospital,
  deactivateHospital,
  assignSevaksToHospital,
  deleteHospital,
} from '../controllers/hospital.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { uploadCsvAny } from '../middlewares/upload.middleware.js';

const router = Router();

// ==========================================
// Hospital Management Endpoints
// ==========================================

// POST /api/hospitals - Admin empanels a single Hospital (Protected, Admin only)
router.post('/', verifyJWT, authorizeRoles('ADMIN'), createHospital);

// POST /api/hospitals/bulk - Bulk add hospitals via CSV file or JSON array (Protected, Admin only)
router.post('/bulk', verifyJWT, authorizeRoles('ADMIN'), uploadCsvAny(), bulkCreateHospitals);

// POST /api/hospitals/upload-csv - Bulk add hospitals via CSV upload (Protected, Admin only)
router.post('/upload-csv', verifyJWT, authorizeRoles('ADMIN'), uploadCsvAny(), bulkCreateHospitals);

// GET /api/hospitals - List all hospitals with filters & pagination (Protected)
router.get('/', verifyJWT, getAllHospitals);

// GET /api/hospitals/:id & /api/hospitals/:id/details - Get complete hospital details by UUID or Hospital Code (Protected)
router.get(['/:id', '/:id/details'], verifyJWT, getHospitalById);

// GET /api/hospitals/:id/sevaks & /api/hospitals/:id/arogya-sevaks - Get all Arogya Sevaks assigned to a hospital (Protected)
router.get(['/:id/sevaks', '/:id/arogya-sevaks'], verifyJWT, getHospitalSevaks);

// PUT & PATCH /api/hospitals/:id - Update hospital record (Protected, Admin only)
router.put('/:id', verifyJWT, authorizeRoles('ADMIN'), updateHospital);
router.patch('/:id', verifyJWT, authorizeRoles('ADMIN'), updateHospital);

// PATCH /api/hospitals/:id/deactivate - Deactivate hospital (removes from active assignment options without deleting history)
router.patch('/:id/deactivate', verifyJWT, authorizeRoles('ADMIN'), deactivateHospital);

// POST /api/hospitals/:id/assign-sevaks - Assign Sevaks to Hospital (Protected, Admin only)
router.post('/:id/assign-sevaks', verifyJWT, authorizeRoles('ADMIN'), assignSevaksToHospital);

// DELETE /api/hospitals/:id - Delete hospital by UUID (Protected, Admin only)
router.delete('/:id', verifyJWT, authorizeRoles('ADMIN'), deleteHospital);

export default router;

