import api from './api';

const STORAGE_KEY = 'arogyamitra_schemes_cache';
let _cachedSchemes = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
})();
let _inFlightSchemesPromise = null;

export const schemeService = {
  getCachedSchemes: () => _cachedSchemes || [],

  /**
   * Fetch all schemes from backend API
   */
  fetchSchemes: async (params = {}) => {
    if (!params.search && _inFlightSchemesPromise) {
      return _inFlightSchemesPromise;
    }

    const fetchPromise = (async () => {
      try {
        const res = await api.get('/schemes', { params });
        const list = res?.data?.schemes || (Array.isArray(res?.data) ? res.data : null);
        if (list && Array.isArray(list)) {
          if (!params.search) {
            _cachedSchemes = list;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            } catch (e) {}
          }
          return { success: true, data: list };
        }
      } catch (err) {
        console.warn('[SchemeService] Backend fetch fallback:', err.message);
      } finally {
        if (!params.search) {
          _inFlightSchemesPromise = null;
        }
      }
      return { success: _cachedSchemes ? true : false, data: _cachedSchemes || [] };
    })();

    if (!params.search) {
      _inFlightSchemesPromise = fetchPromise;
    }

    return fetchPromise;
  },

  /**
   * Register a new Healthcare Scheme via API
   * @param {Object} formData
   */
  createScheme: async (formData) => {
    const payload = {
      code: formData.code?.trim().toUpperCase(),
      scheme_code: formData.code?.trim().toUpperCase(),
      name: formData.name?.trim(),
      category: formData.category || 'State Flagship Scheme',
      coverageAmount: formData.coverageAmount?.trim() || '₹1,50,000 / family / year',
      coverage_amount_text: formData.coverageAmount?.trim() || '₹1,50,000 / family / year',
      maxCoverageVal: Number(formData.maxCoverageVal) || 150000,
      maximum_coverage_amount: Number(formData.maxCoverageVal) || 150000,
      description: formData.description?.trim() || 'Healthcare assistance scheme for eligible citizens.',
      eligibility: formData.eligibility?.trim() || 'Empanelled card holders and eligible citizens.',
      eligibility_description: formData.eligibility?.trim() || 'Empanelled card holders and eligible citizens.',
      hotline: formData.hotline?.trim() || '1800-111-222',
      requiredDocuments: formData.requiredDocuments || [
        'Aadhaar Card',
        'Ration Card (Orange / Yellow / Antyodaya)',
        'Doctor Consultation / Referral Note',
      ],
      required_documents: formData.requiredDocuments || [
        'Aadhaar Card',
        'Ration Card (Orange / Yellow / Antyodaya)',
        'Doctor Consultation / Referral Note',
      ],
      status: formData.status || 'Active',
      is_active: formData.status !== 'Inactive',
    };

    try {
      const res = await api.post('/schemes', payload);
      if (res?.data) {
        return { success: true, data: res.data };
      }
    } catch (err) {
      console.warn('[SchemeService] Backend creation error:', err.message);
      throw err;
    }

    return {
      success: true,
      data: {
        id: `SCHEME-${Date.now()}`,
        ...payload,
      },
    };
  },

  /**
   * Update scheme
   */
  updateScheme: async (id, updateData) => {
    try {
      const res = await api.put(`/schemes/${id}`, updateData);
      if (res?.data) {
        return { success: true, data: res.data };
      }
    } catch (err) {
      console.warn('[SchemeService] Backend update fallback:', err.message);
    }
    return { success: true, data: updateData };
  },

  /**
   * Toggle scheme active status
   */
  toggleSchemeStatus: async (id) => {
    try {
      const res = await api.patch(`/schemes/${id}/status`);
      if (res?.data) {
        return { success: true, data: res.data };
      }
    } catch (err) {
      console.warn('[SchemeService] Backend toggle status fallback:', err.message);
    }
    return { success: true };
  },

  /**
   * Delete scheme
   */
  deleteScheme: async (id) => {
    try {
      await api.delete(`/schemes/${id}`);
      return { success: true };
    } catch (err) {
      console.warn('[SchemeService] Backend delete fallback:', err.message);
      return { success: true };
    }
  },
};

export default schemeService;
