import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ApplicationModel } from '../models/application.model.js';
import { ApplicationAssignmentModel } from '../models/applicationAssignment.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { PatientModel } from '../models/patient.model.js';
import { formatApplicationResponse } from '../services/application.service.js';

import { applicationService } from '../services/application.service.js';

let inMemoryPatients = [];

/**
 * GET /api/patients/assigned or /api/arogya-sevaks/patients
 * Retrieve all patients assigned to Arogya Sevak from Admin
 */
export const getAssignedPatients = asyncHandler(async (req, res) => {
  const sevakUserIdOrId = req.user?.sevakId || req.user?.id || req.query.sevakId;
  const { category, status, search } = req.query;

  let dbApplications = [];
  try {
    if (sevakUserIdOrId) {
      dbApplications = await applicationService.getSevakAssignedApplications(sevakUserIdOrId, { status });
    } else {
      const all = await ApplicationModel.findAll({ limit: 50 });
      if (all?.applications) {
        dbApplications = all.applications.map(formatApplicationResponse);
      }
    }
  } catch (err) {
    console.warn('[patient.controller] DB application query notice:', err.message);
  }

  let allPatients = [];

  if (dbApplications.length > 0) {
    dbApplications.forEach((app) => {
      const existingIdx = allPatients.findIndex(
        (p) => p.id === app.id || p.id === app.applicationNumber || p.id === app.uuid
      );
      const isTransferredOut = Boolean(app.isTransferredOut);
      const mapped = {
        ...app,
        id: app.id || app.applicationNumber,
        caseId: app.id || app.applicationNumber,
        name: app.patientName || app.patient?.name || 'Assigned Patient',
        patientName: app.patientName || app.patient?.name || 'Assigned Patient',
        age: app.patient?.age || app.age || 35,
        gender: app.patient?.gender || app.gender || 'Male',
        mobile: app.patient?.mobile || app.contact || '+91 98230 45612',
        phone: app.patient?.mobile || app.contact || '+91 98230 45612',
        hospital: app.hospital || app.assignedHospital || 'City Care Hospital, Pune',
        assignedHospital: app.hospital || app.assignedHospital || 'City Care Hospital, Pune',
        scheme: app.scheme || 'MJPJAY',
        assignedScheme: app.assignedScheme || { name: 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)', code: 'MJPJAY' },
        admittedDateFormatted: app.submittedDate || 'Just now',
        admissionDate: app.admissionDate || app.submittedDate || 'Just now',
        category: isTransferredOut ? 'transferred' : (app.treatmentType === 'SURGERY' || app.status?.includes('SURGERY')) ? 'surgery' : (app.status === 'DISCHARGED' || app.status === 'CLOSED') ? 'discharged' : 'ongoing',
        status: isTransferredOut ? 'TRANSFERRED' : (app.status || 'UNDER TREATMENT'),
        treatmentStatus: isTransferredOut ? 'Transferred' : (app.treatmentStatus || 'Ongoing'),
        statusVariant: isTransferredOut ? 'transferred' : (app.status === 'CLOSED' ? 'completed' : app.status === 'DISCHARGED' ? 'discharged' : 'treatment'),
        isTransferredOut,
        isReassigned: app.isReassigned || false,
        assignedToNewHospital: app.assignedToNewHospital || null,
        assignedToNewSevak: app.assignedToNewSevak || null,
        lastUpdated: 'Just now',
        actionType: 'update',
        ward: app.treatmentType === 'IPD' ? 'General Ward - Bed 05' : 'OPD Room 2',
        diagnosis: app.condition || app.medicalCauseNote || 'General Medical Coordination',
        relativeName: app.relativeName || app.relative?.name || 'Relative',
        relativeRelation: app.relativeRelation || app.relative?.relation || 'Guardian',
        relativePhone: app.relativePhone || app.relative?.phone || '+91 98000 00000',
        emergencyAlternate: '+91 98000 11111',
        residenceDistrict: app.patient?.district || 'Pune',
        doctor: 'Dr. R. Kulkarni',
        vitals: { bp: '120/80', pulse: '78 bpm', spO2: '98%', temp: '98.6 °F' },
        notes: app.remarks || 'Case assigned by Admin.',
        priorityNote: app.priorityNote || ((app.priority === 'CRITICAL' || app.priority === 'HIGH') ? {
          level: app.priority,
          title: `PRIORITY NOTE FROM ADMIN (${app.priority})`,
          text: app.remarks || 'High priority case assigned for immediate hospital assistance.',
        } : null),
      };

      if (existingIdx >= 0) {
        allPatients[existingIdx] = { ...allPatients[existingIdx], ...mapped };
      } else {
        allPatients.unshift(mapped);
      }
    });
  }

  // Filter by category (all, surgery, ongoing, discharged)
  if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all cases') {
    allPatients = allPatients.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
  }

  // Filter by search term
  if (search) {
    const q = search.toLowerCase().trim();
    allPatients = allPatients.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.diagnosis?.toLowerCase().includes(q) ||
        p.ward?.toLowerCase().includes(q)
    );
  }

  // Calculate high-level stats for header badges
  const activeCases = allPatients.filter((p) => p.category !== 'discharged');
  const stats = {
    totalAssigned: allPatients.length,
    inTreatment: activeCases.length,
    surgeryPipeline: allPatients.filter((p) => p.category === 'surgery').length,
    dischargedCases: allPatients.filter((p) => p.category === 'discharged').length,
  };

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        stats,
        patients: allPatients,
        total: allPatients.length,
      },
      'Assigned patients retrieved successfully from Admin'
    )
  );
});

/**
 * GET /api/patients/:id
 * Retrieve specific patient detail by Case ID or UUID
 */
export const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cleanId = String(id).toLowerCase();

  const found = inMemoryPatients.find(
    (p) =>
      p.id.toLowerCase() === cleanId ||
      p.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, '')
  );

  if (found) {
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, found, 'Patient details retrieved successfully'));
  }

  try {
    const app = await ApplicationModel.findById(id);
    if (app) {
      const formatted = formatApplicationResponse(app);
      return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, formatted, 'Patient details retrieved successfully'));
    }
  } catch (_) {}

  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: `Patient with ID '${id}' not found`,
  });
});

/**
 * PATCH /api/patients/:id
 * Update patient status, notes, or vitals
 */
export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = inMemoryPatients.findIndex((p) => p.id.toLowerCase() === id.toLowerCase());

  if (index >= 0) {
    inMemoryPatients[index] = {
      ...inMemoryPatients[index],
      ...updates,
      lastUpdated: 'Just now',
    };
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, inMemoryPatients[index], 'Patient updated successfully'));
  }

  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: `Patient with ID '${id}' not found`,
  });
});

export default {
  getAssignedPatients,
  getPatientById,
  updatePatient,
};
