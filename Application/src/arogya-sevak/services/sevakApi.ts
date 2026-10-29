import { apiClient } from '../../api/client';
import {
  Beneficiary,
  VaccineSchedule,
  FieldVisit,
  MedicineStock,
  SevakDashboardStats,
} from '../types/sevak.types';

export const sevakApi = {
  async getDashboardStats(): Promise<SevakDashboardStats> {
    try {
      const res = await apiClient.get('/arogya-sevaks/dashboard-stats');
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (_) {}
    return {
      todaySurveysCompleted: 0,
      todaySurveyTarget: 0,
      highRiskBeneficiariesCount: 0,
      pendingVaccinesCount: 0,
      offlineQueueCount: 0,
      assignedWard: '',
    };
  },

  async getBeneficiaries(): Promise<Beneficiary[]> {
    try {
      const res = await apiClient.get('/arogya-sevaks/beneficiaries');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  async getVaccineSchedules(): Promise<VaccineSchedule[]> {
    try {
      const res = await apiClient.get('/arogya-sevaks/vaccines');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  async getFieldVisits(): Promise<FieldVisit[]> {
    try {
      const res = await apiClient.get('/arogya-sevaks/visits');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  async getMedicineStock(): Promise<MedicineStock[]> {
    try {
      const res = await apiClient.get('/arogya-sevaks/stocks');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  /**
   * Fetch authenticated Arogya Sevak profile from backend
   */
  async getProfile(): Promise<any> {
    try {
      const res = await apiClient.get('/arogya-sevaks/me');
      if (res?.success && res?.data) {
        return res.data;
      }
      return null;
    } catch (e) {
      console.warn('[sevakApi] Failed to fetch profile from /api/arogya-sevaks/me:', e);
      return null;
    }
  },

  /**
   * Update Arogya Sevak profile on backend
   */
  async updateProfile(data: Record<string, any>): Promise<any> {
    try {
      const res = await apiClient.put('/arogya-sevaks/me', data);
      return res;
    } catch (e) {
      console.warn('[sevakApi] Failed to update profile via /api/arogya-sevaks/me:', e);
      throw e;
    }
  },
};
