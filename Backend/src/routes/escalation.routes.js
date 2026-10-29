import { Router } from 'express';
import {
  getEscalations,
  getEscalationStats,
  getEscalationById,
  createEscalation,
  resolveEscalation,
  simulateEscalationDecision,
} from '../controllers/escalation.controller.js';
import { optionalJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/escalations/stats - Get KPI counts (ALL, ON HOLD, RESOLVED, etc.)
router.get('/stats', optionalJWT, getEscalationStats);

// GET /api/escalations - Get all urgent requests with filters and search
router.get('/', optionalJWT, getEscalations);

// POST /api/escalations - Create new urgent priority request / escalation
router.post('/', optionalJWT, createEscalation);

// GET /api/escalations/:id - Get specific escalation details
router.get('/:id', optionalJWT, getEscalationById);

// PATCH /api/escalations/:id/resolve - Resolve escalation (Admin decision)
router.patch('/:id/resolve', optionalJWT, resolveEscalation);

// POST /api/escalations/:id/simulate-decision - Simulate decision in UI
router.post('/:id/simulate-decision', optionalJWT, simulateEscalationDecision);

// PUT /api/escalations/:id/resolve - Alias for resolve
router.put('/:id/resolve', optionalJWT, resolveEscalation);

export default router;
