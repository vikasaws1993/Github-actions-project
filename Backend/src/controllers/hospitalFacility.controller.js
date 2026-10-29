import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { HospitalFacilitySurveyModel } from '../models/hospitalFacilitySurvey.model.js';
import { hospitalService } from '../services/hospital.service.js';
import { adminService } from '../services/admin.service.js';
import { DoctorModel } from '../models/doctor.model.js';

/**
 * Format DB doctor row to Frontend HospitalDoctor format
 */
function mapDbDoctorToHospitalDoctor(doc) {
  if (!doc) return null;
  const specStr = Array.isArray(doc.specialties) && doc.specialties.length > 0
    ? doc.specialties.join(', ')
    : (doc.specialization || 'General Medicine');

  let availabilityStr = doc.opd_timing || 'Full Day Shift';
  if (doc.duty_type === 'On-Call') {
    availabilityStr = 'On-Call Specialist';
  } else if (doc.start_time && doc.end_time) {
    const days = Array.isArray(doc.working_days) && doc.working_days.length > 0
      ? ` [${doc.working_days.join(', ')}]`
      : '';
    availabilityStr = `Shift (${doc.start_time} ${doc.start_period || 'AM'} - ${doc.end_time} ${doc.end_period || 'PM'})${days}`;
  }

  return {
    id: doc.id,
    name: doc.name,
    speciality: specStr,
    doctorType: doc.doctor_type || 'Both',
    qualification: doc.qualification || 'MBBS',
    experience: doc.experience || (doc.experience_years ? `${doc.experience_years} Years` : ''),
    dutyType: doc.duty_type || 'Shift',
    startTime: doc.start_time || '08:00',
    startPeriod: doc.start_period || 'AM',
    endTime: doc.end_time || '02:00',
    endPeriod: doc.end_period || 'PM',
    workingDays: Array.isArray(doc.working_days) && doc.working_days.length > 0
      ? doc.working_days
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    availability: availabilityStr,
    mobile: doc.contact_number || '',
    altMobile: doc.alt_contact_number || '',
    address: doc.street_address || doc.address || '',
    district: doc.address_district || '',
    taluka: doc.address_taluka || '',
    pincode: doc.address_pincode || '',
    nearestLandmark: doc.landmark || '',
    status: (doc.is_active === false || String(doc.status || '').toUpperCase() === 'INACTIVE') ? 'Inactive' : 'Active',
    isActive: !(doc.is_active === false || String(doc.status || '').toUpperCase() === 'INACTIVE'),
    is_active: !(doc.is_active === false || String(doc.status || '').toUpperCase() === 'INACTIVE'),
  };
}

/**
 * Format frontend HospitalDoctor to DB doctor insert/update payload
 */
