import { HospitalModel } from '../models/hospital.model.js';
import { HospitalSevakAssignmentModel } from '../models/hospitalSevakAssignment.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { DoctorModel } from '../models/doctor.model.js';
import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import crypto from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hospital Service Layer
 * Coordinates hospital empanelment, geolocation matching, and ArogyaSevak field assignments.
 */
export const hospitalService = {
  /**
   * Create and empanel a new Hospital matching UI Form structure
   * @param {string|null} adminUserId - Authenticated user UUID
   * @param {Object} data - Hospital payload from UI form
   */
  async createHospital(adminUserId, data) {
    const trimmedName = data.name.trim();
    const locationStr = (data.location || data.city || data.district || '').trim();
    const talukaStr = (data.areaTaluka || data.taluka || '').replace(/taluka/i, '').trim();

    // 1. Guard against double-submits: check if a hospital with the exact same name & location already exists
    const dupCheck = await query(
      `SELECT id, hospital_code, name FROM public.hospitals 
       WHERE LOWER(name) = LOWER($1) AND (LOWER(city) = LOWER($2) OR LOWER(district) = LOWER($2))
       LIMIT 1;`,
      [trimmedName, locationStr]
    );
    if (dupCheck.rows.length > 0) {
      throw new ApiError(HTTP_STATUS.CONFLICT, `Hospital "${trimmedName}" in "${locationStr}" is already empanelled.`);
    }

    // 2. Generate unique hospital code if not provided
    const codeSuffix = Math.floor(100000 + Math.random() * 900000);
    const hospitalCode = (data.hospital_code && data.hospital_code.trim()) || `HOSP-${codeSuffix}`;

    // 3. Parallelize foreign key / metadata lookups concurrently in a single round-trip
    const [distRes, talRes, adminRes] = await Promise.all([
      locationStr ? query(
        `SELECT id FROM public.districts 
         WHERE LOWER(name_english) = LOWER($1) 
            OR LOWER(name_marathi) = LOWER($1) 
            OR LOWER(name_english) LIKE LOWER($2)
         LIMIT 1`,
        [locationStr, `%${locationStr}%`]
      ).catch(() => null) : Promise.resolve(null),

      talukaStr ? query(
        `SELECT id FROM public.talukas 
         WHERE LOWER(name_english) = LOWER($1) 
            OR LOWER(name_marathi) = LOWER($1) 
            OR LOWER(name_english) LIKE LOWER($2)
         LIMIT 1`,
        [talukaStr, `%${talukaStr}%`]
      ).catch(() => null) : Promise.resolve(null),

      adminUserId ? query(
        'SELECT id FROM public.admins WHERE id = $1 OR user_id = $1 LIMIT 1',
        [adminUserId]
      ).catch(() => null) : Promise.resolve(null)
    ]);

    const resolvedDistrictId = distRes?.rows?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';
    const resolvedTalukaId = talRes?.rows?.[0]?.id || 'b0000000-0000-0000-0000-000000000001';
    const resolvedAdminId = adminRes?.rows?.[0]?.id || null;

    // 4. Insert new hospital record
    const specialtiesList = Array.isArray(data.specialties)
      ? data.specialties
      : typeof data.specialties === 'string'
        ? data.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
        : ['General Medicine'];

    const createdHospital = await HospitalModel.create({
      hospital_code: hospitalCode,
      name: trimmedName,
      type: data.type || 'Government',
      hospital_type: data.type || 'Government',
      location: locationStr || 'Pune',
      city: locationStr || 'Pune',
      district: locationStr || 'Pune',
      district_id: resolvedDistrictId,
      areaTaluka: data.areaTaluka?.trim() || 'Haveli Taluka',
      taluka: data.areaTaluka?.trim() || 'Haveli Taluka',
      taluka_id: resolvedTalukaId,
      address: data.address?.trim(),
      address_line: data.address?.trim(),
      pincode: data.pincode?.trim(),
      nearestLandmark: data.nearestLandmark?.trim() || null,
      nearest_landmark: data.nearestLandmark?.trim() || null,
      contact: data.contact?.trim() || null,
      contact_number: data.contact?.trim() || null,
      phone: data.contact?.trim() || null,
      scheme: data.scheme || 'PM-JAY, MJPJAY',
      specialties: specialtiesList,
      status: data.status || 'ACTIVE',
      created_by_admin_id: resolvedAdminId,
    });

    // 5. Process Designated ArogyaSevak Field Assignments
    const rawSevaks = [
      ...(Array.isArray(data.selectedSevaks) ? data.selectedSevaks : []),
      ...(Array.isArray(data.selectedSevakIds) ? data.selectedSevakIds : []),
    ];

    if (rawSevaks.length > 0) {
      const uniqueIdentifiers = [...new Set(rawSevaks.map(item => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return item.id || item.sevak_id || item.name || item.full_name || '';
        return '';
      }).filter(Boolean))];

      if (uniqueIdentifiers.length > 0) {
        const sevaksQueryRes = await query(
          `SELECT s.id, u.full_name, s.employee_code 
           FROM public.arogya_sevaks s
           JOIN public.users u ON s.user_id = u.id
           WHERE s.id = ANY($1::uuid[]) 
              OR u.id = ANY($1::uuid[])
              OR s.employee_code = ANY($2::text[])
              OR u.mobile = ANY($2::text[])
              OR LOWER(u.full_name) = ANY(SELECT LOWER(unnest($2::text[])));`,
          [
            uniqueIdentifiers.filter(id => UUID_REGEX.test(id)),
            uniqueIdentifiers
          ]
        ).catch(() => ({ rows: [] }));

        for (const sevak of sevaksQueryRes.rows) {
          try {
            await HospitalSevakAssignmentModel.create({
              hospital_id: createdHospital.id,
              sevak_id: sevak.id,
              assigned_by: adminUserId || resolvedAdminId,
              status: 'ACTIVE',
              remarks: 'Assigned during hospital empanelment',
            });
          } catch (_) { }
        }
      }
    }

    // 6. Save Hospital Doctors to public.doctors table
    const createdDoctors = [];
    if (Array.isArray(data.doctors) && data.doctors.length > 0) {
      for (const doc of data.doctors) {
        if (!doc || !doc.name) continue;
        try {
          const docSpecs = Array.isArray(doc.specialities)
            ? doc.specialities.filter(Boolean)
            : (doc.specialization ? [doc.specialization] : []);
          const primarySpec = docSpecs[0] || 'General Medicine';

          const savedDoc = await DoctorModel.create({
            hospital_id: createdHospital.id,
            name: doc.name.trim(),
            contact_number: doc.number || doc.contact_number || doc.phone || '',
            alt_contact_number: doc.altNumber || doc.alt_contact_number || doc.altPhone || '',
            email: doc.email?.trim() || null,
            qualification: doc.qualification || 'MBBS',
            specialization: primarySpec,
            specialties: docSpecs.length > 0 ? docSpecs : [primarySpec],
            experience: doc.experience || '',
            experience_years: parseInt(doc.experience_years || doc.experience, 10) || 0,
            address: doc.address || doc.streetAddress || '',
            street_address: doc.streetAddress || doc.address || '',
            address_village_city: doc.district || createdHospital.city || '',
            address_district: doc.district || createdHospital.district || '',
            address_taluka: doc.taluka || createdHospital.taluka || '',
            address_pincode: doc.pincode || createdHospital.pincode || '',
            landmark: doc.landmark || '',
            doctor_type: doc.doctorType || doc.doctor_type || 'Both',
            duty_type: doc.dutyType || doc.duty_type || 'Shift',
            working_days: Array.isArray(doc.workingDays || doc.working_days) ? (doc.workingDays || doc.working_days) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            start_time: doc.startTime || doc.start_time || '04:00',
            start_period: doc.startPeriod || doc.start_period || 'PM',
            end_time: doc.endTime || doc.end_time || '08:00',
            end_period: doc.endPeriod || doc.end_period || 'PM',
            opd_shift: doc.opdShift || doc.opd_shift || (doc.dutyType === 'On-Call' ? 'On-Call' : 'Morning'),
            opd_timing: doc.opdTiming || doc.opd_timing || (doc.availability || 'Morning 8:00 AM - 12:00 PM'),
            availability_status: doc.availabilityStatus || doc.availability_status || 'Available',
            status: 'ACTIVE',
            is_active: true
          });
          createdDoctors.push(savedDoc);
        } catch (docErr) {
          console.warn('[hospitalService.createHospital] Doctor save notice:', docErr.message);
        }
      }
    }

    // 7. Fetch active sevaks details for response payload
    const activeSevaks = await HospitalSevakAssignmentModel.findActiveSevaksByHospitalId(createdHospital.id);

    const sevakDisplayNames = activeSevaks.map((s) => s.full_name || s.employee_code).filter(Boolean);
    const sevakSummary = sevakDisplayNames.length > 0
      ? sevakDisplayNames.join(', ')
      : (data.selectedSevaks?.length ? data.selectedSevaks.filter((s) => typeof s === 'string').join(', ') : 'Not assigned');

    return {
      ...createdHospital,
      type: createdHospital.hospital_type || createdHospital.type || 'Government',
      location: createdHospital.city || createdHospital.district || createdHospital.location || 'Pune',
      areaTaluka: createdHospital.taluka || createdHospital.areaTaluka || 'Haveli Taluka',
      nearestLandmark: createdHospital.nearest_landmark || createdHospital.nearestLandmark || '',
      contact: createdHospital.contact_number || createdHospital.phone || createdHospital.contact || '',
      scheme: createdHospital.scheme || 'PM-JAY, MJPJAY',
      specialties: createdHospital.specialties || specialtiesList,
      sevak: sevakSummary,
      assigned_sevaks: activeSevaks,
      doctors: createdDoctors,
      activeCases: 0,
      bedsAvailable: 15,
    };
  },

  /**
   * Bulk Empanel Hospitals from list/CSV
   * @param {string|null} adminUserId
   * @param {Array<Object>} hospitalList
   */
  async bulkCreateHospitals(adminUserId, hospitalList) {
    if (!Array.isArray(hospitalList) || hospitalList.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Hospital list cannot be empty.');
    }

    const createdList = [];
    const errors = [];

    for (let i = 0; i < hospitalList.length; i++) {
      const data = hospitalList[i];
      try {
        // If hospital code is provided and already exists, generate a unique suffix
        if (data.hospital_code) {
          const existing = await HospitalModel.findByHospitalCode(data.hospital_code);
          if (existing) {
            data.hospital_code = `${data.hospital_code}-${Math.floor(1000 + Math.random() * 9000)}`;
          }
        }

        const created = await this.createHospital(adminUserId, data);
        createdList.push(created);
      } catch (err) {
        console.warn(`[HospitalService] Bulk creation failed for row ${i + 1} (${data.name}):`, err.message);
        errors.push({
          row: i + 1,
          name: data.name || `Row #${i + 1}`,
          error: err.message || 'Failed to create hospital record',
        });
      }
    }

    return {
      total: hospitalList.length,
      successCount: createdList.length,
      failedCount: errors.length,
      hospitals: createdList,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  /**
   * List all hospitals with assigned sevaks and search filters
   */
  async getAllHospitals(filters = {}) {
    const result = await HospitalModel.findAll(filters);

    const enriched = await Promise.all(
      result.hospitals.map(async (h) => {
        let assignedSevaks = [];
        try {
          assignedSevaks = await HospitalSevakAssignmentModel.findActiveSevaksByHospitalId(h.id);
        } catch (e) {
          assignedSevaks = [];
        }

        const sevakNames = assignedSevaks.map((s) => s.full_name || s.employee_code).filter(Boolean);
        const sevakString = sevakNames.length > 0 ? sevakNames.join(', ') : 'Not assigned';

        const specs = h.specialties && Array.isArray(h.specialties)
          ? h.specialties
          : (typeof h.specialties === 'string'
            ? h.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
            : ['General Medicine']);

        return {
          ...h,
          type: h.hospital_type || h.type || 'Government',
          location: h.city || h.district || h.location || 'Pune',
          areaTaluka: h.taluka || h.areaTaluka || 'Haveli Taluka',
          nearestLandmark: h.nearest_landmark || h.nearestLandmark || '',
          contact: h.contact_number || h.phone || h.contact || '',
          scheme: h.scheme || 'PM-JAY, MJPJAY',
          specialties: specs.length > 0 ? specs : ['General Medicine'],
          sevak: sevakString,
          assigned_sevaks: assignedSevaks,
          activeCases: h.active_cases || 0,
          bedsAvailable: h.beds_available || 15,
        };
      })
    );

    return {
      hospitals: enriched,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  },

  /**
   * Get hospital by ID or Code (Complete details)
   */
  async getHospitalById(id) {
    let hospital = await HospitalModel.findById(id);
    if (!hospital) {
      hospital = await HospitalModel.findByHospitalCode(id);
    }
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID or Code '${id}' not found.`);
    }

    const assignedSevaks = await HospitalSevakAssignmentModel.findActiveSevaksByHospitalId(hospital.id);
    const sevakNames = assignedSevaks.map((s) => s.full_name || s.employee_code).filter(Boolean);

    const specs = hospital.specialties && Array.isArray(hospital.specialties)
      ? hospital.specialties
      : (typeof hospital.specialties === 'string'
        ? hospital.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
        : ['General Medicine', 'Emergency Care', 'Trauma']);

    // Fetch infrastructure record if available
    let infra = null;
    try {
      const infraRes = await query(
        'SELECT * FROM public.hospital_infrastructures WHERE hospital_id = $1 LIMIT 1',
        [hospital.id]
      );
      if (infraRes.rows && infraRes.rows.length > 0) {
        infra = infraRes.rows[0];
      }
    } catch (e) {
      // ignore
    }

    // Fetch doctors specifically assigned to this hospital
    let doctors = [];
    try {
      const rawDoctors = await DoctorModel.findAll({ hospital_id: hospital.id });
      doctors = rawDoctors.map((doc) => {
        const specList = Array.isArray(doc.specialties) && doc.specialties.length > 0
          ? doc.specialties
          : (doc.specialization ? [doc.specialization] : ['General Medicine']);
        return {
          id: doc.id,
          doctorCode: doc.doctor_code || doc.registration_number || null,
          name: doc.name,
          registrationNumber: doc.registration_number,
          qualification: doc.qualification || 'MBBS',
          specialization: doc.specialization || specList[0] || 'General Medicine',
          specialties: specList,
          doctorType: doc.doctor_type || 'Both',
          dutyType: doc.duty_type || 'Shift',
          workingDays: Array.isArray(doc.working_days) ? doc.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          startTime: doc.start_time || '04:00',
          startPeriod: doc.start_period || 'PM',
          endTime: doc.end_time || '08:00',
          endPeriod: doc.end_period || 'PM',
          opdShift: doc.opd_shift || 'Morning',
          opdTiming: doc.opd_timing || (doc.duty_type === 'On-Call' ? '24/7 Emergency On-Call' : `${doc.start_time || '04:00'} ${doc.start_period || 'PM'} - ${doc.end_time || '08:00'} ${doc.end_period || 'PM'}`),
          availabilityStatus: doc.availability_status || 'Available',
          contactPhone: doc.contact_number || '',
          contactNumber: doc.contact_number || '',
          email: doc.email || '',
          experience: doc.experience || (doc.experience_years ? `${doc.experience_years} Years` : ''),
          status: doc.status || (doc.is_active ? 'ACTIVE' : 'INACTIVE'),
          isActive: Boolean(doc.is_active)
        };
      });
    } catch (e) {
      console.warn('[getHospitalById] Error fetching assigned doctors:', e.message);
    }

    return {
      ...hospital,
      type: hospital.hospital_type || hospital.type || 'Government',
      location: hospital.city || hospital.district || hospital.location || 'Pune',
      areaTaluka: hospital.taluka || hospital.areaTaluka || 'Haveli Taluka',
      nearestLandmark: hospital.nearest_landmark || hospital.nearestLandmark || '',
      contact: hospital.contact_number || hospital.phone || hospital.contact || '',
      scheme: hospital.scheme || 'PM-JAY, MJPJAY',
      specialties: specs.length > 0 ? specs : ['General Medicine'],
      sevak: sevakNames.length > 0 ? sevakNames.join(', ') : 'Not assigned',
      assigned_sevaks: assignedSevaks,
      doctors: doctors,
      activeCases: hospital.active_cases || 0,
      bedsAvailable: infra?.general_beds ?? hospital.beds_available ?? 15,
      infrastructure: infra || {
        total_beds: 100,
        general_beds: 85,
        icu_beds: 15,
        has_icu: true,
        has_emergency_services: true,
        has_operation_theatre: true,
        has_blood_bank: true,
        verification_status: 'VERIFIED'
      }
    };
  },

  /**
   * Assign multiple ArogyaSevaks to a specific Hospital
   * @param {string|null} adminUserId
   * @param {string} hospitalId
   * @param {Object} data
   */
  async assignSevaksToHospital(adminUserId, hospitalId, data = {}) {
    const { sevak_ids = [], selectedSevaks = [], remarks = null } = data;

    let hospital = await HospitalModel.findById(hospitalId);
    if (!hospital) {
      hospital = await HospitalModel.findByHospitalCode(hospitalId);
    }
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID or Code '${hospitalId}' not found.`);
    }

    const finalSevakIds = new Set();
    if (Array.isArray(sevak_ids)) {
      for (const sid of sevak_ids) {
        if (sid) finalSevakIds.add(sid);
      }
    }

    if (Array.isArray(selectedSevaks)) {
      for (const item of selectedSevaks) {
        if (typeof item === 'string') {
          const match = await ArogyaSevakModel.findByNameOrCode(item);
          if (match) finalSevakIds.add(match.id);
        } else if (item?.id) {
          finalSevakIds.add(item.id);
        }
      }
    }

    let resolvedAdminId = null;
    if (adminUserId) {
      try {
        const userCheck = await query('SELECT id FROM public.users WHERE id = $1 LIMIT 1', [adminUserId]);
        if (userCheck?.rows?.length > 0) {
          resolvedAdminId = userCheck.rows[0].id;
        } else {
          const adminCheck = await query('SELECT user_id FROM public.admins WHERE id = $1 LIMIT 1', [adminUserId]);
          if (adminCheck?.rows?.length > 0) {
            resolvedAdminId = adminCheck.rows[0].user_id;
          }
        }
      } catch {
        resolvedAdminId = null;
      }
    }

    const activeSevaks = await HospitalSevakAssignmentModel.assignSevaksToHospital({
      hospital_id: hospital.id,
      sevak_ids: Array.from(finalSevakIds),
      assigned_by: resolvedAdminId,
      remarks: remarks || 'Assigned by Admin via portal',
    });

    const sevakNames = activeSevaks.map((s) => s.full_name || s.name || s.employee_code).filter(Boolean);
    const sevakString = sevakNames.length > 0 ? sevakNames.join(', ') : 'Not assigned';

    return {
      ...hospital,
      sevak: sevakString,
      assigned_sevaks: activeSevaks,
      assigned_count: activeSevaks.length,
    };
  },

  /**
   * Get all Arogya Sevaks assigned to a specific hospital
   * @param {string} hospitalId - Hospital UUID, hospital code, or name
   */
  async getHospitalSevaks(hospitalId) {
    let hospital = await HospitalModel.findById(hospitalId);
    if (!hospital) {
      hospital = await HospitalModel.findByHospitalCode(hospitalId);
    }
    if (!hospital) {
      const all = await HospitalModel.findAllActive();
      hospital = all.find(h => 
        h.id === hospitalId || 
        h.hospital_code?.toLowerCase() === hospitalId.toLowerCase() || 
        h.name?.toLowerCase().includes(hospitalId.toLowerCase())
      );
    }
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital '${hospitalId}' not found.`);
    }

    const activeSevaks = await HospitalSevakAssignmentModel.findActiveSevaksByHospitalId(hospital.id);
    return {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      hospital_code: hospital.hospital_code,
      total_sevaks: activeSevaks.length,
      sevaks: activeSevaks,
    };
  },

  /**
   * Update hospital record
   * @param {string} id
   * @param {Object} updateData
   */
  async updateHospital(id, updateData) {
    let hospital = await HospitalModel.findById(id);
    if (!hospital) {
      hospital = await HospitalModel.findByHospitalCode(id);
    }
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID or Code '${id}' not found.`);
    }

    if (updateData.hospital_code && updateData.hospital_code !== hospital.hospital_code) {
      const existing = await HospitalModel.findByHospitalCode(updateData.hospital_code);
      if (existing && existing.id !== hospital.id) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Hospital with code '${updateData.hospital_code}' already exists.`);
      }
    }

    await HospitalModel.update(hospital.id, updateData);
    return this.getHospitalById(hospital.id);
  },

  /**
   * Deactivate hospital (removes from active assignment without deleting history)
   * @param {string} id
   */
  async deactivateHospital(id) {
    let hospital = await HospitalModel.findById(id);
    if (!hospital) {
      hospital = await HospitalModel.findByHospitalCode(id);
    }
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID or Code '${id}' not found.`);
    }

    await HospitalModel.update(hospital.id, { status: 'INACTIVE' });
    return {
      success: true,
      message: `Hospital '${hospital.name}' deactivated successfully`,
      hospital_id: hospital.id,
      status: 'INACTIVE',
    };
  },

  /**
   * Delete hospital (or soft delete)
   */
  async deleteHospital(id) {
    const hospital = await HospitalModel.findById(id);
    if (!hospital) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Hospital with ID '${id}' not found.`);
    }

    return HospitalModel.delete(id);
  },
};

export default hospitalService;
