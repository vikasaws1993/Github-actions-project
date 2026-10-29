export type OpdDepartment =
  | 'General Medicine'
  | 'Cardiology'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Obstetrics & Gynecology'
  | 'General Surgery'
  | 'ENT'
  | 'Ophthalmology'
  | 'Emergency & Trauma';

export type OpdVisitType =
  | 'New Consultation'
  | 'Follow-Up'
  | 'Scheme Verification'
  | 'Diagnostic / Lab Test'
  | 'Emergency Triage';

export type OpdVisitStatus =
  | 'Waiting'
  | 'In Consultation'
  | 'Completed'
  | 'Referred to IPD';

export type OpdSchemeEligibility =
  | 'MJPJAY Eligible'
  | 'PM-JAY Eligible'
  | 'General / Cash'
  | 'Verification Pending';

export type FollowUpStatus = 'PENDING' | 'DONE' | 'NOT_REQUIRED';

export interface OpdPrescriptionDoc {
  id: string;
  name: string;
  uri: string;
  url?: string;
  file_url?: string;
  fileUrl?: string;
  type?: string;
  size?: string;
  source: 'camera' | 'device';
  uploadedAt: string;
}

export interface OpdVisitEntry {
  id: string;
  tokenNumber: string; // e.g. "OPD-101"
  caseId: string; // Allocated case ID from Admin (e.g. "CAS-2026-8912")
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactPhone: string;
  abhaId?: string;
  department: OpdDepartment;
  consultingDoctor?: string; // Optional, empty by default
  visitType: OpdVisitType;
  schemeEligibility: OpdSchemeEligibility;
  chiefComplaint?: string;
  nextFollowUpRequired: boolean; // Yes or No
  nextFollowUpTimeline?: string; // e.g. "In 7 Days", "In 15 Days", "In 1 Month", or date
  followUpStatus: FollowUpStatus;
  followUpResolvedAt?: string;
  followUpResolvedByVisitId?: string;
  entryTime: string; // e.g. "11:45 AM"
  date: string; // YYYY-MM-DD
  timestampFormatted: string; // e.g. "10 Sep 2026, 11:45 AM"
  recordedBy: string;
  prescriptionDoc?: OpdPrescriptionDoc;
}

export interface OpdStats {
  totalVisits: number;
  todayCount: number;
  followUpRequiredCount: number; // Cases needing follow up
  followUpDoneCount: number; // Cases where follow up was completed
}
