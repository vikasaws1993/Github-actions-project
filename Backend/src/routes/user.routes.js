import { Router } from 'express';
import {
  createUser,
  getUserById,
  getUserByMobile,
} from '../controllers/user.controller.js';

const router = Router();

// POST /api/users - Store a new user
router.post('/', createUser);

// GET /api/users/mobile/:mobile - Find user by mobile number
router.get('/mobile/:mobile', getUserByMobile);

// GET /api/users/:id - Find user by UUID
router.get('/:id', getUserById);

export default router;
