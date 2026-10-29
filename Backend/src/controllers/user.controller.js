import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { userService } from '../services/user.service.js';
import { validateCreateUser } from '../validations/user.validation.js';

/**
 * User Controller
 * Handles HTTP requests, input validation, and responses for user endpoints.
 */

/**
 * Store / Create a new User
 * POST /api/users
 */
export const createUser = asyncHandler(async (req, res) => {
  // 1. Run validation
  const validation = validateCreateUser(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  // 2. Call service
  const user = await userService.createUser(validation.data);

  // 3. Return HTTP response
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, user, 'User registered successfully')
  );
});

/**
 * Get User by UUID
 * GET /api/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, user, 'User retrieved successfully')
  );
});

/**
 * Get User by Mobile Number
 * GET /api/users/mobile/:mobile
 */
export const getUserByMobile = asyncHandler(async (req, res) => {
  const user = await userService.getUserByMobile(req.params.mobile);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, user, 'User retrieved successfully')
  );
});
