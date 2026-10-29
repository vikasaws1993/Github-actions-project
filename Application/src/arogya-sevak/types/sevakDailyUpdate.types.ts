export type ShiftType = 'morning' | 'evening';

export interface OpdDoctorEntry {
  id: string;
  date: string;
  doctorName: string;
  specialty: string;
  opdCount: number;
  session?: string;
  onDuty: boolean;
}

export interface DailyHospitalUpdate {
  id: string;
  hospitalId: string;
  hospitalName: string;
  date: string; // Format: YYYY-MM-DD
  shift: ShiftType;
  submittedAt: string;
  reportingOfficer: string;

  // Inpatient & Bed Availability (Aligned with Hospital Facilities Capacity)
  availableGeneralBeds: number;
  totalGeneralBeds: number;
  availableIcuBeds: number;
  totalIcuBeds: number;
  availableNicuBeds?: number;
  totalNicuBeds?: number;
  availablePicuBeds?: number;
  totalPicuBeds?: number;
  availableIsolationBeds?: number;
  totalIsolationBeds?: number;
  availableWards?: number;
  totalWards?: number;

  admissionsToday: number;
  doctorsOnDuty: number;

  // Critical Resources & Equipment Availability
  ventilatorsAvailable: number;
  oxygenBedsAvailable: number;
  dialysisMachinesFree: number;
  operationTheatresReady: number;

  // OPD Doctor records
  opdDoctorRecords?: OpdDoctorEntry[];

  // Shift Remarks & Ward Handover Notes
  remarks: string;
}

export interface TodayShiftStatus {
  morning: DailyHospitalUpdate | null;
  evening: DailyHospitalUpdate | null;
  activeShift: ShiftType;
}
