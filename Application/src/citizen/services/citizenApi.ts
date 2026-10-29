import {
  HealthRecord,
  Appointment,
  HealthScheme,
  FamilyMember,
  CitizenVitals,
} from '../types/citizen.types';
import { apiClient } from '../../api/client';
import { APP_CONFIG } from '../../shared/constants/config';

export const citizenApi = {
  async getVitals(): Promise<CitizenVitals | null> {
    try {
      const res = await apiClient.get('/citizens/vitals');
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (_) {}
    return null;
  },

  async getHealthRecords(): Promise<HealthRecord[]> {
    try {
      const res = await apiClient.get('/citizens/records');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  async getAppointments(): Promise<Appointment[]> {
    try {
      const res = await apiClient.get('/citizens/appointments');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },

  async getSchemes(): Promise<HealthScheme[]> {
    try {
      const res = await fetch(`${APP_CONFIG.API_BASE_URL}/schemes`);
      const json = await res.json();
      const rawSchemes = json?.data?.schemes || json?.schemes || json?.data || [];
      if (Array.isArray(rawSchemes) && rawSchemes.length > 0) {
        return rawSchemes.map((s: any) => ({
          id: s.id,
          name: s.name,
          nameHindi: s.name,
          coverage: s.coverageAmount || s.coverage_amount_text || (s.maxCoverageVal ? `₹${s.maxCoverageVal.toLocaleString('en-IN')}` : '₹5,00,000 per family/year'),
          eligibility: s.eligibility || s.eligibility_description || 'Eligible Maharashtrian Citizens',
          status: s.status || 'Active',
          schemeNumber: s.code || s.scheme_code,
        }));
      }
    } catch (err) {
      console.warn('[citizenApi] Fetch schemes error:', err);
    }
    return [];
  },

  async getFamilyMembers(): Promise<FamilyMember[]> {
    try {
      const res = await apiClient.get('/citizens/family');
      if (res?.success && Array.isArray(res?.data)) {
        return res.data;
      }
    } catch (_) {}
    return [];
  },
};
