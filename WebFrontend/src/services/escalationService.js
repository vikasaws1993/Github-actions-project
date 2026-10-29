import api from './api';

const ESCALATIONS_STORAGE_KEY = 'arogyamitra_escalations_cache';
let _cachedEscalations = null;
let _cachedEscalationsTimestamp = 0;
let _inFlightEscalationsPromise = null;
const CACHE_TTL_MS = 20000; // 20s TTL

function getStoredEscalations() {
  try {
    const data = localStorage.getItem(ESCALATIONS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.requests)) return parsed;
    }
  } catch (_) {}
  return { stats: { all: 0, onHold: 0, resolved: 0 }, requests: [] };
}

function saveStoredEscalations(data) {
  _cachedEscalations = data;
  _cachedEscalationsTimestamp = Date.now();
  try {
    localStorage.setItem(ESCALATIONS_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export const escalationService = {
  invalidateCache() {
    _cachedEscalations = null;
    _cachedEscalationsTimestamp = 0;
    _inFlightEscalationsPromise = null;
  },

  getCachedEscalations() {
    if (_cachedEscalations && Array.isArray(_cachedEscalations.requests) && _cachedEscalations.requests.length > 0) {
      return _cachedEscalations;
    }
    return getStoredEscalations();
  },

  /**
   * 1) GET /api/escalations
   * Fetch all urgent priority requests with optional status, reasonType, and search filters
   */
  async getEscalations(filters = {}, options = {}) {
    const forceRefresh = options === true || options?.forceRefresh === true;
    const isFiltered = Boolean((filters.status && filters.status !== 'All') || (filters.reasonType && filters.reasonType !== 'All') || filters.search);

    if (!isFiltered && !forceRefresh && _cachedEscalations && (Date.now() - _cachedEscalationsTimestamp < CACHE_TTL_MS)) {
      return _cachedEscalations;
    }

    if (!isFiltered && _inFlightEscalationsPromise && !forceRefresh) {
      return _inFlightEscalationsPromise;
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'All' && filters.status !== 'all') {
          params.append('status', filters.status);
        }
        if (filters.reasonType && filters.reasonType !== 'All' && filters.reasonType !== 'all') {
          params.append('reasonType', filters.reasonType);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const queryString = params.toString();
        const endpoint = queryString ? `/escalations?${queryString}` : '/escalations';
        const res = await api.get(endpoint);

        if (res?.data) {
          if (!isFiltered) {
            saveStoredEscalations(res.data);
          }
          return res.data;
        }
        return getStoredEscalations();
      } catch (err) {
        console.warn('[escalationService] getEscalations network notice, using local cache:', err.message);
        return getStoredEscalations();
      }
    })().finally(() => {
      if (!isFiltered) {
        _inFlightEscalationsPromise = null;
      }
    });

    if (!isFiltered) {
      _inFlightEscalationsPromise = fetchPromise;
    }

    return fetchPromise;
  },

  /**
   * 2) GET /api/escalations/stats
   * Fetch summary KPI counts (ALL, ON HOLD, RESOLVED, etc.)
   */
  async getStats() {
    try {
      const res = await api.get('/escalations/stats');
      return res?.data || { all: 0, onHold: 0, resolved: 0 };
    } catch (err) {
      console.warn('[escalationService] getStats warning:', err.message);
      return { all: 0, onHold: 0, resolved: 0 };
    }
  },

  /**
   * 3) GET /api/escalations/:id
   * Fetch single urgent request details
   */
  async getEscalationById(id) {
    try {
      const res = await api.get(`/escalations/${encodeURIComponent(id)}`);
      return res?.data || null;
    } catch (err) {
      console.error('[escalationService] getEscalationById error:', err);
      throw err;
    }
  },

  /**
   * 4) POST /api/escalations
   * Submit a new urgent request / escalation
   */
  async createEscalation(payload) {
    try {
      const res = await api.post('/escalations', payload);
      return res?.data || res;
    } catch (err) {
      console.error('[escalationService] createEscalation error:', err);
      throw err;
    }
  },

  /**
   * 5) PATCH /api/escalations/:id/resolve
   * Resolve an escalation (District Admin approval / Scheme top-up / Hospital transfer)
   */
  async resolveEscalation(id, resolutionPayload) {
    try {
      const res = await api.patch(`/escalations/${encodeURIComponent(id)}/resolve`, resolutionPayload);
      return res?.data || res;
    } catch (err) {
      console.error('[escalationService] resolveEscalation error:', err);
      throw err;
    }
  },

  /**
   * 6) POST /api/escalations/:id/simulate-decision
   * Simulate and record Admin decision in Sevak UI demo mode
   */
  async simulateDecision(id, payload) {
    try {
      const res = await api.post(`/escalations/${encodeURIComponent(id)}/simulate-decision`, payload);
      return res?.data || res;
    } catch (err) {
      console.error('[escalationService] simulateDecision error:', err);
      throw err;
    }
  },
};

export default escalationService;
