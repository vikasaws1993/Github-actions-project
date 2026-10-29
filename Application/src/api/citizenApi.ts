import { apiClient, ApiResponse } from './client';
import { APP_CONFIG } from '../shared/constants/config';

export const citizenApi = {
  /**
   * Get authenticated Citizen Profile (/api/mob/profile)
   */
  async getProfile(): Promise<ApiResponse> {
    return apiClient.get(`${APP_CONFIG.MOBILE_API_BASE_URL}/profile`);
  },

  /**
   * Get Citizen profile by Mobile Number (/api/mob/mobile/:mobile)
   */
  async getByMobile(mobileNumber: string): Promise<ApiResponse> {
    return apiClient.get(`${APP_CONFIG.MOBILE_API_BASE_URL}/mobile/${mobileNumber}`);
  },

  /**
   * Get Citizen profile by UUID (/api/mob/:id)
   */
  async getById(id: string): Promise<ApiResponse> {
    return apiClient.get(`${APP_CONFIG.MOBILE_API_BASE_URL}/${id}`);
  },
};
