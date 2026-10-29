/**
 * Centralized OPD Visit Logs Service for WebFrontend Arogya Sevak Panel
 * Connects directly to Backend REST APIs at /api/opd-visits with fallback caching.
 */

import api from './api';

const getStorageKey = () => {
  try {
    const userStr = localStorage.getItem('ward_arogya_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.id) return `@arogyamitra_web_opd_visits_v2_${u.id}`;
    }
  } catch (_) { }
  return '@arogyamitra_web_opd_visits_v2_guest';
};

const normalizeVisit = (v) => {
  const token = v.tokenNumber || v.token_number || v.tokenNo || `OPD-${v.id || '101'}`;
  const caseId = v.caseId || v.case_id || 'CAS-2026-0000';
  const name = v.patientName || v.patient_name || 'Patient';
  const phone = v.contactPhone || v.contact_phone || v.phone || '+91 98000 00000';
  const dept = v.department || 'General Medicine';
  const doc = v.consultingDoctor || v.consulting_doctor || v.doctor || '';
  const type = v.visitType || v.visit_type || 'Follow-Up';
  const followUp = v.followUpStatus || v.follow_up_status || (v.nextFollowUpRequired ? 'PENDING' : 'NOT_REQUIRED');
  const timeline = v.nextFollowUpTimeline || v.next_follow_up_timeline || 'In 7 Days';
  const timeFormatted = v.timestampFormatted || v.timestamp_formatted || v.timestamp || `${v.date || 'Today'}, ${v.time || '10:00 AM'}`;

  return {
    ...v,
    id: v.id || `opd-${Date.now()}`,
    tokenNumber: token,
    tokenNo: token,
    caseId,
    patientName: name,
    contactPhone: phone,
    phone,
    age: v.age || 45,
    gender: v.gender || 'Male',
    department: dept,
    consultingDoctor: doc,
    doctor: doc,
    visitType: type,
    schemeEligibility: v.schemeEligibility || v.scheme_eligibility || 'MJPJAY Eligible',
    chiefComplaint: v.chiefComplaint || v.chief_complaint || v.diagnosis || 'Routine Checkup',
    diagnosis: v.chiefComplaint || v.chief_complaint || v.diagnosis || 'Routine Checkup',
    followUpStatus: followUp,
    nextFollowUpRequired: v.nextFollowUpRequired ?? v.next_follow_up_required ?? (followUp === 'PENDING'),
    nextFollowUpTimeline: timeline,
    followUpResolvedAt: v.followUpResolvedAt || v.follow_up_resolved_at,
    prescriptionDoc: v.prescriptionDoc || v.prescription_doc_data,
    timestamp: timeFormatted,
    timestampFormatted: timeFormatted,
    statusLabel:
      followUp === 'PENDING'
        ? `Follow-up Required: ${timeline}`
        : followUp === 'DONE'
          ? 'Follow-up Completed'
          : 'Routine Visit • No Follow-up',
  };
};

let _cachedOpdVisits = null;
let _cachedOpdTimestamp = 0;
let _inFlightOpdPromise = null;
const OPD_CACHE_TTL_MS = 20000; // 20s TTL

