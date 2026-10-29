export interface HealthRecord {
  id: string;
  title: string;
  doctorName: string;
  facilityName: string;
  date: string;
  category: 'Prescription' | 'Lab Report' | 'Vaccine' | 'Discharge Summary';
  fileUrl?: string;
  status: 'Verified' | 'Pending';
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  facility: string;
  date: string;
  timeSlot: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  type: 'In-Person' | 'Tele-Consultation';
}

export interface HealthScheme {
  id: string;
  name: string;
  nameHindi: string;
  coverage: string;
  eligibility: string;
  status: 'Enrolled' | 'Eligible' | 'Applied';
  schemeNumber?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'Self' | 'Spouse' | 'Child' | 'Parent';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  abhaId?: string;
}

export interface CitizenVitals {
  bloodPressure: string;
  heartRate: number;
  bloodGroup: string;
  weightKg: number;
  lastUpdated: string;
}
