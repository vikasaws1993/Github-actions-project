export type SevakTabParamList = {
  Dashboard: undefined;
  AllocatedPatients: undefined;
  UrgentRequests: undefined;
  CaseDocuments: undefined;
  Profile: undefined;
};


export type SevakStackParamList = {
  SevakTabs: undefined;
  BeneficiaryDetails: { beneficiaryId: string };
  RecordSurvey: { householdId?: string };
  OfflineSync: undefined;
  PatientCaseDetails: {
    caseId: string;
    patient?: any;
    caseData?: any;
    requestedDocName?: string;
  };
  HospitalSurvey: { initialStep?: number } | undefined;
  HospitalProfile: undefined;
  UrgentRequests: undefined;
  DailyHospitalUpdate: { initialShift?: 'morning' | 'evening' } | undefined;
  OpdVisits:
    | {
        preselectedCaseId?: string;
        initialVisitType?:
          | 'New Consultation'
          | 'Follow-Up'
          | 'Scheme Verification'
          | 'Diagnostic / Lab Test'
          | 'Emergency Triage';
        autoOpenModal?: boolean;
      }
    | undefined;
  DoctorManagement: undefined;
  SevakNotifications: undefined;
  CaseSearch?: undefined;
};

