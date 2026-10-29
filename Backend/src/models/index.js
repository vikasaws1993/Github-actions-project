// Core User & Role Models
export { UserModel, default as User } from './user.model.js';
export { AdminModel, default as Admin } from './admin.model.js';
export { CitizenModel, default as Citizen } from './citizen.model.js';
export { ArogyaSevakModel, default as ArogyaSevak } from './arogyaSevak.model.js';
export { DoctorMasterModel, DoctorModel, default as Doctor } from './doctor.model.js';
export { RefreshTokenModel, default as RefreshToken } from './refreshToken.model.js';

// Geographical Models
export { DistrictModel, default as District } from './district.model.js';
export { TalukaModel, default as Taluka } from './taluka.model.js';

// Healthcare Scheme & Claims Models
export { SchemeModel, default as Scheme } from './scheme.model.js';
export { SchemeAssessmentModel, default as SchemeAssessment } from './schemeAssessment.model.js';
export { SchemeClaimModel, default as SchemeClaim } from './schemeClaim.model.js';
export { PackageMasterModel, default as PackageMaster } from './packageMaster.model.js';

// Application & Workflow Models
export { ApplicationModel, default as Application } from './application.model.js';
export { ApplicationAssignmentModel, default as ApplicationAssignment } from './applicationAssignment.model.js';
export { ApplicationDocumentModel, default as ApplicationDocument } from './applicationDocument.model.js';
export { ApplicationRemarkModel, default as ApplicationRemark } from './applicationRemark.model.js';
export { ApplicationStatusHistoryModel, default as ApplicationStatusHistory } from './applicationStatusHistory.model.js';
export { CaseEscalationModel, default as CaseEscalation } from './caseEscalation.model.js';
export { DocumentTypeModel, default as DocumentType } from './documentType.model.js';

// Patient & Medical Records Models
export { PatientModel, default as Patient } from './patient.model.js';
export { MedicalRecordModel, default as MedicalRecord } from './medicalRecord.model.js';
export { OpdVisitModel, default as OpdVisit } from './opdVisit.model.js';
export { IpdAdmissionModel, default as IpdAdmission } from './ipdAdmission.model.js';
export { IpdStatusUpdateModel, default as IpdStatusUpdate } from './ipdStatusUpdate.model.js';
export { PatientBillModel, default as PatientBill } from './patientBill.model.js';

// Hospital & Infrastructure Models
export { HospitalModel, default as Hospital } from './hospital.model.js';
export { HospitalSchemeModel, default as HospitalScheme } from './hospitalScheme.model.js';
export { HospitalSevakAssignmentModel, default as HospitalSevakAssignment } from './hospitalSevakAssignment.model.js';
export { BackupSevakAssignmentModel, default as BackupSevakAssignment } from './backupSevakAssignment.model.js';
export { HospitalFacilitySurveyModel, default as HospitalFacilitySurvey } from './hospitalFacilitySurvey.model.js';
export { DailyUpdateModel, default as DailyUpdate } from './dailyUpdate.model.js';

// Archival & Audit Logging Models
export { AuditLogModel, default as AuditLog } from './auditLog.model.js';
export { CaseArchiveModel, default as CaseArchive } from './caseArchive.model.js';

// Referrals & Attribution Models
export { ReferralModel, default as Referral } from './referral.model.js';

// Leadership & Welfare Patron Models
export { LeadershipModel, default as Leadership } from './leadership.model.js';

// Notifications & Alerts Models
export { NotificationModel, default as Notification } from './notification.model.js';


