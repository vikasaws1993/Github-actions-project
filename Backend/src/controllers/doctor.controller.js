import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { doctorService } from '../services/doctor.service.js';
import { adminService } from '../services/admin.service.js';
import { HospitalModel } from '../models/hospital.model.js';

/**
 * Helper to resolve hospital ID from request query/body or authenticated user context
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
    } catch {
      // Ignore if user has no assigned hospital records
    }
  }

  if (req.user?.hospitalId || req.user?.hospital) {
    return req.user?.hospitalId || req.user?.hospital;
  }

  return null;
}

/**
 * 1) GET /api/doctors
 * List all doctors with query filtering (hospitalId, specialization, doctorType, availabilityStatus, isActive, search)
 */
export const getDoctors = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  const filters = {
    ...req.query,
    hospitalId: req.query.hospitalId || hospitalId || undefined,
  };

  const doctors = await doctorService.listDoctors(filters);
  const stats = await doctorService.getRosterStats(filters.hospitalId);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        doctors,
        stats,
        total: doctors.length,
      },
      'Hospital doctors and duty roster retrieved successfully'
    )
  );
});

/**
 * 2) GET /api/doctors/stats
 * Get roster KPI metric counters
 */
export const getDoctorStats = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);
  const stats = await doctorService.getRosterStats(hospitalId);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      stats,
      'Doctor roster statistics retrieved successfully'
    )
  );
});

/**
 * 3) GET /api/doctors/:id
 * Get single doctor profile
 */
export const getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctor = await doctorService.getDoctorById(id);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      doctor,
      'Doctor details retrieved successfully'
    )
  );
});

/**
 * 4) POST /api/doctors
 * Register a new doctor into the duty roster
 */
export const createDoctor = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  const payload = {
    ...req.body,
    hospitalId: req.body.hospitalId || hospitalId || undefined,
  };

  const newDoctor = await doctorService.createDoctor(payload);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      newDoctor,
      'Doctor added to duty roster successfully'
    )
  );
});

/**
 * 5) PUT /api/doctors/:id
 * Update existing doctor profile or duty schedule
 */
export const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedDoctor = await doctorService.updateDoctor(id, req.body);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updatedDoctor,
      'Doctor details updated successfully'
    )
  );
});

/**
 * 6) PATCH /api/doctors/:id/availability
 * Quick 1-click update of live duty availability status
 */
export const updateDoctorAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { availabilityStatus } = req.body;

  if (!availabilityStatus) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'availabilityStatus is required');
  }

  const updatedDoctor = await doctorService.updateAvailability(id, availabilityStatus);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updatedDoctor,
      `Doctor availability status updated to "${availabilityStatus}"`
    )
  );
});

/**
 * 7) PATCH /api/doctors/:id/toggle-status
 * Toggle doctor active / deactivated status
 */
export const toggleDoctorActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedDoctor = await doctorService.toggleActiveStatus(id);

  const action = updatedDoctor.isActive ? 'reactivated' : 'deactivated';

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updatedDoctor,
      `Doctor successfully ${action}`
    )
  );
});

/**
 * 8) DELETE /api/doctors/:id
 * Remove doctor record
 */
export const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await doctorService.deleteDoctor(id);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result,
      'Doctor record removed successfully'
    )
  );
});

export default {
  getDoctors,
  getDoctorStats,
  getDoctorById,
  createDoctor,
  updateDoctor,
  updateDoctorAvailability,
  toggleDoctorActive,
  deleteDoctor,
};
