import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { DailyUpdateModel } from '../models/dailyUpdate.model.js';
import { HospitalModel } from '../models/hospital.model.js';
import { HospitalFacilitySurveyModel } from '../models/hospitalFacilitySurvey.model.js';
import { adminService } from '../services/admin.service.js';

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

  // Fallback to first hospital in database if not explicitly assigned
  try {
    const allHosps = await HospitalModel.findAll({ limit: 1 });
    if (allHosps?.hospitals && allHosps.hospitals.length > 0) {
      return allHosps.hospitals[0].id;
    }
  } catch (_) {}

  return null;
}

/**
 * 1) GET Daily Updates & Shift Resource Reports
 * GET /api/daily-updates
 * GET /api/arogya-sevaks/daily-updates
 */
export const getDailyUpdates = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  if (!hospitalId) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'No hospital found. Please ensure hospital assignment is configured.'
    );
  }

  const hospital = await HospitalModel.findById(hospitalId);
  const survey = await HospitalFacilitySurveyModel.findByHospitalId(hospitalId);
  const surveyBeds = survey?.bed_availability || {};
  const surveyResources = survey?.critical_resources || {};

  const isSevak = req.user?.role === 'AROGYA_SEVAK' || req.user?.role === 'SEVAK';
  const filterUserId = isSevak ? (req.user?.id || null) : null;
  const filterSevakId = isSevak ? (req.user?.sevakId || null) : null;

  let reports = await DailyUpdateModel.getRecentReports(hospitalId, 20, filterUserId, filterSevakId);
  if ((!reports || reports.length === 0) && isSevak) {
    reports = await DailyUpdateModel.getRecentReports(hospitalId, 20);
  }
  const latestReport = reports && reports.length > 0 ? reports[0] : null;

  const reportingOfficerName =
    req.user?.full_name ||
    req.user?.name ||
    (reports[0]?.reporting_officer_name) ||
    'Arogya Sevak';

  // Build KPI Summary Stats from facility survey & daily updates
  const surveyIcuTotal = parseInt(surveyBeds.totalIcuBeds || hospital?.total_icu_beds || 0, 10) || 0;
  const icuTotal = surveyIcuTotal > 0 ? surveyIcuTotal : (parseInt(latestReport?.icu_total, 10) || 0);
  const icuAvailable = latestReport ? (parseInt(latestReport.icu_available, 10) || 0) : 0;

  const surveyGeneralTotal = parseInt(surveyBeds.totalBeds || hospital?.total_general_beds || hospital?.total_beds || 0, 10) || 0;
  const generalTotal = surveyGeneralTotal > 0 ? surveyGeneralTotal : (parseInt(latestReport?.general_total, 10) || 0);
  const generalAvailable = latestReport ? (parseInt(latestReport.general_available, 10) || 0) : 0;

  const admissionsMadeToday = latestReport ? (parseInt(latestReport.my_admissions, 10) || 0) : 0;
  const doctorsActiveOnDuty = latestReport ? (parseInt(latestReport.doctors_on_duty, 10) || 0) : 0;

  const surveyVentilatorsTotal = parseInt(surveyResources?.ventilator?.total || surveyResources?.ventilator?.available || surveyBeds.totalEmergencyBeds || hospital?.total_emergency_beds || 0, 10) || 0;
  const ventilatorsAvailable = latestReport ? (parseInt(latestReport.ventilators_available, 10) || 0) : 0;
  const ventilatorsTotal = surveyVentilatorsTotal > 0 ? surveyVentilatorsTotal : (parseInt(latestReport?.ventilators_total || latestReport?.ventilators_available, 10) || 0);

  const oxygenBeds = latestReport ? (parseInt(latestReport.oxygen_beds_available, 10) || 0) : 0;
  const dialysisUnits = latestReport ? (parseInt(latestReport.dialysis_machines_free, 10) || 0) : 0;
  const operationTheatres = latestReport ? (parseInt(latestReport.active_operation_theatres, 10) || 0) : 0;

  // Helper for consistent YYYY-MM-DD date extraction without UTC timezone shifts
  const formatYYYYMMDD = (d) => {
    if (!d) return '';
    if (typeof d === 'string') {
      const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatTime12H = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Format reports history for frontend
  const todayDateStr = formatYYYYMMDD(new Date());
  const formattedReports = reports.map((r) => {
    const reportDateStr = formatYYYYMMDD(r.report_date) || formatYYYYMMDD(r.created_at);
    const createdDateStr = formatYYYYMMDD(r.created_at);
    const isToday = reportDateStr === todayDateStr || createdDateStr === todayDateStr;
    const submittedTimeStr = formatTime12H(r.created_at);

    return {
      id: r.id,
      createdAt: r.created_at,
      reportDate: reportDateStr,
      rawDate: reportDateStr,
      submittedAt: submittedTimeStr,
      isToday,
      date: new Date(r.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      shift: r.shift || 'Morning Shift',
      wardsAvailable: r.wards_available || 0,
      wardsTotal: r.wards_total || 0,
      icuAvailable: r.icu_available,
      icuTotal: r.icu_total,
      generalAvailable: r.general_available,
      generalTotal: r.general_total,
      nicuAvailable: r.nicu_available || 0,
      nicuTotal: r.nicu_total || 0,
      picuAvailable: r.picu_available || 0,
      picuTotal: r.picu_total || 0,
      isolationAvailable: r.isolation_available || 0,
      isolationTotal: r.isolation_total || 0,
      myAdmissions: r.my_admissions,
      doctorsOnDuty: r.doctors_on_duty,
      ventilators: r.ventilators_available,
      oxygenBeds: r.oxygen_beds_available,
      dialysisUnits: r.dialysis_machines_free,
      operationTheatres: r.active_operation_theatres,
      opdDoctorRecords: Array.isArray(r.opd_doctor_records) ? r.opd_doctor_records : (typeof r.opd_doctor_records === 'string' ? JSON.parse(r.opd_doctor_records || '[]') : []),
      remarks: r.remarks || '',
      submittedBy: r.reporting_officer_name || reportingOfficerName,
    };
  });

  const responseData = {
    hospitalId: hospital?.id,
    hospitalName: hospital?.name || 'Assigned Hospital',
    reportingOfficer: reportingOfficerName,
    stats: {
      icuAvailable,
      icuTotal,
      generalAvailable,
      generalTotal,
      admissionsMadeToday,
      doctorsOnDuty: doctorsActiveOnDuty,
      ventilatorsAvailable,
      ventilatorsTotal,
      oxygenBeds,
      dialysisUnits,
      operationTheatres,
    },
    latestReport: latestReport
      ? {
          shift: latestReport.shift,
          wardsAvailable: latestReport.wards_available || 0,
          wardsTotal: latestReport.wards_total || 0,
          icuAvailable: latestReport.icu_available,
          icuTotal: icuTotal,
          generalAvailable: latestReport.general_available,
          generalTotal: generalTotal,
          nicuAvailable: latestReport.nicu_available || 0,
          nicuTotal: latestReport.nicu_total || 0,
          picuAvailable: latestReport.picu_available || 0,
          picuTotal: latestReport.picu_total || 0,
          isolationAvailable: latestReport.isolation_available || 0,
          isolationTotal: latestReport.isolation_total || 0,
          myAdmissions: latestReport.my_admissions,
          doctorsOnDuty: latestReport.doctors_on_duty,
          ventilators: latestReport.ventilators_available,
          ventilatorsAvailable: latestReport.ventilators_available,
          ventilatorsTotal: ventilatorsTotal,
          oxygenBeds: latestReport.oxygen_beds_available,
          dialysisUnits: latestReport.dialysis_machines_free,
          operationTheatres: latestReport.active_operation_theatres,
          opdDoctorRecords: Array.isArray(latestReport.opd_doctor_records) ? latestReport.opd_doctor_records : (typeof latestReport.opd_doctor_records === 'string' ? JSON.parse(latestReport.opd_doctor_records || '[]') : []),
          remarks: latestReport.remarks,
        }
      : null,
    reports: formattedReports,
  };

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        responseData,
        'Daily updates and resource reports retrieved successfully'
      )
    );
});

