import { LocalizedString } from '../../shared/types/i18n.types';

export type DoctorType = 'OPD' | 'IPD' | 'Both';

export type DoctorShift = 'Morning' | 'Afternoon' | 'Evening' | 'Full Day' | 'Custom';

export type DoctorAvailabilityStatus =
  | 'Available'
  | 'On Leave'
  | 'In Surgery'
  | 'Emergency Duty'
  | 'Unavailable';

export interface DoctorPersonalAddress {
  villageCity: string;
  taluka: string;
  district: string;
  pincode?: string; // Optional
}

export interface HospitalDoctor {
  id: string;
  hospitalId: string;
  name: string;
  qualification: string;
  specialization: string;
  specializationCode?: string;
  specializationNames?: LocalizedString;
  doctorType: DoctorType; // 'OPD' | 'IPD' | 'Both'
  opdShift?: DoctorShift;
  opdTiming?: string; // e.g. "8:00 AM - 12:00 PM"
  availabilityStatus: DoctorAvailabilityStatus;
  contactPhone?: string;
  personalAddress: DoctorPersonalAddress;
  isActive: boolean; // false when deactivated (no longer part of the hospital)
  deactivationReason?: string;
  joinedDate?: string;
  lastUpdated?: string;
}

export interface DoctorStats {
  total: number;
  active: number;
  availableNow: number;
  opdCount: number;
  ipdCount: number;
  onLeave: number;
  deactivated: number;
}
