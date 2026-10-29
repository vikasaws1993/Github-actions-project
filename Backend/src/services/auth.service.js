import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, USER_STATUS, USER_ROLES } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { UserModel } from '../models/user.model.js';
import { AdminModel } from '../models/admin.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { CitizenModel } from '../models/citizen.model.js';
import { BackupSevakAssignmentModel } from '../models/backupSevakAssignment.model.js';
import { RefreshTokenModel } from '../models/refreshToken.model.js';
import { verifyPassword, hashPassword } from '../utils/password.util.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util.js';
import { generateOtp } from '../utils/otp.util.js';
import { config } from '../config/environment.js';

// Helper to compute expiration date based on config (e.g., '7d')
const calculateExpiryDate = (expiresIn = '7d') => {
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
};

// In-memory OTP storage for authentication flow (5-minute expiration)
const otpStore = new Map();

// Rate-limiting / Failed login attempts tracker (5 failed attempts -> 5-minute lockout)
const MAX_FAILED_PASSWORD_ATTEMPTS = 5;
const PASSWORD_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes = 300,000 ms

const failedLoginStore = new Map();

/**
 * Checks if the given mobile or identifier is currently locked out
 * @param {string} identifier - clean 10-digit mobile or email
 * @returns {{ isLocked: boolean, remainingSeconds: number, attempts: number } | null}
 */
export const checkPasswordLockout = (identifier) => {
  if (!identifier) return null;
  const key = String(identifier).trim().toLowerCase();
  const record = failedLoginStore.get(key);
  if (!record) return null;

  const now = Date.now();
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
      return {
        isLocked: true,
        remainingSeconds,
        attempts: record.attempts || MAX_FAILED_PASSWORD_ATTEMPTS,
      };
    } else {
      // Lockout expired, clear entry
      failedLoginStore.delete(key);
      return null;
    }
  }
  return null;
};

/**
 * Records a failed password attempt and activates 5-minute lockout if threshold reached (5 attempts)
 * @param {string} identifier
 * @returns {{ isLocked: boolean, remainingAttempts: number, attempts: number, lockoutSeconds: number }}
 */
export const recordFailedPasswordAttempt = (identifier) => {
  if (!identifier) {
    return { isLocked: false, remainingAttempts: MAX_FAILED_PASSWORD_ATTEMPTS, attempts: 0, lockoutSeconds: 0 };
  }
  const key = String(identifier).trim().toLowerCase();
  const now = Date.now();
  const record = failedLoginStore.get(key) || { attempts: 0, lockedUntil: null, lastAttempt: now };

  // If previous lockout expired, reset attempts count
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.attempts = 0;
    record.lockedUntil = null;
  }

  record.attempts = (record.attempts || 0) + 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_FAILED_PASSWORD_ATTEMPTS) {
    record.lockedUntil = now + PASSWORD_LOCKOUT_DURATION_MS;
    failedLoginStore.set(key, record);
    const lockoutSec = Math.ceil(PASSWORD_LOCKOUT_DURATION_MS / 1000);
    logger.warn(`[AUTH] 🔒 Account locked for 5 minutes (${key}) after 5 failed password attempts.`);
    return {
      isLocked: true,
      remainingAttempts: 0,
      attempts: record.attempts,
      lockoutSeconds: lockoutSec,
    };
  }

  failedLoginStore.set(key, record);
  const remainingAttempts = Math.max(0, MAX_FAILED_PASSWORD_ATTEMPTS - record.attempts);
  logger.warn(`[AUTH] ⚠️ Failed password attempt ${record.attempts}/${MAX_FAILED_PASSWORD_ATTEMPTS} for (${key}).`);
  return {
    isLocked: false,
    remainingAttempts,
    attempts: record.attempts,
    lockoutSeconds: 0,
  };
};

/**
 * Clears failed attempts and lockout for a given identifier
 * @param {string} identifier
 */
