import { apiClient, ApiResponse } from './client';

export interface ApplicationSubmitPayload {
  id?: string;
  caseId?: string;
  schemeId?: string;
  schemeName?: string;
  suggested_scheme_id?: string;
  suggested_scheme_name?: string;
  patientName: string;
  patientPhone?: string;
  contactMobile?: string;
  applyingFor?: string;
  priority?: string;
  abhaNumber?: string;
  pmjayCardNumber?: string;
  age?: number | string;
  gender?: string;
  address?: string;
  villageCity?: string;
  taluka?: string;
  taluka_id?: string;
  talukaId?: string;
  talukaCode?: string;
  district?: string;
  district_id?: string;
  districtId?: string;
  districtCode?: string;
  pincode?: string;
  relativeName?: string;
  relativePhone?: string;
  relativeRelation?: string;
  treatmentType?: string;
  hospitalName?: string;
  hospitalId?: string;
  medicalCauseNote?: string;
  referralName?: string;
  referralFullName?: string;
  referralType?: string;
  referralCustomType?: string;
  referralFirstName?: string;
  referralLastName?: string;
  referredBy?: string;
  documents?: any[];
  remarks?: string;
}

export interface ResubmitDocPayload {
  document: {
    name: string;
    file_url?: string;
    uri?: string;
    size?: string;
    category?: string;
    source?: 'camera' | 'device';
    type?: string;
  };
  citizenRemark?: string;
}

export const applicationApi = {
  /**
   * Submit new scheme application (POST /api/applications)
   */
  async createApplication(data: ApplicationSubmitPayload): Promise<ApiResponse> {
    return apiClient.post('/applications', data);
  },

  /**
   * Get logged-in citizen's scheme applications list (GET /api/applications/my)
   */
  async getMyApplications(params?: { limit?: number; offset?: number }): Promise<ApiResponse> {
    const query = params ? `?limit=${params.limit || 50}&offset=${params.offset || 0}` : '';
    return apiClient.get(`/applications/my${query}`);
  },

  /**
   * Get all scheme applications list (GET /api/applications)
   */
  async getApplications(): Promise<ApiResponse> {
    return apiClient.get('/applications');
  },

  /**
   * Get single application by ID or Case ID (GET /api/applications/:id)
   */
  async getApplicationById(id: string): Promise<ApiResponse> {
    return apiClient.get(`/applications/${id}`);
  },

  /**
   * Resubmit requested document for a reverted application (POST /api/applications/:id/resubmit-doc)
   */
  async resubmitDocument(id: string, payload: ResubmitDocPayload): Promise<ApiResponse> {
    return apiClient.post(`/applications/${id}/resubmit-doc`, payload);
  },

  /**
   * Track application by Case ID / Application Number (GET /api/applications/:caseId)
   */
  async trackApplication(caseId: string): Promise<ApiResponse> {
    return apiClient.get(`/applications/${caseId}`);
  },

  /**
   * Send escalation reminder / notification to Admin when SLA exceeds threshold
   * (POST /api/applications/:id/remind-admin)
   */
  async remindAdmin(id: string, payload?: { message?: string; priority?: string }): Promise<ApiResponse> {
    return apiClient.post(`/applications/${id}/remind-admin`, payload || {});
  },

  /**
   * Citizen request to reopen a rejected application within the 60-day eligibility window
   * (POST /api/applications/:id/request-reopen)
   */
  async requestReopen(id: string, payload?: { reason?: string; remarks?: string }): Promise<ApiResponse> {
    return apiClient.post(`/applications/${id}/request-reopen`, payload || {});
  },

  /**
   * Reopen a rejected application within the 60-day eligibility window (Admin Action)
   * (POST /api/applications/:id/reopen)
   */
  async reopenApplication(id: string, payload?: { reason?: string; remarks?: string }): Promise<ApiResponse> {
    return apiClient.post(`/applications/${id}/reopen`, payload || {});
  },
};
