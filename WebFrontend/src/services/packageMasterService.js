import api from './api';

const BASE_URL = '/packages';

export const packageMasterService = {
  /**
   * Get all packages with search and filtering
   */
  async getAllPackages(params = {}) {
    try {
      const response = await api.get(BASE_URL, { params });
      return response?.data || response || [];
    } catch (error) {
      console.warn('[packageMasterService.getAllPackages] API call failed:', error);
      throw error;
    }
  },

  /**
   * Get Key-Value Map of Specialties and their procedures
   */
  async getBySpecialtyMap(params = {}) {
    try {
      const response = await api.get(`${BASE_URL}/by-specialty`, { params });
      return response?.data || response || {};
    } catch (error) {
      console.warn('[packageMasterService.getBySpecialtyMap] API call failed:', error);
      throw error;
    }
  },

  /**
   * Get specialties hierarchy
   */
  async getSpecialtiesHierarchy() {
    try {
      const response = await api.get(`${BASE_URL}/specialties`);
      return response?.data || response || [];
    } catch (error) {
      console.warn('[packageMasterService.getSpecialtiesHierarchy] API call failed:', error);
      throw error;
    }
  },

  /**
   * Get package by ID
   */
  async getPackageById(id) {
    try {
      const response = await api.get(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.getPackageById] API call failed:', error);
      throw error;
    }
  },

  /**
   * Create a package manually
   */
  async createPackage(data) {
    try {
      const response = await api.post(BASE_URL, data);
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.createPackage] API call failed:', error);
      throw error;
    }
  },

  /**
   * Bulk import array of packages
   */
  async bulkImportPackages(packages) {
    try {
      const response = await api.post(`${BASE_URL}/bulk`, { packages });
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.bulkImportPackages] API call failed:', error);
      throw error;
    }
  },

  /**
   * Upload CSV string data
   */
  async uploadCsv(csvData) {
    try {
      const response = await api.post(`${BASE_URL}/upload-csv`, { csvData });
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.uploadCsv] API call failed:', error);
      throw error;
    }
  },

  /**
   * Update package procedure
   */
  async updatePackage(id, data) {
    try {
      const response = await api.put(`${BASE_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.updatePackage] API call failed:', error);
      throw error;
    }
  },

  /**
   * Delete package procedure
   */
  async deletePackage(id) {
    try {
      const response = await api.delete(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.warn('[packageMasterService.deletePackage] API call failed:', error);
      throw error;
    }
  }
};

export default packageMasterService;
