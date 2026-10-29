export interface Beneficiary {
  id: string;
  name: string;
  nameHindi?: string;
  householdId: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  category: 'Pregnant Woman (ANC)' | 'Lactating Mother (PNC)' | 'Infant (0-1y)' | 'Child (1-5y)' | 'General Citizen';
  riskLevel: 'Normal' | 'Moderate' | 'High Risk';
  phone: string;
  address: string;
  ward: string;
  abhaId?: string;
  lastSurveyDate: string;
}

export interface VaccineSchedule {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCategory: string;
  vaccineName: string;
  dueDate: string;
  status: 'Due' | 'Overdue' | 'Administered';
  doseNumber: string;
}

export interface FieldVisit {
  id: string;
  beneficiaryName: string;
  address: string;
  visitType: 'ANC Checkup' | 'Newborn Care' | 'TB Follow-up' | 'NCD Survey' | 'Immunization';
  scheduledTime: string;
  priority: 'High' | 'Normal';
  status: 'Pending' | 'Completed' | 'Missed';
}

export interface MedicineStock {
  id: string;
  medicineName: string;
  category: 'Iron Folic Acid' | 'ORS & Zinc' | 'Paracetamol' | 'Antibiotic' | 'Contraceptive';
  quantityInKit: number;
  unit: string;
  status: 'Adequate' | 'Low Stock' | 'Critical';
}

export interface SyncItem {
  id: string;
  type: 'BENEFICIARY_REGISTRATION' | 'VACCINE_ADMINISTERED' | 'VISIT_RECORDED';
  timestamp: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface SevakDashboardStats {
  todaySurveysCompleted: number;
  todaySurveyTarget: number;
  highRiskBeneficiariesCount: number;
  pendingVaccinesCount: number;
  offlineQueueCount: number;
  assignedWard: string;
}
