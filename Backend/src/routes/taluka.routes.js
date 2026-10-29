import { Router } from 'express';
import { getTalukas } from '../controllers/taluka.controller.js';
import { optionalJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/talukas - Fetch talukas (supports ?districtCode=... & ?search=...)
router.get('/', optionalJWT, getTalukas);

export default router;
