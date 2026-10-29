import { apiClient, ApiResponse } from './client';
import { APP_CONFIG } from '../shared/constants/config';
import { CitizenRegistrationInput } from '../shared/types/common.types';

export interface SendOtpPayload {
  mobileNumber: string;
}

export interface VerifyOtpPayload {
  mobileNumber: string;
  otp: string;
}

export const authApi = {
  /**
   * Send 6-digit OTP to mobile number (/api/mob/send-otp)
   */
  async sendOtp(mobileNumber: string): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/send-otp`;
    return apiClient.post(endpoint, { mobileNumber });
  },

  /**
   * Verify 6-digit OTP & resolve login session (/api/mob/verify-otp)
   */
  async verifyOtp(mobileNumber: string, otp: string): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/verify-otp`;
    return apiClient.post(endpoint, { mobileNumber, otp });
  },

  /**
   * Register new Citizen on Mobile App (/api/mob/register)
   */
  async registerCitizen(data: CitizenRegistrationInput): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/register`;
    const payload = {
      phoneNumber: data.phoneNumber,
      mobileNumber: data.phoneNumber,
      name: data.name.trim(),
      full_name: data.name.trim(),
      dob: data.dob.trim(),
      gender: data.gender,
      address: data.address.trim(),
      state: data.state.trim() || 'Maharashtra',
      district: data.district.trim(),
      taluka: data.taluka.trim(),
      pincode: data.pincode.trim(),
      email: data.email?.trim() || undefined,
    };
    return apiClient.post(endpoint, payload);
  },

  /**
   * Mobile User Login (/api/mob/login)
   */
  async login(mobileNumber: string, otp?: string): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/login`;
    return apiClient.post(endpoint, { mobileNumber, otp });
  },

  /**
   * Mobile Auth Initiation Check (/api/mob/initiate)
   */
  async initiateAuth(mobileNumber: string): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/initiate`;
    return apiClient.post(endpoint, { mobileNumber });
  },

  /**
   * Check Session / Get Profile (/api/mob/profile)
   */
  async checkSession(): Promise<ApiResponse> {
    const endpoint = `${APP_CONFIG.MOBILE_API_BASE_URL}/profile`;
    return apiClient.get(endpoint);
  },
};