export const isOpdVisitToday = (v) => {
  if (!v) return false;
  if (v.isToday === true) return true;

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const todayIso = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;
  const monthShort = now.toLocaleString('en-GB', { month: 'short' });
  const dayStr = String(todayDate).padStart(2, '0');

  // Check date field
  if (v.date) {
    const dStr = String(v.date).trim();
    if (dStr.startsWith(todayIso) || dStr === todayIso) return true;
    if (dStr.toLowerCase().includes('today')) return true;
    if (dStr.includes(monthShort) && (dStr.includes(dayStr) || dStr.includes(String(todayDate)))) return true;
    const parsedD = new Date(dStr);
    if (!isNaN(parsedD.getTime())) {
      if (parsedD.getFullYear() === todayYear && parsedD.getMonth() === todayMonth && parsedD.getDate() === todayDate) {
        return true;
      }
    }
  }

  // Check visitDate / visit_date
  const vDate = v.visitDate || v.visit_date;
  if (vDate) {
    const dStr = String(vDate).trim();
    if (dStr.startsWith(todayIso)) return true;
    const parsedV = new Date(vDate);
    if (!isNaN(parsedV.getTime())) {
      if (parsedV.getFullYear() === todayYear && parsedV.getMonth() === todayMonth && parsedV.getDate() === todayDate) {
        return true;
      }
    }
  }

  // Check createdAt / created_at
  const cDate = v.createdAt || v.created_at;
  if (cDate) {
    const parsedC = new Date(cDate);
    if (!isNaN(parsedC.getTime())) {
      if (parsedC.getFullYear() === todayYear && parsedC.getMonth() === todayMonth && parsedC.getDate() === todayDate) {
        return true;
      }
    }
  }

  // Check timestamp / timestampFormatted
  const ts = String(v.timestampFormatted || v.timestamp || '').trim();
  if (ts) {
    if (ts.toLowerCase().includes('today')) return true;
    if (ts.includes(monthShort) && (ts.includes(dayStr) || ts.includes(String(todayDate))) && (ts.includes(String(todayYear)) || !ts.match(/\b20\d\d\b/))) {
      return true;
    }
  }

  return false;
};

export const computeOpdStats = (allVisits = []) => {
  const safeList = Array.isArray(allVisits) ? allVisits : [];
  return {
    totalVisits: safeList.length,
    todayCount: safeList.filter(isOpdVisitToday).length,
    followUpRequiredCount: safeList.filter((v) => (v.followUpStatus || '').toUpperCase() === 'PENDING' || v.nextFollowUpRequired === true).length,
    followUpDoneCount: safeList.filter((v) => (v.followUpStatus || '').toUpperCase() === 'DONE').length,
  };
};

