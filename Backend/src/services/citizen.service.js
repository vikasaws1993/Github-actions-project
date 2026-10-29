import { CitizenModel } from '../models/citizen.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, USER_ROLES, USER_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import {
  toStandardDigits,
  normalizeGender,
  parseBirthDate,
} from '../utils/language.util.js';
import { generateOtp } from '../utils/otp.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { RefreshTokenModel } from '../models/refreshToken.model.js';
import { referralService } from './referral.service.js';
import { resolveDistrict, resolveTaluka } from '../utils/locationResolver.util.js';

// In-memory OTP storage for citizen authentication flow (5-minute expiration)
const citizenOtpStore = new Map();

/**
 * Citizen Service
 * Handles business logic for Citizen registration, profile retrieval, and updates.
 * Features built-in normalization for bilingual Marathi and English data.
 */
class CitizenService {
  /**
   * Register or update a citizen profile from the registration UI form.
   *
   * @param {Object} data - Form data (full_name, dob, gender, address, district, taluka, pincode, etc.)
   * @param {Object} [tokenUser] - Authenticated user payload from JWT (if available)
   * @returns {Promise<Object>} Complete citizen profile with user details
   */
  async registerCitizen(data, tokenUser = null) {
    const mobileInput = data.mobileNumber || data.phoneNumber || data.mobile;
    const nameInput = (data.full_name || data.name || '').trim();
    const districtInput = (data.district || data.dist || '').trim();
    const talukaInput = (data.taluka || data.tal || '').trim();

    let targetUserId = tokenUser?.id || data.user_id || null;
    let user = null;

    // 1. Resolve user
    if (targetUserId) {
      user = await UserModel.findById(targetUserId);
      if (!user) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          'User with provided user_id does not exist / वापरकर्ता सापडला नाही'
        );
      }
    } else if (mobileInput) {
      const cleanMobile = toStandardDigits(mobileInput).replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका'
        );
      }

      user = await UserModel.findByMobile(cleanMobile);
      if (!user) {
        // Create new user account automatically
        user = await UserModel.create({
          full_name: nameInput,
          mobile: cleanMobile,
          email: data.email?.trim().toLowerCase() || null,
          role: USER_ROLES.CITIZEN,
          status: USER_STATUS.ACTIVE,
        });
        logger.info(`Auto-created Citizen user for mobile: ${cleanMobile} [ID: ${user.id}]`);
      }
      targetUserId = user.id;
    } else {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Authentication token, user_id, or mobileNumber is required to register citizen profile.'
      );
    }

    // 2. Synchronize full_name and email on the users table
    if (nameInput) {
      await UserModel.updateProfile(user.id, {
        full_name: nameInput,
        email: data.email,
      });
    }

    // 3. Normalize Marathi/English form values
    const normalizedDob = parseBirthDate(data.dob);
    const normalizedGender = normalizeGender(data.gender);
    const normalizedPincode = toStandardDigits(data.pincode);
    const normalizedEmail = data.email ? data.email.trim().toLowerCase() : null;

    // Resolve location canonically
    const resolvedDistrict = await resolveDistrict(data.district_id || data.districtId || districtInput);
    const resolvedTaluka = await resolveTaluka(data.taluka_id || data.talukaId || talukaInput, resolvedDistrict.id || resolvedDistrict.district_code);

    const canonicalDistrictName = resolvedDistrict.nameEnglish || districtInput || 'Pune';
    const canonicalTalukaName = resolvedTaluka.nameEnglish || talukaInput || null;

    const citizenPayload = {
      user_id: user.id,
      dob: normalizedDob,
      gender: normalizedGender,
      address: data.address.trim(),
      state: data.state?.trim() || 'Maharashtra',
      district: canonicalDistrictName,
      district_id: resolvedDistrict.id || null,
      taluka: canonicalTalukaName,
      taluka_id: resolvedTaluka.id || null,
      pincode: normalizedPincode,
      email: normalizedEmail,
    };

    // 4. Upsert citizen profile (check 1-to-1 relationship)
    const existingCitizen = await CitizenModel.findByUserId(user.id);
    let citizenRecord;

    if (existingCitizen) {
      // Update existing citizen profile
      citizenRecord = await CitizenModel.update(existingCitizen.id, citizenPayload);
      logger.info(`Citizen profile updated successfully [CitizenID: ${existingCitizen.id}, UserID: ${user.id}]`);
    } else {
      // Create new citizen profile
      citizenRecord = await CitizenModel.create(citizenPayload);
      logger.info(`Citizen profile created successfully [CitizenID: ${citizenRecord.id}, UserID: ${user.id}]`);

      // Track referral ONLY for first-time citizen registration
      const inputReferralCode = data.referral_code || data.referralCode;
      if (inputReferralCode) {
        try {
          await referralService.processRegistrationReferral({
            referralCode: inputReferralCode,
            referredUserId: user.id,
          });
        } catch (refErr) {
          logger.warn(`Referral attribution skipped for user ${user.id}: ${refErr.message}`);
        }
      }
    }

    // 5. Return complete joined profile with auth tokens
    const fullProfile = await this.getCitizenByUserId(user.id);

    const tokenPayload = {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      role: USER_ROLES.CITIZEN,
      name: user.full_name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    try {
      await RefreshTokenModel.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (_) { }

    return {
      ...fullProfile,
      token: accessToken,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get Citizen profile by User UUID
   * @param {string} userId
   */
  async getCitizenByUserId(userId) {
    const citizen = await CitizenModel.findByUserId(userId);
    if (!citizen) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Citizen profile not found for this user / या वापरकर्त्याची नागरिक प्रोफाइल सापडली नाही'
      );
    }
    return citizen;
  }

  /**
   * Get Citizen profile by Citizen UUID
   * @param {string} id
   */
  async getCitizenById(id) {
    const citizen = await CitizenModel.findById(id);
    if (!citizen) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Citizen profile not found / नागरिक प्रोफाइल सापडली नाही'
      );
    }
    return citizen;
  }

  /**
   * Get Citizen profile by Mobile Number
   * @param {string} mobile
   */
  async getCitizenByMobile(mobile) {
    const cleanMobile = toStandardDigits(mobile).replace(/\D/g, '');
    const citizen = await CitizenModel.findByMobile(cleanMobile);
    if (!citizen) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Citizen profile not found for mobile number ${cleanMobile} / या मोबाईल नंबरची नागरिक प्रोफाइल सापडली नाही`
      );
    }
    return citizen;
  }

  /**
   * Send 6-digit OTP to mobile number.
   * Checks if user is registered and checks role permissions (CITIZEN, AROGYA_SEVAK, ADMIN).
   *
   * @param {string} mobileNumber
   */
  async sendCitizenOtp(mobileNumber) {
    const cleanMobile = toStandardDigits(mobileNumber).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका'
      );
    }

    // 1. Generate 6-digit OTP
    const otp = generateOtp(6);

    // 2. Store OTP in memory (5-minute expiration, 0 failed attempts, max 5)
    citizenOtpStore.set(cleanMobile, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
    });

    console.log(`[CITIZEN-AUTH] 📱 Generated 6-digit OTP for +91 ${cleanMobile}: ${otp}`);
    logger.info(`Generated 6-digit OTP for mobile: ${cleanMobile}`);

    // 3. Lookup user in DB (or check demo test accounts)
    let user = await UserModel.findByMobile(cleanMobile);

    // Demo Account Auto-Seeding if lookup missed
    if (!user) {
      if (cleanMobile === '1111111111') {
        user = await UserModel.create({
          full_name: 'Ramesh Patil (रमेश पाटील)',
          mobile: '1111111111',
          email: 'ramesh.patil@example.com',
          role: USER_ROLES.CITIZEN,
          status: USER_STATUS.ACTIVE,
        });
        await CitizenModel.create({
          user_id: user.id,
          dob: '1985-05-15',
          gender: 'MALE',
          address: 'Flat 402, Shiv Shrushti CHS, Shivaji Chowk',
          state: 'Maharashtra',
          district: 'Thane',
          taluka: 'Kalyan',
          pincode: '421301',
          email: 'ramesh.patil@example.com',
        });
      } else if (cleanMobile === '2222222222') {
        user = await UserModel.create({
          full_name: 'Sunita Deshmukh (सुनिता देशमुख)',
          mobile: '2222222222',
          email: 'sunita.sevak@example.com',
          role: USER_ROLES.AROGYA_SEVAK,
          status: USER_STATUS.ACTIVE,
        });
      } else if (cleanMobile === '9999999999' || cleanMobile === '8888888888') {
        user = await UserModel.create({
          full_name: 'System Admin (सिस्टम अॅडमिन)',
          mobile: cleanMobile,
          email: 'admin@arogyamitra.gov.in',
          role: USER_ROLES.ADMIN,
          status: USER_STATUS.ACTIVE,
        });
      }
    }

    const isRegistered = Boolean(user);
    const role = user ? (user.role === 'SEVAK' ? USER_ROLES.AROGYA_SEVAK : user.role) : null;

    // Admin role check: Prohibited on mobile application
    if (role === USER_ROLES.ADMIN) {
      return {
        mobileNumber: cleanMobile,
        isRegistered: true,
        isMobileRegistered: true,
        role: USER_ROLES.ADMIN,
        isAllowedOnMobile: false,
        otpSent: false,
        otp: null,
        message: 'Admin login is not allowed on Mobile App. Please use the Web Admin Portal / अॅडमिन ला मोबाईल अॅपवर लॉगिन करण्याची परवानगी नाही.',
      };
    }

    if (role === USER_ROLES.AROGYA_SEVAK) {
      return {
        mobileNumber: cleanMobile,
        isRegistered: true,
        isMobileRegistered: true,
        role: USER_ROLES.AROGYA_SEVAK,
        isAllowedOnMobile: true,
        otpSent: true,
        otp,
        message: '६ अंकी OTP पाठवला आहे. आरोग्य सेवक लॉगिन करण्यासाठी OTP टाका / OTP sent. Enter OTP to login as Arogya Sevak.',
      };
    }

    if (role === USER_ROLES.CITIZEN) {
      return {
        mobileNumber: cleanMobile,
        isRegistered: true,
        isMobileRegistered: true,
        role: USER_ROLES.CITIZEN,
        isAllowedOnMobile: true,
        otpSent: true,
        otp,
        message: '६ अंकी OTP पाठवला आहे. कृपया लॉगिन करण्यासाठी OTP टाका / OTP sent. Enter OTP to login to your dashboard.',
      };
    }

    // Unregistered Citizen
    return {
      mobileNumber: cleanMobile,
      isRegistered: false,
      isMobileRegistered: false,
      role: null,
      isAllowedOnMobile: true,
      otpSent: true,
      otp,
      message: '६ अंकी OTP पाठवला आहे. नवीन नागरिक नोंदणी सुरू करा / OTP sent. Proceed to complete registration.',
    };
  }

  /**
   * Verify 6-digit OTP and login citizen or Arogya Sevak
   *
   * @param {Object} data
   * @param {string} data.mobileNumber
   * @param {string} data.otp
   */
  async verifyCitizenOtpAndLogin({ mobileNumber, otp }) {
    const cleanMobile = toStandardDigits(mobileNumber).replace(/\D/g, '');
    const cleanOtp = toStandardDigits(otp).trim();

    let user = await UserModel.findByMobile(cleanMobile);
    const role = user ? (user.role === 'SEVAK' ? USER_ROLES.AROGYA_SEVAK : user.role) : null;
    const citizenProfile = (user && role === USER_ROLES.CITIZEN) ? await CitizenModel.findByUserId(user.id) : null;
    const isRegistered = Boolean(user);

    const record = citizenOtpStore.get(cleanMobile);
    if (!record || Date.now() > record.expiresAt) {
      if (record) citizenOtpStore.delete(cleanMobile);
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        status: 'OTP_EXPIRED_OR_INVALID',
        isOtpValid: false,
        otpVerified: false,
        isMobileRegistered: isRegistered,
        isRegistered,
        message: 'OTP has expired or was not requested / OTP ची मुदत संपली आहे किंवा मागवला नाही. कृपया पुन्हा प्रयत्न करा.',
      };
    }

    if (record.otp !== cleanOtp) {
      record.attempts = (record.attempts || 0) + 1;
      const maxAttempts = record.maxAttempts || 5;
      const remainingAttempts = Math.max(0, maxAttempts - record.attempts);

      if (remainingAttempts === 0) {
        citizenOtpStore.delete(cleanMobile);
        return {
          statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
          status: 'MAX_ATTEMPTS_EXCEEDED',
          isOtpValid: false,
          otpVerified: false,
          isMobileRegistered: isRegistered,
          isRegistered,
          attemptsExceeded: true,
          remainingAttempts: 0,
          message: 'Too many incorrect OTP attempts. For your security, this OTP has been invalidated / जास्त वेळा चुकीचा OTP टाकला आहे. सुरक्षिततेसाठी हा OTP रद्द केला आहे.',
        };
      }

      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        status: 'INVALID_OTP',
        isOtpValid: false,
        otpVerified: false,
        isMobileRegistered: isRegistered,
        isRegistered,
        attemptsExceeded: false,
        attempts: record.attempts,
        remainingAttempts,
        message: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining / अमान्य OTP. ${remainingAttempts} प्रयत्न शिल्लक आहेत.`,
      };
    }

    // Clear verified OTP
    citizenOtpStore.delete(cleanMobile);

    if (role === USER_ROLES.ADMIN) {
      return {
        statusCode: HTTP_STATUS.FORBIDDEN,
        status: 'ADMIN_PROHIBITED',
        isOtpValid: true,
        otpVerified: true,
        isRegistered: true,
        isMobileRegistered: true,
        message: 'Admin login is not allowed on Mobile App / अॅडमिन ला मोबाईल अॅपवर लॉगिन करण्याची परवानगी नाही.',
      };
    }

    // Arogya Sevak Login Flow
    if (role === USER_ROLES.AROGYA_SEVAK) {
      const tokenPayload = {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: USER_ROLES.AROGYA_SEVAK,
        name: user.full_name,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: user.id });

      return {
        status: 'LOGIN_SUCCESS',
        role: USER_ROLES.AROGYA_SEVAK,
        isOtpValid: true,
        otpVerified: true,
        isRegistered: true,
        isMobileRegistered: true,
        message: 'आरोग्य सेवक यशस्वीरीत्या लॉगिन झाले / Arogya Sevak logged in successfully',
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          full_name: user.full_name,
          mobile: user.mobile,
          email: user.email,
          role: USER_ROLES.AROGYA_SEVAK,
          status: user.status,
        },
        sevakProfile: {
          id: user.id,
          name: user.full_name,
          phoneNumber: user.mobile,
          assignedWard: 'Ward 14 - Shivajinagar PHC',
          badgeNumber: 'AS-MH-2024-884',
        },
      };
    }

    // Citizen Login Flow
    if (user && citizenProfile) {
      const tokenPayload = {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: USER_ROLES.CITIZEN,
        name: user.full_name,
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
        logger.warn(`Could not persist citizen refresh token: ${tokenErr.message}`);
      }

      logger.info(`Citizen logged in successfully [UserID: ${user.id}, Mobile: ${cleanMobile}]`);

      return {
        status: 'LOGIN_SUCCESS',
        role: USER_ROLES.CITIZEN,
        isOtpValid: true,
        otpVerified: true,
        isRegistered: true,
        isMobileRegistered: true,
        message: 'नागरिक यशस्वीरीत्या लॉगिन झाले / Citizen logged in successfully',
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          full_name: user.full_name,
          mobile: user.mobile,
          email: user.email,
          role: USER_ROLES.CITIZEN,
          status: user.status,
        },
        citizenProfile,
      };
    }

    // Citizen not registered yet -> Registration required
    return {
      status: 'REGISTRATION_REQUIRED',
      role: null,
      isOtpValid: true,
      otpVerified: true,
      isRegistered: false,
      isMobileRegistered: false,
      mobileNumber: cleanMobile,
      message: 'OTP पडताळणी झाली! कृपया नागरिक नोंदणी पूर्ण करा / OTP verified! Please complete citizen registration.',
    };
  }

  /**
   * Get all active alerts and notifications from Admin for the citizen.
   * Compiles dynamic case alerts (reverted doc requests, approvals, sevak assignments)
   * and general administrative welfare announcements.
   *
   * @param {string} [userId]
   * @param {string} [userMobile]
   * @returns {Promise<Array>} List of formatted admin notifications
   */
  async getCitizenAlerts(userId = null, userMobile = null) {
    const alerts = [];

    // 1. Fetch targeted and broadcast notifications from Database
    try {
      const { NotificationModel } = await import('../models/notification.model.js');
      const dbNotifications = await NotificationModel.findForCitizen(userId, userMobile);
      if (Array.isArray(dbNotifications) && dbNotifications.length > 0) {
        dbNotifications.forEach((n) => {
          alerts.push({
            id: n.id,
            type: n.type || 'CUSTOM',
            priority: n.priority || 'HIGH',
            title: n.title,
            titleEn: n.title_en || n.titleEn || n.title,
            titleHi: n.title_hi || n.titleHi || n.title,
            message: n.message,
            messageEn: n.message_en || n.messageEn || n.message,
            messageHi: n.message_hi || n.messageHi || n.message,
            sender: n.sender || 'प्रशासक / Admin Desk',
            senderEn: n.sender_en || n.senderEn || 'Administration',
            senderHi: n.sender_hi || n.senderHi || 'प्रशासन',
            date: n.created_at ? new Date(n.created_at).toLocaleDateString('mr-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'अलीकडेच',
            dateEn: n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            caseId: n.case_id || null,
            requestedDocName: n.requested_doc_name || null,
            requestedDocType: n.requested_doc_type || null,
            revertReason: n.revert_reason || null,
            badge: n.badge || (n.priority === 'CRITICAL' ? 'तातडीचे / Urgent' : 'प्रशासकीय संदेश'),
            badgeEn: n.badge_en || (n.priority === 'CRITICAL' ? 'Urgent' : 'Admin Notice'),
            badgeHi: n.badge_hi || (n.priority === 'CRITICAL' ? 'महत्वपूर्ण' : 'प्रशासनिक सूचना'),
            isRead: Boolean(n.is_read),
            actionType: n.action_type || (n.requested_doc_name ? 'UPLOAD_DOC' : 'VIEW_CASE'),
          });
        });
      }
    } catch (dbErr) {
      console.warn('[CitizenService] DB notifications fetch warning:', dbErr.message);
    }

    // 2. Default System Administrative Announcements & MLA Health Welfare Broadcasts
    alerts.push({
      id: 'alert-broadcast-01',
      type: 'ANNOUNCEMENT',
      priority: 'CRITICAL',
      title: 'विशेष मोफत आरोग्य तपासणी व ABHA कार्ड वाटप शिबिर',
      titleEn: 'Special Free Health Checkup & ABHA Card Camp',
      titleHi: 'विशेष निःशुल्क स्वास्थ्य जांच एवं आभा कार्ड वितरण शिविर',
      message: 'मा. रवींद्र चव्हाण यांच्या विशेष पुढाकाराने कल्याण व ठाणे विभागात भव्य मोफत आरोग्य तपासणी, ईसीजी, रक्त तपासणी व मोफत औषध वाटप शिबिर आयोजित केले आहे. सर्व नागरिकांनी लाभ घ्यावा.',
      messageEn: 'Under the initiative of Hon. MLA Ravindra Chavan, a mega free health checkup, ECG, blood test & free medicines camp is organized in Kalyan & Thane. All citizens are requested to participate.',
      messageHi: 'मा. रवींद्र चव्हाण की पहल पर कल्याण और ठाणे में विशाल निःशुल्क स्वास्थ्य जांच, ईसीजी, रक्त परीक्षण व मुफ्त दवा वितरण शिविर का आयोजन किया गया है।',
      sender: 'प्रशासक / MLA Welfare Desk',
      senderEn: 'Administration / MLA Welfare Desk',
      senderHi: 'प्रशासन / विधायक स्वास्थ्य प्रकोष्ठ',
      date: '१५ मार्च २०२६',
      dateEn: '15 Mar 2026',
      timestamp: '१०:०० AM',
      category: 'camp',
      badge: 'महत्त्वाचे / Urgent',
      badgeEn: 'Urgent Notice',
      badgeHi: 'महत्वपूर्ण सूचना',
      isRead: false,
      actionType: 'ANNOUNCEMENT',
    });

    alerts.push({
      id: 'alert-broadcast-02',
      type: 'SCHEME_UPDATE',
      priority: 'HIGH',
      title: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY) मर्यादा वाढ',
      titleEn: 'MJPJAY Health Scheme Coverage Limit Enhanced to ₹5 Lakhs',
      titleHi: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY) सीमा में वृद्धि',
      message: 'शासनाच्या सुधारित निर्णयानुसार MJPJAY अंतर्गत कॅशलेस उपचारांची मर्यादा आता ₹५ लाखांपर्यंत वाढवण्यात आली आहे. सर्व पिवळे व केशरी शिधापत्रिकाधारक या योजनेसाठी पात्र आहेत.',
      messageEn: 'As per government notification, cashless treatment coverage under MJPJAY has been enhanced up to ₹5,00,000. All eligible ration card holders can avail the benefits.',
      messageHi: 'शासन के निर्णय अनुसार MJPJAY के तहत कैशलेस इलाज की सीमा अब ₹5 लाख तक बढ़ा दी गई है। सभी पात्र राशन कार्ड धारक लाभ ले सकते हैं।',
      sender: 'सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन',
      senderEn: 'Public Health Dept, Govt of Maharashtra',
      senderHi: 'सार्वजनिक स्वास्थ्य विभाग, महाराष्ट्र शासन',
      date: '०५ मार्च २०२६',
      dateEn: '05 Mar 2026',
      timestamp: '११:३० AM',
      category: 'scheme',
      badge: 'योजना अद्यतन',
      badgeEn: 'Scheme Update',
      badgeHi: 'योजना अपडेट',
      isRead: false,
      actionType: 'SCHEME_UPDATE',
    });

    alerts.push({
      id: 'alert-broadcast-03',
      type: 'ADVISORY',
      priority: 'MEDIUM',
      title: 'पावसाळी आजार व साथीच्या रोगांवर मोफत तपासणी सल्ला',
      titleEn: 'Monsoon Seasonal Health Advisory & Free OPD Guidance',
      titleHi: 'मौसमी बीमारियों पर निःशुल्क जांच एवं स्वास्थ्य सलाह',
      message: 'ताप, थंडी किंवा डेंग्यू/मलेरियाची लक्षणे आढळल्यास तत्काळ जवळच्या शासकीय उपकेंद्र किंवा रुग्णालयातील आरोग्य मित्रांशी संपर्क साधा.',
      messageEn: 'In case of persistent fever or monsoon disease symptoms, contact your nearest Arogya Sevak or government hospital OPD immediately for free diagnosis.',
      messageHi: 'बुखार या मौसमी बीमारी के लक्षण दिखने पर तुरंत नजदीकी सरकारी अस्पताल या आरोग्य मित्र से संपर्क करें।',
      sender: 'जिल्हा आरोग्य अधिकारी कार्यालय',
      senderEn: 'District Health Office',
      senderHi: 'जिला स्वास्थ्य अधिकारी कार्यालय',
      date: '२८ फेब्रुवारी २०२६',
      dateEn: '28 Feb 2026',
      timestamp: '०४:१५ PM',
      category: 'advisory',
      badge: 'आरोग्य सूचना',
      badgeEn: 'Health Advisory',
      badgeHi: 'स्वास्थ्य सलाह',
      isRead: true,
      actionType: 'ADVISORY',
    });

    return alerts;
  }
}

export const citizenService = new CitizenService();
export default citizenService;

