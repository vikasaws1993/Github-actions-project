import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Phone,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  RotateCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  MapPin,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './ArogyaSevaks.css';

export const ArogyaSevaks = () => {
  const navigate = useNavigate();
  const { arogyaSevaks = [], hospitals = [], cases = [], setActiveModal, fetchArogyaSevaks } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sevak Details Modal & Temporary Replacement States
  const [selectedSevakDetails, setSelectedSevakDetails] = useState(null);
  const [isAssigningTemp, setIsAssigningTemp] = useState(false);
  const [tempForm, setTempForm] = useState({ name: '', mobile: '', reason: '' });
  const [tempError, setTempError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });

  // Persistent storage for temporary relief sevaks and availability status
  const [temporarySevaks, setTemporarySevaks] = useState(() => {
    try {
      const saved = localStorage.getItem('arogya_temp_sevaks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [unavailableSevaks, setUnavailableSevaks] = useState(() => {
    try {
      const saved = localStorage.getItem('arogya_unavailable_sevaks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTempSevaks = (updated) => {
    setTemporarySevaks(updated);
    try {
      localStorage.setItem('arogya_temp_sevaks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const saveUnavailableSevaks = (updated) => {
    setUnavailableSevaks(updated);
    try {
      localStorage.setItem('arogya_unavailable_sevaks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to extract initials
  const getSevakInitials = (name) => {
    if (!name) return 'AS';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Pagination State - 5 items per page
  const SEVAKS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever search query or hospital filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedHospital]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (fetchArogyaSevaks) {
      await fetchArogyaSevaks(searchQuery);
    }
    setIsRefreshing(false);
  };

  // Helper to dynamically calculate active patient count for a Sevak from live cases
  const getSevakActivePatientsCount = (sevak) => {
    if (!sevak) return 0;
    const sevakName = (sevak.name || sevak.full_name || '').toLowerCase().trim();
    const sevakId = String(sevak.id || sevak.sevakId || sevak.userId || sevak._id || '').toLowerCase().trim();
    const rawMobile = String(sevak.mobile || sevak.phone || '').replace(/\D/g, '');
    const sevakMobileLast10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;

    const activeMatchingCases = (cases || []).filter((c) => {
      if (!c) return false;
      const rawStatus = String(c.status || c.current_status || c.application_status || '').toUpperCase().trim();

      // Exclude terminal / closed / rejected cases
      const isTerminal = ['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED', 'REJECTED', 'CANCELLED'].some(
        (term) => rawStatus === term || rawStatus.includes(term)
      );
      if (isTerminal) return false;

      // Extract Sevak identifiers from the case
      const caseSevakStr = typeof c.assignedSevak === 'string'
        ? c.assignedSevak
        : (c.assignedSevak?.name || c.assignedSevak?.full_name || c.assignedSevak?.sevak_name || '');
      const caseSevakName = (caseSevakStr || c.sevakName || c.sevak || c.assigned_sevak_name || '').toLowerCase().trim();

      const caseSevakId = String(
        c.assignedSevakId ||
        c.sevakId ||
        c.sevak_id ||
        (typeof c.assignedSevak === 'object' ? c.assignedSevak?.id || c.assignedSevak?.user_id || c.assignedSevak?._id : '') ||
        ''
      ).toLowerCase().trim();

      const caseSevakPhoneRaw = String(
        c.sevakPhone ||
        c.assigned_sevak_phone ||
        (typeof c.assignedSevak === 'object' ? c.assignedSevak?.mobile || c.assignedSevak?.phone : '') ||
        ''
      ).replace(/\D/g, '');
      const casePhoneLast10 = caseSevakPhoneRaw.length >= 10 ? caseSevakPhoneRaw.slice(-10) : caseSevakPhoneRaw;

      // Match conditions
      const isIdMatch = Boolean(sevakId && caseSevakId && sevakId === caseSevakId);
      const isPhoneMatch = Boolean(sevakMobileLast10 && casePhoneLast10 && sevakMobileLast10 === casePhoneLast10);
      const isNameMatch = Boolean(
        sevakName &&
        caseSevakName &&
        caseSevakName !== 'not assigned' &&
        caseSevakName !== '—' &&
        caseSevakName !== '-' &&
        caseSevakName !== 'unassigned' &&
        (caseSevakName === sevakName || caseSevakName.includes(sevakName) || sevakName.includes(caseSevakName))
      );

      return isIdMatch || isPhoneMatch || isNameMatch;
    });

    if (activeMatchingCases.length > 0) {
      return activeMatchingCases.length;
    }

    // Fallbacks if cases aren't loaded or count was passed via sevak object
    if (typeof sevak.active_patients === 'number' && sevak.active_patients > 0) return sevak.active_patients;
    if (typeof sevak.activePatients === 'number' && sevak.activePatients > 0) return sevak.activePatients;
    if (typeof sevak.active_patients_count === 'number' && sevak.active_patients_count > 0) return sevak.active_patients_count;
    if (typeof sevak.patients === 'number' && sevak.patients > 0) return sevak.patients;
    if (typeof sevak.patient_count === 'number' && sevak.patient_count > 0) return sevak.patient_count;

    return 0;
  };

  // Helper to get active cases list for a Sevak
  const getSevakActiveCasesList = (sevak) => {
    if (!sevak) return [];
    const sevakName = (sevak.name || sevak.full_name || '').toLowerCase().trim();
    const sevakId = String(sevak.id || sevak.sevakId || sevak.userId || sevak._id || '').toLowerCase().trim();
    const rawMobile = String(sevak.mobile || sevak.phone || '').replace(/\D/g, '');
    const sevakMobileLast10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;

    return (cases || []).filter((c) => {
      if (!c) return false;
      const rawStatus = String(c.status || c.current_status || c.application_status || '').toUpperCase().trim();
      const isTerminal = ['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED', 'REJECTED', 'CANCELLED'].some(
        (term) => rawStatus === term || rawStatus.includes(term)
      );
      if (isTerminal) return false;

      const caseSevakStr = typeof c.assignedSevak === 'string'
        ? c.assignedSevak
        : (c.assignedSevak?.name || c.assignedSevak?.full_name || c.assignedSevak?.sevak_name || '');
      const caseSevakName = (caseSevakStr || c.sevakName || c.sevak || c.assigned_sevak_name || '').toLowerCase().trim();

      const caseSevakId = String(
        c.assignedSevakId ||
        c.sevakId ||
        c.sevak_id ||
        (typeof c.assignedSevak === 'object' ? c.assignedSevak?.id || c.assignedSevak?.user_id || c.assignedSevak?._id : '') ||
        ''
      ).toLowerCase().trim();

      const caseSevakPhoneRaw = String(
        c.sevakPhone ||
        c.assigned_sevak_phone ||
        (typeof c.assignedSevak === 'object' ? c.assignedSevak?.mobile || c.assignedSevak?.phone : '') ||
        ''
      ).replace(/\D/g, '');
      const casePhoneLast10 = caseSevakPhoneRaw.length >= 10 ? caseSevakPhoneRaw.slice(-10) : caseSevakPhoneRaw;

      const isIdMatch = Boolean(sevakId && caseSevakId && sevakId === caseSevakId);
      const isPhoneMatch = Boolean(sevakMobileLast10 && casePhoneLast10 && sevakMobileLast10 === casePhoneLast10);
      const isNameMatch = Boolean(
        sevakName &&
        caseSevakName &&
        caseSevakName !== 'not assigned' &&
        caseSevakName !== '—' &&
        caseSevakName !== '-' &&
        caseSevakName !== 'unassigned' &&
        (caseSevakName === sevakName || caseSevakName.includes(sevakName) || sevakName.includes(caseSevakName))
      );

      return isIdMatch || isPhoneMatch || isNameMatch;
    });
  };

  const handleOpenSevakDetails = (sevak) => {
    setSelectedSevakDetails(sevak);
    setIsAssigningTemp(false);
    setTempForm({ name: '', mobile: '', reason: '' });
    setTempError('');
    setFeedbackMsg({ text: '', type: 'success' });
  };

  const handleCloseSevakDetails = () => {
    setSelectedSevakDetails(null);
    setIsAssigningTemp(false);
    setTempForm({ name: '', mobile: '', reason: '' });
    setTempError('');
  };

  const handleToggleAvailability = (sevak) => {
    const sevakKey = String(sevak?.id || sevak?.sevakId || sevak?.name);
    const currentlyUnavailable = Boolean(unavailableSevaks[sevakKey]);
    const nextState = !currentlyUnavailable;

    const updated = { ...unavailableSevaks, [sevakKey]: nextState };
    saveUnavailableSevaks(updated);

    if (nextState) {
      setFeedbackMsg({
        text: `Marked "${sevak.name}" as Not Available / On Leave. You can assign a temporary replacement Sevak below.`,
        type: 'warning'
      });
    } else {
      // If marking as available again, release temporary sevak
      const updatedTemp = { ...temporarySevaks };
      delete updatedTemp[sevakKey];
      saveTempSevaks(updatedTemp);
      setFeedbackMsg({
        text: `"${sevak.name}" is now marked as Available & On-Duty.`,
        type: 'success'
      });
    }
  };

  const handleAddTemporarySevakSubmit = (e, sevak) => {
    if (e) e.preventDefault();
    setTempError('');

    if (!tempForm.name.trim() || tempForm.name.trim().length < 2) {
      setTempError('Please enter a valid temporary Sevak full name (at least 2 characters).');
      return;
    }

    const cleanMobile = tempForm.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setTempError('Please enter a valid 10-digit Indian mobile number (e.g. 9822011223).');
      return;
    }

    const sevakKey = String(sevak?.id || sevak?.sevakId || sevak?.name);

    const tempRecord = {
      name: tempForm.name.trim(),
      mobile: cleanMobile,
      reason: tempForm.reason.trim() || 'Handling active patient cases during leave',
      assignedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updatedTemp = { ...temporarySevaks, [sevakKey]: tempRecord };
    saveTempSevaks(updatedTemp);

    // Also mark sevak as unavailable
    const updatedUnavail = { ...unavailableSevaks, [sevakKey]: true };
    saveUnavailableSevaks(updatedUnavail);

    setIsAssigningTemp(false);
    setTempForm({ name: '', mobile: '', reason: '' });
    setFeedbackMsg({
      text: `Temporary Sevak "${tempRecord.name}" (${tempRecord.mobile}) assigned successfully!`,
      type: 'success'
    });
  };

  const handleRemoveTemporarySevak = (sevak) => {
    const sevakKey = String(sevak?.id || sevak?.sevakId || sevak?.name);
    const updatedTemp = { ...temporarySevaks };
    delete updatedTemp[sevakKey];
    saveTempSevaks(updatedTemp);
    setFeedbackMsg({
      text: `Temporary cover removed for "${sevak.name}".`,
      type: 'info'
    });
  };

  // Helper to get real hospital name for a Sevak
  const getSevakHospitalName = (s) => {
    let rawHosp = typeof s.hospital === 'string' ? s.hospital : s.hospital?.name || s.hospitalName || s.hospital_name || '';
    if (rawHosp && rawHosp !== 'Hospital' && rawHosp !== '—' && rawHosp !== 'Unassigned') {
      return rawHosp;
    }

    const assignedArr = s.assignedHospitals || s.assigned_hospitals;
    if (Array.isArray(assignedArr) && assignedArr.length > 0) {
      const names = assignedArr.map((h) => (typeof h === 'string' ? h : h.name || h.hospitalName)).filter(Boolean);
      if (names.length > 0 && !names.includes('Hospital')) return names.join(', ');
    }

    const matchedHosp = (hospitals || []).find((h) => {
      if (h.assignedSevaks && Array.isArray(h.assignedSevaks)) {
        return h.assignedSevaks.some((sel) => String(sel.id || sel) === String(s.id) || sel.name === s.name);
      }
      if (h.sevak && typeof h.sevak === 'string' && s.name) {
        return h.sevak.toLowerCase().includes(s.name.toLowerCase());
      }
      return false;
    });

    if (matchedHosp && matchedHosp.name) {
      return matchedHosp.name;
    }

    if (rawHosp && rawHosp !== 'Hospital' && rawHosp !== '—') return rawHosp;
    return null;
  };

  // Hospital Filter Dropdown Options
  const hospitalList = useMemo(() => {
    const hospMap = new Map();
    (hospitals || []).forEach((h) => {
      if (h.name) {
        hospMap.set(h.name, h.shortName || h.name);
      }
    });
    (arogyaSevaks || []).forEach((s) => {
      const hName = getSevakHospitalName(s);
      if (hName) {
        if (!Array.from(hospMap.keys()).some((k) => k.toLowerCase().includes(hName.toLowerCase()))) {
          hospMap.set(hName, hName);
        }
      }
    });
    return Array.from(hospMap.entries()).map(([fullName, displayName]) => ({
      fullName,
      displayName
    }));
  }, [hospitals, arogyaSevaks]);

  const filteredSevaks = useMemo(() => {
    return (arogyaSevaks || []).filter((s) => {
      const hName = getSevakHospitalName(s) || '';
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        hName.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        s.employeeCode?.toLowerCase().includes(q) ||
        s.taluka?.toLowerCase().includes(q) ||
        s.fullAddress?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedHospital === 'all') return true;
      if (selectedHospital === 'unassigned') {
        return !hName;
      }

      const selHosp = selectedHospital.toLowerCase();
      return hName && (hName.toLowerCase().includes(selHosp) || selHosp.includes(hName.toLowerCase()));
    });
  }, [arogyaSevaks, searchQuery, selectedHospital, hospitals]);

  const unassignedCount = (arogyaSevaks || []).filter((s) => !getSevakHospitalName(s)).length;

  // Pagination Calculations
  const totalCount = filteredSevaks.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / SEVAKS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * SEVAKS_PER_PAGE;
  const paginatedSevaks = filteredSevaks.slice(startIndex, startIndex + SEVAKS_PER_PAGE);

  return (
    <div className="sevaks-container">

      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by Sevak name, hospital, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', color: '#0f172a' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Hospital Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '220px' }}>
            <Building2 size={16} color="#0284c7" />
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.825rem', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="all">🏥 All Hospitals ({arogyaSevaks.length})</option>
              <option value="unassigned">⚠️ Unassigned / Free ({unassignedCount})</option>
              {hospitalList.map((h) => (
                <option key={h.fullName} value={h.fullName}>
                  {h.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reload live Arogya Sevaks from database"
          >
            <RotateCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh List'}
          </button>

          <button
            onClick={() => setActiveModal({ type: 'add-sevak' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#166534',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={15} /> Register New Sevak
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eef2f6', overflowX: 'auto', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Registered Field Representatives</span>
          <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
            {totalCount} Sevaks Listed
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>NAME</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>ASSIGNED HOSPITAL</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>LOCATION / ADDRESS</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>MOBILE NUMBER</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>ACTIVE PATIENTS</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>STATUS</th>
              <th style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.725rem', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isRefreshing ? (
              <Loader
                asTableRow
                colSpan={7}
                message="Syncing Arogya Sevaks..."
                subtext="Fetching field personnel registry and hospital assignments"
              />
            ) : paginatedSevaks.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No Arogya Sevaks match your search query or hospital filter.
                </td>
              </tr>
            ) : (
              paginatedSevaks.map((s) => {
                const sevakKey = String(s.id || s.sevakId || s.userId || s.name);
                const isUnavailable = Boolean(unavailableSevaks[sevakKey]);
                const tempSevak = temporarySevaks[sevakKey];
                const activeCount = getSevakActivePatientsCount(s);
                const hName = getSevakHospitalName(s);

                const detailUrl = `/admin/sevaks/detail/${encodeURIComponent(s.id || s.sevakId || s.employeeCode || s.name)}`;

                return (
                  <tr
                    key={s.id}
                    className="sevak-data-row-interactive"
                    onClick={() => navigate(detailUrl, { state: { sevak: s } })}
                    title={`Click to view full details of ${s.name}`}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>
                      <div className="sevak-row-name-link">{s.name}</div>
                      {s.employeeCode && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {s.employeeCode}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {hName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.8rem' }}>
                          <Building2 size={13} color="#0284c7" /> {hName}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.775rem' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#475569' }}>
                      {s.fullAddress || s.city || (s.hospital !== '—' ? s.hospital : 'Pune - Haveli')}
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                      {s.mobile}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: activeCount > 0 ? '#15803d' : '#64748b',
                          backgroundColor: activeCount > 0 ? '#dcfce7' : '#f1f5f9',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '28px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {activeCount}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isUnavailable ? '#fef3c7' : (s.status === 'Active' ? '#dcfce7' : '#f1f5f9'),
                            color: isUnavailable ? '#b45309' : (s.status === 'Active' ? '#15803d' : '#64748b'),
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'fit-content'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isUnavailable ? '#f59e0b' : (s.status === 'Active' ? '#16a34a' : '#94a3b8')
                            }}
                          />
                          {isUnavailable ? 'On Leave' : (s.status || 'Active')}
                        </span>
                        {tempSevak && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#1d4ed8',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}
                            title={`Temporary Cover: ${tempSevak.name} (${tempSevak.mobile})`}
                          >
                            <Shield size={11} /> Temp: {tempSevak.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModal({ type: 'edit-sevak', payload: s });
                          }}
                          style={{
                            border: 'none',
                            background: '#eff6ff',
                            color: '#2563eb',
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Edit Sevak details"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModal({ type: 'delete-sevak', payload: s });
                          }}
                          style={{
                            border: 'none',
                            background: '#fef2f2',
                            color: '#dc2626',
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Delete Sevak"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="sevaks-pagination-bar">
            <div className="sevaks-pagination-info">
              Showing <strong>{startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + SEVAKS_PER_PAGE, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> ArogyaSevaks
            </div>

            {totalPages > 1 && (
              <div className="sevaks-pagination-controls">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>

                <div className="page-numbers-list">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`btn-page-num ${pageNum === safeCurrentPage ? 'is-active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === safeCurrentPage - 2 ||
                      pageNum === safeCurrentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="page-ellipsis">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArogyaSevaks;