/**
 * 2) POST Submit Daily Update Report
 * POST /api/daily-updates
 * POST /api/arogya-sevaks/daily-updates
 */
export const submitDailyUpdate = asyncHandler(async (req, res) => {
  const hospitalId = await resolveHospitalId(req);

  if (!hospitalId) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Hospital ID is required or user must have an assigned hospital.'
    );
  }

  const survey = await HospitalFacilitySurveyModel.findByHospitalId(hospitalId);
  const surveyBeds = survey?.bed_availability || {};
  const surveyCapacity = survey?.capacity || {};
  const ipdCap = surveyCapacity.ipd || {};
  const surveyIcuDefault = parseInt(ipdCap.icuUnits || surveyBeds.totalIcuBeds || 0, 10) || 0;
  const surveyGenDefault = parseInt(ipdCap.generalBeds || surveyBeds.totalBeds || 0, 10) || 0;
  const surveyWardsDefault = parseInt(ipdCap.noOfWards || 0, 10) || 0;
  const surveyNicuDefault = parseInt(ipdCap.nicuBeds || 0, 10) || 0;
  const surveyPicuDefault = parseInt(ipdCap.picuBeds || 0, 10) || 0;
  const surveyIsolationDefault = parseInt(ipdCap.isolationBeds || 0, 10) || 0;

  const userId = req.user?.id;
  const sevakId = req.user?.sevakId || null;
  const reportingOfficerName =
    req.body.reportingOfficerName ||
    req.user?.full_name ||
    req.user?.name ||
    'Suresh Jadhav (ArogyaSevak)';

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayYYYYMMDD = `${y}-${m}-${d}`;

  const payload = {
    hospital_id: hospitalId,
    sevak_id: sevakId,
    user_id: userId,
    report_date: req.body.reportDate || req.body.report_date || todayYYYYMMDD,
    shift: req.body.shift || 'Morning Shift',
    wards_available: req.body.wardsAvailable !== undefined ? req.body.wardsAvailable : (req.body.wards_available || 0),
    wards_total: req.body.wardsTotal !== undefined ? req.body.wardsTotal : (req.body.wards_total || surveyWardsDefault || 0),
    general_available: req.body.generalAvailable !== undefined ? req.body.generalAvailable : (req.body.general_available || 0),
    general_total: req.body.generalTotal !== undefined ? req.body.generalTotal : (req.body.general_total || surveyGenDefault || 0),
    icu_available: req.body.icuAvailable !== undefined ? req.body.icuAvailable : (req.body.icu_available || 0),
    icu_total: req.body.icuTotal !== undefined ? req.body.icuTotal : (req.body.icu_total || surveyIcuDefault || 0),
    nicu_available: req.body.nicuAvailable !== undefined ? req.body.nicuAvailable : (req.body.nicu_available || 0),
    nicu_total: req.body.nicuTotal !== undefined ? req.body.nicuTotal : (req.body.nicu_total || surveyNicuDefault || 0),
    picu_available: req.body.picuAvailable !== undefined ? req.body.picuAvailable : (req.body.picu_available || 0),
    picu_total: req.body.picuTotal !== undefined ? req.body.picuTotal : (req.body.picu_total || surveyPicuDefault || 0),
    isolation_available: req.body.isolationAvailable !== undefined ? req.body.isolationAvailable : (req.body.isolation_available || 0),
    isolation_total: req.body.isolationTotal !== undefined ? req.body.isolationTotal : (req.body.isolation_total || surveyIsolationDefault || 0),
    my_admissions: req.body.myAdmissions !== undefined ? req.body.myAdmissions : (req.body.my_admissions || 0),
    doctors_on_duty: req.body.doctorsOnDuty !== undefined ? req.body.doctorsOnDuty : (req.body.doctors_on_duty || 0),
    ventilators_available: req.body.ventilators !== undefined ? req.body.ventilators : (req.body.ventilators_available || 0),
    oxygen_beds_available: req.body.oxygenBeds !== undefined ? req.body.oxygenBeds : (req.body.oxygen_beds_available || 0),
    dialysis_machines_free: req.body.dialysisUnits !== undefined ? req.body.dialysisUnits : (req.body.dialysis_machines_free || 0),
    active_operation_theatres: req.body.operationTheatres !== undefined ? req.body.operationTheatres : (req.body.active_operation_theatres || 0),
    opd_doctor_records: Array.isArray(req.body.opdDoctorRecords) ? req.body.opdDoctorRecords : [],
    remarks: req.body.remarks || '',
    reporting_officer_name: reportingOfficerName,
  };

  const savedReport = await DailyUpdateModel.createReport(payload);

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        savedReport,
        'Daily update report submitted successfully'
      )
    );
});

export default {
  getDailyUpdates,
  submitDailyUpdate,
};