function mapHospitalDoctorToDbPayload(doc, hospitalId) {
  const specArray = (doc.speciality || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const primarySpec = specArray[0] || 'General Medicine';
  const isInactive = String(doc.status || '').toUpperCase() === 'INACTIVE' || doc.is_active === false || doc.isActive === false;

  return {
    hospital_id: hospitalId,
    name: doc.name?.trim(),
    qualification: doc.qualification?.trim() || 'MBBS',
    specialization: primarySpec,
    specialties: specArray.length > 0 ? specArray : [primarySpec],
    doctor_type: doc.doctorType || 'Both',
    experience: doc.experience?.trim() || '',
    duty_type: doc.dutyType || 'Shift',
    start_time: doc.startTime || '08:00',
    start_period: doc.startPeriod || 'AM',
    end_time: doc.endTime || '02:00',
    end_period: doc.endPeriod || 'PM',
    working_days: Array.isArray(doc.workingDays) && doc.workingDays.length > 0
      ? doc.workingDays
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    opd_timing: doc.availability || (doc.dutyType === 'On-Call' ? '24/7 Emergency On-Call' : `${doc.startTime || '08:00'} ${doc.startPeriod || 'AM'} - ${doc.endTime || '02:00'} ${doc.endPeriod || 'PM'}`),
    contact_number: doc.mobile || '',
    alt_contact_number: doc.altMobile || '',
    street_address: doc.address || '',
    address: doc.address || '',
    address_district: doc.district || '',
    address_taluka: doc.taluka || '',
    address_pincode: doc.pincode || '',
    landmark: doc.nearestLandmark || '',
    is_active: !isInactive,
    status: isInactive ? 'INACTIVE' : 'ACTIVE',
    availability_status: isInactive ? 'Unavailable' : (doc.availabilityStatus || 'Available'),
  };
}

/**
 * Helper to resolve hospital ID for current user
 */
async function resolveHospitalId(req) {
  if (req.query?.hospitalId || req.body?.hospitalId || req.params?.hospitalId) {
    return req.query?.hospitalId || req.body?.hospitalId || req.params?.hospitalId;
  }

  const isBackup = Boolean(req.user?.isBackup || req.user?.is_backup);
  const coveringId = req.user?.coveringForSevakId || req.user?.covering_for_sevak_id;
  const sevakId = (isBackup && coveringId) ? coveringId : (req.user?.sevakId || req.user?.id);

  if (sevakId) {
    try {
      const sevakData = await adminService.getSevakAssignedHospitals(sevakId);
      if (sevakData?.active_hospitals && sevakData.active_hospitals.length > 0) {
        return sevakData.active_hospitals[0].hospital_id;
      }
    } catch (_) {}
  }

  if (req.user?.hospitalId || req.user?.hospital) {
    return req.user?.hospitalId || req.user?.hospital;
  }

  return null;
}

/**
 * 1) GET Hospital Facilities & Infrastructure Info
 * GET /api/hospital-facilities
 */
export const getHospitalFacilities = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  if (!hospitalId) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'No assigned hospital found for this user. Please ensure hospital assignment is configured.'
    );
  }

  // 1. Fetch base hospital record
  let hospital = null;
  try {
    hospital = await hospitalService.getHospitalById(hospitalId);
  } catch (_) {}

  if (!hospital) {
    hospital = {
      id: hospitalId,
      name: typeof hospitalId === 'string' ? hospitalId : 'Assigned Hospital',
      hospital_type: 'Government',
      address: '',
      city: '',
      district: '',
      taluka: '',
      pincode: '',
      contact_number: '',
    };
  }

  // 2. Fetch existing facility survey
  const existingSurvey = await HospitalFacilitySurveyModel.findByHospitalId(hospitalId);

  // 3. Fetch all doctors from the main public.doctors table for this hospital
  let dbDoctors = [];
  try {
    const rawDocs = await DoctorModel.findAll({ hospital_id: hospitalId, limit: 100 });
    dbDoctors = (rawDocs || []).map(mapDbDoctorToHospitalDoctor).filter(Boolean);
  } catch (err) {
    console.warn('[getHospitalFacilities] Could not load db doctors:', err.message);
  }

  // 4. Merge doctors from DB and saved survey (DB is source of truth, plus any unsaved survey doctors)
  const surveyDocList = Array.isArray(existingSurvey?.doctors_list) ? existingSurvey.doctors_list : [];
  const mergedDoctorsMap = new Map();

  // Add DB doctors first
  for (const d of dbDoctors) {
    if (d && d.name) {
      mergedDoctorsMap.set(d.name.toLowerCase().trim(), d);
    }
  }

  // Add any survey doctors that aren't in DB yet
  for (const sd of surveyDocList) {
    if (sd && sd.name && !mergedDoctorsMap.has(sd.name.toLowerCase().trim())) {
      mergedDoctorsMap.set(sd.name.toLowerCase().trim(), sd);
    }
  }

  const finalDoctorsList = Array.from(mergedDoctorsMap.values());

  // 5. Prepare pre-filled Hospital Info for Step 1
  const prefilledHospInfo = {
    name: hospital.name || '',
    type: hospital.hospital_type || 'Government',
    address: hospital.address || hospital.address_line || '',
    city: hospital.city || '',
    district: hospital.district || '',
    areaTaluka: hospital.taluka || hospital.area || '',
    pincode: hospital.pincode || '',
    nearestLandmark: hospital.nearest_landmark || '',
    contact: hospital.contact_number || hospital.phone || '',
    emergency24x7: hospital.emergency_available ? 'Yes' : 'No',
    ambulanceAvailable: hospital.ambulance_available ? 'Yes' : 'No',
  };

  const isCompleted = Boolean(
    existingSurvey?.is_fully_completed ||
    existingSurvey?.status === 'SUBMITTED' ||
    existingSurvey?.current_status?.verifiedBySevak === true
  );

  const responseData = {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    hospitalCode: hospital.hospital_code,
    hospitalInfo: {
      ...prefilledHospInfo,
      ...(existingSurvey?.hospital_info || {}),
    },
    capacity: existingSurvey?.capacity || null,
    selectedSpecialities: existingSurvey?.selected_specialities || [],
    selectedPackages: existingSurvey?.selected_packages || [],
    doctorsList: finalDoctorsList,
    resourceCount: existingSurvey?.resource_count || null,
    hospitalDoctorsMaster: dbDoctors, // Master doctors already in database for autocomplete/dropdown

    // Legacy fields for backward compatibility
    specializations: existingSurvey?.specializations || {},
    treatmentsOperations: existingSurvey?.treatments_operations || {},
    bedAvailability: existingSurvey?.bed_availability || {},
    criticalResources: existingSurvey?.critical_resources || {},
    emergencyCapability: existingSurvey?.emergency_capability || {},
    currentStatus: {
      ...(existingSurvey?.current_status || {}),
      verifiedBySevak: isCompleted,
    },
    completedSections: isCompleted
      ? ['s1', 's2', 's3', 's4', 's5', 's6']
      : (existingSurvey?.completed_sections || []),
    isFullyCompleted: isCompleted,
    submittedBySevakId: existingSurvey?.submitted_by_sevak_id || null,
    status: isCompleted ? 'SUBMITTED' : (existingSurvey?.status || 'DRAFT'),
    updatedAt: existingSurvey?.updated_at || null,
  };

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        responseData,
        'Hospital facility infrastructure details retrieved successfully'
      )
    );
});

