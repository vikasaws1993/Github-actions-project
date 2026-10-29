import { LocalizedString } from '../../shared/types/i18n.types';

export interface AdditionalHospitalFacility {
  id: string;
  name: string;
  names?: LocalizedString;
  isAvailable: boolean | null;
  count?: number | string;
  about?: string;
}

export interface HospitalCapacityData {
  ipd: {
    noOfWards: string | number;
    generalBeds: string | number;
    icuUnits: string | number;
    nicuBeds: string | number;
    picuBeds: string | number;
    isolationBeds: string | number;
  };
  diagnosis: {
    xray?: { available: 'Yes' | 'No'; count: string | number };
    mri?: { available: 'Yes' | 'No'; count: string | number };
    ultrasound?: { available: 'Yes' | 'No'; count: string | number };
    ctScan?: { available: 'Yes' | 'No'; count: string | number };
    ecg?: { available: 'Yes' | 'No'; count: string | number };
    endoscopy?: { available: 'Yes' | 'No'; count: string | number };
    [key: string]: { available: 'Yes' | 'No'; count: string | number } | undefined;
  };
  operative: {
    operationTheatresAvailable?: boolean;
    operationTheatres?: string | number;
    recoveryBedsAvailable?: boolean;
    recoveryBeds?: string | number;
    dialysisUnitsAvailable?: boolean;
    dialysisUnits?: string | number;
    [key: string]: any;
  };
  emergency: {
    emergencyBedsAvailable?: boolean;
    emergencyBeds?: string | number;
    ambulancesAvailable?: boolean;
    ambulances?: string | number;
    [key: string]: any;
  };
  bloodBank: {
    bloodGroups: {
      'A+'?: boolean;
      'A-'?: boolean;
      'B+'?: boolean;
      'B-'?: boolean;
      'AB+'?: boolean;
      'AB-'?: boolean;
      'O+'?: boolean;
      'O-'?: boolean;
      [key: string]: boolean | undefined;
    };
  };
}

export interface HospitalDoctor {
  id: string;
  name: string;
  speciality: string;
  qualification: string;
  experience?: string;
  dutyType: 'Shift' | 'On-Call';
  startTime?: string;
  startPeriod?: 'AM' | 'PM';
  endTime?: string;
  endPeriod?: 'AM' | 'PM';
  workingDays?: string[];
  availability?: string;
  location?: string;
  mobile: string;
  altMobile?: string;
  address?: string;
  city?: string;
  district?: string;
  taluka?: string;
  pincode?: string;
  nearestLandmark?: string;
  status?: 'Active' | 'Inactive';
}

export interface HospitalResourceCount {
  totalDoctors: string | number;
  nursingStaff: string | number;
  paramedicalStaff: string | number;
  supportStaff: string | number;
}

export interface HospitalFacilityProfile {
  id: string;
  assignedHospitalId: string;
  hospitalCode?: string;
  hospitalName: string;
  names?: LocalizedString;
  hospitalType: 'Government / Public' | 'Private / Trust' | 'Private Multi-Specialty' | 'Charitable Trust' | 'Semi-Government' | 'Charitable' | string;
  fullAddress: string;
  streetAddress?: string;
  city?: string;
  district?: string;
  taluka?: string;
  pincode?: string;
  landmark?: string;
  contactHelpline: string;
  is24x7EmergencyAvailable: boolean | null;
  isAmbulanceAvailable: boolean | null;

  // Step 2: Capacity Structure
  capacity?: HospitalCapacityData;

  // Step 3: Specialities (Clinical Specialities IDs e.g. burns, cardio, gen_med)
  selectedSpecialities?: string[];
  specializations: string[];
  additionalSpecialities?: AdditionalHospitalFacility[];

  // Step 4: Packages (Selected Scheme Package Codes / IDs)
  selectedPackages?: string[];

  // Step 5: Doctors Roster
  doctorsList?: HospitalDoctor[];

  // Step 6: Resource & Workforce Count
  resourceCount?: HospitalResourceCount;

  // Step 3 (Legacy): Important Treatment / Operations (Surgical Capability)
  operations: {
    majorSurgery: boolean | null;
    emergencySurgery: boolean | null;
    cSection: boolean | null;
    fractureOrthoSurgery: boolean | null;
    brainNeurosurgery: boolean | null;
    heartSurgery: boolean | null;
    angioplasty: boolean | null;
    cancerTreatment: boolean | null;
    dialysisUnit: boolean | null;
    otherMajorProcedures: boolean | null;
  };

  // Step 4 (Legacy): Bed Availability (Ward Capacity)
  bedAvailability: {
    totalHospitalBeds: number;
    availableHospitalBeds: number;
    totalIcuBeds: number;
    availableIcuBeds: number;
    totalEmergencyBeds: number;
    availableEmergencyBeds: number;
  };

  // Step 5 (Legacy): Critical Resources (Equipment & Life Support)
  criticalResources: {
    icuUnit: { available: boolean | null; total: number };
    ventilators: { available: boolean | null; total: number };
    oxygenBeds: { available: boolean | null; total: number };
    dialysisMachines: { available: boolean | null; total: number };
    operationTheatres: { available: boolean | null; total: number };
    bloodBank: { available: boolean | null; total: number };
    ctScan: { available: boolean | null; total: number };
    mriMachine: { available: boolean | null; total: number };
    xRayUnit: { available: boolean | null; total: number };
    ultrasound: { available: boolean | null; total: number };
  };