export const clearFailedPasswordAttempts = (identifier) => {
  if (!identifier) return;
  const key = String(identifier).trim().toLowerCase();
  failedLoginStore.delete(key);
};

/**
 * Authentication Service
 * Houses all business logic related to user registration, login, and token generation.
 * Decoupled from Express HTTP request/response objects.
 */
class AuthService {

  /**
   * Role-based entry check for Admin and Arogya Sevak
   * 1. Verifies mobile is in database and role is ADMIN or SEVAK/AROGYA_SEVAK.
   *    If not, throws NOT_FOUND / FORBIDDEN (invalid input).
   * 2. If user already has password set -> returns status 'PASSWORD_REQUIRED'
   * 3. If user is first-time visitor (no password set) -> sends 4-digit OTP and returns status 'FIRST_TIME_OTP'
   *
   * @param {string} mobileNumber
   */
  async initiateAuth(mobileNumber) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Please provide a valid 10-digit mobile number');
    }

    // Check if mobile number is temporarily locked out due to 5 wrong password attempts
    const lockStatus = checkPasswordLockout(cleanMobile);
    if (lockStatus && lockStatus.isLocked) {
      const mins = Math.floor(lockStatus.remainingSeconds / 60);
      const secs = lockStatus.remainingSeconds % 60;
      const timeFormatted = mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}s`;
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        `Account temporarily locked due to 5 failed password attempts. Please wait ${timeFormatted} before trying again.`,
        [],
        '',
        {
          isLocked: true,
          lockoutSeconds: lockStatus.remainingSeconds,
          retryAfter: lockStatus.remainingSeconds,
          remainingAttempts: 0,
        }
      );
    }

    let user = await UserModel.findByMobile(cleanMobile);
    let normalizedRole = (user?.role || '').toUpperCase();
    let isAllowedRole =
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'SEVAK' ||
      normalizedRole === 'AROGYA_SEVAK' ||
      normalizedRole === 'OPERATOR';

    // Always check for active backup / temporary relief assignment
    let backupRecord = await BackupSevakAssignmentModel.getActiveByMobile(cleanMobile);
    
    // Check if user has permanent profile in arogya_sevaks or admins
    let permanentSevak = user ? await ArogyaSevakModel.findByUserId(user.id) : null;
    let permanentAdmin = user ? await AdminModel.findByUserId(user.id) : null;

    if (backupRecord && backupRecord.is_active) {
      isAllowedRole = true;
    } else if (!permanentSevak && !permanentAdmin) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Your temporary relief assignment has ended or is inactive. Login access is deactivated. Please contact your system administrator / आपला तात्पुरता आरोग्य सेवक कार्यकाळ समाप्त झाला आहे.'
      );
    } else if (!user || !isAllowedRole) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Invalid mobile number. You are not registered as an Admin or Arogya Sevak. Please contact your system administrator.'
      );
    }

    if (user && user.status === USER_STATUS.BLOCKED) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Your account has been blocked. Please contact support.');
    }
    if (user && user.status === USER_STATUS.INACTIVE) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Your temporary relief assignment has ended. Your account is inactive / आपले खाते निष्क्रिय झाले आहे.'
      );
    }

    // Resolve primary sevak name if this is a backup sevak
    let primarySevakName = null;
    if (backupRecord?.primary_sevak_id) {
      try {
        const prim = await ArogyaSevakModel.findById(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByUserId(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByNameOrCode(backupRecord.primary_sevak_id);
        primarySevakName = prim?.full_name || prim?.name || backupRecord.primary_sevak_id;
      } catch (_) {}
    }

    const hasPassword = Boolean(user && user.password_hash);

    if (hasPassword) {
      return {
        status: 'PASSWORD_REQUIRED',
        role: user.role || 'AROGYA_SEVAK',
        name: user.full_name || backupRecord?.backup_name || 'Arogya Sevak',
        mobileNumber: cleanMobile,
        isBackup: Boolean(backupRecord),
        coveringFor: primarySevakName,
        primarySevakName,
        message: 'Please enter your password to sign in.',
      };
    }

    // First-time visitor: generate and store OTP
    const otp = generateOtp(4);
    const roleName = user?.role || 'AROGYA_SEVAK';
    const fullName = user?.full_name || backupRecord?.backup_name || 'Relief Arogya Sevak';

    otpStore.set(cleanMobile, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
      isBackup: Boolean(backupRecord),
      backupRecord,
    });

    console.log(`[AUTH] 📱 First-time setup OTP for +91 ${cleanMobile} [${roleName}]: ${otp}`);
    logger.info(`Generated setup OTP for ${cleanMobile}: ${otp}`);

    return {
      status: 'FIRST_TIME_OTP',
      role: roleName,
      name: fullName,
      mobileNumber: cleanMobile,
      isBackup: Boolean(backupRecord),
      coveringFor: primarySevakName,
      primarySevakName,
      message: primarySevakName
        ? `Welcome ${fullName}! You are assigned as Temporary Relief Sevak for ${primarySevakName}. Please enter the 4-digit OTP to set your password.`
        : `Welcome, ${fullName}! Please enter the 4-digit OTP sent to your registered number to set your password.`,
      otp, // for testing/dev ease
    };
  }

  /**
   * Set permanent password for first-time allocated Admin or Arogya Sevak
   *
   * @param {Object} data
   * @param {string} data.mobileNumber
   * @param {string} data.password
   */
  async setFirstTimePassword({ mobileNumber, password }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');

    const record = otpStore.get(cleanMobile);
    if (!record || !record.verified) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Please verify your mobile number with OTP before setting your password.'
      );
    }

    if (!password || password.length < 6) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters long.');
    }

    let user = await UserModel.findByMobile(cleanMobile);
    const passwordHash = await hashPassword(password);

    if (!user) {
      const backupRecord = record.backupRecord || (await BackupSevakAssignmentModel.getActiveByMobile(cleanMobile));
      if (backupRecord) {
        user = await UserModel.create({
          full_name: backupRecord.backup_name || 'Relief Sevak',
          mobile: cleanMobile,
          password_hash: passwordHash,
          role: USER_ROLES.AROGYA_SEVAK,
          status: USER_STATUS.ACTIVE,
        });
      } else {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found in system.');
      }
    } else {
      await UserModel.updatePassword(user.id, passwordHash);
    }

    // Clear verified OTP record and failed attempts
    otpStore.delete(cleanMobile);
    clearFailedPasswordAttempts(cleanMobile);

    // Automatically log user in with newly set password
    return this.loginUser(cleanMobile, password);
  }


  /**
   * Send 4-digit OTP to mobile number
   * Checks whether the user is already available in the database
   *
   * @param {string} mobileNumber
   */
  async sendLoginOtp(mobileNumber) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Please provide a valid 10-digit mobile number');
    }

    // 1. Generate 4-digit OTP
    const otp = generateOtp(4);

    // 2. Check if mobile number already exists in database
    const existingUser = await UserModel.findByMobile(cleanMobile);

    // 3. Store OTP in-memory with 5-minute expiration and max 5 attempts
    otpStore.set(cleanMobile, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
    });

    console.log(`[AUTH] 📱 Generated 4-digit OTP for +91 ${cleanMobile}: ${otp} (User Exists: ${Boolean(existingUser)})`);
    logger.info(`Generated 4-digit OTP for ${cleanMobile}: ${otp}`);

    return {
      message: 'OTP sent successfully',
      mobileNumber: cleanMobile,
      isExistingUser: Boolean(existingUser),
      hasPassword: Boolean(existingUser?.password_hash),
      // Returned for testing/dev ease so user can verify instantly
      otp,
    };
  }

  /**
   * Verify 4-digit OTP
   * Validates OTP and returns whether user is already registered in database
   *
   * @param {string} mobileNumber
   * @param {string} otp
   */
  async verifyLoginOtp(mobileNumber, otp) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');
    const inputOtp = String(otp).trim();

    const record = otpStore.get(cleanMobile);
    if (!record || Date.now() > record.expiresAt) {
      if (record) otpStore.delete(cleanMobile);
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'OTP has expired or was not requested. Please click Resend OTP.'
      );
    }

    if (record.otp !== inputOtp) {
      record.attempts = (record.attempts || 0) + 1;
      const remainingAttempts = Math.max(0, (record.maxAttempts || 5) - record.attempts);

      if (remainingAttempts === 0) {
        otpStore.delete(cleanMobile);
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'Too many incorrect OTP attempts. This OTP has been invalidated for security. Please request a new OTP.'
        );
      }

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid OTP code. ${remainingAttempts} attempt(s) remaining. Please check and try again.`
      );
    }

    // Mark verified
    record.verified = true;

    // Check user record in database
    const existingUser = await UserModel.findByMobile(cleanMobile);

    return {
      verified: true,
      mobileNumber: cleanMobile,
      isExistingUser: Boolean(existingUser),
      hasPassword: Boolean(existingUser?.password_hash),
      name: existingUser?.full_name || null,
      role: existingUser?.role || null,
    };
  }

  /**
   * Register or set password for a user after OTP verification
   *
   * @param {Object} data
   * @param {string} data.mobileNumber
   * @param {string} data.password
   * @param {string} [data.full_name]
   */
  async registerWithPassword({ mobileNumber, password, full_name }) {
    const cleanMobile = String(mobileNumber).replace(/\D/g, '');

    // 1. Ensure OTP was verified
    const record = otpStore.get(cleanMobile);
    if (!record || !record.verified) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Please verify your mobile number with OTP before creating a password.'
      );
    }

    if (!password || password.length < 6) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters long.');
    }

    // 2. Hash new password
    const passwordHash = await hashPassword(password);

    // 3. Check if user already exists
    let user = await UserModel.findByMobile(cleanMobile);
    if (user) {
      // Update password
      user = await UserModel.updatePassword(user.id, passwordHash);
    } else {
      // Create new User
      const isBackupUser = Boolean(record.isBackup);
      const userRole = isBackupUser ? USER_ROLES.AROGYA_SEVAK : USER_ROLES.CITIZEN;
      const userName = (isBackupUser && record.backupRecord?.backup_name) 
        ? record.backupRecord.backup_name 
        : (full_name?.trim() || (isBackupUser ? 'Relief Sevak' : 'Citizen User'));

      user = await UserModel.create({
        full_name: userName,
        mobile: cleanMobile,
        password_hash: passwordHash,
        role: userRole,
        status: USER_STATUS.ACTIVE,
      });

      try {
        if (!isBackupUser) {
          await CitizenModel.create({ user_id: user.id });
        }
      } catch (cErr) {
        logger.warn(`Could not create profile record: ${cErr.message}`);
      }
    }

    // Clear OTP record and failed password attempts
    otpStore.delete(cleanMobile);
    clearFailedPasswordAttempts(cleanMobile);

    // 4. Generate JWT tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      name: user.full_name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Persist refresh token
    try {
      await RefreshTokenModel.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: calculateExpiryDate(config.jwt.refreshExpiresIn),
      });
    } catch (tokenErr) {
      logger.warn(`Could not persist refresh token: ${tokenErr.message}`);
    }

    const sanitizedUser = {
      id: user.id,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      systemRole: user.role.toLowerCase(),
      status: user.status,
      created_at: user.created_at,
    };

    logger.info(`User registered & logged in successfully [ID: ${user.id}, Mobile: ${user.mobile}]`);

    return {
      user: sanitizedUser,
      accessToken,
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * Login an existing user using mobile number or email and password
   * Supports all roles (ADMIN, AROGYA_SEVAK, SEVAK, CITIZEN)
   *
   * @param {string} identifier - Mobile number or email address
   * @param {string} password - User password
   */
  async loginUser(identifier, password) {
    if (!identifier) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Mobile number or email is required');
    }

    const cleanIdentifier = String(identifier).trim();
    const isEmail = cleanIdentifier.includes('@');
    const cleanMobile = !isEmail ? cleanIdentifier.replace(/\D/g, '') : null;
    const lookupKey = cleanMobile || cleanIdentifier.toLowerCase();

    // 0. Check if identifier/mobile is currently locked out
    const lockStatus = checkPasswordLockout(lookupKey);
    if (lockStatus && lockStatus.isLocked) {
      const mins = Math.floor(lockStatus.remainingSeconds / 60);
      const secs = lockStatus.remainingSeconds % 60;
      const timeFormatted = mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}s`;
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        `Too many incorrect password attempts (5/5). Account is locked for 5 minutes. Please wait ${timeFormatted} before trying again.`,
        [],
        '',
        {
          isLocked: true,
          lockoutSeconds: lockStatus.remainingSeconds,
          retryAfter: lockStatus.remainingSeconds,
          remainingAttempts: 0,
        }
      );
    }

    // 1. Look up user by mobile or email in the database
    const user = isEmail
      ? await UserModel.findByEmail(cleanIdentifier.toLowerCase())
      : await UserModel.findByMobile(cleanMobile);

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials. User not found.');
    }

    // Check lockout on user's registered mobile if looked up by email
    if (user.mobile && user.mobile !== lookupKey) {
      const userMobileLock = checkPasswordLockout(user.mobile);
      if (userMobileLock && userMobileLock.isLocked) {
        const mins = Math.floor(userMobileLock.remainingSeconds / 60);
        const secs = userMobileLock.remainingSeconds % 60;
        const timeFormatted = mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}s`;
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          `Too many incorrect password attempts (5/5). Account is locked for 5 minutes. Please wait ${timeFormatted} before trying again.`,
          [],
          '',
          {
            isLocked: true,
            lockoutSeconds: userMobileLock.remainingSeconds,
            retryAfter: userMobileLock.remainingSeconds,
            remainingAttempts: 0,
          }
        );
      }
    }

    // 2. Check if password_hash is set
    if (!user.password_hash) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        'Password login is not enabled for this account. Please set a password.'
      );
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      const failureKey = user.mobile || lookupKey;
      const failRecord = recordFailedPasswordAttempt(failureKey);

      if (failRecord.isLocked) {
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'Too many incorrect password attempts (5/5). Your account is locked for 5 minutes for security.',
          [],
          '',
          {
            isLocked: true,
            lockoutSeconds: failRecord.lockoutSeconds || 300,
            retryAfter: failRecord.lockoutSeconds || 300,
            remainingAttempts: 0,
            attempts: failRecord.attempts,
          }
        );
      }

      const remaining = failRecord.remainingAttempts;
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        `Invalid credentials. Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before a 5-minute security lockout.`,
        [],
        '',
        {
          isLocked: false,
          remainingAttempts: remaining,
          attempts: failRecord.attempts,
        }
      );
    }

    // Successful login -> clear failed attempts and any lockout
    clearFailedPasswordAttempts(user.mobile);
    clearFailedPasswordAttempts(lookupKey);

    // 4. Check user status
    if (user.status === USER_STATUS.BLOCKED) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Your account has been blocked. Please contact system support.'
      );
    }

    if (user.status === USER_STATUS.INACTIVE) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Your account is inactive. Please contact system support.'
      );
    }

    // 5. Load role-specific profile details
    let adminProfile = null;
    let sevakProfile = null;

    const normalizedRole = (user.role || '').toUpperCase();

    if (normalizedRole === USER_ROLES.ADMIN || normalizedRole === 'ADMIN') {
      try {
        adminProfile = await AdminModel.findByUserId(user.id);
      } catch (err) {
        logger.warn(`Could not fetch admin profile for user ${user.id}: ${err.message}`);
      }
    } else if (
      normalizedRole === USER_ROLES.SEVAK ||
      normalizedRole === USER_ROLES.AROGYA_SEVAK ||
      normalizedRole === 'SEVAK' ||
      normalizedRole === 'AROGYA_SEVAK'
    ) {
      try {
        sevakProfile = await ArogyaSevakModel.findByUserId(user.id);
      } catch (err) {
        logger.warn(`Could not fetch sevak profile for user ${user.id}: ${err.message}`);
      }
    }

    let backupProfile = null;
    let primarySevakDetails = null;
    if (
      normalizedRole === USER_ROLES.SEVAK ||
      normalizedRole === USER_ROLES.AROGYA_SEVAK ||
      normalizedRole === 'SEVAK' ||
      normalizedRole === 'AROGYA_SEVAK'
    ) {
      try {
        backupProfile = await BackupSevakAssignmentModel.getActiveByMobile(user.mobile);
        if (backupProfile && backupProfile.primary_sevak_id) {
          const primId = backupProfile.primary_sevak_id;
          let primSevak = await ArogyaSevakModel.findById(primId)
            || await ArogyaSevakModel.findByUserId(primId)
            || await ArogyaSevakModel.findByNameOrCode(primId);
          if (primSevak) {
            primarySevakDetails = {
              id: primSevak.id,
              userId: primSevak.user_id,
              name: primSevak.full_name || primSevak.name || 'Primary Arogya Sevak',
              employee_code: primSevak.employee_code,
              hospital: primSevak.hospital || backupProfile.hospital_id,
              assigned_hospitals: primSevak.assigned_hospitals || [],
            };
          } else {
            primarySevakDetails = {
              id: primId,
              name: primId,
              hospital: backupProfile.hospital_id,
            };
          }
        }
      } catch (err) {
        logger.warn(`Could not fetch backup sevak profile for user ${user.id}: ${err.message}`);
      }
    }

    if (!adminProfile && !sevakProfile && !backupProfile) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Your temporary relief assignment has ended. Login access is deactivated. Please contact your system administrator / आपला तात्पुरता आरोग्य सेवक कार्यकाळ समाप्त झाला आहे.'
      );
    }

    // 6. Generate access and refresh tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      name: user.full_name,
      ...(backupProfile && {
        isBackup: true,
        coveringForSevakId: backupProfile.primary_sevak_id,
        primarySevakName: primarySevakDetails?.name || 'Primary Sevak',
        hospitalId: backupProfile.hospital_id || primarySevakDetails?.hospital,
        employeeCode: 'RELIEF-SEVAK',
      }),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Persist refresh token
    try {
      await RefreshTokenModel.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: calculateExpiryDate(config.jwt.refreshExpiresIn),
      });
    } catch (tokenErr) {
      logger.warn(`Could not persist refresh token: ${tokenErr.message}`);
    }

    // 7. Sanitize response (never return password_hash)
    const sanitizedUser = {
      id: user.id,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      systemRole: user.role.toLowerCase(),
      status: user.status,
      created_at: user.created_at,
      isBackup: Boolean(backupProfile),
      is_backup: Boolean(backupProfile),
      coveringFor: primarySevakDetails?.name || null,
      primarySevakName: primarySevakDetails?.name || null,
      coveringForSevakId: backupProfile?.primary_sevak_id || null,
      hospital: backupProfile?.hospital_id || primarySevakDetails?.hospital || null,
      assignedHospitals: primarySevakDetails?.assigned_hospitals || [],
      ...(adminProfile && {
        admin: {
          id: adminProfile.id,
          department: adminProfile.department,
          designation: adminProfile.designation,
        },
      }),
      ...(sevakProfile && !backupProfile && {
        sevak: {
          id: sevakProfile.id,
          employee_code: sevakProfile.employee_code,
          phone: sevakProfile.phone,
        },
      }),
      ...(backupProfile && {
        sevak: {
          id: `backup-${backupProfile.id}`,
          name: backupProfile.backup_name || user.full_name,
          employee_code: 'RELIEF-SEVAK',
          phone: backupProfile.backup_mobile || user.mobile,
          is_backup: true,
          covering_for_sevak_id: backupProfile.primary_sevak_id,
          covering_for_name: primarySevakDetails?.name || 'Primary Sevak',
          hospital: backupProfile.hospital_id || primarySevakDetails?.hospital,
        },
      }),
    };

    logger.info(`User logged in successfully [ID: ${user.id}, Mobile: ${user.mobile}, Role: ${user.role}]`);

    return {
      user: sanitizedUser,
      accessToken,
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh session using a valid, non-revoked refresh token
   * @param {string} refreshToken
   */
  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refresh token is required');
    }

    // 1. Verify JWT signature and expiration
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    // 2. Verify token against database / in-memory store
    const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
    if (!tokenRecord) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or unrecognized refresh token');
    }

    if (tokenRecord.revoked) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token has been revoked. Please login again.');
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token has expired. Please login again.');
    }

    // 3. Find user and verify account status
    const userId = decoded.id || tokenRecord.user_id;
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User associated with token not found');
    }

    if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.INACTIVE) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `Account is ${user.status.toLowerCase()}. Please contact administrator.`
      );
    }

    // 4. Generate fresh access token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      name: user.full_name,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    logger.info(`Session refreshed successfully [UserID: ${user.id}, Mobile: ${user.mobile}]`);

    return {
      accessToken: newAccessToken,
      token: newAccessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        systemRole: user.role ? user.role.toLowerCase() : 'user',
        status: user.status,
      },
    };
  }

  /**
   * Invalidate / revoke refresh token on logout
   * @param {string} [refreshToken]
   * @param {string} [userId]
   */
  async logoutUser(refreshToken, userId) {
    if (refreshToken) {
      await RefreshTokenModel.revoke(refreshToken);
    }
    if (userId && !refreshToken) {
      await RefreshTokenModel.revokeByUserId(userId);
    }

    logger.info(
      `User session logged out / token revoked [Token: ${refreshToken ? 'provided' : 'none'}, UserID: ${userId || 'N/A'}]`
    );

    return {
      success: true,
      message: 'Logged out successfully. Refresh token invalidated.',
    };
  }

  /**
   * Change password for currently authenticated user
   * Verifies existing current_password and stores hashed new_password
   *
   * @param {string} userId - Authenticated user UUID
   * @param {Object} data
   * @param {string} data.currentPassword
   * @param {string} data.newPassword
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    if (!userId) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required');
    }
    if (!currentPassword || !newPassword) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Current password and new password are required');
    }
    if (newPassword.length < 6) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'New password must be at least 6 characters long');
    }

    // 1. Fetch user by id
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found');
    }

    // 2. Fetch full user to get password_hash
    const fullUser = await UserModel.findByMobile(user.mobile);
    if (!fullUser || !fullUser.password_hash) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No existing password found on your account. Please set a password first.');
    }

    // 3. Verify current password
    const isMatch = await verifyPassword(currentPassword, fullUser.password_hash);
    if (!isMatch) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Incorrect current password. Please try again.');
    }

    // 4. Hash new password
    const newHash = await hashPassword(newPassword);

    // 5. Update user password in database
    await UserModel.updatePassword(userId, newHash);
    clearFailedPasswordAttempts(fullUser?.mobile || user?.mobile);

    logger.info(`Password successfully updated for user [ID: ${userId}, Mobile: ${user.mobile}]`);

    return {
      success: true,
      message: 'Account password updated successfully',
    };
  }
}

export const authService = new AuthService();


