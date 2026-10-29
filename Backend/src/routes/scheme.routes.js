import { Router } from 'express';
import {
  getSchemeStats,
  getAllSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus,
  deleteScheme,
  getSchemeHospitals,
  empanelHospitals,
  deEmpanelHospital,
  getSchemeClaims,
} from '../controllers/scheme.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Authenticated read routes
router.get('/stats', getSchemeStats);
router.get('/', getAllSchemes);
router.get('/:id/hospitals', getSchemeHospitals);
router.get('/:id', getSchemeById);

// Admin-protected routes
router.post('/', verifyJWT, authorizeRoles('ADMIN'), createScheme);
router.put('/:id', verifyJWT, authorizeRoles('ADMIN'), updateScheme);
router.patch('/:id/status', verifyJWT, authorizeRoles('ADMIN'), toggleSchemeStatus);
router.delete('/:id', verifyJWT, authorizeRoles('ADMIN'), deleteScheme);

// Hospital empanelment & claims routes under scheme
router.post('/:id/hospitals', verifyJWT, authorizeRoles('ADMIN'), empanelHospitals);
router.delete('/:id/hospitals/:hospitalId', verifyJWT, authorizeRoles('ADMIN'), deEmpanelHospital);
router.get('/:id/claims', verifyJWT, authorizeRoles('ADMIN'), getSchemeClaims);

export default router;
