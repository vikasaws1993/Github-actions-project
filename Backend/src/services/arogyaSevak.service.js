import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { UserModel } from '../models/user.model.js';
import { BackupSevakAssignmentModel } from '../models/backupSevakAssignment.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, USER_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { generateOtp } from '../utils/otp.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { toStandardDigits } from '../utils/language.util.js';
import { RefreshTokenModel } from '../models/refreshToken.model.js';
import { adminService } from './admin.service.js';


// In-memory OTP store for Arogya Sevak mobile app login (5-minute expiry)
const sevakMobileOtpStore = new Map();

class ArogyaSevakService {
  /**
   * Create a new Arogya Sevak profile linked to an existing user
   */
  async createArogyaSevak(sevakData) {
    const { user_id, employee_code } = sevakData;

    // 1. Verify user exists
    const user = await UserModel.findById(user_id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User with this user_id does not exist');
    }

    // 2. Check 1-to-1 relationship: sevak profile must not already exist
    const existingSevak = await ArogyaSevakModel.findByUserId(user_id);
    if (existingSevak) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'An Arogya Sevak profile already exists for this user'
      );
    }

    // 3. Verify employee_code uniqueness
    const existingCode = await ArogyaSevakModel.findByEmployeeCode(employee_code);
    if (existingCode) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'An Arogya Sevak with this employee code already exists'
      );
    }

    // 4. Create Arogya Sevak profile
    const sevak = await ArogyaSevakModel.create(sevakData);
    logger.info(`Arogya Sevak profile created successfully [ID: ${sevak.id}, Code: ${employee_code}]`);

    return sevak;
  }

  async getArogyaSevakById(id) {
    return adminService.getArogyaSevakById(id);
  }

  async getArogyaSevakByUserId(user_id) {
    return adminService.getArogyaSevakById(user_id);
  }

  async getArogyaSevakByEmployeeCode(employee_code) {
    const sevak = await ArogyaSevakModel.findByEmployeeCode(employee_code);
    if (!sevak) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found for this employee code');
    }
    return adminService.getArogyaSevakById(sevak.id);
  }

  async updateArogyaSevak(id, updateData, updatingUserId = null) {
    return adminService.updateArogyaSevak(updatingUserId, id, updateData);
  }


  /**
   * Send 6-digit OTP for Arogya Sevak Mobile App login.
   * Only permits existing, active Arogya Sevaks registered by Admin.
   *
   * @param {string} mobileNumber - 10-digit mobile number
   */
  async sendSevakLoginOtp(mobileNumber) {
    const cleanMobile = toStandardDigits(mobileNumber).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका'
      );
    }

    // 1. Verify user exists in database
    const user = await UserModel.findByMobile(cleanMobile);
    const normalizedRole = (user?.role || '').toUpperCase();
    const isSevakRole =
      normalizedRole === 'AROGYA_SEVAK' ||
      normalizedRole === 'SEVAK' ||
      normalizedRole === 'OPERATOR';

    const sevakProfile = user && isSevakRole ? await ArogyaSevakModel.findByUserId(user.id) : null;

    // Check if Arogya Sevak is registered as primary user
    if (!user || !isSevakRole || !sevakProfile) {
      // Check if this mobile number is assigned as an active Backup / Temporary Sevak
      const backupRecord = await BackupSevakAssignmentModel.getActiveByMobile(cleanMobile);
      if (backupRecord && backupRecord.is_active) {
        const otp = generateOtp(6);
        sevakMobileOtpStore.set(cleanMobile, {
          otp,
          isBackup: true,
          backupRecord,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });

        console.log(`[BACKUP-SEVAK-AUTH] 📱 Generated 6-digit OTP for Backup Sevak +91 ${cleanMobile} (${backupRecord.backup_name}): ${otp}`);
        logger.info(`Generated 6-digit mobile OTP for Backup Arogya Sevak: ${cleanMobile}`);

        return {
          mobileNumber: cleanMobile,
          isMobileRegistered: true,
          isBackup: true,
          otpSent: true,
          name: backupRecord.backup_name,
          employee_code: 'TEMP-RELIEF',
          covering_for_sevak_id: backupRecord.primary_sevak_id,
          otp,
          message: '६ अंकी OTP पाठवला आहे. तात्पुरता आरोग्य सेवक डॅशबोर्ड लॉगिनसाठी OTP टाका / 6-digit OTP sent. Enter OTP to login as Relief Sevak.',
        };
      }

      return {
        mobileNumber: cleanMobile,
        isMobileRegistered: false,
        otpSent: false,
        otp: null,
        message: 'This mobile number is not registered as an Arogya Sevak or Backup Relief. Please contact your system administrator / हा मोबाईल नंबर आरोग्य सेवक म्हणून नोंदणीकृत नाही. कृपया प्रशासकाशी संपर्क साधा.',
      };
    }

    // 2. Verify user status
    if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.INACTIVE || sevakProfile.status === 'INACTIVE') {
      return {
        mobileNumber: cleanMobile,
        isMobileRegistered: true,
        isActive: false,
        otpSent: false,
        otp: null,
        message: 'Your Arogya Sevak account is blocked or inactive. Please contact your administrator / आपले खाते निष्क्रिय किंवा ब्लॉक केले आहे.',
      };
    }

    // 3. Generate 6-digit OTP
    const otp = generateOtp(6);

    // 4. Store in memory (5-minute expiration)
    sevakMobileOtpStore.set(cleanMobile, {
      otp,
      userId: user.id,
      sevakId: sevakProfile.id,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`[SEVAK-MOBILE-AUTH] 📱 Generated 6-digit OTP for +91 ${cleanMobile} (${user.full_name}): ${otp}`);
    logger.info(`Generated 6-digit mobile OTP for Arogya Sevak: ${cleanMobile}`);

    return {
      mobileNumber: cleanMobile,
      isMobileRegistered: true,
      otpSent: true,
      name: user.full_name,
      employee_code: sevakProfile.employee_code || sevakProfile.employee_id || 'SEVAK',
      // Returned for testing/dev ease in Postman
      otp,
      message: '६ अंकी OTP पाठवला आहे. डॅशबोर्ड लॉगिनसाठी OTP टाका / 6-digit OTP sent. Enter OTP to login to your dashboard.',
    };
  }

  /**
   * Verify 6-digit OTP and login Arogya Sevak to mobile dashboard.
   * Returns JWT token, user info, sevak profile, and assigned hospitals.
   *
   * @param {Object} data
   * @param {string} data.mobileNumber
   * @param {string} data.otp
   */
  async verifySevakOtpAndLogin({ mobileNumber, otp }) {
    const cleanMobile = toStandardDigits(mobileNumber).replace(/\D/g, '');
    const cleanOtp = toStandardDigits(otp).trim();

    const record = sevakMobileOtpStore.get(cleanMobile);
    if (!record || Date.now() > record.expiresAt) {
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        status: 'OTP_EXPIRED_OR_INVALID',
        isOtpValid: false,
        otpVerified: false,
        isMobileRegistered: true,
        message: 'OTP has expired or was not requested / OTP ची मुदत संपली आहे किंवा मागवला नाही. कृपया पुन्हा OTP मागवा.',
      };
    }

    if (record.otp !== cleanOtp) {
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        status: 'INVALID_OTP',
        isOtpValid: false,
        otpVerified: false,
        isMobileRegistered: true,
        message: 'Invalid OTP code. Please check and try again / अमान्य OTP. कृपया तपासून पुन्हा प्रयत्न करा.',
      };
    }

    // Clear used OTP
    sevakMobileOtpStore.delete(cleanMobile);

    // If this is a Temporary / Backup Relief Sevak Login
    if (record.isBackup && record.backupRecord) {
      const backup = record.backupRecord;
      const primarySevakProfile = await adminService.getArogyaSevakById(backup.primary_sevak_id);

      const tokenPayload = {
        id: `backup-${backup.id}`,
        mobile: cleanMobile,
        role: 'AROGYA_SEVAK',
        name: backup.backup_name,
        isBackup: true,
        coveringForSevakId: backup.primary_sevak_id,
        primarySevakName: primarySevakProfile?.name || 'Primary Sevak',
        hospitalId: backup.hospital_id,
        employeeCode: 'RELIEF-SEVAK',
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: `backup-${backup.id}` });

      logger.info(`Backup Relief Sevak mobile login successful [Name: ${backup.backup_name}, Phone: ${cleanMobile}]`);

      return {
        status: 'LOGIN_SUCCESS',
        isOtpValid: true,
        otpVerified: true,
        isMobileRegistered: true,
        isBackup: true,
        message: `Welcome Relief Sevak ${backup.backup_name}! Logged in successfully.`,
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: `backup-${backup.id}`,
          full_name: backup.backup_name,
          mobile: cleanMobile,
          role: 'AROGYA_SEVAK',
          isBackup: true,
          coveringFor: primarySevakProfile?.name || 'Primary Sevak',
        },
        sevakProfile: {
          id: `backup-${backup.id}`,
          name: backup.backup_name,
          mobile: cleanMobile,
          is_backup: true,
          covering_for_sevak_id: backup.primary_sevak_id,
          hospital: backup.hospital_id || primarySevakProfile?.hospital,
          assigned_hospitals: primarySevakProfile?.assigned_hospitals || [],
        },
        assignedHospitals: primarySevakProfile?.assigned_hospitals || [],
      };
    }

    // Fetch user and full Sevak profile (including assigned hospitals)
    const user = await UserModel.findById(record.userId);
    const fullProfile = await ArogyaSevakModel.findById(record.sevakId);

    if (!user || !fullProfile) {
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        status: 'NOT_FOUND',
        isOtpValid: true,
        otpVerified: true,
        isMobileRegistered: false,
        message: 'Arogya Sevak account could not be found.',
      };
    }

    // Generate JWT access & refresh tokens
    const employeeCode = fullProfile.employee_code || fullProfile.employee_id || 'SEVAK';
    const tokenPayload = {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      name: user.full_name,
      sevakId: fullProfile.id,
      employeeCode,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    try {
      await RefreshTokenModel.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (tokenErr) {
      logger.warn(`Could not persist sevak refresh token: ${tokenErr.message}`);
    }

    logger.info(`Arogya Sevak mobile login successful [ID: ${fullProfile.id}, Code: ${employeeCode}]`);

    return {
      status: 'LOGIN_SUCCESS',
      isOtpValid: true,
      otpVerified: true,
      isMobileRegistered: true,
      message: 'Arogya Sevak logged in successfully / आरोग्य सेवक यशस्वीरीत्या लॉगिन झाले',
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      sevakProfile: fullProfile,
      assignedHospitals: fullProfile.assigned_hospitals || [],
    };
  }

  /**
   * Assign a Temporary / Backup Arogya Sevak
   */
  async assignBackupSevak(data) {
    const { primary_sevak_id, backup_name, backup_mobile, reason, hospital_id, assigned_by } = data;
    if (!backup_name || !backup_mobile) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Backup Sevak name and mobile number are required.');
    }

    const cleanMobile = String(backup_mobile).replace(/\D/g, '').slice(-10);
    const cleanName = String(backup_name).trim();

    // Ensure User record exists in public.users for seamless login
    let user = await UserModel.findByMobile(cleanMobile);
    if (!user) {
      try {
        user = await UserModel.create({
          full_name: cleanName,
          mobile: cleanMobile,
          role: USER_ROLES.AROGYA_SEVAK,
          status: USER_STATUS.ACTIVE,
        });
        logger.info(`Created user account for Temporary Arogya Sevak [Name: ${cleanName}, Mobile: ${cleanMobile}]`);
      } catch (uErr) {
        logger.warn(`Could not create user account during backup assignment: ${uErr.message}`);
      }
    } else if (user.role !== USER_ROLES.AROGYA_SEVAK && user.role !== 'AROGYA_SEVAK' && user.role !== 'SEVAK') {
      try {
        await UserModel.update(user.id, { role: USER_ROLES.AROGYA_SEVAK, full_name: cleanName });
      } catch (_) {}
    }

    const saved = await BackupSevakAssignmentModel.assignBackup({
      primary_sevak_id,
      hospital_id,
      backup_name: cleanName,
      backup_mobile: cleanMobile,
      reason,
      assigned_by,
    });

    logger.info(`Backup Sevak assigned [Primary: ${primary_sevak_id}, Backup: ${cleanName}, Phone: ${cleanMobile}]`);
    return { ...saved, user_id: user?.id };
  }

  /**
   * Get active backup assignment for a primary Sevak
   */
  async getActiveBackupSevak(primary_sevak_id) {
    return BackupSevakAssignmentModel.getActiveByPrimarySevakId(primary_sevak_id);
  }

  /**
   * Admin removes / deactivates temporary backup Sevak
   */
  async removeBackupSevak(primary_sevak_id) {
    const removed = await BackupSevakAssignmentModel.removeBackup(primary_sevak_id);

    // Deactivate temporary relief user account and revoke active login tokens
    for (const row of (removed || [])) {
      if (row.backup_mobile) {
        try {
          const user = await UserModel.findByMobile(row.backup_mobile);
          if (user) {
            // Check if user has a permanent role in arogya_sevaks or admins
            const permanentSevak = await ArogyaSevakModel.findByUserId(user.id);
            const permanentAdmin = await AdminModel.findByUserId(user.id);
            if (!permanentSevak && !permanentAdmin) {
              await UserModel.update(user.id, { status: USER_STATUS.INACTIVE });
              await RefreshTokenModel.revokeByUserId(user.id);
              logger.info(`Deactivated temporary sevak user account and revoked tokens [ID: ${user.id}, Mobile: ${user.mobile}]`);
            }
          }
        } catch (uErr) {
          logger.warn(`Could not deactivate temp user upon backup removal: ${uErr.message}`);
        }
      }
    }

    logger.info(`Backup Sevak removed for primary Sevak: ${primary_sevak_id}`);
    return { success: true, message: 'Backup Sevak assignment removed and login access revoked successfully', removed };
  }
}

export const arogyaSevakService = new ArogyaSevakService();
export default arogyaSevakService;
