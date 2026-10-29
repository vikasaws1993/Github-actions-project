import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initialAdminData } from './adminData';
import patientService from '../../services/patientService';
import { schemeService } from '../../services/schemeService';
import { leadershipService } from '../../services/leadershipService';
import { hospitalService } from '../../services/hospitalService';
import { applicationService, normalizeApplication, formatDateDDMMYYYY, isCaseAssigned } from '../../services/applicationService';
import escalationService from '../../services/escalationService';
import api from '@/services/api';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [data, setData] = useState(() => {
    const cachedCases = applicationService.getCachedApplications();
    const cachedSchemes = schemeService.getCachedSchemes();
    const cachedHospitals = hospitalService.getCached();
    const cachedEscalations = escalationService.getCachedEscalations()?.requests || [];

    return {
      ...initialAdminData,
      cases: cachedCases,
      schemes: cachedSchemes.length > 0 ? cachedSchemes : initialAdminData.schemes,
      hospitals: cachedHospitals.length > 0 ? cachedHospitals : initialAdminData.hospitals,
      escalationRequests: cachedEscalations.length > 0 ? cachedEscalations : initialAdminData.escalationRequests,
    };
  });
  const [activeModal, setActiveModal] = useState(null); // { type: 'add-hospital' | 'call' | 'add-note' | 'request-docs' | 'update-status' | 'view-doc', payload: any }
  const [toastMessage, setToastMessage] = useState(null);
  const [casesLoading, setCasesLoading] = useState(() => !applicationService.getCachedApplications()?.length);
  const [casesPagination, setCasesPagination] = useState({ total: applicationService.getCachedApplications()?.length || 0, page: 1, totalPages: 1, limit: 50, offset: 0 });
  const [applicationStats, setApplicationStats] = useState(() => applicationService.getCachedApplicationStats());
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Persistent Doctor Form Draft State (Keeps data intact across page switches)
  const [doctorFormDraft, setDoctorFormDraftState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('arogya_doctor_form_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const updateDoctorFormDraft = useCallback((draft) => {
    setDoctorFormDraftState(draft);
    try {
      if (draft) {
        sessionStorage.setItem('arogya_doctor_form_draft', JSON.stringify(draft));
      } else {
        sessionStorage.removeItem('arogya_doctor_form_draft');
      }
    } catch (e) {}
  }, []);

  const clearDoctorFormDraft = useCallback(() => {
    setDoctorFormDraftState(null);
    try {
      sessionStorage.removeItem('arogya_doctor_form_draft');
    } catch (e) {}
  }, []);

  // Persistent Hospital Form Draft State (Keeps hospital details & doctors roster intact across page switches)
  const [hospitalFormDraft, setHospitalFormDraftState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('arogya_hospital_form_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const updateHospitalFormDraft = useCallback((draft) => {
    setHospitalFormDraftState(draft);
    try {
      if (draft) {
        sessionStorage.setItem('arogya_hospital_form_draft', JSON.stringify(draft));
      } else {
        sessionStorage.removeItem('arogya_hospital_form_draft');
      }
    } catch (e) {}
  }, []);

  const clearHospitalFormDraft = useCallback(() => {
    setHospitalFormDraftState(null);
    try {
      sessionStorage.removeItem('arogya_hospital_form_draft');
    } catch (e) {}
  }, []);

  const fetchAdminNotifications = useCallback(async () => {
    try {
      const res = await applicationService.fetchAdminNotifications({ scope: 'inbox', recipient_type: 'ADMIN', limit: 50 });
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.notifications)) {
        list = res.notifications;
      } else if (Array.isArray(res?.data?.notifications)) {
        list = res.data.notifications;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      }

      // Strictly filter to ensure no citizen, sevak, or outgoing broadcast notifications leak into admin inbox
      const adminInboxList = list.filter((n) => {
        const rType = String(n.recipient_type || '').toUpperCase();
        if (['CITIZEN', 'ALL_CITIZENS', 'SEVAK', 'ALL_SEVAKS', 'ALL', 'BROADCAST'].includes(rType)) {
          return false;
        }
        if (n.is_broadcast && rType !== 'ADMIN') return false;
        return true;
      });

      const unread =
        typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : typeof res?.data?.unreadCount === 'number'
            ? res.data.unreadCount
            : adminInboxList.filter((n) => !n?.is_read).length;

      setAdminNotifications(adminInboxList);
      setUnreadNotificationsCount(adminInboxList.filter((n) => !n?.is_read).length);
      return { notifications: adminInboxList, unreadCount: adminInboxList.filter((n) => !n?.is_read).length };
    } catch (err) {
      console.warn('[AdminContext] fetchAdminNotifications error:', err.message);
      setAdminNotifications([]);
      setUnreadNotificationsCount(0);
      return { notifications: [], unreadCount: 0 };
    }
  }, []);

  const markAdminNotificationRead = useCallback(async (id) => {
    try {
      await applicationService.markNotificationRead(id);
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('[AdminContext] markAdminNotificationRead error:', err.message);
    }
  }, []);

  const markAllAdminNotificationsRead = useCallback(async () => {
    try {
      await applicationService.markAllNotificationsRead();
      setAdminNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.warn('[AdminContext] markAllAdminNotificationsRead error:', err.message);
    }
  }, []);

  const clearSeenAdminNotifications = useCallback(async () => {
    try {
      await applicationService.clearSeenNotifications();
      setAdminNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (err) {
      console.warn('[AdminContext] clearSeenAdminNotifications error:', err.message);
    }
  }, []);

  const clearAllAdminNotifications = useCallback(async () => {
    try {
      await applicationService.clearAllNotifications();
      setAdminNotifications([]);
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.warn('[AdminContext] clearAllAdminNotifications error:', err.message);
    }
  }, []);

  const deleteAdminNotification = useCallback(async (id) => {
    try {
      await applicationService.deleteNotification(id);
      setAdminNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('[AdminContext] deleteAdminNotification error:', err.message);
    }
  }, []);

  const fetchCases = useCallback(async (params = {}) => {
    setCasesLoading(true);
    try {
      const res = await applicationService.fetchApplications(params);
      if (res?.success && Array.isArray(res.applications)) {
        setData((prev) => ({
          ...prev,
          cases: res.applications,
        }));
        setCasesPagination({
          total: res.total ?? res.applications.length,
          page: res.page || 1,
          totalPages: res.totalPages || 1,
          limit: res.limit || 50,
          offset: res.offset || 0,
        });
        return res;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch cases from /api/admins/applications:', err.message);
    } finally {
      setCasesLoading(false);
    }
  }, []);

  const fetchApplicationStats = useCallback(async () => {
    try {
      const res = await applicationService.fetchApplicationStats();
      if (res?.success && res.data) {
        setApplicationStats(res.data);
        return res.data;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch application queue stats:', err.message);
    }
  }, []);

  const fetchAdmins = useCallback(async (search = '') => {
    try {
      const endpoint = search ? `/admins?search=${encodeURIComponent(search)}` : '/admins';
      const res = await api.get(endpoint);
      const rawList = res?.data?.admins || (Array.isArray(res?.data) ? res.data : null);

      if (rawList && Array.isArray(rawList)) {
        const mapped = rawList.map((a, idx) => ({
          id: a.id || a.user_id || `USR-${idx + 1}`,
          adminId: a.id,
          userId: a.user_id,
          name: a.full_name || a.name || 'Admin User',
          email: a.email || '—',
          phone: a.mobile || a.phone || '—',
          address: a.address || '',
          streetAddress: a.address || '',
          city: a.city || '',
          taluka: a.taluka || '',
          district: a.district || '',
          landmark: a.landmark || '',
          fullAddress: [a.address, a.landmark ? `Near ${a.landmark}` : null, a.taluka, a.city, a.district].filter(Boolean).join(', ') || a.address || '—',
          role: a.designation || 'System Administrator',
          department: a.department || 'Health Administration',
          status: (a.user_status || a.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
          assignedCases: a.cases_handled || 0,
          createdAt: a.created_at,
        }));

        setData((prev) => ({
          ...prev,
          users: mapped,
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch admins from API, using default/cached data:', err.message);
    }
  }, []);

  const fetchArogyaSevaks = useCallback(async (search = '') => {
    try {
      const endpoint = search
        ? `/admins/arogya-sevaks?search=${encodeURIComponent(search)}`
        : '/admins/arogya-sevaks';
      const res = await api.get(endpoint);
      const rawList = res?.data?.sevaks || (Array.isArray(res?.data) ? res.data : null);

      if (rawList && Array.isArray(rawList)) {
        const mapped = rawList.map((s, idx) => {
          const hospitalName =
            s.hospital?.name ||
            (Array.isArray(s.assigned_hospitals) && s.assigned_hospitals.length > 0
              ? s.assigned_hospitals.map((h) => h.name).join(', ')
              : '—');
          const rawStatus = (s.status || s.user_status || 'ACTIVE').toUpperCase();
          const statusDisplay =
            hospitalName === '—'
              ? 'Unassigned'
              : rawStatus === 'ACTIVE'
                ? 'Active'
                : 'Inactive';

          const sevakName = (s.full_name || s.name || '').toLowerCase().trim();
          const sevakId = String(s.id || '').toLowerCase().trim();
          const sevakPhone = String(s.mobile || s.phone || '').replace(/\D/g, '');
          const sevakPhoneLast10 = sevakPhone.length >= 10 ? sevakPhone.slice(-10) : sevakPhone;

          const calculatedActiveFromCases = (data?.cases || []).filter((c) => {
            if (!c) return false;
            const st = String(c.status || c.current_status || '').toUpperCase().trim();
            const isTerm = ['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED', 'REJECTED', 'CANCELLED'].some(
              (term) => st === term || st.includes(term)
            );
            if (isTerm) return false;

            const cSevStr = typeof c.assignedSevak === 'string' ? c.assignedSevak : (c.assignedSevak?.name || c.assignedSevak?.full_name || '');
            const cSevName = (cSevStr || c.sevakName || c.sevak || '').toLowerCase().trim();
            const cSevId = String(c.assignedSevakId || c.sevakId || (typeof c.assignedSevak === 'object' ? c.assignedSevak?.id : '') || '').toLowerCase().trim();
            const cSevPhone = String(c.sevakPhone || (typeof c.assignedSevak === 'object' ? c.assignedSevak?.mobile : '') || '').replace(/\D/g, '');
            const cPhoneLast10 = cSevPhone.length >= 10 ? cSevPhone.slice(-10) : cSevPhone;

            return (
              (sevakId && cSevId && sevakId === cSevId) ||
              (sevakPhoneLast10 && cPhoneLast10 && sevakPhoneLast10 === cPhoneLast10) ||
              (sevakName && cSevName && cSevName !== 'not assigned' && cSevName !== '—' && (cSevName === sevakName || cSevName.includes(sevakName) || sevakName.includes(cSevName)))
            );
          }).length;

          return {
            id: s.id || `SEVAK-${idx + 1}`,
            sevakId: s.id,
            userId: s.user_id,
            name: s.full_name || s.name || 'Arogya Sevak',
            hospital: hospitalName,
            mobile: s.mobile || s.phone || '—',
            email: s.email || '',
            patients: (s.active_patients && s.active_patients > 0) ? s.active_patients : (calculatedActiveFromCases > 0 ? calculatedActiveFromCases : (s.patients || 0)),
            activePatients: (s.active_patients && s.active_patients > 0) ? s.active_patients : (calculatedActiveFromCases > 0 ? calculatedActiveFromCases : (s.patients || 0)),
            status: statusDisplay,
            rawStatus: rawStatus,
            employeeCode: s.employee_code,
            taluka: s.taluka || '',
            district: s.district || '',
            address: s.address || '',
            city: s.city || '',
            landmark: s.landmark || '',
            fullAddress: [s.address, s.taluka, s.city, s.district].filter(Boolean).join(', '),
            assignedHospitals: s.assigned_hospitals || [],
          };
        });

        setData((prev) => ({
          ...prev,
          arogyaSevaks: mapped,
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch sevaks from API:', err.message);
    }
  }, []);

  const fetchAdminProfile = useCallback(async () => {
    try {
      const res = await api.get('/admins/profile');
      const adminData = res?.data?.data || res?.data;
      if (adminData && (adminData.full_name || adminData.name || adminData.email)) {
        const name = adminData.full_name || adminData.name || 'Admin Officer';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'AD';

        const mappedOperator = {
          id: adminData.id || adminData.user_id,
          adminId: adminData.id,
          userId: adminData.user_id,
          operatorId: adminData.id ? `OP-${String(adminData.id).substring(0, 4).toUpperCase()}` : 'OP-ADMIN',
          name: name,
          email: adminData.email || '',
          phone: adminData.mobile || adminData.phone || '',
          role: adminData.designation || 'Administrator',
          department: adminData.department || 'Health Administration',
          accessLevel: 'Super Admin (Level 3)',
          district: [adminData.city, adminData.taluka ? `${adminData.taluka} Taluka` : null, adminData.district].filter(Boolean).join(' - ') || adminData.district || '',
          address: adminData.address || '',
          city: adminData.city || '',
          taluka: adminData.taluka || '',
          landmark: adminData.landmark || '',
          status: (adminData.user_status || adminData.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active Duty' : 'Inactive',
          registeredDate: adminData.created_at ? new Date(adminData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          initials: initials,
          avatar: null
        };

        setData((prev) => ({
          ...prev,
          operator: {
            ...prev.operator,
            ...mappedOperator,
          }
        }));
        return mappedOperator;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch live admin profile from /admins/profile:', err.message);
    }
  }, []);

  const fetchSchemes = useCallback(async (search = '') => {
    try {
      const res = await schemeService.fetchSchemes({ search });
      if (res?.success && Array.isArray(res.data)) {
        setData((prev) => ({
          ...prev,
          schemes: res.data,
        }));
        return res.data;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch schemes from API:', err.message);
    }
  }, []);

  const fetchMlaData = useCallback(async () => {
    try {
      const res = await leadershipService.getMlaProfile();
      if (res?.success && res?.data) {
        const { profile, telemetry } = res.data;
        setData((prev) => ({
          ...prev,
          mlaProfile: profile,
          mlaTelemetry: telemetry,
          mlaPhoto: profile?.photoUrl || prev.mlaPhoto || '/ravindra_chavan.png',
        }));
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch MLA data from API:', err.message);
    }
  }, []);

  const fetchHospitals = useCallback(async () => {
    try {
      const res = await hospitalService.fetchHospitals();
      if (res?.success && Array.isArray(res.data)) {
        setData((prev) => ({
          ...prev,
          hospitals: res.data,
        }));
        return res.data;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch hospitals from API:', err.message);
    }
  }, []);

  const fetchEscalationRequests = useCallback(async (filters = {}) => {
    try {
      const res = await escalationService.getEscalations(filters);
      if (res?.requests && Array.isArray(res.requests)) {
        setData((prev) => ({
          ...prev,
          escalationRequests: res.requests,
        }));
        return res.requests;
      }
    } catch (err) {
      console.warn('[AdminContext] Could not fetch live escalations from API:', err.message);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      fetchAdminProfile(),
      fetchAdmins(),
      fetchArogyaSevaks(),
      fetchSchemes(),
      fetchMlaData(),
      fetchHospitals(),
      fetchCases(),
      fetchApplicationStats(),
      fetchEscalationRequests(),
      fetchAdminNotifications(),
    ]);

    // Fast multi-admin live synchronization timer (every 6 seconds)
    const syncTimer = setInterval(() => {
      fetchCases();
      fetchApplicationStats();
      fetchAdminNotifications();
      fetchEscalationRequests();
    }, 6000);

    // Instant sync when admin switches back to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCases();
        fetchApplicationStats();
        fetchAdminNotifications();
        fetchEscalationRequests();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [fetchAdminProfile, fetchAdmins, fetchArogyaSevaks, fetchSchemes, fetchMlaData, fetchHospitals, fetchCases, fetchApplicationStats, fetchEscalationRequests, fetchAdminNotifications]);

  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const updateCaseStatus = async (caseId, newStatus, remarks = '') => {
    let displayStatus = newStatus;
    let backendStatus = 'UNDER_REVIEW';
    let statusClass = 'status-submitted';

    const sUpper = String(newStatus || '').toUpperCase().trim().replace(/[-\s/]+/g, '_');
    if (sUpper === 'DOCS_VERIFIED' || sUpper === 'DOCUMENTS_VERIFIED' || sUpper === 'DOC_VERIFIED') {
      displayStatus = 'Docs Verified';
      backendStatus = 'DOCS_VERIFIED';
      statusClass = 'status-docs-verified';
    } else if (sUpper === 'COORDINATED' || sUpper === 'HOSPITAL_SEVAK_ASSIGNED' || sUpper === 'SEVAK_HOSPITAL_ASSIGNED' || sUpper === 'SEVAK_ASSIGNED' || sUpper === 'ASSIGNED') {
      displayStatus = 'Hospital, Sevak Assigned';
      backendStatus = 'COORDINATED';
      statusClass = 'status-assigned';
    } else if (sUpper === 'TREATMENT_STARTED' || sUpper === 'ACTIVE' || sUpper === 'IN_TREATMENT') {
      displayStatus = 'Treatment Started';
      backendStatus = 'TREATMENT_STARTED';
      statusClass = 'status-active';
    } else if (sUpper === 'APPROVED') {
      displayStatus = 'Approved';
      backendStatus = 'APPROVED';
      statusClass = 'status-active';
    } else if (sUpper === 'DOCS_REQUIRED' || sUpper === 'REVERTED' || sUpper === 'ON_HOLD') {
      displayStatus = 'Docs Required';
      backendStatus = 'DOCS_REQUIRED';
      statusClass = 'status-docs-required';
    } else if (sUpper === 'UNDER_REVIEW' || sUpper === 'IN_REVIEW') {
      displayStatus = 'Under Review';
      backendStatus = 'UNDER_REVIEW';
      statusClass = 'status-under-review';
    } else if (sUpper === 'SUBMITTED' || sUpper === 'PENDING') {
      displayStatus = 'Submitted';
      backendStatus = 'SUBMITTED';
      statusClass = 'status-submitted';
    } else if (sUpper === 'REJECTED') {
      displayStatus = 'Rejected';
      backendStatus = 'REJECTED';
      statusClass = 'status-rejected';
    } else if (sUpper === 'CLOSED' || sUpper === 'COMPLETED' || sUpper === 'DISCHARGED') {
      displayStatus = 'Closed';
      backendStatus = 'CLOSED';
      statusClass = 'status-closed';
    }

    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        const cleanTarget = String(caseId || '').toLowerCase().trim();
        const isMatch = [c.id, c.uuid, c.caseId, c.applicationNumber].some(
          (val) => val && String(val).toLowerCase().trim() === cleanTarget
        );
        if (isMatch) {
          const prevTimeline = (c.timeline || []).map((t) => ({
            ...t,
            completed: true,
            current: false
          }));
          const updatedTimeline = [
            ...prevTimeline,
            {
              title: `Status Updated: ${displayStatus}`,
              time: 'Just now',
              completed: false,
              current: true
            }
          ];
          return {
            ...c,
            status: displayStatus,
            current_status: backendStatus,
            statusClass,
            isUrgentRow: displayStatus === 'Docs Required',
            isReviewScreenCase: displayStatus === 'Pending Review' || displayStatus === 'Under Review' || displayStatus === 'Docs Verified',
            lastUpdate: 'Just now',
            timeline: updatedTimeline
          };
        }
        return c;
      })
    }));

    try {
      applicationService.invalidateApplicationsCache();
      const res = await applicationService.updateStatus(caseId, {
        status: backendStatus,
        remarks: remarks || `Status updated to ${displayStatus} by Admin`
      });
      await fetchCases();
      await fetchApplicationStats();
      showToast(`Case ${caseId} status updated to "${displayStatus}"`);
      return res;
    } catch (err) {
      console.warn('[AdminContext] updateCaseStatus backend sync note:', err.message);
      showToast(`Case ${caseId} status updated to "${displayStatus}"`);
    }
  };

  const addCaseNote = async (caseId, noteText) => {
    const cleanText = String(noteText || '').trim();
    if (!cleanText) return;

    // Find the case and assigned Sevak if available
    const targetCase = data.cases.find(c => c.id === caseId || c.caseId === caseId);
    const assignedSevakName = targetCase?.assignedSevak && targetCase.assignedSevak !== 'Not assigned' && targetCase.assignedSevak !== '—'
      ? targetCase.assignedSevak
      : null;

    const authorLabel = data.operator?.name ? `Admin (${data.operator.name})` : 'District Admin';

    // 1. Sync to local patient store for immediate Sevak view reactivity
    try {
      if (patientService?.addAdminDirective) {
        await patientService.addAdminDirective(caseId, cleanText, authorLabel);
      }
    } catch (e) {
      console.warn('[AdminContext] patientService addAdminDirective warning:', e.message);
    }

    // 2. Call backend API to persist note and notify assigned ArogyaSevak
    try {
      if (applicationService?.addCaseNote) {
        await applicationService.addCaseNote(caseId, cleanText);
      }
    } catch (apiErr) {
      console.warn('[AdminContext] backend addCaseNote warning:', apiErr.message);
    }

    // 3. Save to localStorage backup for 100% persistence on page refresh
    try {
      const cleanKey = `arogyamitra_case_notes_${String(caseId).toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(cleanKey) || '[]');
      const newEntry = { id: Date.now(), text: cleanText, by: authorLabel, date: 'Just now' };
      const updated = [newEntry, ...existing.filter(item => (typeof item === 'string' ? item : item.text) !== cleanText)];
      localStorage.setItem(cleanKey, JSON.stringify(updated));
    } catch (_) { }

    // 4. Update local AdminContext cases state
    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId || c.caseId === caseId) {
          const prevNotes = Array.isArray(c.notes) ? c.notes : [];
          return {
            ...c,
            remarks: cleanText,
            notes: [cleanText, ...prevNotes.filter(n => (typeof n === 'string' ? n : n.text) !== cleanText)],
            adminNotes: [
              { id: Date.now(), text: cleanText, by: authorLabel, date: 'Just now' },
              ...(Array.isArray(c.adminNotes) ? c.adminNotes : [])
            ]
          };
        }
        return c;
      }),
      pendingFollowUps: (prev.pendingFollowUps || []).map((fu) => {
        if (fu.caseId === caseId) {
          return {
            ...fu,
            note: cleanText
          };
        }
        return fu;
      })
    }));

    if (assignedSevakName) {
      showToast(`Admin note transmitted directly to ArogyaSevak (${assignedSevakName}) for Case ${caseId}`);
    } else {
      showToast(`Admin note added and saved for Case ${caseId}`);
    }
  };

  const claimCase = useCallback(async (caseId, customAdminName = null) => {
    const adminName = customAdminName || data.operator?.name || 'Admin';
    const adminId = data.operator?.id || null;
    const now = new Date().toISOString();

    // 1. Optimistically update local cases state
    setData((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) => {
        const cleanTarget = String(caseId || '').toLowerCase().trim();
        const isMatch = [c.id, c.uuid, c.caseId, c.applicationNumber].some(
          (val) => val && String(val).toLowerCase().trim() === cleanTarget
        );
        if (isMatch) {
          return {
            ...c,
            reviewedByAdminId: adminId,
            reviewedByAdminName: adminName,
            reviewed_by_admin_id: adminId,
            reviewed_by_admin_name: adminName,
            claimedAt: now,
            claimed_at: now,
            isClaimed: true,
          };
        }
        return c;
      }),
    }));

    showToast(`Case ${caseId} claimed by ${adminName}`);

    // 2. Call backend API
    try {
      await applicationService.claimCase(caseId, { reviewer_name: adminName, reviewer_id: adminId });
    } catch (err) {
      console.warn('[AdminContext] claimCase backend warning:', err.message);
    }
  }, [data.operator, showToast]);

  const unclaimCase = useCallback(async (caseId) => {
    // 1. Optimistically update local cases state
    setData((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) => {
        const cleanTarget = String(caseId || '').toLowerCase().trim();
        const isMatch = [c.id, c.uuid, c.caseId, c.applicationNumber].some(
          (val) => val && String(val).toLowerCase().trim() === cleanTarget
        );
        if (isMatch) {
          return {
            ...c,
            reviewedByAdminId: null,
            reviewedByAdminName: null,
            reviewed_by_admin_id: null,
            reviewed_by_admin_name: null,
            claimedAt: null,
            claimed_at: null,
            isClaimed: false,
          };
        }
        return c;
      }),
    }));

    showToast(`Case ${caseId} review claim released`);

    // 2. Call backend API
    try {
      await applicationService.unclaimCase(caseId);
    } catch (err) {
      console.warn('[AdminContext] unclaimCase backend warning:', err.message);
    }
  }, [showToast]);

  const assignCaseReviewer = useCallback(async (caseId, targetAdminId, targetAdminName) => {
    const now = new Date().toISOString();

    // 1. Optimistically update local cases state
    setData((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) => {
        const cleanTarget = String(caseId || '').toLowerCase().trim();
        const isMatch = [c.id, c.uuid, c.caseId, c.applicationNumber].some(
          (val) => val && String(val).toLowerCase().trim() === cleanTarget
        );
        if (isMatch) {
          return {
            ...c,
            reviewedByAdminId: targetAdminId,
            reviewedByAdminName: targetAdminName,
            reviewed_by_admin_id: targetAdminId,
            reviewed_by_admin_name: targetAdminName,
            claimedAt: now,
            claimed_at: now,
            isClaimed: true,
          };
        }
        return c;
      }),
    }));

    showToast(`Case ${caseId} assigned to reviewer ${targetAdminName}`);

    // 2. Call backend API
    try {
      await applicationService.assignReviewer(caseId, { reviewer_id: targetAdminId, reviewer_name: targetAdminName });
    } catch (err) {
      console.warn('[AdminContext] assignCaseReviewer backend warning:', err.message);
    }
  }, [showToast]);

  const recordCallFollowUp = (caseItem, callTarget = 'applicant', phoneToCall) => {
    if (!caseItem) return;
    const isRelative = callTarget === 'relative';
    const targetName = isRelative
      ? (caseItem.relativeName ? `${caseItem.relativeName} (${caseItem.relativeRelation || 'Relative'})` : `Relative (${caseItem.relativeRelation || 'Family'})`)
      : (caseItem.applicant || caseItem.patient || 'Applicant');

    const phoneNum = phoneToCall || (isRelative ? caseItem.relativeContact : caseItem.contact) || '98765 43210';

    const followUpRecord = {
      id: `FU-${Date.now().toString().slice(-4)}`,
      name: targetName,
      caseId: caseItem.id || 'AM-2026-00124',
      note: isRelative
        ? `👨‍👩‍👧 Outbound Call Logged to Relative (${targetName}) regarding case ${caseItem.id || ''}`
        : `📱 Outbound Call Logged to Applicant (${targetName}) regarding case ${caseItem.id || ''}`,
      status: 'Logged',
      statusType: 'logged',
      phone: phoneNum,
      date: 'Just now',
      hospital: caseItem.hospitalShort || caseItem.hospital || 'Empanelled Hospital',
      scheme: caseItem.scheme || 'PM-JAY',
      callTarget: callTarget,
      type: isRelative ? 'call_relative' : 'call_applicant',
      priority: 'Normal'
    };

    setData((prev) => ({
      ...prev,
      pendingFollowUps: [followUpRecord, ...(prev.pendingFollowUps || [])]
    }));

    showToast(`Call logged for ${targetName}. Added to Follow-Ups & Call Logs!`);
  };

  const addFollowUp = (followUpData) => {
    const newFollowUp = {
      id: `FU-${Date.now().toString().slice(-4)}`,
      name: followUpData.name || 'Target Contact',
      caseId: followUpData.caseId || 'AM-2026-00124',
      note: followUpData.note || 'Admin follow-up created',
      status: followUpData.status || 'Pending',
      statusType: followUpData.priority === 'Urgent' ? 'urgent' : followUpData.priority === 'High' ? 'high' : 'pending',
      phone: followUpData.phone || '98765 43210',
      date: 'Just now',
      hospital: followUpData.hospital || 'Empanelled Hospital',
      scheme: followUpData.scheme || 'PM-JAY',
      callTarget: followUpData.callTarget || 'admin',
      type: followUpData.type || 'admin_followup',
      priority: followUpData.priority || 'Medium'
    };

    setData((prev) => ({
      ...prev,
      pendingFollowUps: [newFollowUp, ...(prev.pendingFollowUps || [])]
    }));

    showToast(`Follow-up created for Case ${newFollowUp.caseId}!`);
  };

  const resolveFollowUp = (followUpId) => {
    setData((prev) => ({
      ...prev,
      pendingFollowUps: (prev.pendingFollowUps || []).map((fu) => {
        if (fu.id === followUpId) {
          return {
            ...fu,
            status: 'Completed',
            statusType: 'completed'
          };
        }
        return fu;
      })
    }));
    showToast(`Follow-up record ${followUpId} marked as Completed!`);
  };

  const requestDocument = async (caseId, docName, channel, customNote = '') => {
    const targetCase = data.cases.find(c => c.id === caseId || c.caseId === caseId || c.applicationNumber === caseId || c.uuid === caseId);
    if (targetCase && (targetCase.status === 'Rejected' || targetCase.status === 'Closed (Expired)' || targetCase.status === 'Closed')) {
      showToast(`🔒 Cannot request documents on a ${targetCase.status} case. Please reopen the case first.`, 'warning');
      return;
    }

    const targetName = docName || 'Additional Document';
    let isTargetAssigned = false;
    let targetSevakName = '';
    let targetApplicantName = '';

    const isTargetInitiallyAssigned = targetCase ? (
      isCaseAssigned(targetCase) ||
      ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'DISCHARGED', 'CLOSED'].includes(String(targetCase.status || '').toUpperCase().replace(/[-\s/]+/g, '_')) ||
      (targetCase.hospital && targetCase.hospital !== '—' && targetCase.hospital !== '-' && targetCase.assignedSevak && targetCase.assignedSevak !== '—' && targetCase.assignedSevak !== '-')
    ) : false;

    const noteMsg = customNote?.trim() ? ` [Note: "${customNote.trim()}"]` : '';

    // Fire live backend API to persist DOCS_REQUIRED and dispatch real-time push notification
    try {
      await applicationService.requestDocument(caseId, {
        requestedDocName: targetName,
        reason: customNote?.trim() || 'कागदपत्र पडताळणीसाठी आवश्यक आहे',
        deadlineDays: 3,
        requestedFrom: isTargetInitiallyAssigned ? 'sevak' : 'citizen'
      });
    } catch (apiErr) {
      console.warn(`[AdminContext] requestDocument backend API notice for '${caseId}':`, apiErr.message);
    }

    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId || c.caseId === caseId || c.applicationNumber === caseId || c.uuid === caseId) {
          const isCaseStatusApproved = c.status === 'Approved' || c.status === 'APPROVED' || c.status === 'Treatment Started' || c.status === 'TREATMENT_STARTED' || c.status === 'Coordinated' || c.status === 'COORDINATED' || c.status === 'Discharged' || c.status === 'DISCHARGED' || Boolean(c.hospital && c.hospital !== '—' && c.hospital !== '-' && c.assignedSevak && c.assignedSevak !== '—' && c.assignedSevak !== '-');
          const hasHospitalAssigned = isCaseAssigned(c) || isCaseStatusApproved;

          isTargetAssigned = hasHospitalAssigned;
          targetSevakName = c.assignedSevak || c.sevak || 'Akanksha Pawashe';
          targetApplicantName = c.applicant || c.patient || 'Citizen';

          const prevTimeline = (c.timeline || []).map((t) => ({
            ...t,
            completed: true,
            current: false
          }));

          const docs = c.documents || [];
          const exists = docs.some((d) => d.name === targetName || d.title === targetName);

          let updatedDocs;
          if (exists) {
            updatedDocs = docs.map((d) => {
              if (d.name === targetName || d.title === targetName) {
                return {
                  ...d,
                  file: 'Pending Upload',
                  fileName: 'Pending Upload',
                  fileUrl: '',
                  size: '-',
                  uploaded: false,
                  verified: false,
                  requested: true,
                  is_sevak_upload: hasHospitalAssigned,
                  isSevakUpload: hasHospitalAssigned,
                  uploaded_by_role: hasHospitalAssigned ? 'AROGYA_SEVAK' : 'CITIZEN',
                  uploaderRole: hasHospitalAssigned ? 'ArogyaSevak' : 'Citizen',
                  uploadedBy: hasHospitalAssigned ? 'sevak' : 'citizen',
                  requestedFrom: hasHospitalAssigned ? 'sevak' : 'citizen',
                  by: hasHospitalAssigned ? targetSevakName : targetApplicantName,
                  source: hasHospitalAssigned ? 'ArogyaSevak Upload' : 'Citizen Upload',
                  status: hasHospitalAssigned ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
                  document_status: hasHospitalAssigned ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
                  statusText: hasHospitalAssigned ? `Requested from ArogyaSevak (${targetSevakName})` : 'Pending Citizen Upload',
                  requestedAt: 'Just now',
                  adminNote: customNote?.trim() || d.adminNote || ''
                };
              }
              return d;
            });
          } else {
            updatedDocs = [
              ...docs,
              {
                id: `DOC-REQ-${Date.now().toString().slice(-4)}`,
                name: targetName,
                title: targetName,
                file: 'Pending Upload',
                fileName: 'Pending Upload',
                fileUrl: '',
                size: '-',
                uploaded: false,
                verified: false,
                requested: true,
                is_sevak_upload: hasHospitalAssigned,
                isSevakUpload: hasHospitalAssigned,
                uploaded_by_role: hasHospitalAssigned ? 'AROGYA_SEVAK' : 'CITIZEN',
                uploaderRole: hasHospitalAssigned ? 'ArogyaSevak' : 'Citizen',
                uploadedBy: hasHospitalAssigned ? 'sevak' : 'citizen',
                requestedFrom: hasHospitalAssigned ? 'sevak' : 'citizen',
                by: hasHospitalAssigned ? targetSevakName : targetApplicantName,
                source: hasHospitalAssigned ? 'ArogyaSevak Upload' : 'Citizen Upload',
                status: hasHospitalAssigned ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
                document_status: hasHospitalAssigned ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
                statusText: hasHospitalAssigned ? `Requested from ArogyaSevak (${targetSevakName})` : 'Pending Citizen Upload',
                requestedAt: 'Just now',
                adminNote: customNote?.trim() || ''
              }
            ];
          }

          const revertDetailsObj = {
            requestedDocName: targetName,
            requestedDocType: 'other',
            reason: customNote?.trim() || 'कागदपत्र पडताळणीसाठी आवश्यक आहे',
            deadlineDays: 3,
            requestedDate: new Date().toISOString(),
            isResolved: false,
            requestedFrom: hasHospitalAssigned ? 'sevak' : 'citizen'
          };

          const newNote = customNote?.trim()
            ? `📄 [DOCUMENT REQUEST NOTE] Document "${targetName}" requested from ${hasHospitalAssigned ? `ArogyaSevak (${targetSevakName})` : `Citizen (${c.applicant})`}: ${customNote.trim()}`
            : null;

          const updatedNotes = newNote ? [newNote, ...(c.notes || [])] : c.notes;

          if (hasHospitalAssigned) {
            return {
              ...c,
              status: 'Docs Required',
              current_status: 'DOCS_REQUIRED',
              statusClass: 'status-docs-required',
              isUrgentRow: true,
              documents: updatedDocs,
              notes: updatedNotes,
              revertDetails: revertDetailsObj,
              revert_details: revertDetailsObj,
              lastUpdate: 'Just now',
              timeline: [
                ...prevTimeline,
                {
                  title: `Requested "${targetName}" from ArogyaSevak (${targetSevakName})${noteMsg} — Task Sent`,
                  time: 'Just now',
                  completed: false,
                  current: true
                }
              ]
            };
          } else {
            return {
              ...c,
              status: 'Docs Required',
              isUrgentRow: true,
              isReviewScreenCase: false,
              documents: updatedDocs,
              notes: updatedNotes,
              revertDetails: revertDetailsObj,
              revert_details: revertDetailsObj,
              lastUpdate: 'Just now',
              timeline: [
                ...prevTimeline,
                {
                  title: `Requested "${targetName}" from Citizen (${c.applicant})${noteMsg} — Status: On Hold`,
                  time: 'Just now',
                  completed: false,
                  current: true
                }
              ]
            };
          }
        }
        return c;
      }),
      pendingFollowUps: [
        {
          id: `FU-${Date.now().toString().slice(-4)}`,
          name: isTargetAssigned ? targetSevakName : targetApplicantName,
          caseId: caseId,
          note: `🚨 Document Requested: "${targetName}" from ${isTargetAssigned ? `ArogyaSevak (${targetSevakName})` : `Citizen`}.${noteMsg}`,
          status: 'Urgent',
          statusType: 'urgent',
          phone: '98765 43210',
          date: 'Just now',
          callTarget: isTargetAssigned ? 'sevak' : 'applicant',
          type: isTargetAssigned ? 'sevak_followup' : 'call_applicant',
          priority: 'Urgent'
        },
        ...(prev.pendingFollowUps || [])
      ]
    }));

    showToast(`Document "${targetName}" requested from ${isTargetAssigned ? `ArogyaSevak (${targetSevakName})` : 'Citizen'}.`);
  };

  const verifyDocument = async (caseId, docIdOrName, remark = '') => {
    const targetCase = data.cases.find(c =>
      c.id === caseId ||
      c.caseId === caseId ||
      c.applicationNumber === caseId ||
      c.uuid === caseId
    );
    if (targetCase && (targetCase.status === 'Rejected' || targetCase.status === 'Closed (Expired)' || targetCase.status === 'Closed')) {
      showToast(`🔒 Cannot verify documents on a ${targetCase.status} case. Please reopen the case first.`, 'warning');
      return;
    }

    const docTarget = typeof docIdOrName === 'object' && docIdOrName !== null
      ? (docIdOrName.id || docIdOrName.docId || docIdOrName.file_url || docIdOrName.file_name || docIdOrName.file || docIdOrName.name || docIdOrName.title)
      : docIdOrName;

    let targetDocDisplayName = typeof docIdOrName === 'object' && docIdOrName !== null
      ? (docIdOrName.name || docIdOrName.title || docIdOrName.file_name || 'Document')
      : (typeof docIdOrName === 'string' ? docIdOrName : 'Document');

    // Find the document in targetCase if available
    const existingDoc = (targetCase?.documents || []).find((d) =>
      (d === docIdOrName) ||
      (docTarget && d.id && String(d.id) === String(docTarget)) ||
      (docTarget && d.docId && String(d.docId) === String(docTarget)) ||
      (docTarget && d.name && String(d.name).toLowerCase() === String(docTarget).toLowerCase()) ||
      (docTarget && d.title && String(d.title).toLowerCase() === String(docTarget).toLowerCase()) ||
      (docTarget && d.file_name && String(d.file_name).toLowerCase() === String(docTarget).toLowerCase()) ||
      (docTarget && d.fileName && String(d.fileName).toLowerCase() === String(docTarget).toLowerCase()) ||
      (docTarget && d.file && String(d.file).toLowerCase() === String(docTarget).toLowerCase()) ||
      (docTarget && d.file_url && String(d.file_url) === String(docTarget)) ||
      (docTarget && d.fileUrl && String(d.fileUrl) === String(docTarget))
    );

    if (existingDoc) {
      targetDocDisplayName = existingDoc.name || existingDoc.title || existingDoc.file_name || targetDocDisplayName;
    }

    // 1. Optimistically update local React state INSTANTLY for super fast UI response
    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId || c.caseId === caseId || c.applicationNumber === caseId || c.uuid === caseId) {
          const docs = c.documents || [];
          const matchedDoc = docs.find((d) =>
            (d === docIdOrName) ||
            (docTarget && d.id && String(d.id) === String(docTarget)) ||
            (docTarget && d.docId && String(d.docId) === String(docTarget)) ||
            (docTarget && d.file_url && String(d.file_url) === String(docTarget)) ||
            (docTarget && d.fileUrl && String(d.fileUrl) === String(docTarget)) ||
            (docTarget && d.file_name && String(d.file_name).toLowerCase() === String(docTarget).toLowerCase()) ||
            (docTarget && d.fileName && String(d.fileName).toLowerCase() === String(docTarget).toLowerCase()) ||
            (docTarget && d.file && String(d.file).toLowerCase() === String(docTarget).toLowerCase()) ||
            (docTarget && d.name && String(d.name).toLowerCase() === String(docTarget).toLowerCase()) ||
            (docTarget && d.title && String(d.title).toLowerCase() === String(docTarget).toLowerCase())
          );

          let updatedDocs;
          if (matchedDoc) {
            let matchedFound = false;
            updatedDocs = docs.map((d) => {
              const isMatch =
                (matchedDoc.id && d.id && String(d.id) === String(matchedDoc.id)) ||
                (matchedDoc.docId && d.docId && String(d.docId) === String(matchedDoc.docId)) ||
                (matchedDoc.file_url && d.file_url && String(d.file_url) === String(matchedDoc.file_url)) ||
                (matchedDoc.file_name && d.file_name && String(d.file_name) === String(matchedDoc.file_name)) ||
                (matchedDoc.name && d.name && String(d.name) === String(matchedDoc.name)) ||
                (d === matchedDoc);

              if (isMatch && !matchedFound) {
                matchedFound = true;
                const currentAdmin = data.operator?.name || 'Admin';
                return {
                  ...d,
                  verified: true,
                  uploaded: true,
                  status: 'VERIFIED',
                  document_status: 'VERIFIED',
                  requested: false,
                  statusText: 'Verified ✓',
                  verificationRemark: remark || d.verificationRemark || `Verified: ${targetDocDisplayName} ✓`,
                  verification_remark: remark || d.verification_remark || `Verified: ${targetDocDisplayName} ✓`,
                  verifiedAt: new Date().toISOString(),
                  verified_at: new Date().toISOString(),
                  verifiedBy: currentAdmin,
                  verified_by: currentAdmin,
                  verified_by_name: currentAdmin,
                  file: (d.file && d.file !== 'Pending Upload') ? d.file : `${(d.name || 'document').toLowerCase().replace(/[^a-z0-9]/g, '_')}_verified.pdf`,
                  size: d.size && d.size !== 'Not uploaded' && d.size !== '-' ? d.size : '1.4 MB'
                };
              }
              return d;
            });
          } else {
            const isAssignedCase = isCaseAssigned(c) || c.status === 'Approved' || c.status === 'Treatment Started';
            const currentAdmin = data.operator?.name || 'Admin';
            updatedDocs = [
              ...docs,
              {
                id: docTarget || `DOC-${Date.now().toString().slice(-4)}`,
                name: targetDocDisplayName,
                title: targetDocDisplayName,
                file: `${String(targetDocDisplayName).toLowerCase().replace(/[^a-z0-9]/g, '_')}_verified.pdf`,
                size: '1.4 MB',
                verified: true,
                status: 'VERIFIED',
                document_status: 'VERIFIED',
                uploaded: true,
                requested: false,
                is_sevak_upload: isAssignedCase,
                isSevakUpload: isAssignedCase,
                uploaderRole: isAssignedCase ? 'ArogyaSevak' : 'Citizen',
                uploadedBy: isAssignedCase ? 'sevak' : 'citizen',
                uploaderName: isAssignedCase ? (c.assignedSevak || 'ArogyaSevak') : (c.applicant || 'Citizen'),
                statusText: 'Verified ✓',
                verificationRemark: remark || `Verified: ${targetDocDisplayName} ✓`,
                verification_remark: remark || `Verified: ${targetDocDisplayName} ✓`,
                verifiedAt: new Date().toISOString(),
                verified_at: new Date().toISOString(),
                verifiedBy: currentAdmin,
                verified_by: currentAdmin,
                verified_by_name: currentAdmin
              }
            ];
          }

          const allVerified = updatedDocs.every((d) => d.verified);
          const wasOnHold = c.status === 'Docs Required' || c.status === 'DOCS_REQUIRED' || c.status === 'REVERTED';
          const nextStatus = allVerified ? (wasOnHold || c.status === 'Submitted' || c.status === 'Pending Review' || c.status === 'SUBMITTED' ? 'Under Review' : c.status) : c.status;

          const prevTimeline = (c.timeline || []).map((t) => ({
            ...t,
            current: false
          }));

          const isSevakDoc = matchedDoc
            ? (matchedDoc.isSevakUpload || matchedDoc.is_sevak_upload || matchedDoc.uploaderRole === 'ArogyaSevak' || matchedDoc.uploadedBy === 'sevak')
            : (isCaseAssigned(c) || c.status === 'Approved' || c.status === 'Treatment Started');

          const currentAdmin = data.operator?.name || 'Admin';
          const updatedTimeline = [
            ...prevTimeline,
            {
              id: `tl-v-${Date.now()}`,
              title: `Verified document "${targetDocDisplayName}" ✓`,
              by: currentAdmin,
              adminName: currentAdmin,
              role: 'Admin',
              date: new Date().toISOString(),
              time: 'Just now',
              completed: true,
              current: true
            }
          ];

          return {
            ...c,
            documents: updatedDocs,
            status: nextStatus,
            isUrgentRow: !allVerified,
            lastUpdate: 'Just now',
            timeline: updatedTimeline,
            docsRequiredList: (c.docsRequiredList || []).filter(
              (name) => name.toLowerCase() !== targetDocDisplayName.toLowerCase()
            ),
          };
        }
        return c;
      })
    }));

    // 2. Call backend API asynchronously in background without blocking UI
    const docUuid = existingDoc?.id || existingDoc?.docId || (typeof docTarget === 'string' && docTarget.length > 8 ? docTarget : null);
    if (caseId && docUuid && !String(docUuid).startsWith('DOC-')) {
      applicationService.verifyDocument(caseId, docUuid, { status: 'VERIFIED', remark: remark || 'Verified by Admin ✓' })
        .then(() => console.log(`[AdminContext] Verified document ${docUuid} in DB`))
        .catch((err) => console.warn('[AdminContext] verifyDocument API error:', err.message));
    }

    showToast(`Verified document "${targetDocDisplayName}" ✓`);
  };

  const uploadDocument = (caseId, docName, fileName = null, uploaderRole = null) => {
    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId || c.caseId === caseId || c.applicationNumber === caseId || c.uuid === caseId) {
          const isCaseAssignedOrApproved = isCaseAssigned(c) || c.status === 'Approved' || c.status === 'APPROVED' || c.status === 'Treatment Started' || c.status === 'TREATMENT_STARTED' || c.status === 'Coordinated';
          const isSevak = uploaderRole === 'ArogyaSevak' || uploaderRole === 'sevak' || isCaseAssignedOrApproved;
          const targetSevakName = c.assignedSevak || c.sevak || 'Akanksha Pawashe';
          const generatedName = fileName || `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${isSevak ? 'sevak' : 'uploaded'}.pdf`;

          let matched = false;
          const updatedDocs = (c.documents || []).map((d) => {
            if (d.name === docName || d.title === docName || (d.id && String(d.id) === String(docName))) {
              matched = true;
              return {
                ...d,
                uploaded: true,
                file: generatedName,
                fileName: generatedName,
                file_name: generatedName,
                size: d.size && d.size !== '-' && d.size !== 'Not uploaded' ? d.size : '1.4 MB',
                is_sevak_upload: isSevak || d.is_sevak_upload,
                isSevakUpload: isSevak || d.isSevakUpload,
                uploaded_by_role: isSevak ? 'AROGYA_SEVAK' : (d.uploaded_by_role || 'CITIZEN'),
                uploaderRole: isSevak ? 'ArogyaSevak' : (d.uploaderRole || 'Citizen'),
                uploadedBy: isSevak ? 'sevak' : (d.uploadedBy || 'citizen'),
                by: isSevak ? targetSevakName : (d.by || c.applicant || 'Citizen'),
                source: isSevak ? 'ArogyaSevak Upload' : (d.source || 'Citizen Upload'),
                status: 'UPLOADED_PENDING_VERIFICATION',
                document_status: 'UPLOADED_PENDING_VERIFICATION',
                statusText: isSevak ? `Uploaded by ArogyaSevak (${targetSevakName}) — Ready for Verification` : 'Uploaded by Citizen — Ready for Verification',
                uploadedAt: 'Just now'
              };
            }
            return d;
          });

          if (!matched) {
            updatedDocs.push({
              id: `DOC-UPL-${Date.now().toString().slice(-4)}`,
              name: docName,
              title: docName,
              file: generatedName,
              fileName: generatedName,
              file_name: generatedName,
              size: '1.4 MB',
              uploaded: true,
              verified: false,
              is_sevak_upload: isSevak,
              isSevakUpload: isSevak,
              uploaded_by_role: isSevak ? 'AROGYA_SEVAK' : 'CITIZEN',
              uploaderRole: isSevak ? 'ArogyaSevak' : 'Citizen',
              uploadedBy: isSevak ? 'sevak' : 'citizen',
              by: isSevak ? targetSevakName : (c.applicant || 'Citizen'),
              source: isSevak ? 'ArogyaSevak Upload' : 'Citizen Upload',
              status: 'UPLOADED_PENDING_VERIFICATION',
              document_status: 'UPLOADED_PENDING_VERIFICATION',
              statusText: isSevak ? `Uploaded by ArogyaSevak (${targetSevakName}) — Ready for Verification` : 'Uploaded by Citizen — Ready for Verification',
              uploadedAt: 'Just now'
            });
          }

          const uploaderTitle = isSevak ? `ArogyaSevak (${targetSevakName})` : `Citizen (${c.applicant || 'Applicant'})`;

          return {
            ...c,
            documents: updatedDocs,
            lastUpdate: 'Just now',
            timeline: [
              ...(c.timeline || []).map(t => ({ ...t, current: false })),
              {
                title: `${uploaderTitle} uploaded "${docName}"`,
                time: 'Just now',
                completed: true,
                current: true
              }
            ]
          };
        }
        return c;
      })
    }));

    showToast(`${uploaderRole === 'ArogyaSevak' ? 'ArogyaSevak' : 'Citizen'} uploaded "${docName}". Ready for verification ✓`, 'info');
  };

  const approveCase = async (caseId, { scheme, hospital, sevak, note, admissionDate }) => {
    const rawSevak = typeof sevak === 'string' ? sevak : (sevak?.sevak_name || sevak?.name || '');
    const cleanSevakName = rawSevak.includes('—') ? rawSevak.split('—')[0].trim() : (rawSevak || 'Not assigned');

    let targetScheme = scheme || 'MJPJAY';
    let targetHospital = hospital || 'City Care Hospital, Pune';

    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId) {
          targetScheme = scheme || c.scheme || 'MJPJAY';
          targetHospital = hospital || c.hospital || 'City Care Hospital, Pune';
          const prevTimeline = (c.timeline || []).map((t) => ({
            ...t,
            completed: true,
            current: false
          }));
          return {
            ...c,
            scheme: targetScheme,
            assignedScheme: { name: targetScheme },
            assigned_scheme: targetScheme,
            status: 'Approved',
            statusClass: 'status-active',
            isUrgentRow: false,
            isReviewScreenCase: false,
            hospital: targetHospital,
            assignedHospital: targetHospital,
            assigned_hospital: targetHospital,
            assignedSevak: cleanSevakName,
            sevak: cleanSevakName,
            documents: (c.documents || []).map((d) => ({
              ...d,
              verified: true,
              status: 'VERIFIED',
              document_status: 'VERIFIED',
              statusText: 'Verified ✓'
            })),
            admissionDate: admissionDate || formatDateDDMMYYYY(new Date()),
            notes: note ? [note, ...(c.notes || [])] : c.notes,
            lastUpdate: 'Just now',
            timeline: [
              ...prevTimeline,
              {
                title: `Case Approved — Scheme: ${targetScheme}, Assigned to ${cleanSevakName} at ${targetHospital}`,
                time: 'Just now',
                completed: true,
                current: true
              }
            ]
          };
        }
        return c;
      }),
      arogyaSevaks: prev.arogyaSevaks.map((s) => {
        if (cleanSevakName.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cleanSevakName.toLowerCase())) {
          return {
            ...s,
            patients: s.patients + 1
          };
        }
        return s;
      }),
      metrics: {
        ...prev.metrics,
        pendingReview: Math.max(0, prev.metrics.pendingReview - 1),
        activeCases: prev.metrics.activeCases + 1
      }
    }));

    try {
      applicationService.invalidateApplicationsCache();
      await applicationService.assignApplication(caseId, {
        hospitalName: targetHospital,
        sevakName: cleanSevakName,
        scheme: targetScheme,
        admissionDate: admissionDate || formatDateDDMMYYYY(new Date()),
        assignmentNotes: note,
        remarks: note
      });
    } catch (err) {
      console.warn('[AdminContext] approveCase assign sync notice:', err.message);
    }

    try {
      await applicationService.updateApplicationStatus(caseId, {
        status: 'APPROVED',
        remarks: note || `Approved under ${targetScheme} - Case Approved by Admin`,
        hospital: targetHospital,
        sevak: cleanSevakName,
        assignedScheme: targetScheme
      });
      await fetchCases();
      await fetchApplicationStats();
    } catch (err) {
      console.warn('[AdminContext] approveCase status sync notice:', err.message);
    }

    showToast(`Case ${caseId} approved under ${targetScheme} & assigned to ${cleanSevakName}! Status: Approved`, 'success');
  };

  const rejectCase = async (caseId, reason = '') => {
    const rejectionReason =
      reason?.trim() ||
      'Application does not meet the eligibility criteria for government healthcare schemes / सदर अर्ज कोणत्याही शासकीय आरोग्य योजनेच्या निकषात बसत नाही.';

    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId) {
          const prevTimeline = (c.timeline || []).map((t) => ({
            ...t,
            completed: true,
            current: false,
          }));
          return {
            ...c,
            status: 'Rejected',
            statusClass: 'status-rejected',
            isLocked: true,
            isUrgentRow: false,
            isReviewScreenCase: false,
            rejectedDate: new Date().toISOString(),
            rejectionReason,
            notes: [`✕ [REJECTION NOTE] ${rejectionReason}`, ...(c.notes || [])],
            lastUpdate: 'Just now',
            timeline: [
              ...prevTimeline,
              {
                title: `Case Rejected: ${rejectionReason}`,
                time: 'Just now',
                completed: true,
                current: false,
              },
            ],
          };
        }
        return c;
      }),
      metrics: {
        ...prev.metrics,
        pendingReview: Math.max(0, prev.metrics.pendingReview - 1),
        rejectedCases: (prev.metrics.rejectedCases || 0) + 1,
      },
    }));

    try {
      applicationService.invalidateApplicationsCache();
      await applicationService.updateStatus(caseId, {
        status: 'REJECTED',
        reason: rejectionReason,
        remarks: rejectionReason,
      });
      await fetchCases();
      await fetchApplicationStats();
    } catch (err) {
      console.warn('[AdminContext] rejectCase backend sync notice:', err.message);
    }

    showToast(`Case ${caseId} marked as Rejected. Citizen has been notified.`, 'error');
  };

  const holdCase = async (caseId, reason = '') => {
    const holdReason = reason?.trim() || 'Case placed on hold pending additional verification';
    setData((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: 'Docs Required',
            statusClass: 'status-docs-required',
            isUrgentRow: true,
            notes: [`⏳ [HOLD NOTE] ${holdReason}`, ...(c.notes || [])],
            lastUpdate: 'Just now',
          };
        }
        return c;
      }),
    }));

    try {
      applicationService.invalidateApplicationsCache();
      await applicationService.updateStatus(caseId, {
        status: 'DOCS_REQUIRED',
        reason: holdReason,
        remarks: holdReason,
      });
      await fetchCases();
      await fetchApplicationStats();
    } catch (err) {
      console.warn('[AdminContext] holdCase backend sync notice:', err.message);
    }

    showToast(`Case ${caseId} placed on hold.`, 'warning');
  };

  const getReopenInfo = (caseItem) => {
    if (!caseItem) return { isRejected: false, isReopenable: false, isArchived: false, daysRemaining: 0, displayStatus: 'Submitted', reopenRequested: false, reopenRequestReason: '' };

    const rawStatus = String(caseItem.status || caseItem.current_status || '').toUpperCase();
    const isRejectedState = rawStatus === 'REJECTED' || caseItem.status === 'Rejected';
    const isArchivedState = rawStatus === 'ARCHIVED' || rawStatus === 'CLOSED_EXPIRED' || caseItem.status === 'Archived' || caseItem.status === 'Closed (Expired)';
    const reopenRequested = Boolean(caseItem.reopenRequested || caseItem.reopen_requested || caseItem.reopenInfo?.reopenRequested);
    const reopenRequestReason = caseItem.reopenRequestReason || caseItem.reopen_request_reason || caseItem.reopenInfo?.reopenRequestReason || '';

    if (!isRejectedState && !isArchivedState) {
      return {
        isRejected: false,
        isReopenable: false,
        isArchived: false,
        daysRemaining: 0,
        displayStatus: caseItem.status,
        reopenRequested: false,
        reopenRequestReason: '',
      };
    }

    let rejectedTimestamp;
    if (caseItem.rejectedDate && !isNaN(new Date(caseItem.rejectedDate).getTime())) {
      rejectedTimestamp = new Date(caseItem.rejectedDate).getTime();
    } else if (caseItem.closed_at && !isNaN(new Date(caseItem.closed_at).getTime())) {
      rejectedTimestamp = new Date(caseItem.closed_at).getTime();
    } else if (caseItem.updated_at && !isNaN(new Date(caseItem.updated_at).getTime())) {
      rejectedTimestamp = new Date(caseItem.updated_at).getTime();
    } else {
      rejectedTimestamp = Date.now() - 14 * 24 * 60 * 60 * 1000;
    }

    const daysElapsed = Math.floor((Date.now() - rejectedTimestamp) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 60 - daysElapsed);

    if (daysRemaining > 0 && !isArchivedState) {
      return {
        isRejected: true,
        isReopenable: true,
        isArchived: false,
        daysRemaining,
        daysElapsed,
        displayStatus: `Rejected (${daysRemaining}d Left to Reopen)`,
        reopenRequested,
        reopenRequestReason,
      };
    } else {
      return {
        isRejected: false,
        isReopenable: false,
        isArchived: true,
        daysRemaining: 0,
        daysElapsed,
        displayStatus: 'Archived (60d Window Expired)',
        reopenRequested: false,
        reopenRequestReason: '',
      };
    }
  };

  const reopenCase = async (caseId, noteText = '') => {
    let restoredState = 'Submitted';
    const reopenReason = noteText?.trim() || 'Case reopened within 60-day eligibility window and restored to review queue / ६० दिवसांच्या मुदतीत अर्ज फेरविचारासाठी पुन्हा उघडला.';

    setData((prev) => {
      const target = prev.cases.find((c) => c.id === caseId);
      if (target) {
        restoredState = target.previousStatus && target.previousStatus !== 'Rejected' ? target.previousStatus : 'Submitted';
      }

      try {
        patientService.updatePatient(caseId, {
          status: restoredState,
          lastUpdated: 'Just now'
        });
        patientService.addPatientNote(caseId, `[ADMIN NOTICE] ${reopenReason}`);
      } catch (e) {
        console.log('Syncing patientService on reopen:', e);
      }

      return {
        ...prev,
        cases: prev.cases.map((c) => {
          if (c.id === caseId) {
            const prevTimeline = (c.timeline || []).map((t) => ({
              ...t,
              completed: true,
              current: false
            }));
            const finalRestored = c.previousStatus && c.previousStatus !== 'Rejected' ? c.previousStatus : 'Submitted';
            return {
              ...c,
              status: finalRestored,
              isLocked: false,
              isUrgentRow: finalRestored === 'Docs Required',
              isReviewScreenCase: finalRestored === 'Under Review' || finalRestored === 'Pending Review',
              rejectedDate: null,
              notes: [`🔄 [REOPENED] ${reopenReason}`, ...(c.notes || [])],
              lastUpdate: 'Just now',
              timeline: [
                ...prevTimeline,
                {
                  title: `Case Reopened within 60-day window — Restored to "${finalRestored}"`,
                  time: 'Just now',
                  completed: true,
                  current: true
                }
              ]
            };
          }
          return c;
        }),
        metrics: {
          ...prev.metrics,
          pendingReview: prev.metrics.pendingReview + (restoredState === 'Under Review' || restoredState === 'Pending Review' || restoredState === 'Submitted' ? 1 : 0),
          rejectedCases: Math.max(0, (prev.metrics.rejectedCases || 1) - 1)
        }
      };
    });

    try {
      applicationService.invalidateApplicationsCache();
      await api.post(`/applications/${encodeURIComponent(caseId)}/reopen`, {
        reason: reopenReason,
      });
      await fetchCases();
      await fetchApplicationStats();
    } catch (err) {
      console.warn('[AdminContext] reopenCase backend sync note:', err.message);
      // Fallback
      try {
        await applicationService.updateStatus(caseId, {
          status: 'UNDER_REVIEW',
          reason: reopenReason,
          remarks: reopenReason,
        });
        await fetchCases();
        await fetchApplicationStats();
      } catch (_) { }
    }

    showToast(`Case ${caseId} reopened & restored to active review!`, 'success');
  };

  const addHospital = (newHosp) => {
    const specs = Array.isArray(newHosp.specialties)
      ? newHosp.specialties
      : typeof newHosp.specialties === 'string'
        ? newHosp.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
        : ['General Medicine'];

    const hospName = (newHosp.name || '').trim();
    const hospId = newHosp.id || newHosp.hospital_code || `HOSP-${hospName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const hospRecord = {
      id: hospId,
      hospital_code: newHosp.hospital_code || hospId,
      name: hospName,
      type: newHosp.type || 'Government',
      location: newHosp.location || 'Pune',
      areaTaluka: newHosp.areaTaluka || 'Haveli Taluka',
      pincode: newHosp.pincode || '411004',
      address: newHosp.address || `${hospName}, ${newHosp.location || ''}`,
      nearestLandmark: newHosp.nearestLandmark || '',
      scheme: newHosp.scheme || 'PM-JAY, MJPJAY',
      specialties: specs.length > 0 ? specs : ['General Medicine'],
      sevak: newHosp.sevak || 'Not assigned',
      assigned_sevaks: newHosp.assigned_sevaks || [],
      activeCases: newHosp.activeCases || 0,
      bedsAvailable: newHosp.bedsAvailable || 15,
      contact: newHosp.contact || '020-12345678',
      doctors: newHosp.doctors || []
    };
    setData((prev) => {
      const filtered = (prev.hospitals || []).filter(
        (h) => h.id !== hospRecord.id && h.name?.toLowerCase().trim() !== hospName.toLowerCase()
      );
      return {
        ...prev,
        hospitals: [hospRecord, ...filtered]
      };
    });
    showToast(`Hospital "${hospName}" empanelled successfully!`);
  };

  const deleteHospital = (hospId) => {
    const hospName = data.hospitals.find((h) => h.id === hospId)?.name || 'Hospital';
    try {
      hospitalService.deleteHospital(hospId);
    } catch (e) {
      console.log('Error deleting hospital service cache:', e);
    }
    setData((prev) => ({
      ...prev,
      hospitals: prev.hospitals.filter((h) => h.id !== hospId)
    }));
    showToast(`Hospital "${hospName}" removed from directory`, 'warning');
  };

  const updateArogyaSevak = async (sevakId, updatedData) => {
    const payload = {
      full_name: (updatedData.name || updatedData.full_name || '').trim(),
      mobile: (updatedData.mobile || updatedData.phone || '').trim().replace(/\D/g, ''),
      email: updatedData.email !== undefined ? (updatedData.email ? updatedData.email.trim() : null) : undefined,
      address: (updatedData.address || updatedData.street_address || '').trim(),
      city: (updatedData.city || '').trim(),
      taluka: (updatedData.taluka || '').trim(),
      district: (updatedData.district || '').trim(),
      landmark: (updatedData.landmark || '').trim() || undefined,
      status: updatedData.status ? (updatedData.status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') : 'ACTIVE',
    };

    try {
      const res = await api.put(`/admins/arogya-sevaks/${sevakId}`, payload);
      showToast(`ArogyaSevak "${payload.full_name}" updated successfully!`);
      fetchArogyaSevaks().catch(() => { });
      return res?.data || res;
    } catch (err) {
      console.warn('Backend API update notice:', err.message);
      const isMock = String(sevakId).startsWith('SEVAK-');
      setData((prev) => ({
        ...prev,
        arogyaSevaks: prev.arogyaSevaks.map((s) =>
          s.id === sevakId || s.sevakId === sevakId
            ? {
              ...s,
              ...updatedData,
              name: payload.full_name,
              mobile: payload.mobile,
              email: payload.email || '',
              address: payload.address,
              city: payload.city,
              taluka: payload.taluka,
              district: payload.district,
              landmark: payload.landmark || '',
              status: payload.status === 'INACTIVE' ? 'Inactive' : 'Active',
              rawStatus: payload.status,
              fullAddress: [payload.address, payload.taluka, payload.city, payload.district].filter(Boolean).join(', ')
            }
            : s
        )
      }));

      if (isMock) {
        showToast(`ArogyaSevak "${payload.full_name}" updated locally!`);
        return;
      }
      throw err;
    }
  };

  const deleteArogyaSevak = (sevakId) => {
    const sevakName = data.arogyaSevaks.find((s) => s.id === sevakId)?.name || 'Sevak';
    setData((prev) => ({
      ...prev,
      arogyaSevaks: prev.arogyaSevaks.filter((s) => s.id !== sevakId)
    }));
    showToast(`ArogyaSevak "${sevakName}" deleted`, 'warning');
  };

  const addArogyaSevak = async (newSevak) => {
    const cleanMobile = (newSevak.mobile || '').replace(/\D/g, '');
    const cleanName = (newSevak.name || newSevak.full_name || '').trim();

    const payload = {
      full_name: cleanName,
      mobile: cleanMobile,
      email: newSevak.email ? newSevak.email.trim() : undefined,
      address: newSevak.address,
      city: newSevak.city,
      taluka: newSevak.taluka,
      district: newSevak.district,
      landmark: newSevak.landmark || undefined,
    };

    try {
      const res = await api.post('/admins/arogya-sevaks', payload);
      const createdData = res?.data || res;
      const createdSevak = {
        id: createdData.id || createdData.user_id || `SEVAK-${Date.now()}`,
        name: cleanName,
        full_name: cleanName,
        hospital: '—',
        mobile: cleanMobile,
        email: newSevak.email || '',
        address: newSevak.address,
        city: newSevak.city,
        taluka: newSevak.taluka,
        district: newSevak.district,
        landmark: newSevak.landmark,
        patients: 0,
        status: 'Active',
      };
      setData((prev) => {
        const filtered = (prev.arogyaSevaks || []).filter(
          (s) => s.id !== createdSevak.id && s.mobile !== cleanMobile
        );
        return {
          ...prev,
          arogyaSevaks: [createdSevak, ...filtered]
        };
      });
      showToast(`ArogyaSevak "${cleanName}" registered successfully!`);
      // Sync in background without blocking modal close
      fetchArogyaSevaks().catch(() => { });
      return createdData;
    } catch (err) {
      console.warn('Backend API registration notice:', err.message);
      throw err;
    }
  };

  const addAdmin = async (newAdmin) => {
    const payload = {
      full_name: (newAdmin.fullname || newAdmin.name || newAdmin.full_name || '').trim(),
      mobile: (newAdmin.mobile || '').replace(/\D/g, ''),
      email: newAdmin.email ? newAdmin.email.trim() : undefined,
      address: (newAdmin.streetAddress || newAdmin.address || newAdmin.street_address || '').trim() || undefined,
      city: (newAdmin.city || '').trim() || undefined,
      taluka: (newAdmin.taluka || '').trim() || undefined,
      district: (newAdmin.district || '').trim() || undefined,
      landmark: (newAdmin.landmark || '').trim() || undefined,
    };

    try {
      const res = await api.post('/admins', payload);
      const created = res?.data || res;
      showToast(`System Admin "${payload.full_name}" registered successfully!`);
      await fetchAdmins();
      return created;
    } catch (err) {
      console.error('Admin registration error:', err?.response?.data || err.message);
      throw err;
    }
  };

  const deleteAdmin = (adminId) => {
    const adminName = data.users.find((u) => u.id === adminId)?.name || 'Admin';
    setData((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== adminId)
    }));
    showToast(`Admin "${adminName}" removed`, 'warning');
  };

  const updateAdmin = (adminId, updatedData) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === adminId ? { ...u, ...updatedData } : u
      )
    }));
    showToast(`Admin details updated successfully!`);
  };

  const updateMlaPhoto = async (photoInput) => {
    try {
      if (photoInput instanceof File) {
        const res = await leadershipService.uploadMlaPhoto(photoInput);
        const uploadedUrl = res?.data?.photoUrl;
        if (uploadedUrl) {
          try {
            await leadershipService.updateMlaPhotoUrl(uploadedUrl);
          } catch (e) {
            console.warn('[AdminContext] updateMlaPhotoUrl note:', e?.message);
          }
          localStorage.setItem('arogya_mla_photo', uploadedUrl);
          setData((prev) => ({
            ...prev,
            mlaPhoto: uploadedUrl,
            mlaProfile: {
              ...(prev.mlaProfile || {}),
              photoUrl: uploadedUrl,
            },
          }));
          showToast(`Hon. MLA photo uploaded & saved successfully!`);
          return uploadedUrl;
        }
      } else if (typeof photoInput === 'string') {
        if (photoInput.startsWith('http://') || photoInput.startsWith('https://') || photoInput === '/ravindra_chavan.png') {
          await leadershipService.updateMlaPhotoUrl(photoInput);
        }
        localStorage.setItem('arogya_mla_photo', photoInput);
        setData((prev) => ({
          ...prev,
          mlaPhoto: photoInput,
          mlaProfile: {
            ...(prev.mlaProfile || {}),
            photoUrl: photoInput,
          },
        }));
        showToast(`Hon. MLA photo updated successfully!`);
      }
    } catch (err) {
      console.error('[AdminContext] Error updating MLA photo:', err);
      if (typeof photoInput === 'string') {
        localStorage.setItem('arogya_mla_photo', photoInput);
        setData((prev) => ({ ...prev, mlaPhoto: photoInput }));
      }
      showToast(err.message || `Photo update failed`, 'warning');
    }
  };

  const updateMlaProfile = async (profileInput) => {
    try {
      const res = await leadershipService.updateMlaProfile(profileInput);
      const updatedProfile = res?.data || profileInput;
      if (updatedProfile?.photoUrl) {
        localStorage.setItem('arogya_mla_photo', updatedProfile.photoUrl);
      }
      setData((prev) => ({
        ...prev,
        mlaProfile: {
          ...(prev.mlaProfile || {}),
          ...updatedProfile,
        },
        mlaPhoto: updatedProfile.photoUrl || prev.mlaPhoto,
      }));
      showToast('Patron leadership profile updated & synchronized successfully!');
      return updatedProfile;
    } catch (err) {
      console.error('[AdminContext] Error updating MLA profile:', err);
      // Optimistic fallback
      setData((prev) => ({
        ...prev,
        mlaProfile: {
          ...(prev.mlaProfile || {}),
          ...profileInput,
        },
      }));
      showToast(err.message || 'Profile updated locally', 'warning');
      return profileInput;
    }
  };

  const addScheme = async (newScheme) => {
    let createdRecord = null;
    try {
      const res = await schemeService.createScheme(newScheme);
      if (res?.data) {
        createdRecord = res.data;
      }
    } catch (err) {
      console.warn('[AdminContext] API createScheme failed, applying local resilience:', err.message);
    }

    if (!createdRecord) {
      createdRecord = {
        id: `SCHEME-${Date.now()}`,
        code: newScheme.code?.toUpperCase() || 'SCHEME',
        name: newScheme.name || 'New Health Scheme',
        category: newScheme.category || 'State Flagship Scheme',
        coverageAmount: newScheme.coverageAmount || '₹1,50,000 / family / year',
        maxCoverageVal: Number(newScheme.maxCoverageVal) || 150000,
        description: newScheme.description || 'Healthcare assistance scheme for eligible citizens.',
        eligibility: newScheme.eligibility || 'Eligible residents with valid ID proof',
        hotline: newScheme.hotline || '1800-111-222',
        beneficiariesEnrolled: '0',
        requiredDocuments: Array.isArray(newScheme.requiredDocuments) && newScheme.requiredDocuments.length > 0
          ? newScheme.requiredDocuments
          : ['Aadhaar Card', 'Ration Card (Orange / Yellow / Antyodaya)'],
        status: newScheme.status || 'Active'
      };
    }

    setData((prev) => ({
      ...prev,
      schemes: [createdRecord, ...(prev.schemes || []).filter((s) => s.id !== createdRecord.id)]
    }));
    showToast(`Scheme "${createdRecord.code} - ${createdRecord.name}" registered successfully!`);
    return createdRecord;
  };

  const updateScheme = async (schemeId, updatedData) => {
    try {
      await schemeService.updateScheme(schemeId, updatedData);
    } catch (err) {
      console.warn('[AdminContext] API updateScheme failed:', err.message);
    }

    setData((prev) => ({
      ...prev,
      schemes: (prev.schemes || []).map((s) =>
        s.id === schemeId ? { ...s, ...updatedData } : s
      )
    }));
    showToast(`Scheme details updated successfully!`);
  };

  const deleteScheme = async (schemeId) => {
    const schemeCode = (data.schemes || []).find((s) => s.id === schemeId)?.code || 'Scheme';
    try {
      await schemeService.deleteScheme(schemeId);
    } catch (err) {
      console.warn('[AdminContext] API deleteScheme failed:', err.message);
    }

    setData((prev) => ({
      ...prev,
      schemes: (prev.schemes || []).filter((s) => s.id !== schemeId)
    }));
    showToast(`Scheme "${schemeCode}" removed`, 'warning');
  };

  const toggleSchemeStatus = async (schemeId) => {
    try {
      await schemeService.toggleSchemeStatus(schemeId);
    } catch (err) {
      console.warn('[AdminContext] API toggleSchemeStatus failed:', err.message);
    }

    setData((prev) => ({
      ...prev,
      schemes: (prev.schemes || []).map((s) => {
        if (s.id === schemeId) {
          const nextStatus = s.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`Scheme "${s.code}" status changed to ${nextStatus}`);
          return { ...s, status: nextStatus };
        }
        return s;
      })
    }));
  };

  const createEscalationRequest = (payload) => {
    const newId = `ESC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReq = {
      id: newId,
      caseId: payload.caseId || `CAS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: payload.patientName || 'Patient',
      ageGender: payload.ageGender || '',
      ward: payload.ward || '',
      scheme: payload.scheme || 'MJPJAY',
      schemeLimit: payload.schemeLimit || '',
      reasonType: payload.reasonType,
      reasonTitle: payload.reasonType === 'bill_exceeded' ? 'Hospital Bill Exceeds Scheme Ceiling' : 'Specialty / Facility Unavailable',
      reasonBadge: payload.reasonType === 'bill_exceeded' ? 'Bill Ceiling Exceeded' : 'Specialty Unavailable',
      status: 'on_hold',
      statusLabel: 'On Hold',
      statusBadge: 'Admin Review',
      requiredSpecialty: payload.requiredSpecialty || '',
      remarks: payload.remarks || '',
      attachment: payload.attachmentName || '',
      submittedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      submittedBy: payload.submittedBy || 'Arogya Sevak',
      hospitalId: payload.hospitalId || '',
      hospitalName: payload.hospitalName || 'Empanelled Hospital',
      patientLat: payload.patientLat || 18.5204,
      patientLng: payload.patientLng || 73.8567,
      estimatedBill: payload.estimatedBill || ''
    };

    setData((prev) => ({
      ...prev,
      escalationRequests: [newReq, ...(prev.escalationRequests || [])]
    }));
    showToast(`Administrative intervention request #${newId} submitted successfully!`);
  };

  const resolveBillEscalation = async (requestId, resolutionType, details) => {
    let resolvedTargetId = requestId;
    setData((prev) => {
      const targetReq = (prev.escalationRequests || []).find((r) =>
        r.id === requestId || r.uuid === requestId || r.shortId === requestId || r.caseId === requestId
      );
      if (targetReq?.uuid) {
        resolvedTargetId = targetReq.uuid;
      }
      let desc = '';
      if (resolutionType === 'cmrf' || resolutionType === 'scheme_topup') {
        desc = `Supplementary Grant Sanctioned: Chief Minister Relief Fund (CMRF) (${details.amount ? `₹${details.amount}` : 'Full Exceeded Balance'})`;
      } else if (resolutionType === 'others') {
        desc = `Alternative Financial Strategy (Others): ${details.sevakNote ? `Note for Sevak: "${details.sevakNote}"` : (details.notes || 'Custom Resolution')}`;
      } else if (resolutionType === 'copay') {
        desc = `Applicant Co-Pay Recorded: ₹${details.amount || '15,000'} to be paid by applicant/family; balance sanctioned.`;
      } else {
        desc = `Special Administrative Grant Approved: ₹${details.amount || '35,000'}.`;
      }

      const updatedEsc = (prev.escalationRequests || []).map((req) => {
        if (req.id === requestId || req.uuid === requestId || req.shortId === requestId || req.caseId === requestId) {
          return {
            ...req,
            status: 'resolved',
            statusLabel: 'Resolved',
            statusBadge: 'Admin Approved',
            resolutionNotes: `${desc} — ${details.notes || 'Admin decision completed.'}`,
            resolvedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            resolvedBy: prev.operator?.name ? `${prev.operator.name} (Admin)` : 'System Admin'
          };
        }
        return req;
      });

      const targetCaseId = targetReq ? targetReq.caseId : requestId;
      const updatedCases = (prev.cases || []).map((c) => {
        if (c.id === targetCaseId || c.id === requestId || c.applicationNumber === targetCaseId) {
          return {
            ...c,
            status: 'Bill Resolved & Approved',
            statusClass: 'status-coordinated',
            lastUpdate: 'Just now',
            isUrgentRow: false,
            isBillResolved: true,
            notes: [`[ADMIN BILL RESOLUTION] ${desc}. Approved by ${prev.operator?.name || 'Admin'}.`, ...(c.notes || [])],
            timeline: [
              ...(c.timeline || []).map(t => ({ ...t, completed: true, current: false })),
              { title: 'Admin Scheme Budget Sanctioned', time: 'Just now', completed: true, current: true }
            ]
          };
        }
        return c;
      });

      const billFollowUp = {
        id: `FU-BILL-${Date.now()}`,
        name: `${targetReq?.submittedBy || 'ArogyaSevak'} (${targetReq?.hospitalName || 'Hospital'})`,
        caseId: targetCaseId,
        note: `💰 [BILL EXCEEDED RESOLUTION] ${desc}. Scheme limit sanction approved by Admin (${prev.operator?.name || 'Admin'}). Patient cashless coverage confirmed.`,
        status: 'Bill Resolved',
        statusType: 'urgent',
        phone: targetReq?.contact || '98765 43210',
        date: 'Just now',
        callTarget: 'sevak',
        type: 'bill_resolution',
        priority: 'High',
        hospital: targetReq?.hospitalName,
        scheme: targetReq?.scheme || 'PM-JAY'
      };

      return {
        ...prev,
        escalationRequests: updatedEsc,
        cases: updatedCases,
        pendingFollowUps: [billFollowUp, ...(prev.pendingFollowUps || [])]
      };
    });

    try {
      await escalationService.resolveEscalation(resolvedTargetId || requestId, {
        resolutionNotes: details.notes || 'Admin bill resolution approved',
        resolutionType,
        sanctionedScheme: details.schemeCode || 'CMRF',
        copayAmount: details.amount || '0',
        status: 'RESOLVED',
      });
      fetchEscalationRequests();
      fetchCases();
    } catch (e) {
      console.warn('[AdminContext] Sync resolution warning:', e.message);
    }

    showToast(`Request #${requestId} resolved at administrative level successfully! Case & Follow-Up updated.`);
  };

  const transferHospitalEscalation = async (requestId, targetHospital, newSevakName, notesOrOptions, maybeOptions) => {
    let resolvedTargetId = requestId;

    let notes = '';
    let prevSevakNote = '';
    let newSevakNote = '';

    if (typeof notesOrOptions === 'string') {
      notes = notesOrOptions;
    } else if (notesOrOptions && typeof notesOrOptions === 'object') {
      prevSevakNote = notesOrOptions.prevSevakNote || '';
      newSevakNote = notesOrOptions.newSevakNote || '';
      notes = notesOrOptions.notes || notesOrOptions.resolutionNotes || '';
    }

    if (maybeOptions && typeof maybeOptions === 'object') {
      prevSevakNote = maybeOptions.prevSevakNote || prevSevakNote;
      newSevakNote = maybeOptions.newSevakNote || newSevakNote;
    }

    setData((prev) => {
      const targetReq = (prev.escalationRequests || []).find((r) =>
        r.id === requestId || r.uuid === requestId || r.shortId === requestId || r.caseId === requestId
      );
      if (targetReq?.uuid) {
        resolvedTargetId = targetReq.uuid;
      }
      const prevHospital = targetReq ? targetReq.hospitalName : 'Current Hospital';
      const prevSevak = targetReq ? targetReq.submittedBy : 'Previous Arogya Sevak';
      const targetCaseId = targetReq ? targetReq.caseId : requestId;
      const patientName = targetReq ? targetReq.patientName : 'Patient';

      const updatedEsc = (prev.escalationRequests || []).map((req) => {
        if (req.id === requestId || req.uuid === requestId || req.shortId === requestId || req.caseId === requestId) {
          return {
            ...req,
            status: 'resolved',
            statusLabel: 'Resolved',
            statusBadge: 'Reassigned Hospital',
            assignedNewHospital: targetHospital.name,
            assignedNewSevak: newSevakName,
            prevSevakNote: prevSevakNote || undefined,
            newSevakNote: newSevakNote || undefined,
            resolutionNotes: `Case successfully resolved & transferred due to specialty availability. Old Sevak (${prevSevak}) notified of handover.${prevSevakNote ? ` [Note for Old Sevak: "${prevSevakNote}"]` : ''} New Sevak (${newSevakName}) assigned at "${targetHospital.name}".${newSevakNote ? ` [Note for New Sevak: "${newSevakNote}"]` : ''}`,
            resolvedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            resolvedBy: prev.operator?.name ? `${prev.operator.name} (Admin)` : 'System Admin'
          };
        }
        return req;
      });

      const oldSevakLog = `[OLD SEVAK HANDOVER - ${prevSevak}]: Specialty unavailable at ${prevHospital}. Case transferred to ${targetHospital.name}.${prevSevakNote ? ` Admin Note: "${prevSevakNote}"` : ''}`;
      const newSevakLog = `[NEW SEVAK INTAKE - ${newSevakName}]: Case assigned to ${targetHospital.name}.${newSevakNote ? ` Admin Note: "${newSevakNote}"` : ''}`;

      const updatedCases = (prev.cases || []).map((c) => {
        if (c.id === targetCaseId || c.id === requestId || c.applicationNumber === targetCaseId) {
          return {
            ...c,
            hospital: targetHospital.name,
            hospitalShort: targetHospital.name,
            assignedHospital: targetHospital.name,
            previousHospital: prevHospital || 'Govind Kale Hospital',
            assignedSevak: newSevakName,
            previousSevak: prevSevak,
            isTransferred: true,
            status: 'Reassigned & Coordinated',
            statusClass: 'status-coordinated',
            lastUpdate: 'Just now',
            isUrgentRow: false,
            notes: [newSevakLog, oldSevakLog, ...(c.notes || [])],
            timeline: [
              ...(c.timeline || []).map(t => ({ ...t, completed: true, current: false })),
              { title: `Transferred to ${targetHospital.name} (New Sevak: ${newSevakName})`, time: 'Just now', completed: true, current: true }
            ]
          };
        }
        return c;
      });

      const newFollowUps = [
        {
          id: `FU-TEL-${Date.now()}-1`,
          name: `${prevSevak} (Previous Arogya Sevak)`,
          caseId: targetCaseId,
          note: `🚨 [OLD SEVAK HANDOVER NOTICE] Case ${targetCaseId} (${patientName}) transfer approved from ${prevHospital} to "${targetHospital.name}".${prevSevakNote ? ` Note: "${prevSevakNote}"` : ''}`,
          status: 'Handed Over',
          statusType: 'logged',
          phone: '98765 00001',
          date: 'Just now',
          callTarget: 'sevak',
          type: 'handover_notice',
          priority: 'High',
          hospital: prevHospital,
          scheme: targetReq?.scheme || 'MJPJAY'
        },
        {
          id: `FU-TEL-${Date.now()}-2`,
          name: `${newSevakName} (New Assigned Arogya Sevak)`,
          caseId: targetCaseId,
          note: `📥 [NEW SEVAK INTAKE NOTICE] Case ${targetCaseId} (${patientName}) assigned to you at "${targetHospital.name}".${newSevakNote ? ` Note: "${newSevakNote}"` : ''}`,
          status: 'Active Intake',
          statusType: 'urgent',
          phone: '98765 00002',
          date: 'Just now',
          callTarget: 'sevak',
          type: 'new_assignment',
          priority: 'Urgent',
          hospital: targetHospital.name,
        }
      ];

      return {
        ...prev,
        escalationRequests: updatedEsc,
        cases: updatedCases,
        pendingFollowUps: [...newFollowUps, ...(prev.pendingFollowUps || [])]
      };
    });

    try {
      await escalationService.resolveEscalation(resolvedTargetId || requestId, {
        resolutionNotes: notes || `Transferred to ${targetHospital.name} (${newSevakName})`,
        prevSevakNote: prevSevakNote || undefined,
        newSevakNote: newSevakNote || undefined,
        resolutionType: 'hospital_transfer',
        assignedHospitalName: targetHospital.name,
        assignedHospitalId: targetHospital.id,
        newSevakName: newSevakName,
        assignedSevakName: newSevakName,
        status: 'RESOLVED',
      });
      fetchEscalationRequests();
      fetchCases();

      api.post(`/admins/applications/${encodeURIComponent(requestId)}/assign`, {
        hospitalName: targetHospital.name,
        sevakName: newSevakName,
        assignmentNotes: `Transfer: ${notes || 'Reassigned to ' + targetHospital.name}`
      }).catch(e => console.warn('[AdminContext] sync reassignment notice:', e.message));
    } catch (e) {
      console.warn('[AdminContext] sync reassignment notice:', e.message);
    }

    showToast(`Specialty transfer resolved! Reassigned to ${targetHospital.name} (${newSevakName}). Both Sevaks notified.`);
  };

  const updateOperatorProfile = async (updatedProfile) => {
    setData((prev) => ({
      ...prev,
      operator: {
        ...prev.operator,
        ...updatedProfile,
        initials: updatedProfile.name
          ? updatedProfile.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
          : prev.operator.initials
      }
    }));

    if (updatedProfile.avatar !== undefined) {
      if (updatedProfile.avatar) {
        localStorage.setItem('arogya_admin_avatar', updatedProfile.avatar);
      } else {
        localStorage.removeItem('arogya_admin_avatar');
      }
    }

    try {
      const payload = {
        name: updatedProfile.name || updatedProfile.full_name,
        full_name: updatedProfile.name || updatedProfile.full_name,
        email: updatedProfile.email,
        phone: updatedProfile.phone || updatedProfile.mobile,
        mobile: updatedProfile.phone || updatedProfile.mobile,
        district: updatedProfile.district,
        address: updatedProfile.address || updatedProfile.streetAddress,
        streetAddress: updatedProfile.address || updatedProfile.streetAddress,
        city: updatedProfile.city,
        taluka: updatedProfile.taluka,
        landmark: updatedProfile.landmark,
        department: updatedProfile.department,
        designation: updatedProfile.role || updatedProfile.designation,
      };
      const res = await api.put('/admins/profile', payload);
      const resData = res?.data?.data || res?.data;
      if (resData) {
        const storedUser = localStorage.getItem('ward_arogya_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.full_name = resData.full_name || payload.full_name || parsed.full_name;
            parsed.name = resData.full_name || payload.full_name || parsed.name;
            parsed.email = resData.email || payload.email || parsed.email;
            parsed.mobile = resData.mobile || payload.mobile || parsed.mobile;
            localStorage.setItem('ward_arogya_user', JSON.stringify(parsed));
          } catch (_) { }
        }
      }
      showToast('Administrator profile updated successfully!');
      await fetchAdminProfile();
      return resData;
    } catch (err) {
      console.warn('Backend profile update notice:', err?.response?.data || err.message);
      showToast(err?.response?.data?.message || 'Administrator profile updated locally!');
      throw err;
    }
  };

  const assignSevaksToHospital = (hospitalId, selectedSevakList = []) => {
    // Deduplicate selectedSevakList strictly by ID and normalized Name
    const uniqueMap = new Map();
    (Array.isArray(selectedSevakList) ? selectedSevakList : []).forEach((s) => {
      const key = (typeof s === 'string' ? s : s.id || s.name || s.full_name || s.sevak_name || '').toString().toLowerCase().trim();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    const cleanSevakList = Array.from(uniqueMap.values());

    const targetHosp = (data.hospitals || []).find((h) =>
      String(h.id) === String(hospitalId) ||
      String(h.hospital_code || '') === String(hospitalId) ||
      (h.name && h.name.toLowerCase().trim() === String(hospitalId).toLowerCase().trim())
    );
    const hospName = targetHosp?.name || 'Hospital';

    const uniqueNames = Array.from(new Set(cleanSevakList.map((s) => (typeof s === 'string' ? s : s.name || s.full_name || s.sevak_name)).filter(Boolean)));
    const sevakNamesStr = uniqueNames.length > 0 ? uniqueNames.join(', ') : 'Not assigned';
    const sevakIds = cleanSevakList.map((s) => String(s.id || s));

    try {
      hospitalService.assignSevaksToHospital(hospitalId, cleanSevakList);
    } catch (e) {
      console.warn('Failed to update hospitalService cache:', e);
    }

    setData((prev) => {
      let foundHosp = false;
      const updatedHospitals = (prev.hospitals || []).map((h) => {
        if (String(h.id) === String(hospitalId) || String(h.hospital_code || '') === String(hospitalId)) {
          foundHosp = true;
          return {
            ...h,
            assignedSevaks: cleanSevakList,
            assigned_sevaks: cleanSevakList,
            sevak: sevakNamesStr || 'Not assigned',
            assigned_sevak_name: sevakNamesStr || 'Not assigned',
            sevakMobile: cleanSevakList.length > 0 ? cleanSevakList[0].mobile : '—',
          };
        }
        return h;
      });

      if (!foundHosp && targetHosp) {
        updatedHospitals.push({
          ...targetHosp,
          assignedSevaks: selectedSevakList,
          sevak: sevakNamesStr || 'Unassigned',
          sevakMobile: selectedSevakList.length > 0 ? selectedSevakList[0].mobile : '—'
        });
      }

      const updatedSevaks = (prev.arogyaSevaks || []).map((s) => {
        const isAssigned =
          sevakIds.includes(String(s.id)) ||
          selectedSevakList.some((sel) => sel.name === s.name || String(sel.id) === String(s.id));
        if (isAssigned) {
          return {
            ...s,
            hospital: hospName,
            status: 'Active',
          };
        } else if (s.hospital && targetHosp && s.hospital.toLowerCase().trim() === targetHosp.name.toLowerCase().trim()) {
          return {
            ...s,
            hospital: '—',
          };
        }
        return s;
      });

      return {
        ...prev,
        hospitals: updatedHospitals,
        arogyaSevaks: updatedSevaks,
      };
    });

    showToast(`Assigned ${selectedSevakList.length} ArogyaSevak(s) to ${hospName}`);
  };

  // Dynamically compute live metrics based on database applications and queue stats
  const dynamicMetrics = useMemo(() => {
    const rawCases = Array.isArray(data.cases) ? data.cases : [];
    const stats = applicationStats || {};

    // Check applications created today
    const todayStr = new Date().toDateString();
    const todayCount = rawCases.filter((c) => {
      const dt = c.created_at || c.createdAt || c.submittedAt || c.submittedDate;
      if (!dt) return false;
      const parsed = new Date(dt);
      return !isNaN(parsed.getTime()) && parsed.toDateString() === todayStr;
    }).length;

    const totalApplications = typeof stats.totalApplications === 'number'
      ? stats.totalApplications
      : rawCases.length;

    const submitted = typeof stats.submittedCount === 'number'
      ? stats.submittedCount
      : rawCases.filter(c => ['SUBMITTED', 'PENDING'].includes(String(c.status).toUpperCase().replace(/\s+/g, '_'))).length;

    const inReview = typeof stats.inReviewCount === 'number'
      ? stats.inReviewCount
      : rawCases.filter(c => ['UNDER_REVIEW', 'IN_REVIEW', 'UNDER REVIEW'].includes(String(c.status).toUpperCase())).length;

    const docsRequired = typeof stats.revertDocsRequiredCount === 'number'
      ? stats.revertDocsRequiredCount
      : rawCases.filter(c => ['DOCS_REQUIRED', 'REVERTED', 'ON_HOLD', 'DOCS REQUIRED'].includes(String(c.status).toUpperCase())).length;

    const approved = typeof stats.approvedCount === 'number'
      ? stats.approvedCount
      : rawCases.filter(c => ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'TREATMENT STARTED', 'ACTIVE'].includes(String(c.status).toUpperCase())).length;

    const closed = typeof stats.closedCount === 'number'
      ? stats.closedCount
      : rawCases.filter(c => ['CLOSED', 'COMPLETED'].includes(String(c.status).toUpperCase())).length;

    const rejected = typeof stats.rejectedCount === 'number'
      ? stats.rejectedCount
      : rawCases.filter(c => ['REJECTED'].includes(String(c.status).toUpperCase())).length;

    // Real, dynamic values without hardcoded or artificial overrides
    const pendingReviewTotal = inReview + submitted;
    const activeTotal = approved;
    const closedMonthTotal = closed;

    // IPD & OPD Cases calculation from live applications
    const ipd = rawCases.filter(c => c.admissionDate || (c.hospital && c.hospital !== '—' && ['APPROVED', 'TREATMENT_STARTED', 'ACTIVE'].includes(String(c.status).toUpperCase()))).length || (approved > 0 ? Math.ceil(approved * 0.6) : 0);
    const opd = Math.max(0, rawCases.length - ipd);

    return {
      totalApplications: totalApplications,
      newCasesToday: todayCount,
      pendingReview: pendingReviewTotal,
      docsRequired: docsRequired,
      activeCases: activeTotal,
      closedThisMonth: closedMonthTotal,
      rejectedCases: rejected,
      ipdCases: ipd,
      opdCases: opd,
      queueTotal: totalApplications,
      urgentFollowUps: (data.pendingFollowUps || []).filter(f => f.priority === 'Urgent' || f.statusType === 'urgent').length,
    };
  }, [data.cases, data.pendingFollowUps, applicationStats]);

  // Dynamically compute 7-day weekly trend from database application records
  const dynamicWeeklyTrend = useMemo(() => {
    const rawCases = Array.isArray(data.cases) ? data.cases : [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const countsByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    rawCases.forEach((c) => {
      const dt = c.created_at || c.createdAt || c.submittedAt || c.submittedDate;
      if (dt) {
        const parsed = new Date(dt);
        if (!isNaN(parsed.getTime())) {
          const dayName = dayNames[parsed.getDay()];
          if (countsByDay[dayName] !== undefined) {
            countsByDay[dayName] += 1;
          }
        }
      }
    });

    const maxVal = Math.max(...Object.values(countsByDay), 1);

    return displayDays.map((day) => {
      const count = countsByDay[day];
      return {
        day,
        count,
        isPeak: count === maxVal && count > 0,
        isSunday: day === 'Sun',
      };
    });
  }, [data.cases]);

  return (
    <AdminContext.Provider
      value={{
        data,
        operator: data.operator,
        currentDate: data.currentDate,
        metrics: dynamicMetrics,
        cases: data.cases,
        hospitals: data.hospitals,
        arogyaSevaks: data.arogyaSevaks,
        pendingFollowUps: data.pendingFollowUps,
        weeklyTrend: dynamicWeeklyTrend,
        users: data.users,
        schemes: data.schemes || [],
        escalationRequests: data.escalationRequests || [],
        mlaPhoto: data.mlaPhoto || data.mlaProfile?.photoUrl || '/ravindra_chavan.png',
        mlaProfile: data.mlaProfile || null,
        mlaTelemetry: data.mlaTelemetry || {
          activeHospitalizedPatients: 0,
          empanelledHospitals: data.hospitals.length,
          assignedFieldArogyaSevaks: data.arogyaSevaks.length,
        },
        fetchMlaData,
        activeModal,
        setActiveModal,
        toastMessage,
        showToast,
        updateCaseStatus,
        claimCase,
        unclaimCase,
        assignCaseReviewer,
        addCaseNote,
        requestDocument,
        uploadDocument,
        verifyDocument,
        approveCase,
        rejectCase,
        holdCase,
        reopenCase,
        getReopenInfo,
        addHospital,
        deleteHospital,
        updateArogyaSevak,
        deleteArogyaSevak,
        addArogyaSevak,
        fetchArogyaSevaks,
        addAdmin,
        fetchAdmins,
        deleteAdmin,
        updateAdmin,
        updateMlaPhoto,
        updateMlaProfile,
        addScheme,
        updateScheme,
        deleteScheme,
        toggleSchemeStatus,
        recordCallFollowUp,
        addFollowUp,
        resolveFollowUp,
        fetchAdminProfile,
        updateOperatorProfile,
        createEscalationRequest,
        resolveBillEscalation,
        transferHospitalEscalation,
        fetchEscalationRequests,
        assignSevaksToHospital,
        fetchCases,
        fetchApplicationStats,
        casesLoading,
        casesPagination,
        applicationStats,
        doctorFormDraft,
        updateDoctorFormDraft,
        clearDoctorFormDraft,
        hospitalFormDraft,
        updateHospitalFormDraft,
        clearHospitalFormDraft,
        adminNotifications,
        unreadNotificationsCount,
        fetchAdminNotifications,
        markAdminNotificationRead,
        markAllAdminNotificationsRead,
        clearSeenAdminNotifications,
        clearAllAdminNotifications,
        deleteAdminNotification,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;