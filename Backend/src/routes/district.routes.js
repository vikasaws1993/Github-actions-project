import { Router } from 'express';
import { getDistricts, getTalukasByDistrict } from '../controllers/district.controller.js';
import { optionalJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/districts - Fetch all districts (supports ?search=...)
router.get('/', optionalJWT, getDistricts);

// GET /api/districts/:districtCode/talukas - Fetch talukas under specific district
router.get('/:districtCode/talukas', optionalJWT, getTalukasByDistrict);

export default router;
