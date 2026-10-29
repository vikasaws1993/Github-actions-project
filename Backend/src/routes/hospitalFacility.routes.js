import { Router } from 'express';
import {
  getHospitalFacilities,
  saveHospitalFacilities,
} from '../controllers/hospitalFacility.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Allow AROGYA_SEVAK, SEVAK, and ADMIN
router.use(verifyJWT);
router.use(authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'));

// 1) GET /api/hospital-facilities
router.get('/', getHospitalFacilities);
router.get('/my-hospital', getHospitalFacilities);

// 2) POST /api/hospital-facilities
router.post('/', saveHospitalFacilities);

export default router;
