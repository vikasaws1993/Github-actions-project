export interface UploadedDoc {
  id: string;
  name: string;
  size: string;
  source: 'camera' | 'device';
  timestamp: string;
  category: 'aadhaar' | 'ration' | 'medical' | 'income' | 'referral' | 'other';
  uri?: string;
  file_url?: string;
  type?: string;
  uploading?: boolean;
  verified?: boolean;
  document_status?: string;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'UNDER_REVIEW'
  | 'DOCS_VERIFIED'
  | 'REVERTED'
  | 'DOCS_REQUIRED'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'COORDINATED'
  | 'SEVAK_ASSIGNED'
  | 'HOSPITAL_ASSIGNED'
  | 'TREATMENT_STARTED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'CLOSED_EXPIRED'
  | 'COMPLETED'
  | 'CLOSED';

export type ApplicationPriority = 'emergency' | 'regular' | 'EMERGENCY' | 'REGULAR' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'critical' | 'high' | 'medium' | 'low';

export interface ApplicationTimelineStep {
  id: string;
  title: string;
  titleKey?: string;
  description: string;
  date?: string;
  time?: string;
  status?: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'ALERT';
  completed?: boolean;
  current?: boolean;
  by?: string;
}

export interface RevertDetails {
  requestedDocName: string;
  requestedDocType?: 'ration' | 'aadhaar' | 'income' | 'medical' | 'referral' | 'other' | string;
  reason: string;
  requestedDate?: string;
  isResolved?: boolean;
  resubmittedDoc?: UploadedDoc;
  resubmittedDocId?: string;
  resubmittedDocName?: string;
  resubmittedRemark?: string;
  resubmittedDate?: string;
}

export interface SchemeApplication {
  id: string; // e.g. "AA-2026-00001" or "AM-2026-78241"
  caseId?: string;
  applicationNumber?: string;
  uuid?: string;
  schemeId: string; // 'pmjay' | 'mjpjay' | 'cm_relief_fund' | 'other' | 'unknown'
  schemeName: string;
  suggestedScheme?: {
    id?: string;
    name?: string;
    code?: string;
    maxCoverage?: number | null;
  } | null;
  assignedScheme?: {
    id?: string;
    name?: string;
    code?: string;
    maxCoverage?: number | null;
  } | null;
  isSchemeAssignedByAdmin?: boolean;
  applyingFor?: 'self' | 'relative' | string;
  priority?: ApplicationPriority;
  abhaNumber?: string;
  pmjayCardNumber?: string;
  patientName: string;
  patientPhone?: string;
  age: string | number;
  gender: 'male' | 'female' | 'other' | string;
  contactMobile: string;
  address: string; // full address
  villageCity?: string;
  taluka?: string;
  district?: string;
  pincode?: string;
  relativeName?: string;
  relativePhone?: string;
  relativeRelation?: string;
  treatmentType: 'opd' | 'ipd' | string;
  hospitalName?: string;
  hospitalId?: string;
  hospitalAddress?: string;
  hospitalCity?: string;
  hospitalDistrict?: string;
  hospitalPhone?: string;
  admissionDate?: string;
  visitDate?: string;
  preferredAdmissionDate?: string;
  referralFullName?: string;
  referralType?: string;
  referralCustomType?: string;
  referralFirstName?: string;
  referralLastName?: string;
  referredBy?: string;
  medicalCauseNote?: string;
  appliedDate: string;
  status: ApplicationStatus;
  sanctionedAmount?: string;
  rawSanctionedAmount?: number | null;
  assignedSevak?: {
    name: string;
    phone: string;
    role?: string;
  };
  timeline: ApplicationTimelineStep[];
  documents: UploadedDoc[];
  revertDetails?: RevertDetails;
  remarks?: string;
  adminRemarks?: string;
  rejectionReason?: string;
  rejectedDate?: string;
  reopenWindow?: {
    daysRemaining: number;
    daysElapsed: number;
    isReopenable: boolean;
    isExpired: boolean;
    rejectedDate?: string;
    reopenRequested?: boolean;
    reopenRequestedAt?: string;
    reopenRequestReason?: string;
  };
  reopenRequested?: boolean;
  reopenRequestedAt?: string;
  reopenRequestReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}
