import { apiClient, ApiResponse } from './client';
import { LocalizedString } from '../shared/types/i18n.types';

export interface SchemeItem {
  id: string;
  code?: string;
  name: string;
  names?: LocalizedString;
  subtitle?: string;
  subtitles?: LocalizedString;
  category?: string;
  coverageAmount?: string;
  coverage_amount_text?: string;
  maxCoverageVal?: number;
  maximum_coverage_amount?: number;
  description?: string;
  descriptions?: LocalizedString;
  eligibility?: string;
  eligibility_description?: string;
  hotline?: string;
  status?: string;
  is_active?: boolean;
}

export const schemeApi = {
  /**
   * Fetch all Healthcare Schemes (/api/schemes)
   */
  async getSchemes(): Promise<ApiResponse<{ schemes: SchemeItem[]; total: number }>> {
    return apiClient.get('/schemes');
  },

  /**
   * Fetch single Scheme details by ID (/api/schemes/:id)
   */
  async getSchemeById(id: string): Promise<ApiResponse<SchemeItem>> {
    return apiClient.get(`/schemes/${id}`);
  },
};
