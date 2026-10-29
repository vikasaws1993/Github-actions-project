import { Router } from 'express';
import {
  getDailyUpdates,
  submitDailyUpdate,
} from '../controllers/dailyUpdate.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);
router.use(authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'));

// 1) GET /api/daily-updates - Retrieve daily update KPIs, history, and today's shift details
router.get('/', getDailyUpdates);

// 2) POST /api/daily-updates - Submit a new daily shift report
router.post('/', submitDailyUpdate);

export default router;
