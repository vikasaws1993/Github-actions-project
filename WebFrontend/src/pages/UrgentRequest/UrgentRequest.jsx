import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Search, 
  X, 
  FileText, 
  Camera, 
  Upload, 
  ChevronRight, 
  HelpCircle, 
  CheckCircle, 
  ShieldAlert, 
  User, 
  Building2, 
  DollarSign, 
  AlertCircle,
  Plus,
  Send,
  Trash2,
  Lock
} from 'lucide-react';
import patientService from '@/services/patientService';
import escalationService from '@/services/escalationService';
import Loader from '@/components/common/Loader/Loader';
import { useLanguage } from '@/context/LanguageContext';
import './UrgentRequest.css';

const SPECIALTY_OPTIONS = [
  'Neurosurgery (मेंदू शस्त्रक्रिया)',
  'Pediatric ICU / Lack of Beds (बालरोग अतिदक्षता / बेड कमतरता)',
  'Hemodialysis / Equipment (डायलिसिस युनिट / साधनसामग्री)',
  'Interventional Cardiology (हृदयरोग कॅथलॅब)',
  'Oncology / Chemo (कर्करोग उपचार)',
  'Trauma Vascular (रक्तवाहिनी शस्त्रक्रिया)',
  'Lack of ICU / Ventilator (अतिदक्षता / व्हेंटिलेटर अनुपलब्ध)'
];

