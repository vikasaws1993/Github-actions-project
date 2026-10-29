import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  Phone,
  PhoneCall,
  Mail,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  UserPlus,
  UserX,
  Shield,
  ShieldCheck,
  Activity,
  Briefcase,
  Check,
  ExternalLink
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import Loader from '@/components/common/Loader/Loader';
import './ArogyaSevakDetail.css';

export const ArogyaSevakDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { arogyaSevaks = [], hospitals = [], cases = [], setActiveModal } = useAdmin();

  // Find target Sevak from router state, context, or route ID param
  const targetIdStr = id ? decodeURIComponent(id).toLowerCase().trim() : '';

  const matchedSevak = useMemo(() => {
    if (location.state?.sevak) return location.state.sevak;
    if (!targetIdStr) return null;

    return (
      arogyaSevaks.find((s) => {
        const sid = String(s.id || s.sevakId || s.userId || '').toLowerCase().trim();
        const scode = String(s.employeeCode || s.empCode || '').toLowerCase().trim();
        const sname = String(s.name || s.full_name || '').toLowerCase().trim();
        return sid === targetIdStr || scode === targetIdStr || sname === targetIdStr;
      }) || null
    );
  }, [arogyaSevaks, targetIdStr, location.state]);

  const [sevak, setSevak] = useState(matchedSevak || null);

  useEffect(() => {
    if (matchedSevak) {
      setSevak(matchedSevak);
    }
  }, [matchedSevak]);

  // Fallback default sevak object if id not found yet
  const currentSevak = sevak || {
    id: id || 'AS-1',
    name: 'Megha Patil',
    employeeCode: 'AS-159922',
    mobile: '9877777777',
    email: 'megha@gmail.com',
    hospital: 'Sahyadri Super Specialty Hospital 7741',
    district: 'Pune',
    taluka: 'Haveli',
    city: 'Pune',
    address: 'Nahre, Haveli, Pune, Pune (Near Katraj)',
    status: 'Active'
  };

  const sevakKey = String(currentSevak.id || currentSevak.sevakId || currentSevak.userId || currentSevak.name);

  // Persistent storage for temporary relief sevaks and availability status
  const [temporarySevaks, setTemporarySevaks] = useState(() => {
    try {
      const saved = localStorage.getItem('arogya_temp_sevaks');
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

  const currentTempSevak = temporarySevaks[sevakKey];

  // Form states for temporary relief replacement
  const [isAssigningTemp, setIsAssigningTemp] = useState(false);
  const [tempForm, setTempForm] = useState({ name: '', mobile: '', reason: '' });
  const [tempError, setTempError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'AS';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to find hospital name
  const hospitalName = useMemo(() => {
    let rawHosp = typeof currentSevak.hospital === 'string' ? currentSevak.hospital : currentSevak.hospital?.name || currentSevak.hospitalName || '';
    if (rawHosp && rawHosp !== 'Hospital' && rawHosp !== '—' && rawHosp !== 'Unassigned') {
      return rawHosp;
    }

    const matchedHosp = (hospitals || []).find((h) => {
      if (h.assignedSevaks && Array.isArray(h.assignedSevaks)) {
        return h.assignedSevaks.some((sel) => String(sel.id || sel) === String(currentSevak.id) || sel.name === currentSevak.name);
      }
      if (h.sevak && typeof h.sevak === 'string' && currentSevak.name) {
        return h.sevak.toLowerCase().includes(currentSevak.name.toLowerCase());
      }
      return false;
    });

    if (matchedHosp && matchedHosp.name) return matchedHosp.name;
    if (rawHosp && rawHosp !== 'Hospital' && rawHosp !== '—') return rawHosp;
    return 'Sahyadri Super Specialty Hospital 7741';
  }, [currentSevak, hospitals]);

  // Filter active cases assigned to this Sevak
  const activeCasesList = useMemo(() => {
    const sevakName = (currentSevak.name || currentSevak.full_name || '').toLowerCase().trim();
    const sevakId = String(currentSevak.id || currentSevak.sevakId || currentSevak.userId || currentSevak._id || '').toLowerCase().trim();
    const rawMobile = String(currentSevak.mobile || currentSevak.phone || '').replace(/\D/g, '');
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
  }, [cases, currentSevak]);

  // Load active backup sevak from Backend on mount or sevak change
  useEffect(() => {
    let isMounted = true;
    const fetchBackup = async () => {
      try {
        const token = localStorage.getItem('ward_arogya_token');
        const res = await fetch(`http://localhost:5000/api/arogya-sevaks/${encodeURIComponent(sevakKey)}/backup`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const json = await res.json();
        if (isMounted && json && json.data) {
          const rec = json.data;
          const updated = {
            name: rec.backup_name,
            mobile: rec.backup_mobile,
            reason: rec.reason || 'Temporary relief coverage',
            assignedAt: rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'
          };
          setTemporarySevaks((prev) => ({ ...prev, [sevakKey]: updated }));
        }
      } catch (e) {
        // Fallback to localStorage
      }
    };

    if (sevakKey) {
      fetchBackup();
    }
    return () => {
      isMounted = false;
    };
  }, [sevakKey]);

  // Handlers for Temporary / Backup Sevak
  const handleAddTemporarySevakSubmit = async (e) => {
    if (e) e.preventDefault();
    setTempError('');

    if (!tempForm.name.trim() || tempForm.name.trim().length < 2) {
      setTempError('Please enter a valid backup / temporary Sevak full name (at least 2 characters).');
      return;
    }

    const cleanMobile = tempForm.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setTempError('Please enter a valid 10-digit Indian mobile number (e.g. 9822011223).');
      return;
    }

    const tempRecord = {
      name: tempForm.name.trim(),
      mobile: cleanMobile,
      reason: tempForm.reason.trim() || 'Temporary backup to handle patient cases and hospital coordination',
      assignedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    // Optimistic local state update
    const updatedTemp = { ...temporarySevaks, [sevakKey]: tempRecord };
    saveTempSevaks(updatedTemp);

    // Call Backend API to persist assignment
    try {
      const token = localStorage.getItem('ward_arogya_token');
      await fetch(`http://localhost:5000/api/arogya-sevaks/${encodeURIComponent(sevakKey)}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          backup_name: tempRecord.name,
          name: tempRecord.name,
          backup_mobile: tempRecord.mobile,
          mobile: tempRecord.mobile,
          primary_sevak_id: sevakKey,
          primary_sevak_name: currentSevak.name,
          reason: tempRecord.reason,
          hospital_id: hospitalName
        })
      });
    } catch (err) {
      console.warn('Backup Sevak API call failed, kept in local state:', err?.message);
    }

    setIsAssigningTemp(false);
    setTempForm({ name: '', mobile: '', reason: '' });
    setFeedbackMsg({
      text: `Backup Sevak "${tempRecord.name}" (${tempRecord.mobile}) assigned successfully!`,
      type: 'success'
    });
  };

  const handleRemoveTemporarySevak = async () => {
    const confirmRemove = window.confirm(
      `Are you sure you want to remove the temporary backup Sevak for ${currentSevak.name}?`
    );
    if (!confirmRemove) return;

    // Optimistic local state update
    const updatedTemp = { ...temporarySevaks };
    delete updatedTemp[sevakKey];
    saveTempSevaks(updatedTemp);

    // Call Backend API to deactivate assignment
    try {
      const token = localStorage.getItem('ward_arogya_token');
      await fetch(`http://localhost:5000/api/arogya-sevaks/${encodeURIComponent(sevakKey)}/backup`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (err) {
      console.warn('Remove backup Sevak API failed, updated locally:', err?.message);
    }

    setFeedbackMsg({
      text: `Backup Sevak removed for "${currentSevak.name}".`,
      type: 'info'
    });
  };

  return (
    <div className="sevak-detail-page">
      {/* Top Header & Breadcrumb Bar */}
      <div className="sevak-detail-top-bar">
        <div className="top-bar-left">
          <Link to="/admin/sevaks" className="btn-back-to-sevaks">
            <ArrowLeft size={16} />
            <span>Back to Sevaks Directory</span>
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentSevak.name}</span>
        </div>

        <div className="top-bar-actions">
          <button
            type="button"
            className="btn-action-edit"
            onClick={() => setActiveModal({ type: 'edit-sevak', payload: currentSevak })}
          >
            <Pencil size={14} />
            <span>Edit Profile</span>
          </button>

          <Link
            to="/admin/hospitals/assign-sevaks"
            className="btn-action-assign-hosp"
          >
            <Building2 size={14} />
            <span>Hospital Allocation</span>
          </Link>
        </div>
      </div>

      {/* Notification / Toast Banner */}
      {feedbackMsg.text && (
        <div className={`sevak-detail-alert-banner ${feedbackMsg.type}`}>
          {feedbackMsg.type === 'warning' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setFeedbackMsg({ text: '', type: 'success' })}
          >
            ×
          </button>
        </div>
      )}

      {/* Hero Profile Banner Card */}
      <div className="sevak-hero-card">
        <div className="hero-left-section">
          <div className="sevak-large-avatar">
            {getInitials(currentSevak.name)}
          </div>

          <div className="sevak-hero-info">
            <div className="sevak-hero-title-row">
              <h2 className="sevak-hero-name">{currentSevak.name}</h2>
              {currentTempSevak ? (
                <span className="hero-status-badge badge-backup">
                  🛡️ Backup Sevak Assigned: {currentTempSevak.name}
                </span>
              ) : (
                <span className="hero-status-badge badge-active">
                  ✓ Active Sevak
                </span>
              )}
            </div>

            <div className="sevak-hero-submeta">
              {currentSevak.employeeCode && (
                <span className="hero-emp-code">
                  ID: <strong>{currentSevak.employeeCode}</strong>
                </span>
              )}
              {hospitalName && (
                <span className="hero-hosp-pill">
                  <Building2 size={14} />
                  <span>{hospitalName}</span>
                </span>
              )}
              <span className="hero-district-pill">
                <MapPin size={13} />
                <span>{currentSevak.district || 'Pune'}, {currentSevak.taluka || 'Haveli'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right KPI Summary Cards */}
        <div className="hero-kpi-grid">
          <div className="hero-kpi-item">
            <span className="kpi-number">{activeCasesList.length}</span>
            <span className="kpi-label">Active Cases</span>
          </div>

          <div className="hero-kpi-item phone-box">
            <a href={`tel:${currentSevak.mobile}`} className="kpi-phone-btn">
              <PhoneCall size={15} />
              <span>{currentSevak.mobile}</span>
            </a>
            <span className="kpi-label">Direct Contact</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Backup Sevak & Cases) | Right Column (Contact Details) */}
      <div className="sevak-detail-main-grid">
        {/* LEFT COLUMN */}
        <div className="main-grid-left">
          {/* 1. Backup / Temporary Sevak Card */}
          <div className="detail-section-card">
            <div className="card-header-row">
              <div className="card-title-wrap">
                <ShieldCheck size={19} className="text-emerald" />
                <h3 className="card-title">Backup / Temporary ArogyaSevak</h3>
              </div>

              {!currentTempSevak && !isAssigningTemp && (
                <button
                  type="button"
                  className="btn-add-backup-sevak"
                  onClick={() => {
                    setIsAssigningTemp(true);
                    setTempForm({ name: '', mobile: '', reason: '' });
                    setTempError('');
                  }}
                >
                  <UserPlus size={15} />
                  <span>Add Temp Sevak</span>
                </button>
              )}
            </div>

            <div className="backup-coverage-wrapper">
              {/* If a Temporary/Backup Sevak is Assigned */}
              {currentTempSevak ? (
                <div className="temp-sevak-hero-card">
                  <div className="temp-hero-header">
                    <div className="temp-hero-badge">
                      <Shield size={14} />
                      <span>Active Backup / Temporary Sevak</span>
                    </div>
                    <span className="temp-assigned-stamp">Assigned: {currentTempSevak.assignedAt}</span>
                  </div>

                  <div className="temp-hero-body">
                    <div className="temp-field-box">
                      <span className="temp-field-label">Backup Sevak Name</span>
                      <strong className="temp-field-value">{currentTempSevak.name}</strong>
                    </div>

                    <div className="temp-field-box">
                      <span className="temp-field-label">Contact Mobile Number</span>
                      <a href={`tel:${currentTempSevak.mobile}`} className="temp-phone-link">
                        <PhoneCall size={14} />
                        <span>{currentTempSevak.mobile}</span>
                      </a>
                    </div>

                    <div className="temp-field-box full">
                      <span className="temp-field-label">Coverage Purpose / Remarks</span>
                      <span className="temp-field-value">{currentTempSevak.reason}</span>
                    </div>
                  </div>

                  <div className="temp-hero-footer">
                    <button
                      type="button"
                      className="btn-temp-remove"
                      onClick={handleRemoveTemporarySevak}
                    >
                      <Trash2 size={14} /> Remove Backup Sevak
                    </button>

                    <button
                      type="button"
                      className="btn-temp-edit"
                      onClick={() => {
                        setTempForm({
                          name: currentTempSevak.name,
                          mobile: currentTempSevak.mobile,
                          reason: currentTempSevak.reason
                        });
                        setIsAssigningTemp(true);
                      }}
                    >
                      <Pencil size={14} /> Edit Backup Details
                    </button>
                  </div>
                </div>
              ) : (
                !isAssigningTemp && (
                  <div className="no-temp-card">
                    <div className="no-temp-text-wrap">
                      <h5 className="no-temp-title">No Backup Sevak Assigned</h5>
                      <p className="no-temp-desc">
                        Cases for this hospital are currently handled directly by {currentSevak.name}. Use the "+ Add Temp Sevak" button above to assign a temporary backup representative.
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Sub-Form for Adding / Updating Temporary Sevak */}
              {isAssigningTemp && (
                <form
                  className="temp-sevak-input-form"
                  onSubmit={handleAddTemporarySevakSubmit}
                >
                  <div className="form-header-bar">
                    <h4 className="form-header-title">
                      {currentTempSevak ? 'Edit Backup Sevak Details' : 'Assign Backup / Temporary Sevak'}
                    </h4>
                    <p className="form-header-desc">
                      Enter the name and mobile number of the backup representative to assist or cover hospital cases.
                    </p>
                  </div>

                  {tempError && (
                    <div className="form-alert-error">
                      <AlertCircle size={15} />
                      <span>{tempError}</span>
                    </div>
                  )}

                  <div className="form-row-grid">
                    <div className="form-group-item">
                      <label className="input-label">
                        Temporary Sevak Name <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Vikram Deshmukh"
                        value={tempForm.name}
                        onChange={(e) => setTempForm({ ...tempForm, name: e.target.value })}
                        autoFocus
                      />
                    </div>

                    <div className="form-group-item">
                      <label className="input-label">
                        Mobile Number <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        className="input-field"
                        placeholder="e.g. 9822011223"
                        value={tempForm.mobile}
                        onChange={(e) => setTempForm({ ...tempForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      />
                    </div>

                    <div className="form-group-item full">
                      <label className="input-label">Coverage Reason / Duration</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Medical leave cover (30 Sept - 05 Oct)"
                        value={tempForm.reason}
                        onChange={(e) => setTempForm({ ...tempForm, reason: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-submit-row">
                    <button
                      type="button"
                      className="btn-form-cancel"
                      onClick={() => {
                        setIsAssigningTemp(false);
                        setTempError('');
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn-form-confirm"
                    >
                      <Check size={15} />
                      <span>Confirm & Assign Backup Sevak</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* 2. Active Caseload Table */}
          <div className="detail-section-card">
            <div className="card-header-row">
              <div className="card-title-wrap">
                <Activity size={19} className="text-indigo" />
                <h3 className="card-title">
                  Active Assigned Patient Cases
                  <span className="caseload-count-badge">{activeCasesList.length}</span>
                </h3>
              </div>
            </div>

            {activeCasesList.length === 0 ? (
              <div className="empty-caseload-box">
                <Briefcase size={32} color="#94a3b8" />
                <h4 className="empty-title">No Active Cases Assigned Currently</h4>
                <p className="empty-subtitle">
                  When patients are admitted under empanelled schemes at {hospitalName}, they will appear in this live caseload table.
                </p>
              </div>
            ) : (
              <div className="caseload-table-container">
                <table className="caseload-data-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Patient / Applicant</th>
                      <th>Department / Diagnosis</th>
                      <th>Scheme</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCasesList.map((c, idx) => (
                      <tr key={c.id || idx}>
                        <td className="case-id-cell">
                          {c.id || c.caseId || c.applicationNumber}
                        </td>
                        <td className="patient-name-cell">
                          <strong>{c.applicant || c.patient || c.patientName || 'Citizen'}</strong>
                        </td>
                        <td className="dept-cell">
                          {c.department || c.disease || c.category || 'General Medicine'}
                        </td>
                        <td>
                          <span className="scheme-badge-pill">{c.scheme || 'PM-JAY'}</span>
                        </td>
                        <td>
                          <span className="status-badge-live">
                            {c.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-view-case-link"
                            onClick={() => navigate(`/admin/cases/review/${c.id || c.caseId}`)}
                            title="Open Case Workflow"
                          >
                            <span>Open</span>
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Contact & Geographical Location */}
        <div className="main-grid-right">
          <div className="detail-section-card">
            <div className="card-header-row">
              <div className="card-title-wrap">
                <UserCheck size={19} className="text-blue" />
                <h3 className="card-title">Contact & Placement Details</h3>
              </div>
            </div>

            <div className="info-attribute-list">
              <div className="info-attr-item">
                <span className="attr-label">Primary Mobile</span>
                <a href={`tel:${currentSevak.mobile}`} className="attr-phone-link">
                  <Phone size={14} className="text-blue" />
                  <span>{currentSevak.mobile || '—'}</span>
                </a>
              </div>

              <div className="info-attr-item">
                <span className="attr-label">Email Address</span>
                <span className="attr-value">
                  {currentSevak.email ? (
                    <a href={`mailto:${currentSevak.email}`} className="attr-email-link">
                      <Mail size={14} className="text-slate" />
                      <span>{currentSevak.email}</span>
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="info-attr-item">
                <span className="attr-label">Assigned Hospital</span>
                <span className="attr-value">
                  <span className="attr-hosp-pill">
                    <Building2 size={14} />
                    <span>{hospitalName}</span>
                  </span>
                </span>
              </div>

              <div className="info-attr-item">
                <span className="attr-label">District / City</span>
                <span className="attr-value">{currentSevak.district || 'Pune'} ({currentSevak.city || 'Pune'})</span>
              </div>

              <div className="info-attr-item">
                <span className="attr-label">Taluka / Sub-District</span>
                <span className="attr-value">{currentSevak.taluka || 'Haveli'}</span>
              </div>

              <div className="info-attr-item full">
                <span className="attr-label">Full Street Address</span>
                <span className="attr-value address-box">
                  <MapPin size={15} className="text-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    {currentSevak.fullAddress || currentSevak.address || currentSevak.street_address || 'Nahre, Haveli, Pune, Pune'}
                    {currentSevak.landmark && ` (Near ${currentSevak.landmark})`}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArogyaSevakDetail;
