import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Search,
  X,
  FileText,
  Building2,
  MapPin,
  UserCheck,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  ArrowRightLeft,
  DollarSign,
  Navigation
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { useLanguage } from '@/context/LanguageContext';
import { hospitalMatchesSpecialty } from './EscalationCaseDetail';
import Loader from '@/components/common/Loader/Loader';
import './UrgentEscalations.css';

// Helper to calculate approximate distance in km from lat/long
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.2; // Default fallback distance
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Helper to safely format person or submitter name string from string or object
const formatPerson = (val, defaultVal = 'Arogya Sevak') => {
  if (!val) return defaultVal;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.name) return `${val.name}${val.role ? ` (${val.role})` : ''}`;
    if (val.full_name) return val.full_name;
    return defaultVal;
  }
  return String(val);
};

export const UrgentEscalations = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    escalationRequests,
    hospitals,
    arogyaSevaks,
    resolveBillEscalation,
    transferHospitalEscalation,
    fetchEscalationRequests,
    casesLoading,
    showToast
  } = useAdmin();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (fetchEscalationRequests) {
      setLoading(true);
      Promise.resolve(fetchEscalationRequests()).finally(() => {
        if (isMounted) setLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [fetchEscalationRequests]);

  // Filters & Search State
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Decision Modal State (Admin Resolution)
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [decisionTab, setDecisionTab] = useState('bill'); // 'bill' | 'transfer'

  // Bill resolution states (Only CMRF and Others)
  const [billResolutionType, setBillResolutionType] = useState('cmrf'); // 'cmrf' | 'others'
  const [sevakInstructionNote, setSevakInstructionNote] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Transfer resolution states
  const [selectedTargetHospitalId, setSelectedTargetHospitalId] = useState('');
  const [selectedSevakName, setSelectedSevakName] = useState('');
  const [prevSevakNote, setPrevSevakNote] = useState('');
  const [newSevakNote, setNewSevakNote] = useState('');

  // KPI Metrics Counts
  const counts = useMemo(() => {
    const all = escalationRequests.length;
    const resolved = escalationRequests.filter(r => String(r.status || '').toLowerCase() === 'resolved').length;
    const pendingReview = escalationRequests.filter(r => String(r.status || '').toLowerCase() !== 'resolved').length;
    const specialtyUnavailable = escalationRequests.filter(r => r.reasonType === 'specialty_unavailable' || Boolean(r.requiredSpecialty && r.reasonType !== 'bill_exceeded') || r.reasonBadge?.toLowerCase().includes('specialty')).length;
    const billExceeded = escalationRequests.filter(r => r.reasonType === 'bill_exceeded' || r.reasonTitle?.toLowerCase().includes('bill') || r.reasonBadge?.toLowerCase().includes('bill')).length;
    return { all, pendingReview, specialtyUnavailable, billExceeded, resolved };
  }, [escalationRequests]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return escalationRequests.filter(item => {
      const isResolved = String(item.status || '').toLowerCase() === 'resolved';
      if (activeTab === 'pending' && isResolved) return false;
      if (activeTab === 'resolved' && !isResolved) return false;
      if (activeTab === 'specialty') {
        const isSpec = item.reasonType === 'specialty_unavailable' || Boolean(item.requiredSpecialty && item.reasonType !== 'bill_exceeded') || item.reasonBadge?.toLowerCase().includes('specialty');
        if (!isSpec) return false;
      }
      if (activeTab === 'bill') {
        const isBill = item.reasonType === 'bill_exceeded' || item.reasonTitle?.toLowerCase().includes('bill') || item.reasonBadge?.toLowerCase().includes('bill');
        if (!isBill) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.patientName?.toLowerCase().includes(q);
        const matchesId = item.caseId?.toLowerCase().includes(q);
        const matchesReason = item.reasonTitle?.toLowerCase().includes(q) || item.remarks?.toLowerCase().includes(q);
        const matchesSpecialty = item.requiredSpecialty?.toLowerCase().includes(q);
        return matchesName || matchesId || matchesReason || matchesSpecialty;
      }
      return true;
    });
  }, [escalationRequests, activeTab, searchQuery]);

  // Proximity & Specialty-Filtered Hospitals for Transfer Modal (Sorted nearest first)
  const nearbyHospitals = useMemo(() => {
    if (!selectedEscalation) return [];
    const targetSpec = selectedEscalation.requiredSpecialty || '';
    const pLat = selectedEscalation.patientLat || 18.5314;
    const pLng = selectedEscalation.patientLng || 73.8298;
    const currentHospId = String(selectedEscalation.hospitalId || selectedEscalation.hospital_id || '');
    const currentHospName = String(selectedEscalation.hospitalName || selectedEscalation.hospital || '').toLowerCase().trim();

    const processed = hospitals
      .filter(h => {
        if (currentHospId && String(h.id) === currentHospId) return false;
        if (currentHospName && (h.name || '').toLowerCase().trim() === currentHospName) return false;
        return true;
      })
      .map(h => {
        const dist = calculateDistance(pLat, pLng, h.lat, h.lng);
        const sevakObj = (arogyaSevaks || []).find(s => 
          (s.hospital && s.hospital.toLowerCase().includes(h.name.toLowerCase())) || 
          (h.sevak && h.sevak.toLowerCase().includes(s.name.toLowerCase()))
        );
        const sevakName = sevakObj ? sevakObj.name : (h.sevak && h.sevak !== 'Not assigned' ? h.sevak : 'Rohan Deshmukh');
        const { matches, matchedTag } = hospitalMatchesSpecialty(h, targetSpec);

        return {
          ...h,
          distanceKm: dist,
          hasSpecialty: matches,
          matchedSpecialtyTag: matchedTag,
          assignedSevakName: sevakName
        };
      });

    // If specialty specified, filter strictly to equipped hospitals
    if (targetSpec && targetSpec.trim()) {
      const equippedHospitals = processed.filter(h => h.hasSpecialty);
      if (equippedHospitals.length > 0) {
        return equippedHospitals.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }

    return processed.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [selectedEscalation, hospitals, arogyaSevaks]);

  // Sync selectedTargetHospitalId when nearbyHospitals change
  useEffect(() => {
    if (nearbyHospitals.length > 0) {
      if (!selectedTargetHospitalId || !nearbyHospitals.some(h => h.id === selectedTargetHospitalId)) {
        setSelectedTargetHospitalId(nearbyHospitals[0].id);
      }
    }
  }, [nearbyHospitals]);

  // Currently selected hospital object in modal
  const selectedHospitalObj = useMemo(() => {
    return nearbyHospitals.find(h => h.id === selectedTargetHospitalId) || nearbyHospitals[0];
  }, [nearbyHospitals, selectedTargetHospitalId]);

  // Allocated Arogya Sevaks for the selected hospital
  const allocatedSevaks = useMemo(() => {
    if (!selectedHospitalObj) return [];
    const hospName = selectedHospitalObj.name.toLowerCase().trim();
    
    // Search in global arogyaSevaks array from context
    let matched = (arogyaSevaks || []).filter(s => {
      const sevakHospLower = (s.hospital || s.hospitalName || '').toLowerCase().trim();
      return (
        (selectedHospitalObj.assignedSevaks &&
          selectedHospitalObj.assignedSevaks.some(sel => String(sel.id || sel) === String(s.id) || sel.name === s.name)) ||
        (selectedHospitalObj.assigned_sevaks &&
          selectedHospitalObj.assigned_sevaks.some(sel => String(sel.id || sel) === String(s.id) || sel.name === s.name)) ||
        (selectedHospitalObj.sevak && typeof selectedHospitalObj.sevak === 'string' && selectedHospitalObj.sevak.toLowerCase().includes(s.name.toLowerCase())) ||
        (sevakHospLower && sevakHospLower !== '—' && (hospName.includes(sevakHospLower) || sevakHospLower.includes(hospName))) ||
        (Array.isArray(s.assignedHospitals) && s.assignedHospitals.some(h => (h.name || '').toLowerCase().includes(hospName) || String(h.id) === String(selectedHospitalObj.id)))
      );
    });

    // Assigned name from hospital object
    const assignedName = selectedHospitalObj.assignedSevakName || selectedHospitalObj.sevak;
    if (assignedName && assignedName !== 'Not assigned' && assignedName !== '—' && !matched.some(m => m.name === assignedName)) {
      matched.unshift({
        id: `SEVAK-ALLOC-${selectedHospitalObj.id}`,
        name: assignedName,
        hospital: selectedHospitalObj.name,
        mobile: selectedHospitalObj.sevakMobile || '98765 00006',
        patients: selectedHospitalObj.activeCases || 12,
        status: 'Active'
      });
    }

    return matched;
  }, [selectedHospitalObj, arogyaSevaks]);

  // Sync selectedSevakName whenever selectedTargetHospitalId changes
  useEffect(() => {
    if (allocatedSevaks.length > 0) {
      if (!selectedSevakName || !allocatedSevaks.some(s => s.name === selectedSevakName)) {
        setSelectedSevakName(allocatedSevaks[0].name);
      }
    }
  }, [selectedTargetHospitalId, allocatedSevaks]);

  // Open Decision Simulator Modal
  const handleOpenDecision = (req) => {
    setSelectedEscalation(req);
    setDecisionTab(req.reasonType === 'bill_exceeded' ? 'bill' : 'transfer');
    setAdminNotes('');
    setPrevSevakNote('');
    setNewSevakNote('');
    if (hospitals.length > 0) {
      setSelectedTargetHospitalId(hospitals[1]?.id || hospitals[0]?.id);
    }
  };

  // Handle Bill Resolution Submit
  const handleResolveBill = async () => {
    if (!selectedEscalation) return;
    const targetId = selectedEscalation.uuid || selectedEscalation.id;
    const combinedNotes = billResolutionType === 'others'
      ? `[NOTE FOR SEVAK (${selectedEscalation.sevakName || 'ArogyaSevak'})] ${sevakInstructionNote.trim()}${adminNotes.trim() ? ` | Admin Note: ${adminNotes.trim()}` : ''}`
      : (adminNotes.trim() || 'Chief Minister Relief Fund (CMRF) supplementary top-up grant approved.');

    setSelectedEscalation(null);
    await resolveBillEscalation(targetId, billResolutionType, {
      schemeCode: 'CMRF',
      amount: selectedEscalation.estimatedBill || 'Exceeded Balance',
      sevakNote: sevakInstructionNote.trim(),
      notes: combinedNotes
    });
  };

  // Handle Transfer Resolution Submit
  const handleTransferSubmit = async () => {
    if (!selectedEscalation) return;
    const targetId = selectedEscalation.uuid || selectedEscalation.id;
    const targetHosp = hospitals.find(h => h.id === selectedTargetHospitalId) || nearbyHospitals[0] || hospitals[0];
    const sevakName = selectedSevakName || targetHosp.assignedSevakName || targetHosp.sevak || 'Rohan Deshmukh';

    setSelectedEscalation(null);
    await transferHospitalEscalation(targetId, targetHosp, sevakName, {
      prevSevakNote: prevSevakNote.trim(),
      newSevakNote: newSevakNote.trim(),
      notes: `Reassigned from ${selectedEscalation.hospitalName || 'previous hospital'} to ${targetHosp.name} (${sevakName})`
    });
  };

  // Open escalation: Specialty unavailable cases go directly to Review & Assign screen with pre-filled specialty (if not already resolved)
  const handleOpenEscalation = (req) => {
    const isResolved = String(req.status || '').toLowerCase() === 'resolved';
    if (!isResolved && req.reasonType === 'specialty_unavailable') {
      const targetCaseId = req.caseId || req.id;
      const query = new URLSearchParams({
        escalationId: req.id,
        specialty: req.requiredSpecialty || '',
      }).toString();
      navigate(`/admin/cases/review/${targetCaseId}?${query}`);
    } else {
      navigate(`/admin/escalations/detail/${req.id}`);
    }
  };

  return (
    <div className="urgent-escalations-container">

      {/* 2. KPI Summary Cards Grid */}
      <div className="kpi-metrics-grid">
        <div className={`kpi-card card-all ${activeTab === 'All' ? 'active-kpi' : ''}`} onClick={() => setActiveTab('All')}>
          <span className="kpi-number">{counts.all}</span>
          <span className="kpi-label">{t('escalations.allCases') || 'All Cases'}</span>
        </div>
        <div className={`kpi-card card-pending ${activeTab === 'pending' ? 'active-kpi' : ''}`} onClick={() => setActiveTab('pending')}>
          <span className="kpi-number">{counts.pendingReview}</span>
          <span className="kpi-label">{t('escalations.pendingReview') || 'Pending Review'}</span>
        </div>
        <div className={`kpi-card card-specialty ${activeTab === 'specialty' ? 'active-kpi' : ''}`} onClick={() => setActiveTab('specialty')}>
          <span className="kpi-number">{counts.specialtyUnavailable}</span>
          <span className="kpi-label">{t('escalations.specialtyUnavailable') || 'Specialty Unavailable'}</span>
        </div>
        <div className={`kpi-card card-bill ${activeTab === 'bill' ? 'active-kpi' : ''}`} onClick={() => setActiveTab('bill')}>
          <span className="kpi-number">{counts.billExceeded}</span>
          <span className="kpi-label">{t('escalations.billLimitExceeded') || 'Bill Limit Exceeded'}</span>
        </div>
        <div className={`kpi-card card-resolved ${activeTab === 'resolved' ? 'active-kpi' : ''}`} onClick={() => setActiveTab('resolved')}>
          <span className="kpi-number">{counts.resolved}</span>
          <span className="kpi-label">{t('escalations.resolved') || 'Resolved'}</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="filter-search-row">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder={t('escalations.searchPlaceholder') || 'Search by patient name, case ID, reason...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills-group">
          <button
            className={`pill-btn ${activeTab === 'All' ? 'active' : ''}`}
            onClick={() => setActiveTab('All')}
          >
            {t('common.all') || 'All'} ({counts.all})
          </button>
          <button
            className={`pill-btn pill-pending ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ {t('escalations.pendingReview') || 'Pending Review'} ({counts.pendingReview})
          </button>
          <button
            className={`pill-btn pill-specialty ${activeTab === 'specialty' ? 'active' : ''}`}
            onClick={() => setActiveTab('specialty')}
          >
            🔀 {t('escalations.specialtyUnavailable') || 'Specialty Unavailable'} ({counts.specialtyUnavailable})
          </button>
          <button
            className={`pill-btn pill-bill ${activeTab === 'bill' ? 'active' : ''}`}
            onClick={() => setActiveTab('bill')}
          >
            💰 {t('escalations.billLimitExceeded') || 'Bill Limit Exceeded'} ({counts.billExceeded})
          </button>
          <button
            className={`pill-btn pill-resolved ${activeTab === 'resolved' ? 'active' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            ✓ {t('escalations.resolved') || 'Resolved'} ({counts.resolved})
          </button>
        </div>
      </div>

      {/* 4. Immediate Scheme Intervention Information Banner */}
      <div className="intervention-alert-banner">
        <div className="alert-badge-icon">
          <HelpCircle size={22} />
        </div>
        <div className="alert-content">
          <h3>{t('escalations.title') || 'Field Arogya Sevak Urgent Escalations'}</h3>
          <ul>
            <li>Arogya Sevaks submit emergency requests when hospital bills exceed scheme limits or required specialties are missing.</li>
            <li>Admin reviews and resolves requests via Supplementary Scheme / Co-Pay sanction or Proximity Hospital Re-Assignment.</li>
          </ul>
        </div>
      </div>

      {/* 5. Escalations Tabular List */}
      <div className="escalations-table-wrapper">
        {loading ? (
          <Loader
            card
            message="Loading Urgent Escalations..."
            subtext="Fetching priority transfer requests and emergency bill ceilings"
          />
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state-card">
            <CheckCircle size={40} className="empty-icon" />
            <p>{t('escalations.emptyMessage') || 'No urgent escalations currently pending.'}</p>
          </div>
        ) : (
          <div className="table-responsive-box">
            <table className="escalations-table">
              <thead>
                <tr>
                  <th>{t('escalations.tableHeaderCase') || 'CASE & PATIENT'}</th>
                  <th>{t('escalations.tableHeaderReason') || 'REASON & REQUIREMENT'}</th>
                  <th>{t('escalations.tableHeaderHospital') || 'HOSPITAL & SUBMITTED BY'}</th>
                  <th>{t('escalations.tableHeaderStatus') || 'STATUS'}</th>
                  <th style={{ textAlign: 'right' }}>{t('escalations.tableHeaderAction') || 'ACTION'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className={`clickable-table-row ${req.status === 'resolved' ? 'row-resolved' : ''}`}
                    onClick={() => handleOpenEscalation(req)}
                  >
                    {/* CASE & PATIENT */}
                    <td className="cell-patient">
                      <div className="patient-name-wrap">
                        <span className="patient-name">{req.patientName}</span>
                        <span className="case-id-badge">#{req.caseId}</span>
                      </div>
                      <div className="patient-sub-details">
                        <span>{req.ageGender}</span>
                        <span className="dot-divider">•</span>
                        <span>{req.ward}</span>
                      </div>
                    </td>

                    {/* REASON & REQUIREMENT */}
                    <td className="cell-reason">
                      <div className="reason-type-chip">
                        <span className="asterisk">*</span>
                        <span className="chip-text">{req.reasonBadge || 'Special Escalation'}</span>
                      </div>

                      {req.requiredSpecialty && (
                        <div className="specialty-line">
                          <span className="spec-lbl">Required Specialty: </span>
                          <span className="spec-val">{req.requiredSpecialty}</span>
                        </div>
                      )}

                      {req.estimatedBill && req.reasonType === 'bill_exceeded' && (
                        <div className="specialty-line">
                          <span className="spec-lbl">Est. Bill: </span>
                          <span className="spec-val-red">{req.estimatedBill}</span>
                          <span className="spec-limit"> (Limit: {req.schemeLimit})</span>
                        </div>
                      )}
                    </td>

                    {/* HOSPITAL & SUBMITTED BY */}
                    <td className="cell-hospital">
                      <div className="hosp-name-title">
                        <Building2 size={13} className="hosp-icon" />
                        <span>{req.hospitalName || 'Empanelled Hospital'}</span>
                      </div>
                      <div className="submitted-info">
                        Submitted by <strong>{formatPerson(req.submittedBy)}</strong> • {req.submittedAt}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="cell-status">
                      {String(req.status || '').toLowerCase() === 'resolved' ? (
                        <span className="status-badge-pill resolved">
                          <CheckCircle size={12} /> Resolved
                        </span>
                      ) : (
                        <span className="status-badge-pill hold">
                          ⏸️ {req.statusLabel || 'On Hold'}
                        </span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="cell-actions" style={{ textAlign: 'right' }}>
                      <button
                        className="btn-table-view-detail"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEscalation(req);
                        }}
                      >
                        <span>
                          {String(req.status || '').toLowerCase() === 'resolved'
                            ? 'View Details'
                            : (req.reasonType === 'specialty_unavailable' ? 'Review & Assign' : 'View Details')}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ADMIN DECISION RESOLUTION MODAL */}
      {/* ============================================================ */}
      {selectedEscalation && (
        <div className="modal-backdrop">
          <div className="modal-content-card decision-modal-wide">
            <div className="modal-header">
              <div className="modal-title-group">
                <ShieldAlert className="modal-icon-blue" size={24} />
                <div>
                  <h2>Admin Decision & Hospital Re-Assignment</h2>
                  <p>Case ID: {selectedEscalation.caseId} • Patient: {selectedEscalation.patientName}</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedEscalation(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="decision-modal-body">
              {/* Context Summary Header */}
              <div className="case-brief-bar">
                <div>
                  <strong>Current Hospital:</strong> {selectedEscalation.hospitalName} ({formatPerson(selectedEscalation.submittedBy)})
                </div>
                <div>
                  <strong>Escalation Reason:</strong> <span className="highlight-text">{selectedEscalation.reasonTitle}</span>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="decision-tabs-header">
                <button
                  className={`decision-tab-btn ${decisionTab === 'bill' ? 'active-tab' : ''}`}
                  onClick={() => setDecisionTab('bill')}
                >
                  <DollarSign size={16} />
                  <span>1. Scheme Budget Ceiling / Co-Pay Decision</span>
                </button>
                <button
                  className={`decision-tab-btn ${decisionTab === 'transfer' ? 'active-tab' : ''}`}
                  onClick={() => setDecisionTab('transfer')}
                >
                  <ArrowRightLeft size={16} />
                  <span>2. Proximity Hospital Re-Assignment (Transfer)</span>
                </button>
              </div>

              {/* TAB 1: BILL EXCEEDED RESOLUTION */}
              {decisionTab === 'bill' && (
                <div className="decision-tab-content">
                  <h3>Admin Level Scheme Budget Resolution</h3>
                  <p className="tab-hint">Select a resolution strategy for hospital bill exceeding package limits:</p>

                  <div className="resolution-options-list">
                    {/* Option 1: Chief Minister Relief Fund (CMRF) */}
                    <label className={`option-card-label ${billResolutionType === 'cmrf' ? 'selected-opt' : ''}`}>
                      <input
                        type="radio"
                        name="billRes"
                        value="cmrf"
                        checked={billResolutionType === 'cmrf'}
                        onChange={() => setBillResolutionType('cmrf')}
                      />
                      <div className="option-details">
                        <strong>Option 1: Chief Minister Relief Fund (CMRF)</strong>
                        <p>Sanction additional top-up grant from Chief Minister Relief Fund (CMRF) to cover the exceeded hospital bill cashless.</p>
                        {billResolutionType === 'cmrf' && (
                          <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                            ✓ CMRF Grant Sanctioned (Up to ₹2.5L / Balance Amount)
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 2: Others */}
                    <label className={`option-card-label ${billResolutionType === 'others' ? 'selected-opt' : ''}`}>
                      <input
                        type="radio"
                        name="billRes"
                        value="others"
                        checked={billResolutionType === 'others'}
                        onChange={() => setBillResolutionType('others')}
                      />
                      <div className="option-details" style={{ width: '100%' }}>
                        <strong>Option 2: Others</strong>
                        <p>Alternative resolution strategy (e.g. applicant co-pay, NGO / charitable trust welfare grant, or special discretionary quota).</p>
                        {billResolutionType === 'others' && (
                          <div style={{ marginTop: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <label style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.8rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📝 Note / Direct Instructions for Assigned Arogya Sevak ({selectedEscalation.sevakName || 'Assigned Sevak'}):</span>
                              <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <textarea
                              rows={2}
                              className="form-control-textarea"
                              style={{ background: '#ffffff', borderColor: '#94a3b8', width: '100%', marginTop: '4px' }}
                              placeholder={`Enter instructions for ${selectedEscalation.sevakName || 'the assigned Arogya Sevak'} on resolving remaining bill balance...`}
                              value={sevakInstructionNote}
                              onChange={(e) => setSevakInstructionNote(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="form-group margin-top-md">
                    <label className="field-label">Official Order & Decision Explanation Notes:</label>
                    <textarea
                      rows={2}
                      className="form-control-textarea"
                      placeholder="Enter official decision notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  <div className="decision-actions-row">
                    <button className="btn-cancel-modal" onClick={() => setSelectedEscalation(null)}>
                      Cancel
                    </button>
                    <button className="btn-confirm-decision" onClick={handleResolveBill}>
                      <CheckCircle size={18} />
                      <span>Approve Decision & Resolve Case</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PROXIMITY HOSPITAL TRANSFER */}
              {decisionTab === 'transfer' && (
                <div className="decision-tab-content">
                  <h3>Proximity-Based Hospital Re-Assignment</h3>
                  <p className="tab-hint">
                    Required Specialty: <strong>{selectedEscalation.requiredSpecialty || 'Neurosurgery'}</strong>.
                    Empanelled hospitals matched by patient location (Lat/Long distance):
                  </p>

                  <div className="hosp-select-section-header">
                    <label className="field-label-bold">Select Nearest Empanelled Hospital with Specialty:</label>
                    <span className="hosp-count-chip">{nearbyHospitals.length} Equipped</span>
                  </div>

                  {/* Proximity Matched Hospitals List */}
                  <div className="nearby-hospitals-list">
                    {nearbyHospitals.length === 0 ? (
                      <div className="no-hospitals-box">
                        <Building2 size={32} />
                        <p>No equipped empanelled hospital found for transfer.</p>
                      </div>
                    ) : (
                      nearbyHospitals.map((hosp) => {
                        const isSelected = selectedTargetHospitalId === hosp.id;
                        return (
                          <div
                            key={hosp.id}
                            className={`hosp-select-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedTargetHospitalId(hosp.id)}
                          >
                            <div className="hosp-radio-wrap">
                              <input
                                type="radio"
                                name="targetHosp"
                                checked={isSelected}
                                onChange={() => setSelectedTargetHospitalId(hosp.id)}
                              />
                            </div>
                            <div className="hosp-card-details">
                              <div className="hosp-card-header">
                                <span className="hosp-title-name">{hosp.name}</span>
                                <div className="hosp-top-badges">
                                  <span className="dist-chip">📍 {hosp.distanceKm} km</span>
                                  <span className="beds-free-chip">🛏️ {hosp.bedsAvailable} Beds Free</span>
                                </div>
                              </div>
                              <div className="hosp-card-sub">
                                <MapPin size={13} className="pin-icon" />
                                <span>{hosp.address} ({hosp.location})</span>
                              </div>
                              <div className="hosp-card-footer-tags">
                                <span className="hosp-type-tag">{hosp.type || 'Empanelled Hospital'}</span>
                                {(hosp.specialties || []).slice(0, 2).map((spec, sIdx) => (
                                  <span key={sIdx} className="hosp-spec-tag">{spec}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ALLOCATED AROGYA SEVAK SELECTION FOR SELECTED HOSPITAL IN MODAL */}
                  {selectedHospitalObj && allocatedSevaks.length > 0 && (
                    <div className="modal-allocated-sevaks-box">
                      <div className="sevak-select-header">
                        <UserCheck size={16} className="sevak-header-icon" />
                        <label className="field-label-bold">
                          Allocated Arogya Sevak at <span>{selectedHospitalObj.name}</span>:
                        </label>
                        <span className="sevak-count-badge">{allocatedSevaks.length} Sevak Allocated</span>
                      </div>

                      <div className="sevaks-cards-grid">
                        {allocatedSevaks.map((sevak) => {
                          const isSevakSelected = selectedSevakName === sevak.name;
                          return (
                            <div
                              key={sevak.id || sevak.name}
                              className={`sevak-radio-card ${isSevakSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedSevakName(sevak.name)}
                            >
                              <input
                                type="radio"
                                name="modalAllocatedSevakSelect"
                                checked={isSevakSelected}
                                onChange={() => setSelectedSevakName(sevak.name)}
                              />
                              <div className="sevak-card-body">
                                <div className="sevak-card-top">
                                  <strong className="sevak-name-title">{sevak.name}</strong>
                                  <span className="sevak-status-pill active">🟢 Allocated & Active</span>
                                </div>
                                <div className="sevak-meta-details">
                                  <span className="sevak-phone-chip">📱 {sevak.mobile || '98765 00006'}</span>
                                  <span className="dot-divider">•</span>
                                  <span className="sevak-cases-chip">👥 {sevak.patients ?? 12} Active Cases</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="form-group margin-top-md">
                    <label className="field-label-bold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>📝 1. Note for Previous ArogyaSevak ({formatPerson(selectedEscalation.submittedBy)}):</span>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>(Discharge & Handover)</span>
                    </label>
                    <textarea
                      rows={2}
                      className="form-control-textarea"
                      placeholder={`Enter handover instructions for previous Sevak (${formatPerson(selectedEscalation.submittedBy)})...`}
                      value={prevSevakNote}
                      onChange={(e) => setPrevSevakNote(e.target.value)}
                    />
                  </div>

                  <div className="form-group margin-top-md">
                    <label className="field-label-bold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>📝 2. Note for Newly Assigned ArogyaSevak ({selectedSevakName || 'New Sevak'}):</span>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>(Intake & Treatment Priority)</span>
                    </label>
                    <textarea
                      rows={2}
                      className="form-control-textarea"
                      placeholder={`Enter intake instructions for newly assigned Sevak (${selectedSevakName || 'New Sevak'})...`}
                      value={newSevakNote}
                      onChange={(e) => setNewSevakNote(e.target.value)}
                    />
                  </div>

                  <div className="telemetry-notice-box">
                    <Zap size={16} />
                    <span>
                      Upon transfer confirmation, automatic handover telemetry alerts will be dispatched to <strong>Previous Sevak ({formatPerson(selectedEscalation.submittedBy)})</strong> and <strong>New Destination Sevak ({selectedSevakName || 'Selected Sevak'})</strong>.
                    </span>
                  </div>

                  <div className="decision-actions-row">
                    <button className="btn-cancel-modal" onClick={() => setSelectedEscalation(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn-confirm-decision"
                      disabled={!selectedTargetHospitalId}
                      onClick={handleTransferSubmit}
                    >
                      <ArrowRightLeft size={18} />
                      <span>Re-assign Case & Notify Both Arogya Sevaks</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgentEscalations;