export const UrgentRequest = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Instant SWR state hydration from memory/cache
  const initialCachedEscalations = React.useMemo(() => escalationService.getCachedEscalations(), []);
  const initialCachedPatients = React.useMemo(() => {
    const raw = patientService.getCachedPatients();
    return (raw || []).map((p) => ({
      id: p.id || p.caseId || p.applicationNumber,
      name: p.name || p.patientName || 'Assigned Patient',
      age: p.age || 35,
      gender: p.gender || 'Male',
      ward: p.ward || (p.bedNumber ? `Ward (Bed ${p.bedNumber})` : 'General Ward'),
      scheme: p.scheme || p.assignedScheme || 'MJPJAY',
      schemeLimit: p.schemeLimit || '₹1.5L',
      diagnosis: p.diagnosis || p.medicalCondition || 'Hospital Inpatient Management'
    }));
  }, []);

  const [requests, setRequests] = useState(() => initialCachedEscalations?.requests || []);
  const [loading, setLoading] = useState(() => !initialCachedEscalations?.requests?.length);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  // step: 0 = closed, 1 = select patient, 2 = request intervention form, 3 = admin decision simulation
  const [modalStep, setModalStep] = useState(0);

  // Modal 1 state: Patient selection
  const [patients, setPatients] = useState(initialCachedPatients);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Modal 2 state: Escalation Form
  const [escalationReason, setEscalationReason] = useState('bill_exceeded'); // 'bill_exceeded' | 'specialty_unavailable'
  const [approxBill, setApproxBill] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [putOnHold, setPutOnHold] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null); // { name, size, previewUrl, fileObj }
  const fileInputRef = useRef(null);

  // Decision Modal State (for decision simulation)
  const [targetRequestForDecision, setTargetRequestForDecision] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [assignedHospital, setAssignedHospital] = useState('KEM Hospital & Seth G.S. Medical College, Mumbai');
  const [sanctionedScheme, setSanctionedScheme] = useState('CMRF (Chief Minister Relief Fund)');

  // Toast alert
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async (force = false) => {
    if (requests.length === 0) {
      setLoading(true);
    }
    try {
      // Parallelize fetches concurrently
      const [escRes, patientsRes] = await Promise.allSettled([
        escalationService.getEscalations({}, force),
        patientService.getPatients(force),
      ]);

      if (escRes.status === 'fulfilled' && escRes.value?.requests && Array.isArray(escRes.value.requests)) {
        setRequests(escRes.value.requests);
      }

      if (patientsRes.status === 'fulfilled' && Array.isArray(patientsRes.value)) {
        const realPatients = patientsRes.value.map((p) => ({
          id: p.id || p.caseId || p.applicationNumber,
          name: p.name || p.patientName || 'Assigned Patient',
          age: p.age || 35,
          gender: p.gender || 'Male',
          ward: p.ward || (p.bedNumber ? `Ward (Bed ${p.bedNumber})` : 'General Ward'),
          scheme: p.scheme || p.assignedScheme || 'MJPJAY',
          schemeLimit: p.schemeLimit || '₹1.5L',
          diagnosis: p.diagnosis || p.medicalCondition || 'Hospital Inpatient Management'
        }));
        const uniquePatients = Array.from(new Map(realPatients.map((item) => [item.id, item])).values());
        setPatients(uniquePatients);
      }
    } catch (err) {
      console.error('Failed to load urgent requests:', err);
    } finally {
      setLoading(false);
    }
  }, [requests.length]);

  // Load Initial Requests and Patients
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate counts for KPI summary cards
  const counts = {
    all: requests.length,
    onHold: requests.filter((r) => r.status === 'on_hold').length,
    resolved: requests.filter((r) => r.status === 'resolved').length
  };

  // Filter requests by active tab & search query
  const filteredRequests = requests.filter((item) => {
    if (activeTab === 'on_hold' && item.status !== 'on_hold') return false;
    if (activeTab === 'resolved' && item.status !== 'resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.patientName?.toLowerCase().includes(q);
      const matchCase = item.caseId?.toLowerCase().includes(q);
      const matchReason = item.reasonTitle?.toLowerCase().includes(q) || item.remarks?.toLowerCase().includes(q);
      return matchName || matchCase || matchReason;
    }
    return true;
  });

  // Filter patients for Modal 1 selection
  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q))
    );
  });

  // Open Step 1 (Select Patient)
  const handleStartNewRequest = () => {
    setPatientSearch('');
    if (!selectedPatient && patients.length > 0) {
      setSelectedPatient(patients[0]);
    }
    setModalStep(1);
  };

  // Open Step 2 (Request Admin Intervention Form directly)
  const handleOpenDirectForm = (patientToUse) => {
    const targetPatient = patientToUse || selectedPatient || (patients.length > 0 ? patients[0] : null);
    if (!targetPatient) {
      handleStartNewRequest();
      return;
    }
    setSelectedPatient(targetPatient);
    setEscalationReason('bill_exceeded');
    setApproxBill('');
    setClinicalNote('');
    setPutOnHold(true);
    setUploadedFile(null);
    setModalStep(2);
  };

  // Select patient from Step 1 -> Move to Step 2 (Form)
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setEscalationReason('bill_exceeded');
    setApproxBill('');
    setClinicalNote('');
    setPutOnHold(true);
    setUploadedFile(null);
    setModalStep(2);
  };

  // File / Photo upload handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFile({
        name: file.name,
        size: sizeInMb,
        previewUrl: event.target.result,
        isImage: isImage
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Submit Urgent Request (Form Step 2)
  const handleSubmitUrgentRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const newReqPayload = {
      applicationId: selectedPatient.id,
      caseId: selectedPatient.id,
      patientName: selectedPatient.name,
      ageGender: `${selectedPatient.age} yrs • ${selectedPatient.gender}`,
      ward: selectedPatient.ward,
      scheme: selectedPatient.scheme,
      schemeLimit: selectedPatient.schemeLimit || '₹1.5L',
      reasonType: escalationReason,
      requiredSpecialty: null,
      estimatedBill: escalationReason === 'bill_exceeded' ? (approxBill.trim() || '1,85,000') : null,
      remarks: clinicalNote || (
        escalationReason === 'bill_exceeded' 
          ? 'Hospital bill exceeds package ceiling limit.' 
          : 'Facility or specialty unavailable in current hospital facility.'
      ),
      attachmentName: uploadedFile ? uploadedFile.name : null,
      attachment: uploadedFile ? uploadedFile.name : null,
      attachmentUrl: uploadedFile ? uploadedFile.previewUrl : null,
      putOnHold: putOnHold
    };

    try {
      await escalationService.createEscalation(newReqPayload);
    } catch (err) {
      console.warn('Fallback to local submission:', err.message);
      await patientService.addUrgentRequest(newReqPayload);
    }

    await loadData();
    setModalStep(0);
    showToast(`Urgent Admin Request submitted for ${selectedPatient.name}!`);
  };

  // Handle Admin Decision Simulation
  const handleOpenDecisionModal = (req) => {
    setTargetRequestForDecision(req);
    setDecisionNotes(req.resolutionNotes || '');
    setAssignedHospital(req.assignedHospital || 'KEM Hospital & Seth G.S. Medical College, Mumbai');
    setSanctionedScheme(req.sanctionedScheme || 'CMRF (Chief Minister Relief Fund)');
    setModalStep(3);
  };

  const handleSimulateDecision = async () => {
    if (!targetRequestForDecision) return;

    const isSpecialty = targetRequestForDecision.reasonType === 'specialty_unavailable' || 
                        targetRequestForDecision.reasonTitle?.includes('Specialty');

    let baseNotes = decisionNotes.trim();
    if (!baseNotes) {
      baseNotes = isSpecialty
        ? `District Admin approved patient transfer to ${assignedHospital}.`
        : `District Admin approved supplementary grant sanction under ${sanctionedScheme}.`;
    }

    const decisionPayload = {
      resolutionNotes: baseNotes,
      resolution: baseNotes,
      resolutionType: isSpecialty ? 'hospital_transfer' : 'scheme_topup',
      sanctionedScheme: !isSpecialty ? sanctionedScheme : null,
      assignedHospital: isSpecialty ? assignedHospital : null,
      assignedHospitalName: isSpecialty ? assignedHospital : null,
      status: 'RESOLVED',
    };

    try {
      const targetId = targetRequestForDecision.uuid || targetRequestForDecision.id;
      await escalationService.simulateDecision(targetId, decisionPayload);
    } catch (err) {
      console.warn('Fallback local resolution:', err.message);
    }

    await loadData();
    setModalStep(0);
    showToast(`Decision recorded! Case ${targetRequestForDecision.caseId} resolved.`);
  };

  return (
    <div className="urgent-request-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.85rem 1.35rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          animation: 'fadeIn 0.2s'
        }}>
          <CheckCircle color="#10b981" size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Hidden File Input for Bill Photo Copy Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 1. Top Action Row */}
      <div className="urgent-page-header" style={{ justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button className="btn-new-urgent-req" onClick={handleStartNewRequest}>
          <Plus size={16} />
          <span>{t('urgentRequest.newUrgentRequest', 'New Urgent Request')}</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="kpi-cards-grid">
        <div className="kpi-metric-card card-all" onClick={() => setActiveTab('All')} style={{ cursor: 'pointer' }}>
          <span className="kpi-number">{counts.all}</span>
          <span className="kpi-label">{t('urgentRequest.all', 'All')}</span>
        </div>
        <div className="kpi-metric-card card-hold" onClick={() => setActiveTab('on_hold')} style={{ cursor: 'pointer' }}>
          <span className="kpi-number">{counts.onHold}</span>
          <span className="kpi-label">{t('urgentRequest.onHold', '⏸️ ON HOLD')}</span>
        </div>
        <div className="kpi-metric-card card-resolved" onClick={() => setActiveTab('resolved')} style={{ cursor: 'pointer' }}>
          <span className="kpi-number">{counts.resolved}</span>
          <span className="kpi-label">{t('urgentRequest.resolvedDecisions', '✓ Resolved Decisions')}</span>
        </div>
      </div>

      {/* 3. Search and Filter Row */}
      <div className="filter-search-container">
        <div className="search-field-box">
          <Search className="search-field-icon" size={18} />
          <input
            type="text"
            className="search-field-input"
            placeholder={t('urgentRequest.searchPlaceholder', 'Search by patient name, case ID, reason...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills-row">
          <button 
            className={`filter-pill-btn ${activeTab === 'All' ? 'active' : ''}`}
            onClick={() => setActiveTab('All')}
          >
            {t('urgentRequest.all', 'All')} ({counts.all})
          </button>
          <button 
            className={`filter-pill-btn pill-hold ${activeTab === 'on_hold' ? 'active' : ''}`}
            onClick={() => setActiveTab('on_hold')}
          >
            {t('urgentRequest.onHold', '⏸️ ON HOLD')} ({counts.onHold})
          </button>
          <button 
            className={`filter-pill-btn pill-resolved ${activeTab === 'resolved' ? 'active' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            {t('urgentRequest.resolved', '✓ Resolved')} ({counts.resolved})
          </button>
        </div>
      </div>

      {/* 4. Need Immediate Scheme Intervention Banner */}
      <div className="intervention-banner-card">
        <div className="banner-left-content">
          <div className="banner-question-icon">?</div>
          <div className="banner-text-details">
            <h3>{t('urgentRequest.bannerTitle', 'Need Immediate Scheme Intervention?')}</h3>
            <ul>
              <li>{t('urgentRequest.bannerItem1', 'Hospital bill exceeded package limit')}</li>
              <li>{t('urgentRequest.bannerItem2', 'Critical specialty unavailable during treatment')}</li>
            </ul>
          </div>
        </div>
        <button className="btn-new-escalation-link" onClick={handleStartNewRequest}>
          <span>{t('urgentRequest.newEscalation', '+ New Escalation')}</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 5. Urgent Request Cards List */}
      <div className="requests-grid-list">
        {loading ? (
          <Loader
            card
            message="Loading Urgent Requests..."
            subtext="Fetching priority escalation cases and clinical triage requests"
          />
        ) : filteredRequests.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '3rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <CheckCircle size={40} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>{t('urgentRequest.noUrgentRequests', 'No urgent requests match the selected criteria.')}</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div 
              key={req.id} 
              className={`urgent-card-item ${req.status === 'resolved' ? 'status-resolved' : ''}`}
            >
              {/* Card Header Row */}
              <div className="card-top-header">
                <div className="patient-title-group">
                  <h2 className="patient-name-text">{req.patientName}</h2>
                  {req.status === 'on_hold' && (
                    <span className="pill-hold-badge">{t('urgentRequest.onHold', '⏸️ ON HOLD')}</span>
                  )}
                  {req.status === 'resolved' && (
                    <span className="pill-hold-badge" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                      {t('urgentRequest.resolved', '✓ RESOLVED')}
                    </span>
                  )}
                </div>
                <span className="case-id-chip">#{req.caseId}</span>
              </div>

              <div className="patient-meta-subtitle">
                {req.ageGender} • {req.ward}
              </div>

              {/* Reason Content Box */}
              <div className="card-reason-body">
                <div className="reason-badge-row">
                  <div className="chip-reason-tag">
                    <span style={{ color: '#dc2626', fontWeight: 800 }}>🚨</span>
                    <span>{req.reasonBadge || 'Bill Exceeded'}</span>
                  </div>
                  <span className="chip-status-tag">
                    ⏳ {req.statusBadge || 'Under Review'}
                  </span>
                </div>

                {req.estimatedBill && (
                  <div className="bill-amount-row">
                    <span>{t('urgentRequest.approxBill', 'Approx. Hospital Bill (₹):')}</span>
                    <span className="highlight-bill-value">{req.estimatedBill}</span>
                  </div>
                )}

                <div className="clinical-note-quote">
                  "{req.remarks}"
                </div>

                {req.attachment && (
                  <div className="attachment-preview-tag">
                    <FileText size={14} />
                    <span>{t('urgentRequest.attachedDoc', 'Attached Document:')} {req.attachment}</span>
                  </div>
                )}

                <div className="submitted-time-footer">
                  {t('urgentRequest.submittedOn', 'Submitted on')} {req.submittedAt} {t('urgentRequest.by', 'by')} {typeof req.submittedBy === 'object' ? (req.submittedBy?.name || 'Arogya Sevak') : (req.submittedBy || 'Arogya Sevak')}
                </div>

                {req.status === 'resolved' && (
                  <div style={{
                    marginTop: '0.75rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#166534',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {(req.reasonType === 'specialty_unavailable' || req.reasonTitle?.includes('Specialty')) ? (
                      <div>
                        <strong>{t('urgentRequest.newAssignedHospital', 'New Assigned Hospital:')}</strong>{' '}
                        <span style={{ color: '#0369a1', fontWeight: 700 }}>
                          🏥 {req.assignedHospital || 'KEM Hospital & Seth G.S. Medical College, Mumbai'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <strong>{t('urgentRequest.sanctionedScheme', 'Sanctioned Scheme:')}</strong>{' '}
                        <span style={{ color: '#047857', fontWeight: 700 }}>
                          📜 {req.sanctionedScheme || 'CMRF (Chief Minister Relief Fund)'}
                        </span>
                      </div>
                    )}
                    {req.resolutionNotes && <div><strong>{t('urgentRequest.resolutionOrder', 'Resolution Order:')}</strong> {req.resolutionNotes}</div>}
                  </div>
                )}
              </div>

              {/* Card Actions Row */}
              <div className="card-actions-flex">
                {req.status !== 'resolved' ? (
                  <button className="btn-simulate-decision" onClick={() => handleOpenDecisionModal(req)}>
                    <CheckCircle size={16} />
                    <span>{t('urgentRequest.simulateDecision', 'Simulate Admin Decision')}</span>
                  </button>
                ) : (
                  <button className="btn-simulate-decision" disabled style={{ opacity: 0.6, cursor: 'default', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}>
                    <Lock size={14} />
                    <span>{t('urgentRequest.adminSanctionRecorded', 'Admin Sanction Recorded (Read Only)')}</span>
                  </button>
                )}

                <button 
                  className="btn-view-case-detail"
                  onClick={() => {
                    if (req.caseId || req.applicationId) {
                      navigate(`/arogyasevak/patient/${req.caseId || req.applicationId}`);
                    } else {
                      handleOpenDecisionModal(req);
                    }
                  }}
                  title="Open patient case record and uploaded documentation"
                >
                  <span>{t('urgentRequest.viewCaseUploads', 'View Case & Uploads')}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: SELECT PATIENT / CASE (Image 2 UI in Web Format) */}
      {/* ============================================================ */}
      {modalStep === 1 && (
        <div className="urgent-modal-overlay">
          <div className="urgent-modal-card">
            <div className="urgent-modal-header">
              <div className="modal-title-text">
                <h2>{t('urgentRequest.selectPatientTitle', 'Select Patient / Case')}</h2>
                <p>{t('urgentRequest.selectPatientSubtitle', 'Choose the allocated patient whose issue needs admin intervention')}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setModalStep(0)}>
                <X size={20} />
              </button>
            </div>

            <div className="urgent-modal-body">
              <div className="patient-select-search">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder={t('urgentRequest.searchPatientPlaceholder', 'Search patient name, case ID, diagnosis...')}
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>

              <div className="patient-selection-list">
                {filteredPatients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                    <User size={36} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#334155' }}>{t('urgentRequest.noAllocatedPatients', 'No allocated patients found')}</p>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('urgentRequest.noAllocatedSub', 'Only active patients assigned to your hospital appear in this list.')}</span>
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      className="patient-select-item"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <div className="patient-item-left">
                        <div className="patient-avatar-circle">
                          <User size={20} />
                        </div>
                        <div className="patient-select-details">
                          <div className="patient-select-name-row">
                            <span className="patient-select-name">{p.name}</span>
                            <span className="patient-select-caseid">#{p.id}</span>
                          </div>
                          <span className="patient-select-subtext">
                            {p.age} {t('patients.yrs', 'yrs')} • {p.gender} • {p.ward}
                          </span>
                          {p.diagnosis && (
                            <span className="patient-select-diagnosis">{p.diagnosis}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: '#94a3b8' }} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="urgent-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setModalStep(0)}>
                {t('urgentRequest.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: REQUEST ADMIN INTERVENTION FORM (Image 3 & 4 UI) */}
      {/* ============================================================ */}
      {modalStep === 2 && selectedPatient && (
        <div className="urgent-modal-overlay">
          <div className="urgent-modal-card" style={{ maxWidth: '680px' }}>
            <div className="urgent-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon">
                  <Zap size={20} />
                </div>
                <div className="modal-title-text">
                  <h2>{t('urgentRequest.requestInterventionTitle', 'Request Admin Intervention')}</h2>
                  <p>{t('urgentRequest.requestInterventionSubtitle', 'Escalate scheme limit overrun or unavailable specialty to District Admin')}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setModalStep(0)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUrgentRequest}>
              <div className="urgent-modal-body">
                {/* Selected Patient Summary Banner */}
                <div className="selected-patient-banner">
                  <div>
                    <div className="banner-patient-name">{selectedPatient.name}</div>
                    <div className="banner-patient-sub">
                      {selectedPatient.id} • {selectedPatient.scheme || 'MJPJAY'} (Limit ₹1.5L) • {selectedPatient.ward}
                    </div>
                  </div>
                  <span className="scheme-tag-pill">{selectedPatient.scheme || 'MJPJAY'}</span>
                </div>

                {/* Escalation Reason Radio Cards */}
                <div className="form-group-block">
                  <label className="field-label-bold">{t('urgentRequest.selectEscalationReason', 'Select Escalation Reason *')}</label>
                  <div className="reason-cards-grid">
                    {/* Option 1: Bill Exceeded */}
                    <div 
                      className={`reason-radio-card ${escalationReason === 'bill_exceeded' ? 'selected-bill' : ''}`}
                      onClick={() => {
                        setEscalationReason('bill_exceeded');
                      }}
                    >
                      <div className="reason-card-icon-box icon-red-box">
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>$</span>
                      </div>
                      <span className="reason-card-title">{t('urgentRequest.billExceededTitle', '💰 Hospital Bill Exceeded Scheme Limit')}</span>
                      <span className="reason-card-desc">
                        {t('urgentRequest.billExceededDesc', 'Hospital bill exceeds package ceiling. Request extra grant or scheme top-up.')}
                      </span>
                    </div>

                    {/* Option 2: Specialty Unavailable */}
                    <div 
                      className={`reason-radio-card ${escalationReason === 'specialty_unavailable' ? 'selected-facility' : ''}`}
                      onClick={() => {
                        setEscalationReason('specialty_unavailable');
                      }}
                    >
                      <div className="reason-card-icon-box icon-blue-box">
                        <Building2 size={20} />
                      </div>
                      <span className="reason-card-title">{t('urgentRequest.specialtyUnavailableTitle', '🏥 Facility / Specialty Unavailable')}</span>
                      <span className="reason-card-desc">
                        {t('urgentRequest.specialtyUnavailableDesc', 'Facility lacks specialty or equipment. Request official transfer approval.')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approx Hospital Bill (₹) - Only for Hospital Bill Exceeded */}
                {escalationReason === 'bill_exceeded' && (
                  <div className="form-group-block">
                    <label className="field-label-bold">
                      {t('urgentRequest.approxBillLabel', 'Approx. Hospital Bill (₹)')} *
                    </label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder={t('urgentRequest.billPlaceholderExceeded', 'e.g. ₹ 1,85,000 (Exceeds ₹1,50,000 package limit)')}
                      value={approxBill}
                      onChange={(e) => setApproxBill(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Detailed Cause & Clinical Note */}
                <div className="form-group-block">
                  <label className="field-label-bold">{t('urgentRequest.detailedCause', 'Detailed Cause & Clinical Note *')}</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder={t('urgentRequest.causePlaceholder', 'Explain why bill exceeded (e.g. ICU stay extended by 5 days, extra consumables required for bypass surgery)...')}
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    required
                  />
                </div>

                {/* Upload Supportive Document (Bill / Referral Slip) */}
                <div className="form-group-block">
                  <label className="field-label-bold">{t('urgentRequest.attachSupportiveDoc', 'Attach Supportive Document (Bill / Referral Slip)')}</label>
                  <div className="upload-buttons-row">
                    <button 
                      type="button" 
                      className="btn-upload-opt"
                      onClick={triggerFileInput}
                    >
                      <Camera size={18} style={{ color: '#0284c7' }} />
                      <span>{t('urgentRequest.cameraPhoto', 'Camera Photo')}</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn-upload-opt"
                      onClick={triggerFileInput}
                    >
                      <Upload size={18} style={{ color: '#475569' }} />
                      <span>{t('urgentRequest.browseFile', 'Browse File')}</span>
                    </button>
                  </div>

                  {uploadedFile && (
                    <div className="uploaded-file-preview-card">
                      <div className="uploaded-file-info">
                        {uploadedFile.previewUrl ? (
                          <img src={uploadedFile.previewUrl} alt="Bill Preview" className="file-thumb-img" />
                        ) : (
                          <FileText size={28} style={{ color: '#16a34a' }} />
                        )}
                        <div>
                          <div className="file-name-text">{uploadedFile.name}</div>
                          <div className="file-size-text">{uploadedFile.size} • {t('urgentRequest.uploadedCopy', 'Uploaded Copy')}</div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-remove-file"
                        onClick={() => setUploadedFile(null)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Put Case On Hold Option */}
                <div className="hold-option-card">
                  <input
                    type="checkbox"
                    className="hold-checkbox"
                    id="holdCheckbox"
                    checked={putOnHold}
                    onChange={(e) => setPutOnHold(e.target.checked)}
                  />
                  <label htmlFor="holdCheckbox" className="hold-label-text" style={{ cursor: 'pointer' }}>
                    <strong>{t('urgentRequest.putOnHold', 'Put Case On Hold until Admin Decision')}</strong>
                    <p>{t('urgentRequest.putOnHoldDesc', 'Pauses billing, surgery billing, or discharge authorization until Admin decides.')}</p>
                  </label>
                </div>
              </div>

              <div className="urgent-modal-footer">
                <button 
                  type="button" 
                  className="btn-modal-cancel" 
                  onClick={() => setModalStep(1)}
                >
                  {t('urgentRequest.back', 'Back')}
                </button>
                <button type="submit" className="btn-modal-submit">
                  <Send size={16} />
                  <span>{t('urgentRequest.sendRequestToAdmin', 'Send Request to Admin')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ADMIN DECISION SIMULATION */}
      {/* ============================================================ */}
      {modalStep === 3 && targetRequestForDecision && (
        <div className="urgent-modal-overlay">
          <div className="urgent-modal-card">
            <div className="urgent-modal-header">
              <div className="modal-title-with-icon">
                <div className="modal-header-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  <ShieldAlert size={20} />
                </div>
                <div className="modal-title-text">
                  <h2>{t('urgentRequest.simulateDecisionTitle', 'Simulate Admin Decision')}</h2>
                  <p>Case ID: #{targetRequestForDecision.caseId} • Patient: {targetRequestForDecision.patientName}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setModalStep(0)}>
                <X size={20} />
              </button>
            </div>

            <div className="urgent-modal-body">
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.875rem'
              }}>
                <div style={{ marginBottom: '0.35rem' }}>
                  <strong>{t('urgentRequest.escalationReason', 'Escalation Reason:')}</strong> {targetRequestForDecision.reasonTitle}
                </div>
                <div style={{ marginBottom: '0.35rem' }}>
                  <strong>{t('urgentRequest.hospitalBill', 'Hospital Bill (₹):')}</strong> {targetRequestForDecision.estimatedBill}
                </div>
                <div>
                  <strong>{t('urgentRequest.remarks', 'Remarks:')}</strong> "{targetRequestForDecision.remarks}"
                </div>
              </div>

              {targetRequestForDecision.status === 'resolved' ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 800, marginBottom: '0.6rem' }}>
                    <Lock size={16} />
                    <span>{t('urgentRequest.officialResolution', 'Official District Admin Resolution (Read-Only)')}</span>
                  </div>

                  {(targetRequestForDecision.reasonType === 'specialty_unavailable' || targetRequestForDecision.reasonTitle?.includes('Specialty')) ? (
                    <div style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 700, marginBottom: '0.35rem' }}>
                      🏥 {t('urgentRequest.newAssignedHospital', 'New Assigned Hospital:')} {targetRequestForDecision.assignedHospital || 'KEM Hospital & Seth G.S. Medical College, Mumbai'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 700, marginBottom: '0.35rem' }}>
                      📜 {t('urgentRequest.sanctionedScheme', 'Sanctioned Scheme:')} {targetRequestForDecision.sanctionedScheme || 'CMRF (Chief Minister Relief Fund)'}
                    </div>
                  )}

                  {targetRequestForDecision.resolutionNotes && (
                    <div style={{ fontSize: '0.825rem', color: '#15803d', marginTop: '0.35rem' }}>
                      <strong>{t('urgentRequest.resolutionOrder', 'Resolution Order:')}</strong> "{targetRequestForDecision.resolutionNotes}"
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Dynamic Admin Resolution Read-Only Display based on Escalation Reason */}
                  {targetRequestForDecision.reasonType === 'specialty_unavailable' || targetRequestForDecision.reasonTitle?.includes('Specialty') ? (
                    <div className="form-group-block" style={{ marginBottom: '1.25rem' }}>
                      <label className="field-label-bold" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={16} />
                        <span>New Assigned Hospital Name (Specialty Transfer)</span>
                      </label>
                      <div style={{
                        background: '#f0f9ff',
                        border: '1.5px solid #bae6fd',
                        borderRadius: '10px',
                        padding: '0.65rem 1rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>🏥 {targetRequestForDecision.assignedHospital || 'KEM Hospital & Seth G.S. Medical College, Mumbai'}</span>
                        <span style={{ fontSize: '0.75rem', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', color: '#0284c7', fontWeight: 600 }}>Assigned by Admin</span>
                      </div>
                    </div>
                  ) : (
                    <div className="form-group-block" style={{ marginBottom: '1.25rem' }}>
                      <label className="field-label-bold" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={16} />
                        <span>Name of New Scheme Sanctioned (Budget Limit Resolution)</span>
                      </label>
                      <div style={{
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        borderRadius: '10px',
                        padding: '0.65rem 1rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>📜 {targetRequestForDecision.sanctionedScheme || 'CMRF (Chief Minister Relief Fund)'}</span>
                        <span style={{ fontSize: '0.75rem', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', color: '#d97706', fontWeight: 600 }}>Sanctioned by Admin</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group-block">
                    <label className="field-label-bold">Admin Resolution Order & Sanction Notes:</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="Enter official resolution notes (e.g. Approved CMRF ₹35,000 top-up or Approved transfer)..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="urgent-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setModalStep(0)}>
                {t('common.close', 'Close')}
              </button>
              {targetRequestForDecision.status !== 'resolved' && (
                <button className="btn-modal-submit" onClick={handleSimulateDecision} style={{ background: '#0284c7' }}>
                  <CheckCircle size={16} />
                  <span>Approve & Resolve Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgentRequest;
