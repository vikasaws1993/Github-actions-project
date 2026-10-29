import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { hashPassword } from '../utils/password.util.js';
import { logger } from '../utils/logger.js';

/**
 * User Service
 * Handles business logic for user management and persistence.
 */
class UserService {
  /**
   * Create and store a new user in the database
   * @param {Object} userData
   * @param {string} userData.full_name
   * @param {string} userData.mobile
   * @param {string} [userData.email]
   * @param {string} [userData.password]
   * @param {string} [userData.role]
   * @param {string} [userData.status]
   */
  async createUser(userData) {
    const { full_name, mobile, email, password, role, status } = userData;

    // 1. Check if user already exists with this mobile number
    const existingMobile = await UserModel.findByMobile(mobile);
    if (existingMobile) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'A user with this mobile number already exists'
      );
    }

    // 2. If email provided, check if user already exists with this email
    if (email) {
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          'A user with this email address already exists'
        );
      }
    }

    // 3. Hash password if provided
    let password_hash = null;
    if (password) {
      password_hash = await hashPassword(password);
    }

    // 4. Save to database via Model
    const createdUser = await UserModel.create({
      full_name,
      mobile,
      email: email || null,
      password_hash,
      role,
      status,
    });

    logger.info(`User created successfully [ID: ${createdUser.id}, Mobile: ${mobile}, Role: ${createdUser.role}]`);

    return createdUser;
  }

  /**
   * Get user by UUID
   * @param {string} id
   */
  async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }
    return user;
  }

  /**
   * Get user by mobile number
   * @param {string} mobile
   */
  async getUserByMobile(mobile) {
    const user = await UserModel.findByMobile(mobile);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User with this mobile number not found');
    }
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const userService = new UserService();
export default userService;
