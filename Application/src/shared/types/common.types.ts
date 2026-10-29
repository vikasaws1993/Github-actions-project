import { UserRole } from '../constants/roles';

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  abhaId?: string;
  assignedWard?: string;
  badgeNumber?: string;
  avatarUrl?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  address?: string;
  state?: string;
  district?: string;
  taluka?: string;
  pincode?: string;
  email?: string;
  hospitalName?: string;
  phc?: string;
  reportingOfficer?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
}

export interface CitizenRegistrationInput {
  phoneNumber: string;
  name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  address: string;
  state: string;
  district: string;
  taluka: string;
  pincode: string;
  email?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}
