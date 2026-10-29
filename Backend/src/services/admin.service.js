import { AdminModel } from '../models/admin.model.js';
import { UserModel } from '../models/user.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { HospitalModel } from '../models/hospital.model.js';
import { HospitalSevakAssignmentModel } from '../models/hospitalSevakAssignment.model.js';
import { BackupSevakAssignmentModel } from '../models/backupSevakAssignment.model.js';
import { RefreshTokenModel } from '../models/refreshToken.model.js';
import { hashPassword } from '../utils/password.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, USER_ROLES, USER_STATUS, SEVAK_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

class AdminService {
  /**
   * Helper to ensure assigned_by maps to a valid public.users(id)
   * Accepts either user_id or admin_id, resolving to user_id.
   */
  async _resolveUserId(id) {
    if (!id) return null;
    const user = await UserModel.findById(id);
    if (user) return user.id;
    const admin = await AdminModel.findById(id);
    if (admin) return admin.user_id;
    return null;
  }

  // ==========================================
  // 1. Admin Management
  // ==========================================

  /**
   * Register the initial / first-time Admin when no Admin exists in the database.
   * Public endpoint with strict safety guard: strictly permitted only when 0 admins exist.
   * @param {Object} data
   */
  async registerFirstAdmin(data) {
    // 1. Verify if any Admin exists in the database
    const adminCount = await AdminModel.count();
    const userAdminCount = await UserModel.countByRole(USER_ROLES.ADMIN);

    if (adminCount > 0 || userAdminCount > 0) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Initial admin setup is disabled because an administrator already exists in the system. Please login with your existing administrator credentials or have an active administrator create your account.'
      );
    }

    // 2. Create the first admin
    const newAdmin = await this.addNewAdmin('INITIAL_BOOTSTRAP', {
      ...data,
      department: data.department || 'HEALTH_ADMINISTRATION',
      designation: data.designation || 'SUPER_ADMIN',
    });

    // 3. Issue authentication tokens
    const tokenPayload = {
      id: newAdmin.user_id,
      userId: newAdmin.user_id,
      mobile: newAdmin.mobile,
      email: newAdmin.email,
      role: USER_ROLES.ADMIN,
      name: newAdmin.full_name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: newAdmin.user_id });

    // Persist refresh token
    try {
      await RefreshTokenModel.create({
        userId: newAdmin.user_id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (tokenErr) {
      logger.warn(`Could not persist bootstrap refresh token: ${tokenErr.message}`);
    }

    return {
      admin: newAdmin,
      accessToken,
      refreshToken,
      token: accessToken,
    };
  }

  /**
   * Admin creates a brand new Admin (User record + Admin Profile)
   * @param {string} [requestingAdminId] - ID of the admin making the request
   * @param {Object} data
   */
  async addNewAdmin(requestingAdminId, data) {
    const {
      full_name,
      mobile,
      email = null,
      password = null,
      department = 'HEALTH_ADMINISTRATION',
      designation = 'ADMINISTRATOR',
      address = null,
      city = null,
      taluka = null,
      district = null,
      landmark = null,
    } = data;

    // 1. Check uniqueness for mobile
    const existingMobile = await UserModel.findByMobile(mobile);
    if (existingMobile) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `A user with mobile number '${mobile}' already exists`
      );
    }

    // 2. Check uniqueness for email if provided
    if (email) {
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `A user with email '${email}' already exists`
        );
      }
    }

    // 3. Hash password if provided (null indicates first-time user must set password)
    const passwordHash = password ? await hashPassword(password) : null;

    // 4. Create base user
    const user = await UserModel.create({
      full_name,
      mobile,
      email,
      password_hash: passwordHash,
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
    });

    // 5. Create admin profile with address and geographic info
    const admin = await AdminModel.create({
      user_id: user.id,
      department,
      designation,
      address,
      city,
      taluka,
      district,
      landmark,
    });

    logger.info(
      `New Admin created successfully [AdminID: ${admin.id}, UserID: ${user.id}] by ${requestingAdminId || 'System'}`
    );

    return {
      id: admin.id,
      user_id: user.id,
      full_name: user.full_name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      status: user.status,
      department: admin.department,
      designation: admin.designation,
      address: admin.address,
      city: admin.city,
      taluka: admin.taluka,
      district: admin.district,
      landmark: admin.landmark,
      created_at: admin.created_at,
    };
  }

  /**
   * Link an existing user as an Admin (legacy / backward-compatible)
   */
  async createAdmin(adminData) {
    const { user_id, department, designation } = adminData;

    // 1. Verify user exists
    const user = await UserModel.findById(user_id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User with this user_id does not exist');
    }

    // 2. Check 1-to-1 relationship: admin profile must not already exist
    const existingAdmin = await AdminModel.findByUserId(user_id);
    if (existingAdmin) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'An Admin profile already exists for this user'
      );
    }

    // 3. Create Admin profile
    const admin = await AdminModel.create({
      user_id,
      department,
      designation,
    });
    logger.info(`Admin profile created successfully [ID: ${admin.id}, UserID: ${user_id}]`);

    return admin;
  }

  /**
   * List all registered admins with optional search & pagination
   * @param {Object} filters
   */
  async getAllAdmins(filters = {}) {
    const { search, limit = '50', offset = '0' } = filters;
    return AdminModel.findAll({
      search,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
  }

  async getAdminById(id) {
    const admin = await AdminModel.findById(id);
    if (!admin) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Admin profile not found');
    }
    return admin;
  }

  async getAdminByUserId(user_id) {
    const admin = await AdminModel.findByUserId(user_id);
    if (!admin) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Admin profile not found for this user');
    }
    return admin;
  }

  async updateMyProfile(userId, updateData = {}) {
    const admin = await AdminModel.findByUserId(userId);
    if (!admin) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Admin profile not found for current user');
    }

    const {
      name,
      full_name,
      phone,
      mobile,
      email,
      department,
      designation,
      address,
      streetAddress,
      street_address,
      city,
      taluka,
      district,
      landmark,
    } = updateData;

    const userUpdates = {};
    if (full_name !== undefined || name !== undefined) {
      userUpdates.full_name = (full_name || name || '').trim();
    }
    if (mobile !== undefined || phone !== undefined) {
      const cleanMob = String(mobile || phone || '').replace(/\D/g, '');
      if (cleanMob && cleanMob !== admin.mobile) {
        const existingMob = await UserModel.findByMobile(cleanMob);
        if (existingMob && existingMob.id !== userId) {
          throw new ApiError(HTTP_STATUS.CONFLICT, `Mobile number '${cleanMob}' is already in use`);
        }
        userUpdates.mobile = cleanMob;
      }
    }
    if (email !== undefined) {
      const cleanEmail = email ? email.trim() : null;
      if (cleanEmail && cleanEmail !== admin.email) {
        const existingEmail = await UserModel.findByEmail(cleanEmail);
        if (existingEmail && existingEmail.id !== userId) {
          throw new ApiError(HTTP_STATUS.CONFLICT, `Email '${cleanEmail}' is already in use`);
        }
      }
      userUpdates.email = cleanEmail;
    }

    if (Object.keys(userUpdates).length > 0) {
      await UserModel.update(userId, userUpdates);
    }

    const adminUpdates = {};
    if (department !== undefined) adminUpdates.department = department ? department.trim() : null;
    if (designation !== undefined) adminUpdates.designation = designation ? designation.trim() : null;
    if (address !== undefined || streetAddress !== undefined || street_address !== undefined) {
      adminUpdates.address = (address || streetAddress || street_address || '').trim() || null;
    }
    if (city !== undefined) adminUpdates.city = city ? city.trim() : null;
    if (taluka !== undefined) adminUpdates.taluka = taluka ? taluka.trim() : null;
    if (district !== undefined) adminUpdates.district = district ? district.trim() : null;
    if (landmark !== undefined) adminUpdates.landmark = landmark ? landmark.trim() : null;

    if (Object.keys(adminUpdates).length > 0) {
      await AdminModel.update(admin.id, adminUpdates);
    }

    return this.getAdminByUserId(userId);
  }

  async updateAdmin(id, updateData) {
    const existing = await AdminModel.findById(id);
    if (!existing) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Admin profile not found');
    }
    return AdminModel.update(id, updateData);
  }

  // ==========================================
  // 2. Arogya Sevak Management by Admin
  // ==========================================

  /**
   * Admin: Add a new Arogya Sevak
   * Creates the base user record (role=SEVAK, hashed password), the arogya_sevak profile,
   * and optionally assigns the sevak to one or more hospitals.
   *
   * @param {string} adminUserId - Authenticated Admin User UUID
   * @param {Object} data - Input payload
   */
  async addArogyaSevak(adminUserId, data) {
    const {
      full_name,
      mobile,
      email = null,
      password = null,
      phone = null,
      joining_date = null,
      status = SEVAK_STATUS.ACTIVE,
      hospital_id = null,
      hospital_ids = [],
      remarks = null,
      address = null,
      city = null,
      taluka = null,
      district = null,
      landmark = null,
    } = data;

    // 1. Normalize hospital IDs (support both singular and multiple)
    let targetHospitalIds = [];
    if (Array.isArray(hospital_ids) && hospital_ids.length > 0) {
      targetHospitalIds = [...new Set(hospital_ids.filter(Boolean))];
    } else if (hospital_id) {
      targetHospitalIds = [hospital_id];
    }

    // 2. Generate or validate employee_code
    let employeeCode = data.employee_code?.trim();
    if (!employeeCode) {
      employeeCode = `AS-${Date.now().toString().slice(-6)}`;
    }

    // 3. Concurrent Pre-flight checks: Uniqueness (mobile, email, employeeCode) & Hospital validation
    const [existingMobile, existingEmail, existingCode, verifiedHospitals, passwordHash] = await Promise.all([
      UserModel.findByMobile(mobile),
      email ? UserModel.findByEmail(email) : Promise.resolve(null),
      ArogyaSevakModel.findByEmployeeCode(employeeCode),
      targetHospitalIds.length > 0
        ? Promise.all(targetHospitalIds.map((hid) => HospitalModel.findById(hid)))
        : Promise.resolve([]),
      password ? hashPassword(password) : Promise.resolve(null)
    ]);

    if (existingMobile) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `A user with mobile number '${mobile}' already exists`
      );
    }

    if (existingEmail) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `A user with email '${email}' already exists`
      );
    }

    if (existingCode) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `An Arogya Sevak with employee code '${employeeCode}' already exists`
      );
    }

    for (let i = 0; i < targetHospitalIds.length; i++) {
      if (!verifiedHospitals[i]) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          `Hospital with ID '${targetHospitalIds[i]}' was not found`
        );
      }
    }

    // 7. Create User record
    const user = await UserModel.create({
      full_name,
      mobile,
      email,
      password_hash: passwordHash,
      role: USER_ROLES.SEVAK,
      status: USER_STATUS.ACTIVE,
    });

    // 8. Create Arogya Sevak Profile record
    const sevak = await ArogyaSevakModel.create({
      user_id: user.id,
      employee_code: employeeCode,
      phone: phone || mobile,
      joining_date,
      status,
      address,
      city,
      taluka,
      district,
      landmark,
    });

    // 9. Assign hospitals if provided
    const assignedByUserId = await this._resolveUserId(adminUserId);
    const assignedHospitalsList = [];
    for (const h of verifiedHospitals) {
      const assignment = await HospitalSevakAssignmentModel.create({
        hospital_id: h.id,
        sevak_id: sevak.id,
        assigned_by: assignedByUserId,
        status: 'ACTIVE',
        remarks: remarks || 'Assigned during sevak registration by admin',
      });

      assignedHospitalsList.push({
        assignment_id: assignment.id,
        id: h.id,
        name: h.name,
        hospital_code: h.hospital_code,
        assigned_at: assignment.assigned_at,
      });
    }

    logger.info(
      `Admin successfully created Arogya Sevak [SevakID: ${sevak.id}, UserID: ${user.id}, Hospitals: ${assignedHospitalsList.length}]`
    );

    return {
      id: sevak.id,
      user_id: user.id,
      employee_code: employeeCode,
      full_name: user.full_name,
      mobile: user.mobile,
      email: user.email,
      phone: sevak.phone,
      address: sevak.address,
      city: sevak.city,
      taluka: sevak.taluka,
      district: sevak.district,
      landmark: sevak.landmark,
      joining_date: sevak.joining_date,
      role: user.role,
      status: sevak.status,
      assigned_hospitals: assignedHospitalsList,
      hospital: assignedHospitalsList[0] || null, // Backward compatibility
      created_at: sevak.created_at,
    };
  }

  /**
   * Admin: List all Arogya Sevaks
   * @param {Object} filters
   */
  async getAllArogyaSevaks(filters = {}) {
    const { status, search, limit = '50', offset = '0' } = filters;
    return ArogyaSevakModel.findAll({
      status,
      search,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
  }

  /**
   * Admin: Get Arogya Sevak details by UUID
   * @param {string} id - Sevak UUID
   */
  async getArogyaSevakById(id) {
    let sevak = await ArogyaSevakModel.findById(id);
    if (!sevak) {
      sevak = await ArogyaSevakModel.findByUserId(id);
    }
    if (!sevak) {
      sevak = await ArogyaSevakModel.findByNameOrCode(id);
    }

    let backupRecord = null;
    if (!sevak) {
      backupRecord = await BackupSevakAssignmentModel.getActiveByMobile(id);
      if (!backupRecord && typeof id === 'string' && id.startsWith('backup-')) {
        const bId = id.replace('backup-', '');
        backupRecord = await BackupSevakAssignmentModel.getActiveByPrimarySevakId(bId);
      }
      if (!backupRecord) {
        backupRecord = await BackupSevakAssignmentModel.getActiveByPrimarySevakId(id);
      }
      if (backupRecord && backupRecord.primary_sevak_id) {
        sevak = await ArogyaSevakModel.findById(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByUserId(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByNameOrCode(backupRecord.primary_sevak_id);
      }
    }

    if (!sevak && !backupRecord) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found');
    }

    let activeAssignments = sevak ? await HospitalSevakAssignmentModel.findActiveHospitalsBySevakId(sevak.id) : [];
    const desiredHospital = backupRecord?.hospital_id || sevak?.hospital_id || sevak?.hospital || null;

    if (activeAssignments.length === 0 && desiredHospital) {
      let matchedHosp = null;
      try {
        matchedHosp = await HospitalModel.findById(desiredHospital)
          || await HospitalModel.findByHospitalCode(desiredHospital);
        if (!matchedHosp) {
          const list = await HospitalModel.findAll({ search: desiredHospital, limit: 1 });
          if (list?.hospitals?.length > 0) matchedHosp = list.hospitals[0];
        }
      } catch (_) {}

      if (matchedHosp) {
        activeAssignments = [
          {
            hospital_id: matchedHosp.id,
            hospital_name: matchedHosp.name,
            hospital_address: matchedHosp.address || matchedHosp.city || '',
            hospital_code: matchedHosp.hospital_code || matchedHosp.code || '',
            hospital_contact: matchedHosp.contact_number || matchedHosp.phone || '',
          }
        ];
      } else {
        activeAssignments = [
          {
            hospital_id: desiredHospital,
            hospital_name: desiredHospital,
            hospital_address: sevak?.address || sevak?.city || '',
            hospital_code: 'HOSP-' + String(desiredHospital).replace(/\s+/g, '-').toUpperCase().slice(0, 8),
            hospital_contact: sevak?.phone || '',
          }
        ];
      }
    }

    return {
      ...(sevak || {}),
      id: sevak?.id || (backupRecord ? `backup-${backupRecord.id}` : id),
      full_name: backupRecord?.backup_name || sevak?.full_name || 'Arogya Sevak',
      name: backupRecord?.backup_name || sevak?.full_name || 'Arogya Sevak',
      employee_code: backupRecord ? 'RELIEF-SEVAK' : (sevak?.employee_code || ''),
      is_backup: Boolean(backupRecord),
      isBackup: Boolean(backupRecord),
      covering_for_sevak_id: backupRecord?.primary_sevak_id || null,
      assigned_hospitals: activeAssignments,
      hospital: activeAssignments[0] || null,
    };
  }

  /**
   * Admin: Edit / Update an existing Arogya Sevak profile & assignments
   * @param {string} [adminUserId] - Authenticated Admin User UUID
   * @param {string} id - Sevak UUID
   * @param {Object} data - Update payload
   */
  async updateArogyaSevak(adminUserId, id, data) {
    const {
      full_name,
      mobile,
      email,
      phone,
      employee_code,
      joining_date,
      status,
      hospital_id,
      hospital_ids,
      remarks,
      address,
      city,
      taluka,
      district,
      landmark,
    } = data;

    // 1. Verify sevak exists
    let existingSevak = await ArogyaSevakModel.findById(id);
    if (!existingSevak) {
      existingSevak = await ArogyaSevakModel.findByUserId(id);
    }
    if (!existingSevak) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found');
    }

    const sevakId = existingSevak.id;
    const userId = existingSevak.user_id;

    // 2. If mobile is changed, verify uniqueness
    const newMobile = mobile ? mobile.trim() : null;
    if (newMobile && newMobile !== existingSevak.mobile) {
      const userWithMobile = await UserModel.findByMobile(newMobile);
      if (userWithMobile && userWithMobile.id !== userId) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          `A user with mobile number '${newMobile}' already exists`
        );
      }
    }

    // 3. If email is provided/changed, verify uniqueness
    if (email !== undefined && email !== null) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== (existingSevak.email || '').toLowerCase()) {
        const userWithEmail = await UserModel.findByEmail(cleanEmail);
        if (userWithEmail && userWithEmail.id !== userId) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            `A user with email '${cleanEmail}' already exists`
          );
        }
      }
    }

    // 4. If employee_code is provided/changed, verify uniqueness
    if (employee_code !== undefined && employee_code !== null) {
      const cleanCode = employee_code.trim();
      if (cleanCode && cleanCode !== existingSevak.employee_code) {
        const sevakWithCode = await ArogyaSevakModel.findByEmployeeCode(cleanCode);
        if (sevakWithCode && sevakWithCode.id !== id) {
          throw new ApiError(
            HTTP_STATUS.CONFLICT,
            `An Arogya Sevak with employee code '${cleanCode}' already exists`
          );
        }
      }
    }

    // 5. Update user table (full_name, mobile, email, status)
    const userUpdateData = {};
    if (full_name !== undefined) userUpdateData.full_name = full_name;
    if (newMobile !== null) userUpdateData.mobile = newMobile;
    if (email !== undefined) userUpdateData.email = email;
    if (status !== undefined) userUpdateData.status = status;

    if (Object.keys(userUpdateData).length > 0) {
      await UserModel.update(userId, userUpdateData);
    }

    // 6. Update arogya_sevaks table
    const sevakUpdateData = {};
    if (employee_code !== undefined) sevakUpdateData.employee_code = employee_code ? employee_code.trim() : employee_code;
    if (newMobile !== null) sevakUpdateData.phone = newMobile;
    else if (phone !== undefined) sevakUpdateData.phone = phone;
    if (joining_date !== undefined) sevakUpdateData.joining_date = joining_date;
    if (status !== undefined) sevakUpdateData.status = status;
    if (address !== undefined) sevakUpdateData.address = address;
    if (city !== undefined) sevakUpdateData.city = city;
    if (taluka !== undefined) sevakUpdateData.taluka = taluka;
    if (district !== undefined) sevakUpdateData.district = district;
    if (landmark !== undefined) sevakUpdateData.landmark = landmark;

    if (Object.keys(sevakUpdateData).length > 0) {
      await ArogyaSevakModel.update(sevakId, sevakUpdateData);
    }

    // 7. Handle hospital assignments if provided
    let targetHospitalIds = null;
    if (Array.isArray(hospital_ids)) {
      targetHospitalIds = [...new Set(hospital_ids.filter(Boolean))];
    } else if (hospital_id) {
      targetHospitalIds = [hospital_id];
    }

    if (targetHospitalIds !== null) {
      const assignedByUserId = await this._resolveUserId(adminUserId);
      await HospitalSevakAssignmentModel.assignSevakToHospitals({
        sevak_id: sevakId,
        hospital_ids: targetHospitalIds,
        assigned_by: assignedByUserId,
        mode: 'replace',
        remarks: remarks || 'Updated during sevak profile edit by admin',
      });
    }

    logger.info(`Admin successfully updated Arogya Sevak [SevakID: ${sevakId}, UserID: ${userId}]`);

    return this.getArogyaSevakById(sevakId);
  }


  // ==========================================
  // 3. Multi-Hospital Assignment Operations
  // ==========================================

  /**
   * Admin: Assign Arogya Sevak to Selected Hospitals (Multi-selection)
   * Supports 'replace' (deactivate old, assign selected) and 'append' (keep existing, add selected).
   *
   * @param {string} adminUserId - Authenticated admin ID
   * @param {Object} data
   * @param {string} data.sevak_id
   * @param {string[]} data.hospital_ids
   * @param {'replace'|'append'} [data.mode='replace']
   * @param {string} [data.remarks]
   */
  async assignSevakToHospitals(adminUserId, data) {
    const { sevak_id, hospital_ids = [], mode = 'replace', remarks = null } = data;

    // 1. Verify sevak exists
    const sevak = await ArogyaSevakModel.findById(sevak_id);
    if (!sevak) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found');
    }

    // 2. Verify all selected hospitals exist
    const uniqueHospitalIds = [...new Set(hospital_ids.filter(Boolean))];
    if (uniqueHospitalIds.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Please provide at least one valid hospital_id');
    }

    const validHospitals = [];
    for (const hid of uniqueHospitalIds) {
      const hospital = await HospitalModel.findById(hid);
      if (!hospital) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID '${hid}' was not found`);
      }
      validHospitals.push(hospital);
    }

    // 3. Perform assignments via DAO
    const assignedByUserId = await this._resolveUserId(adminUserId);
    const assignedHospitals = await HospitalSevakAssignmentModel.assignSevakToHospitals({
      sevak_id,
      hospital_ids: uniqueHospitalIds,
      assigned_by: assignedByUserId,
      mode,
      remarks,
    });

    logger.info(
      `Admin ${adminUserId} assigned Sevak ${sevak_id} to ${uniqueHospitalIds.length} hospitals [Mode: ${mode}]`
    );

    return {
      sevak: {
        id: sevak.id,
        user_id: sevak.user_id,
        full_name: sevak.full_name,
        employee_code: sevak.employee_code,
      },
      mode,
      assigned_count: assignedHospitals.length,
      assigned_hospitals: assignedHospitals,
    };
  }

  /**
   * Admin: Assign an existing Arogya Sevak to a Single Hospital (legacy helper)
   */
  async assignSevakToHospital(adminUserId, data) {
    const { sevak_id, hospital_id, remarks = null } = data;
    return this.assignSevakToHospitals(adminUserId, {
      sevak_id,
      hospital_ids: [hospital_id],
      mode: 'replace',
      remarks,
    });
  }

  /**
   * Admin: Get all hospitals currently assigned to a Sevak
   * @param {string} sevakId
   */
  async getSevakAssignedHospitals(sevakId) {
    let sevak = await ArogyaSevakModel.findById(sevakId);
    if (!sevak) {
      sevak = await ArogyaSevakModel.findByUserId(sevakId);
    }
    if (!sevak) {
      sevak = await ArogyaSevakModel.findByNameOrCode(sevakId);
    }

    let backupRecord = null;
    if (!sevak) {
      backupRecord = await BackupSevakAssignmentModel.getActiveByMobile(sevakId);
      if (!backupRecord && typeof sevakId === 'string' && sevakId.startsWith('backup-')) {
        const bId = sevakId.replace('backup-', '');
        backupRecord = await BackupSevakAssignmentModel.getActiveByPrimarySevakId(bId);
      }
      if (!backupRecord) {
        backupRecord = await BackupSevakAssignmentModel.getActiveByPrimarySevakId(sevakId);
      }
      if (backupRecord && backupRecord.primary_sevak_id) {
        sevak = await ArogyaSevakModel.findById(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByUserId(backupRecord.primary_sevak_id)
          || await ArogyaSevakModel.findByNameOrCode(backupRecord.primary_sevak_id);
      }
    }

    if (!sevak && !backupRecord) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found');
    }

    let activeHospitals = sevak ? await HospitalSevakAssignmentModel.findActiveHospitalsBySevakId(sevak.id) : [];
    let history = sevak ? await HospitalSevakAssignmentModel.findAllAssignmentsBySevakId(sevak.id) : [];

    // If no active hospital found in junction table, check backupRecord.hospital_id or sevak.hospital
    const desiredHospital = backupRecord?.hospital_id || sevak?.hospital_id || sevak?.hospital || null;

    if (activeHospitals.length === 0 && desiredHospital) {
      let matchedHosp = null;
      try {
        matchedHosp = await HospitalModel.findById(desiredHospital)
          || await HospitalModel.findByHospitalCode(desiredHospital);
        if (!matchedHosp) {
          const list = await HospitalModel.findAll({ search: desiredHospital, limit: 1 });
          if (list?.hospitals?.length > 0) {
            matchedHosp = list.hospitals[0];
          }
        }
      } catch (_) {}

      if (matchedHosp) {
        activeHospitals = [
          {
            hospital_id: matchedHosp.id,
            hospital_name: matchedHosp.name,
            hospital_address: matchedHosp.address || matchedHosp.city || '',
            hospital_code: matchedHosp.hospital_code || matchedHosp.code || '',
            hospital_contact: matchedHosp.contact_number || matchedHosp.phone || '',
          }
        ];
      } else {
        // Construct hospital entry from desiredHospital name
        activeHospitals = [
          {
            hospital_id: desiredHospital,
            hospital_name: desiredHospital,
            hospital_address: sevak?.address || sevak?.city || '',
            hospital_code: 'HOSP-' + String(desiredHospital).replace(/\s+/g, '-').toUpperCase().slice(0, 8),
            hospital_contact: sevak?.phone || '',
          }
        ];
      }
    }

    return {
      sevak: {
        id: sevak?.id || (backupRecord ? `backup-${backupRecord.id}` : sevakId),
        full_name: backupRecord?.backup_name || sevak?.full_name || 'Arogya Sevak',
        employee_code: backupRecord ? 'RELIEF-SEVAK' : (sevak?.employee_code || ''),
      },
      active_count: activeHospitals.length,
      active_hospitals: activeHospitals,
      assignment_history: history,
    };
  }

  /**
   * Admin: Unassign an Arogya Sevak from a specific hospital or all hospitals
   * @param {string} adminUserId
   * @param {string} sevakId
   * @param {string} [hospitalId] - Optional; if provided, unassigns only from this hospital
   * @param {string} [remarks]
   */
  async unassignSevakFromHospital(adminUserId, sevakId, hospitalId = null, remarks = null) {
    const sevak = await ArogyaSevakModel.findById(sevakId);
    if (!sevak) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Arogya Sevak not found');
    }

    const unassignRemarks = remarks || `Unassigned by admin (ID: ${adminUserId || 'system'})`;

    if (hospitalId) {
      const hospital = await HospitalModel.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Hospital not found');
      }

      await HospitalSevakAssignmentModel.deactivateSpecificAssignment(
        sevakId,
        hospitalId,
        unassignRemarks
      );

      return {
        sevak: {
          id: sevak.id,
          full_name: sevak.full_name,
          employee_code: sevak.employee_code,
        },
        unassigned_hospital: {
          id: hospital.id,
          name: hospital.name,
          hospital_code: hospital.hospital_code,
        },
        unassigned_at: new Date(),
        remarks: unassignRemarks,
      };
    }

    // Unassign from all active hospitals
    const currentAssignments = await HospitalSevakAssignmentModel.findActiveHospitalsBySevakId(sevakId);
    if (currentAssignments.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Arogya Sevak '${sevak.full_name}' (${sevak.employee_code}) is not currently assigned to any hospital`
      );
    }

    await HospitalSevakAssignmentModel.deactivateBySevakId(sevakId, unassignRemarks);

    return {
      sevak: {
        id: sevak.id,
        full_name: sevak.full_name,
        employee_code: sevak.employee_code,
      },
      unassigned_count: currentAssignments.length,
      unassigned_hospitals: currentAssignments.map((a) => ({
        id: a.hospital_id,
        name: a.hospital_name,
        hospital_code: a.hospital_code,
      })),
      unassigned_at: new Date(),
      remarks: unassignRemarks,
    };
  }

  // ==========================================
  // 4. Assign multiple Sevaks to a Hospital
  // ==========================================

  /**
   * Admin: Assign multiple Sevaks to a Hospital
   * @param {string} adminUserId
   * @param {string} hospitalId
   * @param {string[]} sevakIds
   * @param {string} [remarks]
   */
  async assignSevaksToHospital(adminUserId, hospitalId, sevakIds = [], remarks = null) {
    const hospital = await HospitalModel.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Hospital not found');
    }

    const uniqueSevakIds = [...new Set(sevakIds.filter(Boolean))];
    if (uniqueSevakIds.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Please provide at least one valid sevak_id');
    }

    const assignedByUserId = await this._resolveUserId(adminUserId);
    for (const sid of uniqueSevakIds) {
      const sevak = await ArogyaSevakModel.findById(sid);
      if (!sevak) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `Arogya Sevak with ID '${sid}' was not found`);
      }

      await HospitalSevakAssignmentModel.create({
        hospital_id: hospitalId,
        sevak_id: sid,
        assigned_by: assignedByUserId,
        status: 'ACTIVE',
        remarks: remarks || 'Assigned to hospital by Admin',
      });
    }

    const currentActiveSevaks = await HospitalSevakAssignmentModel.findActiveSevaksByHospitalId(hospitalId);

    return {
      hospital: {
        id: hospital.id,
        name: hospital.name,
        hospital_code: hospital.hospital_code,
      },
      assigned_sevaks_count: currentActiveSevaks.length,
      assigned_sevaks: currentActiveSevaks,
    };
  }

  // ==========================================
  // 5. Admin Notification Dispatch Operations
  // ==========================================

  /**
   * Admin: Send targeted notification/alert to citizen, case, or arogya sevak
   * @param {string} adminUserId
   * @param {Object} data
   */
  async sendNotification(adminUserId, data) {
    const { NotificationModel } = await import('../models/notification.model.js');
    if (!data.title || !data.message) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Title and Message are required to send notification');
    }

    const payload = {
      ...data,
      sender: data.sender || 'प्रशासक / Admin Desk',
      sender_en: data.senderEn || data.sender_en || 'Administration',
      sender_hi: data.senderHi || data.sender_hi || 'प्रशासन',
      type: data.type || 'CUSTOM',
      priority: data.priority || 'HIGH',
      action_type: data.actionType || data.action_type || (data.requestedDocName ? 'UPLOAD_DOC' : 'VIEW_CASE'),
    };

    const notification = await NotificationModel.create(payload);
    logger.info(`[AdminService] Notification sent by Admin ${adminUserId}: ${notification.id}`);
    return notification;
  }

  /**
   * Admin: Broadcast health announcement to all citizens
   * @param {string} adminUserId
   * @param {Object} data
   */
  async broadcastNotification(adminUserId, data) {
    const { NotificationModel } = await import('../models/notification.model.js');
    if (!data.title || !data.message) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Title and Message are required to broadcast notice');
    }

    const payload = {
      ...data,
      recipient_type: 'BROADCAST',
      type: data.type || 'ANNOUNCEMENT',
      priority: data.priority || 'HIGH',
      sender: data.sender || 'प्रशासक / MLA Health Welfare Desk',
      sender_en: data.senderEn || data.sender_en || 'MLA Health Welfare Desk',
      sender_hi: data.senderHi || data.sender_hi || 'विधायक स्वास्थ्य प्रकोष्ठ',
      action_type: data.actionType || data.action_type || 'ANNOUNCEMENT',
    };

    const notification = await NotificationModel.create(payload);
    logger.info(`[AdminService] Broadcast published by Admin ${adminUserId}: ${notification.id}`);
    return notification;
  }

  /**
   * Admin: Get history of all dispatched and incoming admin notifications
   */
  async getAllNotifications(filters = {}) {
    const { NotificationModel } = await import('../models/notification.model.js');
    const { total, notifications } = await NotificationModel.findAll(filters);
    const unreadCount = await NotificationModel.getAdminUnreadCount();
    return {
      notifications: notifications || [],
      total: total || 0,
      unreadCount: unreadCount || 0,
    };
  }

  /**
   * Admin: Mark a single notification as read
   */
  async markNotificationRead(id) {
    const { NotificationModel } = await import('../models/notification.model.js');
    return NotificationModel.markAsRead(id);
  }

  /**
   * Admin: Mark all notifications as read
   */
  async markAllNotificationsRead() {
    const { NotificationModel } = await import('../models/notification.model.js');
    return NotificationModel.markAllAsReadForAdmin();
  }

  /**
   * Admin: Clear all seen/read notifications
   */
  async clearSeenNotifications() {
    const { NotificationModel } = await import('../models/notification.model.js');
    return NotificationModel.clearSeenNotifications();
  }

  /**
   * Admin: Clear all notifications (complete purge)
   */
  async clearAllNotifications() {
    const { NotificationModel } = await import('../models/notification.model.js');
    return NotificationModel.clearAllNotifications();
  }

  /**
   * Admin: Delete single notification
   */
  async deleteNotification(id) {
    const { NotificationModel } = await import('../models/notification.model.js');
    return NotificationModel.deleteNotification(id);
  }
}

export const adminService = new AdminService();
export default adminService;

