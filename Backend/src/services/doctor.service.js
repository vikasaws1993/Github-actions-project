import { DoctorModel } from '../models/doctor.model.js';
import { HospitalModel } from '../models/hospital.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Helper to format doctor database record into a clean UI response object
 */
export function formatDoctorRecord(doc) {
  if (!doc) return null;

  const specArray = Array.isArray(doc.specialties) && doc.specialties.length > 0
    ? doc.specialties
    : (doc.specialization ? [doc.specialization] : ['General Medicine']);

  return {
    id: doc.id,
    doctorCode: doc.doctor_code || doc.registration_number || null,
    hospitalId: doc.hospital_id,
    hospitalName: doc.hospital_name || null,
    hospitalCode: doc.hospital_code || null,
    hospitalCity: doc.hospital_city || null,
    hospitalDistrict: doc.hospital_district || null,
    name: doc.name,
    registrationNumber: doc.registration_number,
    qualification: doc.qualification || 'MBBS',
    specialization: doc.specialization || specArray[0] || 'General Medicine',
    specialties: specArray,
    doctorType: doc.doctor_type || 'Both',
    dutyType: doc.duty_type || 'Shift',
    workingDays: Array.isArray(doc.working_days) ? doc.working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    startTime: doc.start_time || '04:00',
    startPeriod: doc.start_period || 'PM',
    endTime: doc.end_time || '08:00',
    endPeriod: doc.end_period || 'PM',
    opdShift: doc.opd_shift || 'Morning',
    opdTiming: doc.opd_timing || 'Morning 8:00 AM - 12:00 PM',
    availabilityStatus: doc.availability_status || 'Available',
    contactPhone: doc.contact_number || '',
    contactNumber: doc.contact_number || '',
    altContactNumber: doc.alt_contact_number || '',
    email: doc.email || '',
    experience: doc.experience || (doc.experience_years ? `${doc.experience_years} Years` : ''),
    experienceYears: parseInt(doc.experience_years || 0, 10),
    department: doc.department || doc.specialization,
    roomNumber: doc.room_number || '',
    consultationFee: parseFloat(doc.consultation_fee || 0),
    address: doc.address || doc.street_address || '',
    personalAddress: {
      streetAddress: doc.street_address || doc.address || '',
      villageCity: doc.address_village_city || '',
      taluka: doc.address_taluka || 'Haveli',
      district: doc.address_district || 'Pune',
      pincode: doc.address_pincode || '',
      landmark: doc.landmark || '',
    },
    status: doc.status || (doc.is_active ? 'ACTIVE' : 'INACTIVE'),
    isActive: Boolean(doc.is_active),
    isMaster: Boolean(doc.is_master ?? true),
    joiningDate: doc.joining_date ? new Date(doc.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
    leavingDate: doc.leaving_date || null,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export const doctorService = {
  /**
   * 1) List doctors with search and filter support
   */
  async listDoctors(queryFilters = {}) {
    const {
      hospitalId,
      specialization,
      doctorType,
      dutyType,
      availabilityStatus,
      status,
      isActive,
      search,
      limit = 100,
      offset = 0,
    } = queryFilters;

    const rawDoctors = await DoctorModel.findAll({
      hospital_id: hospitalId || undefined,
      specialization,
      doctor_type: doctorType,
      duty_type: dutyType,
      availability_status: availabilityStatus,
      status,
      is_active: isActive !== undefined ? isActive === 'true' || isActive === true : undefined,
      search,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
    });

    return rawDoctors.map(formatDoctorRecord);
  },

  /**
   * 2) Get single doctor by ID
   */
  async getDoctorById(id) {
    const doc = await DoctorModel.findById(id);
    if (!doc) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Doctor not found with ID ${id}`);
    }
    return formatDoctorRecord(doc);
  },

  /**
   * 3) Add new doctor
   */
  async createDoctor(data) {
    if (!data.name || !data.name.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Doctor name is required');
    }

    // Resolve hospital if provided
    let hospitalId = data.hospitalId || data.hospital_id || null;
    if (hospitalId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hospitalId);
      if (isUuid) {
        const existingHosp = await HospitalModel.findById(hospitalId);
        if (!existingHosp) {
          // If given UUID is not found in database, check for an existing hospital or keep null
          const allHosps = await HospitalModel.findAll({ limit: 1 });
          hospitalId = allHosps?.hospitals?.[0]?.id || null;
        }
      } else {
        try {
          const hosp = await HospitalModel.findByHospitalNumber(hospitalId);
          hospitalId = hosp?.id || null;
        } catch {
          hospitalId = null;
        }
      }
    } else {
      // Auto-associate with default hospital if available
      try {
        const allHosps = await HospitalModel.findAll({ limit: 1 });
        if (allHosps?.hospitals && allHosps.hospitals.length > 0) {
          hospitalId = allHosps.hospitals[0].id;
        }
      } catch {}
    }

    const specArray = Array.isArray(data.specialties) && data.specialties.length > 0
      ? data.specialties
      : (data.specialization ? [data.specialization] : ['General Medicine']);

    const primarySpec = data.specialization || specArray[0] || 'General Medicine';

    const payload = {
      hospital_id: hospitalId,
      name: data.name.trim(),
      doctor_code: data.doctorCode || data.doctor_code || null,
      registration_number: data.registrationNumber || data.registration_number || null,
      qualification: data.qualification?.trim() || 'MBBS',
      specialization: primarySpec,
      specialties: specArray,
      experience: data.experience || (data.experienceYears ? `${data.experienceYears} Years` : ''),
      experience_years: parseInt(data.experienceYears || data.experience_years || 0, 10),
      doctor_type: data.doctorType || data.doctor_type || 'Both',
      duty_type: data.dutyType || data.duty_type || 'Shift',
      working_days: data.workingDays || data.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      start_time: data.startTime || data.start_time || '04:00',
      start_period: data.startPeriod || data.start_period || 'PM',
      end_time: data.endTime || data.end_time || '08:00',
      end_period: data.endPeriod || data.end_period || 'PM',
      opd_shift: data.opdShift || data.opd_shift || (data.dutyType === 'On-Call' ? 'On-Call' : 'Morning'),
      opd_timing: data.availability || data.opdTiming || data.opd_timing || (data.dutyType === 'On-Call' ? '24/7 Emergency On-Call' : 'Morning 8:00 AM - 12:00 PM'),
      availability_status: data.availabilityStatus || data.availability_status || 'Available',
      contact_number: data.contactPhone || data.contactNumber || data.contact_number || data.phone || data.mobile || '',
      alt_contact_number: data.altContactNumber || data.alt_contact_number || data.altPhone || data.altMobile || null,
      email: data.email?.trim() || null,
      address: data.address || data.personalAddress?.streetAddress || null,
      street_address: data.streetAddress || data.personalAddress?.streetAddress || data.address || null,
      address_village_city: data.personalAddress?.villageCity || data.villageCity || data.address_village_city || null,
      address_taluka: data.personalAddress?.taluka || data.taluka || data.address_taluka || 'Haveli',
      address_district: data.personalAddress?.district || data.district || data.address_district || 'Pune',
      address_pincode: data.personalAddress?.pincode || data.pincode || data.address_pincode || null,
      landmark: data.landmark || data.personalAddress?.landmark || null,
      department: data.department?.trim() || primarySpec,
      room_number: data.roomNumber || data.room_number || null,
      consultation_fee: parseFloat(data.consultationFee || data.consultation_fee || 0),
      status: 'ACTIVE',
      is_active: true,
      is_master: true,
      joining_date: data.joiningDate || new Date(),
    };

    const created = await DoctorModel.create(payload);
    return formatDoctorRecord(created);
  },

  /**
   * 4) Update existing doctor
   */
  async updateDoctor(id, data) {
    const existing = await DoctorModel.findById(id);
    if (!existing) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Doctor not found with ID ${id}`);
    }

    const updatePayload = {};

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.registrationNumber !== undefined) updatePayload.registration_number = data.registrationNumber.trim();
    if (data.qualification !== undefined) updatePayload.qualification = data.qualification.trim();
    if (data.specialization !== undefined) updatePayload.specialization = data.specialization.trim();
    if (data.speciality !== undefined && data.specialization === undefined) updatePayload.specialization = data.speciality.trim();
    if (data.specialties !== undefined) updatePayload.specialties = data.specialties;
    if (data.doctorType !== undefined || data.doctor_type !== undefined) updatePayload.doctor_type = data.doctorType || data.doctor_type;
    if (data.dutyType !== undefined || data.duty_type !== undefined) updatePayload.duty_type = data.dutyType || data.duty_type;
    if (data.workingDays !== undefined || data.working_days !== undefined) updatePayload.working_days = data.workingDays || data.working_days;
    if (data.startTime !== undefined || data.start_time !== undefined) updatePayload.start_time = data.startTime || data.start_time;
    if (data.startPeriod !== undefined || data.start_period !== undefined) updatePayload.start_period = data.startPeriod || data.start_period;
    if (data.endTime !== undefined || data.end_time !== undefined) updatePayload.end_time = data.endTime || data.end_time;
    if (data.endPeriod !== undefined || data.end_period !== undefined) updatePayload.end_period = data.endPeriod || data.end_period;
    if (data.opdShift !== undefined || data.opd_shift !== undefined) updatePayload.opd_shift = data.opdShift || data.opd_shift;
    if (data.opdTiming !== undefined || data.opd_timing !== undefined) updatePayload.opd_timing = data.opdTiming || data.opd_timing;
    if (data.availability !== undefined && data.opdTiming === undefined) updatePayload.opd_timing = data.availability;
    if (data.availabilityStatus !== undefined || data.availability_status !== undefined) {
      updatePayload.availability_status = data.availabilityStatus || data.availability_status;
    }
    if (data.contactPhone !== undefined || data.contactNumber !== undefined || data.phone !== undefined || data.mobile !== undefined) {
      updatePayload.contact_number = data.contactPhone || data.contactNumber || data.phone || data.mobile;
    }
    if (data.altContactNumber !== undefined || data.altPhone !== undefined || data.altMobile !== undefined) {
      updatePayload.alt_contact_number = data.altContactNumber || data.altPhone || data.altMobile;
    }
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.department !== undefined) updatePayload.department = data.department;
    if (data.roomNumber !== undefined) updatePayload.room_number = data.roomNumber;
    if (data.experienceYears !== undefined || data.experience_years !== undefined) {
      updatePayload.experience_years = parseInt(data.experienceYears || data.experience_years, 10);
    }
    if (data.consultationFee !== undefined || data.consultation_fee !== undefined) {
      updatePayload.consultation_fee = parseFloat(data.consultationFee || data.consultation_fee);
    }
    if (data.isActive !== undefined || data.is_active !== undefined || data.status !== undefined) {
      const isAct = data.isActive !== undefined ? Boolean(data.isActive) : (data.is_active !== undefined ? Boolean(data.is_active) : (String(data.status).toUpperCase() === 'ACTIVE' || data.status === 'Active'));
      updatePayload.is_active = isAct;
      updatePayload.status = isAct ? 'ACTIVE' : 'INACTIVE';
      if (!isAct) {
        updatePayload.availability_status = 'Unavailable';
      }
    }

    // Address fields
    if (data.personalAddress) {
      if (data.personalAddress.villageCity !== undefined) updatePayload.address_village_city = data.personalAddress.villageCity;
      if (data.personalAddress.taluka !== undefined) updatePayload.address_taluka = data.personalAddress.taluka;
      if (data.personalAddress.district !== undefined) updatePayload.address_district = data.personalAddress.district;
      if (data.personalAddress.pincode !== undefined) updatePayload.address_pincode = data.personalAddress.pincode;
    } else {
      if (data.villageCity !== undefined) updatePayload.address_village_city = data.villageCity;
      if (data.taluka !== undefined) updatePayload.address_taluka = data.taluka;
      if (data.district !== undefined) updatePayload.address_district = data.district;
      if (data.pincode !== undefined) updatePayload.address_pincode = data.pincode;
    }

    const updated = await DoctorModel.update(id, updatePayload);
    return formatDoctorRecord(updated);
  },

  /**
   * 5) Update availability status
   */
  async updateAvailability(id, availabilityStatus) {
    const validStatuses = ['Available', 'On Leave', 'In Surgery', 'Emergency Duty', 'Unavailable'];
    if (!validStatuses.includes(availabilityStatus)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const updated = await DoctorModel.updateAvailability(id, availabilityStatus);
    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Doctor not found with ID ${id}`);
    }
    return formatDoctorRecord(updated);
  },

  /**
   * 6) Toggle Active / Deactivated status
   */
  async toggleActiveStatus(id) {
    const updated = await DoctorModel.toggleActiveStatus(id);
    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Doctor not found with ID ${id}`);
    }
    return formatDoctorRecord(updated);
  },

  /**
   * 7) Delete doctor
   */
  async deleteDoctor(id) {
    const success = await DoctorModel.delete(id);
    if (!success) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Doctor not found with ID ${id}`);
    }
    return { id, deleted: true };
  },

  /**
   * 8) Get Doctor Roster Statistics
   */
  async getRosterStats(hospitalId = null) {
    return DoctorModel.getStats(hospitalId);
  },
};

export default doctorService;
