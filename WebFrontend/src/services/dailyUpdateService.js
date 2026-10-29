import api from './api';

const CACHE_KEY = 'arogyamitra_daily_updates_cache';

export const dailyUpdateService = {
  /**
   * Helper to retrieve cached daily updates from localStorage
   */
  getCachedDailyUpdates() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading daily updates cache:', e);
    }
    return null;
  },

  /**
   * Helper to write daily updates data into localStorage cache
   */
  setCachedDailyUpdates(data) {
    try {
      if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        if (data.stats) {
          localStorage.setItem(
            'arogyamitra_hospital_stats',
            JSON.stringify({
              icuAvailable: data.stats.icuAvailable,
              icuTotal: data.stats.icuTotal,
              generalAvailable: data.stats.generalAvailable,
              generalTotal: data.stats.generalTotal,
              doctorsOnDuty: data.stats.doctorsOnDuty,
              opdAdmissionsToday: data.stats.admissionsMadeToday,
              ventilators: data.stats.ventilatorsAvailable,
              ventilatorsTotal: data.stats.ventilatorsTotal,
              oxygenBeds: data.stats.oxygenBeds,
              dialysisUnits: data.stats.dialysisUnits,
              operationTheatres: data.stats.operationTheatres,
            })
          );
        }
      }
    } catch (e) {
      console.warn('Error saving daily updates cache:', e);
    }
  },

  /**
   * 1) GET Daily Updates & Reports
   * Fetches real-time hospital resource stats, shift details, and report history
   */
  async getDailyUpdates(hospitalId) {
    const endpoint = hospitalId
      ? `/daily-updates?hospitalId=${encodeURIComponent(hospitalId)}`
      : '/daily-updates';
    const res = await api.get(endpoint);
    const data = res?.data;
    if (data) {
      this.setCachedDailyUpdates(data);
    }
    return res;
  },

  /**
   * 2) POST Submit Daily Update Report
   * Persists morning/night shift daily status report to database
   */
  async submitDailyReport(reportData) {
    const res = await api.post('/daily-updates', reportData);
    return res;
  },
};

export default dailyUpdateService;
