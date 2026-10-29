import api from './api';

/**
 * Service to fetch Maharashtra Districts and Talukas from backend API
 */
export const locationService = {
  /**
   * Fetch all active districts
   */
  async getDistricts() {
    try {
      const response = await api.get('/districts');
      if (response?.data?.districts) {
        return response.data.districts;
      }
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch districts:', error);
      return [];
    }
  },

  /**
   * Fetch talukas under a specific district (by code, UUID, or name)
   */
  async getTalukas(districtCodeOrName) {
    if (!districtCodeOrName) return [];
    try {
      const response = await api.get(`/districts/${encodeURIComponent(districtCodeOrName)}/talukas`);
      if (response?.data?.talukas) {
        return response.data.talukas;
      }
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      console.error(`Failed to fetch talukas for ${districtCodeOrName}:`, error);
      return [];
    }
  },
};

export default locationService;
