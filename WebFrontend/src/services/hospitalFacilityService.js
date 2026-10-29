import api from './api';

export const hospitalFacilityService = {
  /**
   * 1) GET Hospital Facilities & Infrastructure Info
   * Retrieves assigned hospital details & existing facility survey
   */
  async getHospitalFacilities(hospitalId) {
    const endpoint = hospitalId
      ? `/hospital-facilities?hospitalId=${encodeURIComponent(hospitalId)}`
      : '/hospital-facilities';
    return api.get(endpoint);
  },

  /**
   * 2) POST Hospital Facilities & Infrastructure Info
   * Saves or updates (upserts) the 7-section facility survey data
   */
  async saveHospitalFacilities(surveyData) {
    return api.post('/hospital-facilities', surveyData);
  },
};

export default hospitalFacilityService;