  // Step 6 (Legacy): Emergency Capability (Trauma Readiness)
  emergencyCapability: {
    handleCriticalPatients: boolean | null;
    performEmergencySurgery: boolean | null;
    icuSupport24x7: boolean | null;
    ventilatorSupport: boolean | null;
    emergencyBloodTransfusion: boolean | null;
  };

  // Current Status & Metadata
  currentStatus: {
    operationalStatus: 'Fully Operational' | 'Normal Capacity' | 'High Occupancy' | 'Emergency Divert Only';
    acceptingNewPatients?: boolean | null;
    emergencyLoad?: 'Low (Manageable)' | 'Medium (Steady Flow)' | 'High (Near Capacity)' | 'Critical (Emergency Divert)' | string;
    serviceUnavailable?: boolean | null;
    verifiedBySevak: boolean;
    sevakRemarks: string;
    lastUpdated: string;
  };
}

export type TreatmentStatus =
  | 'Admitted'
  | 'Diagnostic Stage'
  | 'Under Treatment'
  | 'Surgery Scheduled'
  | 'Post-Op Recovery'
  | 'On Hold'
  | 'Discharged'
  | 'Completed'
  | 'Transferred';

export interface AdminPriorityNote {
  id: string;
  text: string;
  adminName: string;
  designation: string;
  date: string;
  level: 'CRITICAL' | 'URGENT' | 'HIGH';
  badge?: string;
  badge_en?: string;
  badge_hi?: string;
  isReassigned?: boolean;
}

export interface RequestedDocument {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  status: 'pending' | 'uploaded' | 'verified';
  uploadedDoc?: {
    name: string;
    uri: string;
    size: string;
    timestamp: string;
    type: string;
    note?: string;
  };
}

export interface AdditionalMedicalDocument {
  id: string;
  title: string;
  name: string;
  uri: string;
  size: string;
  timestamp: string;
  type: string;
  note?: string;
}

export interface TreatmentTimelineItem {
  id: string;
  status: TreatmentStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
}

export type ClinicalCondition =
  | 'Stable'
  | 'Improving'
  | 'Under Observation'
  | 'Critical'
  | 'Guarded'
  | 'Discharge Ready';

export type SchemePreAuthStatus =
  | 'Pending'
  | 'Pre-Auth Approved'
  | 'Query Raised'
  | 'Enhancement Needed'
  | 'Claim Settled';

export interface WardRoundNote {
  id: string;
  timestamp: string;
  doctorAdvice?: string;
  nursingObservations?: string;
  vitalsSummary?: string;
  sevakRemarks: string;
  updatedBy: string;
}

export type EscalationType = 'BILL_EXCEEDED' | 'SPECIALTY_UNAVAILABLE';
export type EscalationStatus = 'PENDING_ADMIN_REVIEW' | 'ADMIN_RESOLVED';

export interface CaseAdminEscalation {
  id: string;
  caseId: string;
  type: EscalationType;
  title: string;
  approxBillAmount?: string;
  requiredSpecialty?: string;
  sevakNote: string;
  supportiveDoc?: {
    name: string;
    uri: string;
    size: string;
    timestamp: string;
    type: string;
  };
  holdCase: boolean;
  status: EscalationStatus;
  submittedAt: string;
  submittedBy: string;
  adminResponse?: {
    resolvedAt: string;
    adminName: string;
    designation: string;
    decision: 'APPROVE_ENHANCEMENT' | 'TRANSFER_AUTHORIZED' | 'CONTINUE' | 'CLOSE';
    note: string;
  };
}

export interface AllocatedPatientCase {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactPhone: string;
  relativeName?: string;
  relativePhone?: string;
  relativeRelation?: string;
  abhaId: string;
  schemeName: 'MJPJAY' | 'PM-JAY' | 'RSBY' | 'ESIC';
  hospitalName: string;
  assignedWard: string;
  bedNumber: string;
  admissionDate: string;
  diagnosis: string;
  treatingDoctor: string;
  treatmentStatus: TreatmentStatus;
  priorityNote?: AdminPriorityNote;
  isReassigned?: boolean;
  reassignedBadge?: string;
  transferredFromHospital?: string;
  previousSevak?: {
    name: string;
    phone?: string;
    hospital?: string;
  };
  transferReason?: string;
  isTransferredOut?: boolean;
  patientMovedStatus?: 'PENDING_DISPATCH' | 'MOVED';
  patientMovedAt?: string;
  patientAdmittedStatus?: 'PENDING_ADMISSION' | 'ADMITTED';
  patientAdmittedAt?: string;
  assignedToNewHospital?: string;
  assignedToNewSevak?: {
    name: string;
    phone?: string;
    hospital?: string;
  };
  requestedDocuments: RequestedDocument[];
  additionalMedicalDocs: AdditionalMedicalDocument[];
  treatmentHistory: TreatmentTimelineItem[];
  clinicalCondition?: ClinicalCondition;
  schemePreAuthStatus?: SchemePreAuthStatus;
  lastWardRound?: WardRoundNote;
  plannedDischargeDate?: string;
  activeEscalation?: CaseAdminEscalation;
  escalationHistory?: CaseAdminEscalation[];
}