export const opdService = {
  invalidateCache() {
    _cachedOpdVisits = null;
    _cachedOpdTimestamp = 0;
    _inFlightOpdPromise = null;
    try {
      localStorage.removeItem(getStorageKey());
      localStorage.removeItem('@arogyamitra_web_opd_visits_v1');
    } catch (_) { }
  },

  getCachedOpdVisits() {
    if (_cachedOpdVisits && Array.isArray(_cachedOpdVisits) && _cachedOpdVisits.length > 0) {
      return _cachedOpdVisits;
    }
    const cached = localStorage.getItem(getStorageKey());
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.map(normalizeVisit);
      } catch (_) { }
    }
    return [];
  },

  getCachedOpdStats() {
    const visits = this.getCachedOpdVisits();
    return computeOpdStats(visits);
  },

  /**
   * Fetch all OPD visits with optional filter & search parameters
   */
  async getAllOpdVisits(params = {}, options = {}) {
    const forceRefresh = options === true || options?.forceRefresh === true;
    const isFiltered = Boolean(params.search || params.filter || params.limit || params.offset);

    if (!isFiltered && !forceRefresh && _cachedOpdVisits && (Date.now() - _cachedOpdTimestamp < OPD_CACHE_TTL_MS)) {
      return _cachedOpdVisits;
    }

    if (!isFiltered && _inFlightOpdPromise && !forceRefresh) {
      return _inFlightOpdPromise;
    }

    const fetchPromise = (async () => {
      const qParams = new URLSearchParams();
      if (params.search) qParams.append('search', params.search);
      if (params.filter) qParams.append('filter', params.filter);
      if (params.limit) qParams.append('limit', params.limit);
      if (params.offset) qParams.append('offset', params.offset);

      const queryStr = qParams.toString();
      const endpoint = `/opd-visits${queryStr ? `?${queryStr}` : ''}`;

      try {
        const res = await api.get(endpoint);
        const visitsList = res?.data?.visits || (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.visits) ? res.visits : null));
        if (Array.isArray(visitsList)) {
          const normalized = visitsList.map(normalizeVisit);
          if (!isFiltered) {
            _cachedOpdVisits = normalized;
            _cachedOpdTimestamp = Date.now();
            try {
              localStorage.setItem(getStorageKey(), JSON.stringify(normalized));
            } catch (_) { }
          }
          return normalized;
        }
      } catch (err) {
        console.warn('[opdService] API fetch failed, checking local cache:', err.message);
      } finally {
        if (!isFiltered) {
          _inFlightOpdPromise = null;
        }
      }

      return this.getCachedOpdVisits();
    })();

    if (!isFiltered) {
      _inFlightOpdPromise = fetchPromise;
    }

    return fetchPromise;
  },

  /**
   * Fetch aggregated OPD statistics (computed directly or from API)
   */
  async getOpdStats(options = {}) {
    const allVisits = await this.getAllOpdVisits({}, options);
    return computeOpdStats(allVisits);
  },
  /**
   * Log a new OPD Visit
   */
  async logNewOpdVisit(payload) {
    try {
      const res = await api.post('/opd-visits', payload);
      if (res && (res.data || res.success)) {
        const visitData = res.data?.visit || res.data?.data?.visit || res.data || res;
        const newVisit = normalizeVisit(visitData);
        const cached = await this.getAllOpdVisits();
        const updated = [newVisit, ...cached.filter((v) => v.id !== newVisit.id)];
        _cachedOpdVisits = updated;
        _cachedOpdTimestamp = Date.now();
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('arogyamitra:refresh'));
        return newVisit;
      }
    } catch (err) {
      console.warn('[opdService] API create failed, saving visit locally:', err.message);
    }

    // Resilient fallback: Create visit locally and save to cache
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const localVisit = normalizeVisit({
      ...payload,
      id: `opd-${Date.now()}`,
      tokenNumber: `OPD-${Math.floor(100 + Math.random() * 900)}`,
      date: dateStr,
      timestamp: timeFormatted,
      timestampFormatted: timeFormatted,
    });

    const cached = await this.getAllOpdVisits();
    const updated = [localVisit, ...cached.filter((v) => v.id !== localVisit.id)];
    _cachedOpdVisits = updated;
    _cachedOpdTimestamp = Date.now();
    localStorage.setItem(getStorageKey(), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('arogyamitra:refresh'));
    return localVisit;
  },

  /**
   * Mark / resolve follow-up completed for an OPD visit
   */
  async resolveFollowUp(visitId) {
    try {
      const res = await api.patch(`/opd-visits/${encodeURIComponent(visitId)}/resolve-follow-up`, {});
      if (res && res.data) {
        const updatedVisit = normalizeVisit(res.data.visit || res.data);
        const cached = await this.getAllOpdVisits();
        const nextList = cached.map((v) => (v.id === visitId ? updatedVisit : v));
        localStorage.setItem(getStorageKey(), JSON.stringify(nextList));
        return true;
      }
    } catch (err) {
      console.warn('[opdService] API resolve follow-up failed, updating locally:', err.message);
    }

    const cached = await this.getAllOpdVisits();
    const now = new Date();
    const timeFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nextList = cached.map((v) => {
      if (v.id === visitId) {
        return {
          ...v,
          followUpStatus: 'DONE',
          nextFollowUpRequired: false,
          followUpResolvedAt: timeFormatted,
          statusLabel: 'Follow-up Completed',
        };
      }
      return v;
    });

    localStorage.setItem(getStorageKey(), JSON.stringify(nextList));
    return true;
  },

  /**
   * Get all OPD visits for a specific patient Case ID
   */
  async getOpdVisitsByCaseId(caseId) {
    if (!caseId) return [];
    try {
      const res = await api.get(`/opd-visits/case/${encodeURIComponent(caseId)}`);
      if (res && res.data && Array.isArray(res.data.visits)) {
        return res.data.visits.map(normalizeVisit);
      }
    } catch (err) {
      console.warn('[opdService] Case trace API failed, filtering local visits:', err.message);
    }

    const cached = localStorage.getItem(getStorageKey());
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleanCaseId = String(caseId).toLowerCase().trim();
          return parsed
            .filter((v) => v && (String(v.caseId || v.case_id || '').toLowerCase().trim() === cleanCaseId || String(v.applicationId || v.application_id || '').toLowerCase().trim() === cleanCaseId))
            .map(normalizeVisit);
        }
      } catch (_) {}
    }
    return [];
  },
};

export default opdService;