/**
 * 2) POST Hospital Facilities & Infrastructure Info (Upsert)
 * POST /api/hospital-facilities
 */
export const saveHospitalFacilities = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  if (!hospitalId) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Hospital ID is required or user must have an assigned hospital.'
    );
  }

  const userId = req.user?.id;
  let completedSections = Array.isArray(req.body.completedSections) ? req.body.completedSections : [];
  const isSubmission = Boolean(
    req.body.isFullyCompleted === true ||
    req.body.status === 'SUBMITTED' ||
    req.body.currentStatus?.verifiedBySevak === true
  );

  if (isSubmission) {
    completedSections = ['s1', 's2', 's3', 's4', 's5', 's6'];
  }

  const currentStatus = {
    ...(req.body.currentStatus || {}),
    verifiedBySevak: isSubmission ? true : Boolean(req.body.currentStatus?.verifiedBySevak),
  };

  // Sync doctors with main public.doctors table
  const doctorsList = Array.isArray(req.body.doctorsList) ? req.body.doctorsList : [];
  const syncedDoctors = [];

  for (const doc of doctorsList) {
    if (!doc || !doc.name || !doc.name.trim()) continue;
    try {
      const dbPayload = mapHospitalDoctorToDbPayload(doc, hospitalId);
      const isRealUuid = Boolean(doc.id && !String(doc.id).startsWith('doc-') && String(doc.id).length >= 32);

      let savedDoc = null;
      if (isRealUuid) {
        try {
          const existing = await DoctorModel.findById(doc.id);
          if (existing) {
            savedDoc = await DoctorModel.update(doc.id, dbPayload);
          }
        } catch (_) {}
      }

      if (!savedDoc) {
        // Check if doctor with same name exists for this hospital
        const existingByName = await DoctorModel.findAll({
          hospital_id: hospitalId,
          search: doc.name.trim(),
          limit: 1,
        });

        if (existingByName && existingByName.length > 0 && existingByName[0].name.toLowerCase() === doc.name.trim().toLowerCase()) {
          savedDoc = await DoctorModel.update(existingByName[0].id, dbPayload);
        } else {
          savedDoc = await DoctorModel.create(dbPayload);
        }
      }

      syncedDoctors.push(mapDbDoctorToHospitalDoctor(savedDoc) || doc);
    } catch (docErr) {
      console.warn('[saveHospitalFacilities] Notice syncing doctor to DB:', docErr.message);
      syncedDoctors.push(doc);
    }
  }

  const surveyPayload = {
    hospitalInfo: req.body.hospitalInfo || {},
    capacity: req.body.capacity || {},
    selectedSpecialities: req.body.selectedSpecialities || [],
    selectedPackages: req.body.selectedPackages || [],
    doctorsList: syncedDoctors.length > 0 ? syncedDoctors : doctorsList,
    resourceCount: req.body.resourceCount || {},
    specializations: req.body.specializations || {},
    treatmentsOperations: req.body.treatmentsOperations || {},
    bedAvailability: req.body.bedAvailability || {},
    criticalResources: req.body.criticalResources || {},
    emergencyCapability: req.body.emergencyCapability || {},
    currentStatus: currentStatus,
    completedSections: completedSections,
    isFullyCompleted: isSubmission,
    status: isSubmission ? 'SUBMITTED' : 'DRAFT',
  };

  const savedSurvey = await HospitalFacilitySurveyModel.upsertSurvey(
    hospitalId,
    userId,
    surveyPayload
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          ...savedSurvey,
          doctorsList: syncedDoctors.length > 0 ? syncedDoctors : doctorsList,
        },
        'Hospital facility infrastructure details saved successfully'
      )
    );
});

export default {
  getHospitalFacilities,
  saveHospitalFacilities,
};

