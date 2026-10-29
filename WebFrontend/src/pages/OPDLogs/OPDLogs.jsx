import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  User, 
  Clock, 
  ChevronRight, 
  X, 
  Check, 
  Stethoscope, 
  FileText,
  PhoneCall,
  RefreshCw,
  Eye,
  FileCheck2,
  Paperclip,
  Trash2,
  Upload,
  ExternalLink,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import opdService, { computeOpdStats } from '../../services/opdService';
import patientService from '../../services/patientService';
import Loader from '@/components/common/Loader/Loader';
import { useLanguage } from '@/context/LanguageContext';
import './OPDLogs.css';

// Default allocated cases (loaded dynamically from live patient service)
const DEFAULT_ALLOCATED_CASES = [];

const OPD_DOCTORS_LIST = [
  'Dr. Nilesh Bapat (General Physician)',
  'Dr. Arvind Mahadeo Joshi (Cardiothoracic Surgeon)',
  'Dr. Meenal Kulkarni-Deshpande (Interventional Cardiologist)',
  'Dr. Rajesh Vitthalrao Salunkhe (Orthopedics & Trauma)',
  'Dr. Farhan N. Merchant (Nephrologist & Dialysis)',
  'Dr. Sunanda Balkrishna Shinde (Ophthalmologist)',
  'Dr. Ananya Deshmukh (Cardiology)',
  'Dr. Suresh R. Patil (General Medicine)',
  'Dr. Priya Nair (Pediatrician)',
  'Dr. Rahul S. Deshmukh (General Surgeon)',
  'Dr. Anjali Patil (Gynecologist)',
  'Dr. Rohan Kulkarni (Consulting Physician)',
];

const getDefaultFollowUpDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

const VISIT_TYPES = [
  'New Consultation',
  'Follow-Up',
  'Scheme Verification',
  'Diagnostic / Lab Test',
  'Emergency Triage'
];

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'General Surgery',
  'ENT',
  'Ophthalmology',
  'Emergency & Trauma'
];

const FOLLOW_UP_TIMELINES = [
  'In 3 Days',
  'In 7 Days',
  'In 15 Days',
  'In 1 Month'
];

export const OPDLogs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Instant SWR state hydration from memory/cache for 0ms initial render
  const initialCachedVisits = React.useMemo(() => opdService.getCachedOpdVisits(), []);
  const initialCachedStats = React.useMemo(() => opdService.getCachedOpdStats(), []);
  const initialCachedPatients = React.useMemo(() => {
    const pList = patientService.getCachedPatients();
    return (pList || []).map((p) => ({
      id: p.id || p.caseId || p.applicationNumber,
      patientName: p.name || p.patientName,
      age: p.age,
      gender: p.gender,
      phone: p.phone || p.mobile || p.contact || '',
      diagnosis: p.diagnosis || p.ward || 'General Outpatient Treatment',
      scheme: p.scheme || 'MJPJAY',
    }));
  }, []);

  // Main State
  const [logs, setLogs] = useState(initialCachedVisits);
  const [stats, setStats] = useState(initialCachedStats);
  const [allocatedCases, setAllocatedCases] = useState(initialCachedPatients);
  const [loading, setLoading] = useState(() => initialCachedVisits.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needed' | 'completed' | 'today'

  // Modals & UI Overlays
  const [showLogModal, setShowLogModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [callAlert, setCallAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form Modal State
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(() => initialCachedPatients[0]?.id || '');
  const [doctorInput, setDoctorInput] = useState(OPD_DOCTORS_LIST[0]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(getDefaultFollowUpDate());
  const [attachedDoc, setAttachedDoc] = useState(null);

  const filteredDoctors = useMemo(() => {
    const q = (doctorInput || '').toLowerCase().trim();
    if (!q) return OPD_DOCTORS_LIST;
    const exactMatch = OPD_DOCTORS_LIST.some((d) => d.toLowerCase() === q);
    if (exactMatch) return OPD_DOCTORS_LIST;
    return OPD_DOCTORS_LIST.filter((d) => d.toLowerCase().includes(q));
  }, [doctorInput]);

  // Toast Helper
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Data from Live API
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (logs.length === 0) setLoading(true);

    try {
      const [allVisits, patients] = await Promise.all([
        opdService.getAllOpdVisits({}, isRefresh),
        patientService.getPatients(isRefresh).catch(() => []),
      ]);

      const visitsList = Array.isArray(allVisits) ? allVisits : [];
      setLogs(visitsList);
      setStats(computeOpdStats(visitsList));

      if (Array.isArray(patients) && patients.length > 0) {
        const mapped = patients.map((p) => ({
          id: p.id || p.caseId || p.applicationNumber,
          patientName: p.name || p.patientName,
          age: p.age,
          gender: p.gender,
          phone: p.phone || p.mobile || p.contact || '',
          diagnosis: p.diagnosis || p.ward || 'General Outpatient Treatment',
          scheme: p.scheme || 'MJPJAY',
        }));
        setAllocatedCases(mapped);
        if (!selectedCaseId && mapped.length > 0) {
          setSelectedCaseId(mapped[0].id);
        }
      } else {
        setAllocatedCases([]);
      }
    } catch (err) {
      console.error('Error loading OPD data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logs.length, selectedCaseId]);

  useEffect(() => {
    loadData(true);
  }, []);

  // When selected case changes, auto-detect department if applicable
  const handleSelectCase = (c) => {
    setSelectedCaseId(c.id);
    const diag = (c.diagnosis || '').toLowerCase();
    if (diag.includes('coronary') || diag.includes('heart') || diag.includes('cardiac')) {
      setSelectedDepartment('Cardiology');
    } else if (diag.includes('fracture') || diag.includes('femur') || diag.includes('ortho') || diag.includes('joint')) {
      setSelectedDepartment('Orthopedics');
    } else if (diag.includes('pregnan') || diag.includes('lscs') || diag.includes('maternity') || diag.includes('gynec')) {
      setSelectedDepartment('Obstetrics & Gynecology');
    } else if (diag.includes('pediatric') || diag.includes('child')) {
      setSelectedDepartment('Pediatrics');
    }
  };

  // Filtered Logs strictly scoped to Arogya Sevak's allocated cases
  const filteredLogs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];

    const allocatedIdSet = new Set((allocatedCases || []).map((c) => String(c.id || '').toLowerCase().trim()).filter(Boolean));
    const allocatedNameSet = new Set((allocatedCases || []).map((c) => String(c.patientName || '').toLowerCase().trim()).filter(Boolean));

    return logs.filter((log) => {
      // If Arogya Sevak has specific allocated cases, ensure other patients are excluded
      if (allocatedIdSet.size > 0) {
        const logCaseId = String(log.caseId || '').toLowerCase().trim();
        const logAppId = String(log.applicationId || log.application_id || '').toLowerCase().trim();
        const logPatientName = String(log.patientName || '').toLowerCase().trim();

        const isAllocated =
          allocatedIdSet.has(logCaseId) ||
          allocatedIdSet.has(logAppId) ||
          allocatedNameSet.has(logPatientName);

        if (!isAllocated) return false;
      }

      const matchesSearch =
        !q ||
        (log.patientName || '').toLowerCase().includes(q) ||
        (log.caseId || '').toLowerCase().includes(q) ||
        (log.tokenNumber || log.tokenNo || '').toLowerCase().includes(q) ||
        (log.contactPhone || log.phone || '').includes(q) ||
        (log.department || '').toLowerCase().includes(q) ||
        (log.consultingDoctor || log.doctor || '').toLowerCase().includes(q) ||
        (log.chiefComplaint || log.diagnosis || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === 'needed') {
        return log.followUpStatus === 'PENDING' || log.followUpStatus === 'needed';
      }
      if (activeFilter === 'completed') {
        return log.followUpStatus === 'DONE' || log.followUpStatus === 'completed' || log.followUpStatus === 'NOT_REQUIRED';
      }
      if (activeFilter === 'today') {
        return log.date === today || (log.timestamp && log.timestamp.includes('Today'));
      }

      return true;
    });
  }, [logs, searchTerm, activeFilter, allocatedCases]);

  // Dynamically compute KPI Stats reflecting only this Sevak's patient visits
  const displayedStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const targetLogs = allocatedCases?.length > 0
      ? logs.filter((log) => {
          const cId = String(log.caseId || '').toLowerCase().trim();
          const pName = String(log.patientName || '').toLowerCase().trim();
          return allocatedCases.some(
            (c) =>
              String(c.id || '').toLowerCase().trim() === cId ||
              String(c.patientName || '').toLowerCase().trim() === pName
          );
        })
      : logs;

    return {
      totalVisits: targetLogs.length,
      todayCount: targetLogs.filter((v) => v.date === today || v.timestamp?.includes('Today') || v.timestampFormatted?.includes('Today')).length,
      followUpRequiredCount: targetLogs.filter((v) => v.followUpStatus === 'PENDING').length,
      followUpDoneCount: targetLogs.filter((v) => v.followUpStatus === 'DONE').length,
    };
  }, [logs, allocatedCases]);

  // Filter Allocated Cases for Modal Search
  const filteredAllocatedCases = useMemo(() => {
    const q = caseSearch.toLowerCase().trim();
    if (!q) return allocatedCases;
    return allocatedCases.filter(
      (c) =>
        (c.patientName || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (c.diagnosis || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    );
  }, [allocatedCases, caseSearch]);

  // Handle Prescription File Selection
  const handlePrescriptionFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedDoc({
        name: file.name,
        type: file.type || 'image/jpeg',
        size: `${Math.round(file.size / 1024)} KB`,
        uri: ev.target?.result,
        source: 'device',
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit New OPD Visit Log
  const handleRecordVisit = async (e) => {
    e.preventDefault();

    const selectedCaseObj = allocatedCases.find((c) => c.id === selectedCaseId) || allocatedCases[0];
    if (!selectedCaseObj) {
      showToast('Please select an allocated patient case.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedFollowUpDate = followUpDate
        ? new Date(followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'In 7 Days';

      const payload = {
        caseId: selectedCaseObj.id,
        patientName: selectedCaseObj.patientName,
        age: selectedCaseObj.age || 40,
        gender: selectedCaseObj.gender || 'Male',
        contactPhone: selectedCaseObj.phone || '+91 98000 00000',
        abhaId: selectedCaseObj.abhaId,
        department: 'General Medicine',
        consultingDoctor: doctorInput.trim() || undefined,
        visitType: 'Follow-Up',
        schemeEligibility: selectedCaseObj.scheme?.includes('PM-JAY') ? 'PM-JAY Eligible' : 'MJPJAY Eligible',
        chiefComplaint: chiefComplaint.trim() || selectedCaseObj.diagnosis || 'Routine Outpatient Consultation',
        nextFollowUpRequired: followUpRequired,
        nextFollowUpTimeline: followUpRequired ? formattedFollowUpDate : undefined,
        follow_up_date: followUpRequired ? followUpDate : undefined,
        prescriptionDoc: attachedDoc || undefined,
        recordedBy: 'Arogya Sevak',
      };

      const newVisit = await opdService.logNewOpdVisit(payload);

      showToast(`OPD Visit recorded successfully for ${selectedCaseObj.patientName}!`);
      setShowLogModal(false);

      // Reset form
      setDoctorInput('');
      setChiefComplaint('');
      setAttachedDoc(null);
      setFollowUpRequired(false);

      loadData(true);
    } catch (err) {
      console.error('Error recording OPD visit:', err);
      showToast('Failed to record OPD visit. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve Follow-up Status
  const handleResolveFollowUp = async (visit, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setResolvingId(visit.id);

    try {
      const ok = await opdService.resolveFollowUp(visit.id);
      if (ok) {
        showToast(`Follow-up marked completed for ${visit.patientName}!`, 'success');
        loadData(true);
      }
    } catch (err) {
      console.error('Error resolving follow-up:', err);
      showToast('Could not resolve follow-up.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  // Modal Translation Helpers
  const getVisitTypeLabel = (type) => {
    switch (type) {
      case 'New Consultation': return t('opdModal.newConsultation', 'New Consultation');
      case 'Follow-Up': return t('opdModal.followUp', 'Follow-Up');
      case 'Scheme Verification': return t('opdModal.schemeVerification', 'Scheme Verification');
      case 'Diagnostic / Lab Test': return t('opdModal.diagnosticLabTest', 'Diagnostic / Lab Test');
      case 'Emergency Triage': return t('opdModal.emergencyTriage', 'Emergency Triage');
      default: return type;
    }
  };

  const getDeptLabel = (dept) => {
    switch (dept) {
      case 'General Medicine': return t('opdModal.generalMedicine', 'General Medicine');
      case 'Cardiology': return t('opdModal.cardiology', 'Cardiology');
      case 'Orthopedics': return t('opdModal.orthopedics', 'Orthopedics');
      case 'Pediatrics': return t('opdModal.pediatrics', 'Pediatrics');
      case 'Obstetrics & Gynecology': return t('opdModal.obstetricsGynecology', 'Obstetrics & Gynecology');
      case 'General Surgery': return t('opdModal.generalSurgery', 'General Surgery');
      case 'ENT': return t('opdModal.ent', 'ENT');
      case 'Ophthalmology': return t('opdModal.ophthalmology', 'Ophthalmology');
      case 'Emergency & Trauma': return t('opdModal.emergencyTrauma', 'Emergency & Trauma');
      default: return dept;
    }
  };

  const getTimeframeLabel = (tf) => {
    switch (tf) {
      case 'In 3 Days': return t('opdModal.in3Days', 'In 3 Days');
      case 'In 7 Days': return t('opdModal.in7Days', 'In 7 Days');
      case 'In 15 Days': return t('opdModal.in15Days', 'In 15 Days');
      case 'In 1 Month': return t('opdModal.in1Month', 'In 1 Month');
      default: return tf;
    }
  };

  return (
    <div className="web-opd-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`web-opd-toast ${toastMessage.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastMessage.text || toastMessage}</span>
        </div>
      )}

      {/* CTI Dialing Alert Overlay */}
      {callAlert && (
        <div className="cti-modal-backdrop" onClick={() => setCallAlert(null)}>
          <div className="cti-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cti-modal-header">
              <PhoneCall size={24} className="pulse-phone" />
              <div>
                <h3>Connecting CTI Operator Call</h3>
                <span className="cti-sub">Dialing {callAlert.name}</span>
              </div>
            </div>
            <div className="cti-modal-body">
              <p>Phone Number: <strong>{callAlert.phone}</strong></p>
              <span className="cti-patient-ref">Case Reference: {callAlert.caseId}</span>
            </div>
            <div className="cti-modal-actions">
              <button className="btn-cti-cancel" onClick={() => setCallAlert(null)}>Close</button>
              <button
                className="btn-cti-call"
                onClick={() => {
                  window.location.href = `tel:${callAlert.phone.replace(/\s+/g, '')}`;
                  showToast(`Call initiated to ${callAlert.name} (${callAlert.phone})`);
                  setCallAlert(null);
                }}
              >
                Connect Operator Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Document Preview Modal */}
      {previewDoc && (
        <div className="cti-modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="cti-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cti-modal-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck2 size={22} className="text-blue" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{previewDoc.name || 'Prescription Document'}</h3>
                  <span className="cti-sub">{previewDoc.size ? `${previewDoc.size} • ` : ''}Uploaded on {previewDoc.uploadedAt || 'OPD Visit'}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '10px 0', maxHeight: '480px', overflowY: 'auto' }}>
              {previewDoc.uri && (previewDoc.type?.includes('pdf') || previewDoc.name?.toLowerCase().endsWith('.pdf')) ? (
                <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#fff' }}>
                  <iframe
                    src={previewDoc.uri}
                    title={previewDoc.name || 'Prescription Document'}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : previewDoc.uri ? (
                <img
                  src={previewDoc.uri}
                  alt="Prescription Document"
                  style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0', background: '#fff' }}
                />
              ) : (
                <div style={{ padding: '30px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  <FileText size={48} color="#0284c7" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{previewDoc.name}</p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Document attached to this OPD clinical record</span>
                </div>
              )}
            </div>

            <div className="cti-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {previewDoc.uri && (
                <a
                  href={previewDoc.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0284c7', fontWeight: '600' }}
                >
                  <ExternalLink size={14} /> Open Full View
                </a>
              )}
              <button className="btn-cti-cancel" onClick={() => setPreviewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Stat Cards Bar */}
      <div className="web-opd-stats-grid">
        <div className="opd-stat-card card-all">
          <div className="stat-value-text">{displayedStats.totalVisits}</div>
          <div className="stat-label-text">{t('opdLogs.totalVisits', 'TOTAL VISITS')}</div>
        </div>

        <div className="opd-stat-card card-blue">
          <div className="stat-value-text">{displayedStats.todayCount}</div>
          <div className="stat-label-text">{t('opdLogs.todaysVisits', "TODAY'S VISITS")}</div>
        </div>

        <div className="opd-stat-card card-amber">
          <div className="stat-value-text">{displayedStats.followUpRequiredCount}</div>
          <div className="stat-label-text">{t('opdLogs.followUpNeeded', 'FOLLOW-UP NEEDED')}</div>
        </div>

        <div className="opd-stat-card card-emerald">
          <div className="stat-value-text">{displayedStats.followUpDoneCount}</div>
          <div className="stat-label-text">{t('opdLogs.followUpDone', 'FOLLOW-UP DONE')}</div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="web-opd-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="opd-search-input"
            placeholder={t('opdLogs.searchPlaceholder', 'Search patient name, Case ID, token, doctor...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips-group">
          <button
            type="button"
            className={`filter-chip-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            {t('opdLogs.allLogs', 'All Logs')} ({displayedStats.totalVisits})
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${activeFilter === 'needed' ? 'active-amber' : ''}`}
            onClick={() => setActiveFilter('needed')}
          >
            <AlertTriangle size={14} />
            {t('opdLogs.followUpNeededFilter', 'Follow-up Needed')} ({displayedStats.followUpRequiredCount})
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${activeFilter === 'completed' ? 'active-emerald' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            <CheckCircle2 size={14} />
            {t('opdLogs.followUpDoneFilter', 'Follow-up Done')} ({displayedStats.followUpDoneCount})
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${activeFilter === 'today' ? 'active' : ''}`}
            onClick={() => setActiveFilter('today')}
          >
            <Clock size={14} />
            {t('opdLogs.today', 'Today')} ({displayedStats.todayCount})
          </button>

          <button
            type="button"
            className={`refresh-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadData(true)}
            title="Refresh OPD records"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            className="btn-log-opd-primary"
            onClick={() => {
              if (allocatedCases.length > 0 && !selectedCaseId) {
                setSelectedCaseId(allocatedCases[0].id);
              }
              setShowLogModal(true);
            }}
            style={{ padding: '7px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            <Plus size={16} />
            <span>{t('opdLogs.logOpd', 'Log OPD')}</span>
          </button>
        </div>
      </div>

      {/* 3. OPD Log Cards Grid */}
      <div className="web-opd-cards-container">
        {loading ? (
          <Loader
            card
            message="Loading OPD Visits..."
            subtext="Fetching clinical consultation records and follow-up schedules from database"
          />
        ) : filteredLogs.length === 0 ? (
          <div className="web-opd-empty-state">
            <Stethoscope size={40} className="empty-icon" />
            <h3>{t('opdLogs.noLogsFound', 'No OPD Visit Logs Found')}</h3>
            <p>{t('opdLogs.noLogsFoundSub', 'No matching visit logs recorded for your active search or filter criteria.')}</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isFollowUpPending = log.followUpStatus === 'PENDING' || log.followUpStatus === 'needed';
            const isCompleted = log.followUpStatus === 'DONE' || log.followUpStatus === 'completed';

            return (
              <div key={log.id} className="web-opd-log-card">
                {/* Card Top Row: Case Badge & Timestamp */}
                <div className="log-card-header">
                  <div className="badge-tokens-group">
                    <span className="case-id-blue-badge">📁 {log.caseId}</span>
                  </div>
                  <span className="log-timestamp">{log.timestampFormatted || log.timestamp}</span>
                </div>

                {/* Patient Name & Sub Details */}
                <div className="log-card-patient-row">
                  <div className="patient-name-info">
                    <h3 className="patient-fullname">{log.patientName}</h3>
                    <span className="patient-sub-details">
                      {log.age} {t('opdLogs.yrs', 'yrs')} • {log.gender} • {log.contactPhone || log.phone}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-phone-action"
                    onClick={() => setCallAlert({ name: log.patientName, phone: log.contactPhone || log.phone, caseId: log.caseId })}
                    title={`Call ${log.patientName}`}
                  >
                    <Phone size={15} />
                  </button>
                </div>

                {/* Department & Doctor & Visit Type */}
                <div className="log-card-dept-row">
                  <div className="dept-pill-wrap">
                    <Building2 size={14} className="icon-blue" />
                    <span>
                      {log.department} {log.consultingDoctor || log.doctor ? `• Dr. ${(log.consultingDoctor || log.doctor).replace(/^Dr\.\s*/i, '')}` : ''}
                    </span>
                  </div>

                  <span className="visit-type-tag">{log.visitType}</span>
                </div>

                {/* Chief Complaint / Notes */}
                {(log.chiefComplaint || log.diagnosis) && (
                  <div className="log-card-diagnosis">
                    <span className="diag-text">
                      <strong>{t('opdLogs.complaint', 'Complaint:')}</strong> {log.chiefComplaint || log.diagnosis}
                    </span>
                  </div>
                )}

                {/* Prescription Attachment Preview Strip */}
                {log.prescriptionDoc && (
                  <div className="opd-prescription-pill-row">
                    <div className="prescription-name-block">
                      <Paperclip size={13} color="#16a34a" />
                      <span className="prescription-filename" title={log.prescriptionDoc.name}>
                        {log.prescriptionDoc.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-view-rx"
                      onClick={() => setPreviewDoc(log.prescriptionDoc)}
                    >
                      <Eye size={12} />
                      <span>{t('opdLogs.view', 'View')}</span>
                    </button>
                  </div>
                )}

                {/* Card Bottom Row: Follow-up Status Strip & Action */}
                <div className="log-card-footer">
                  <div className="status-tag-wrap">
                    {isFollowUpPending && (
                      <div className="pending-resolve-strip">
                        <span className="status-pill status-amber">
                          <AlertTriangle size={13} /> {log.statusLabel || `${t('opdLogs.followUpLabel', 'Follow-up:')} ${log.nextFollowUpTimeline || 'In 7 Days'}`}
                        </span>
                        <button
                          type="button"
                          className="btn-mark-done-sm"
                          onClick={(e) => handleResolveFollowUp(log, e)}
                          disabled={resolvingId === log.id}
                          title="Mark follow-up completed"
                        >
                          <CheckCircle2 size={13} />
                          <span>{resolvingId === log.id ? t('opdLogs.saving', 'Saving...') : t('opdLogs.markDone', 'Mark Done')}</span>
                        </button>
                      </div>
                    )}

                    {isCompleted && (
                      <span className="status-pill status-emerald">
                        <CheckCircle2 size={13} /> {log.statusLabel || t('opdLogs.followUpCompleted', 'Follow-up Completed')}
                      </span>
                    )}

                    {!isFollowUpPending && !isCompleted && (
                      <span className="status-pill status-slate">
                        {log.statusLabel || t('opdLogs.routineVisit', 'Routine Visit • No Follow-up')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-case-details-link"
                    onClick={() => navigate(`/arogyasevak/patient/${log.caseId}`)}
                  >
                    <span>{t('opdLogs.caseDetails', 'Case Details')}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Record OPD Visit Modal */}
      {showLogModal && (
        <div className="web-modal-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="web-modal-dialog" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="web-modal-header">
              <div className="modal-title-wrap">
                <FileText size={22} className="text-blue" />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('opdModal.title', 'Record OPD Visit')}</h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('opdModal.subtitle', 'Issue outpatient token & clinical record')}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLogModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordVisit} className="web-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              
              {/* Field 1: Select Allocated Patient Case */}
              <div className="modal-form-group">
                <label className="modal-field-label">
                  {t('opdModal.selectAllocatedPatient', 'Select Allocated Patient Case')} <span className="req-star">*</span>
                </label>

                {/* Case Search Input */}
                <div className="case-search-box">
                  <Search size={15} className="case-search-icon" />
                  <input
                    type="text"
                    className="case-search-input"
                    placeholder={t('opdModal.searchPatientPlaceholder', 'Search patient name, case ID, diagnosis...')}
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                  />
                </div>

                {/* Allocated Cases Radio List */}
                <div className="allocated-cases-picker-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredAllocatedCases.slice(0, 8).map((c) => {
                    const isSelected = selectedCaseId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`case-picker-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCase(c)}
                      >
                        <div className="case-picker-info">
                          <strong className="picker-patient-name">{c.patientName}</strong>
                          <span className="picker-patient-meta">
                            {c.id} • {c.diagnosis} • {c.age}y/{c.gender}
                          </span>
                        </div>

                        <div className="picker-radio-icon">
                          {isSelected ? <Check size={14} color="#0284c7" /> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Field 2: Consulting Doctor (Searchable dropdown with custom typing) */}
              <div className="modal-form-group" style={{ position: 'relative' }}>
                <label className="modal-field-label">
                  {t('opdModal.consultingDoctor', 'Consulting Doctor')} <span className="req-star">*</span>
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Search size={16} />
                  </div>

                  <input
                    type="text"
                    className="modal-text-input"
                    placeholder={t('opdModal.doctorPlaceholder', 'Search doctor or type custom doctor name...')}
                    value={doctorInput}
                    onChange={(e) => {
                      setDoctorInput(e.target.value);
                      setShowDoctorDropdown(true);
                    }}
                    onFocus={() => setShowDoctorDropdown(true)}
                    required
                    autoComplete="off"
                    style={{
                      padding: '9px 65px 9px 36px',
                      fontSize: '13.5px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      width: '100%',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {doctorInput && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setDoctorInput('');
                          setShowDoctorDropdown(true);
                        }}
                        title="Clear search"
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowDoctorDropdown((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronDown
                        size={18}
                        style={{
                          transform: showDoctorDropdown ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {showDoctorDropdown && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                      onClick={() => setShowDoctorDropdown(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '230px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '1.5px solid #3b82f6',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        marginTop: '4px',
                        zIndex: 999,
                      }}
                    >
                      {doctorInput.trim() && !OPD_DOCTORS_LIST.includes(doctorInput.trim()) && (
                        <div
                          onClick={() => setShowDoctorDropdown(false)}
                          style={{
                            padding: '10px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            background: '#f0fdf4',
                            borderBottom: '1px solid #bbf7d0',
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 600,
                          }}
                        >
                          <span>➕ Use custom doctor: <strong>"{doctorInput.trim()}"</strong></span>
                          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>Custom</span>
                        </div>
                      )}

                      {filteredDoctors.length > 0 ? (
                        filteredDoctors.map((doc) => {
                          const isSelected = doctorInput === doc;
                          return (
                            <div
                              key={doc}
                              onClick={() => {
                                setDoctorInput(doc);
                                setShowDoctorDropdown(false);
                              }}
                              style={{
                                padding: '9px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                color: isSelected ? '#1d4ed8' : '#1e293b',
                                fontWeight: isSelected ? 600 : 400,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = '#ffffff';
                              }}
                            >
                              <span>{doc}</span>
                              {isSelected && <Check size={14} style={{ color: '#2563eb' }} />}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '12px', fontSize: '12.5px', color: '#64748b', background: '#f8fafc', textAlign: 'center' }}>
                          <div>No matching predefined doctors found.</div>
                          <div style={{ marginTop: '4px', color: '#1e293b', fontWeight: 500 }}>
                            "{doctorInput}" will be saved as the consulting doctor.
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Field 3: Chief Complaint / Clinical Notes */}
              <div className="modal-form-group">
                <label className="modal-field-label">
                  {t('opdModal.chiefComplaint', 'Chief Complaint / Visit Reason')}
                </label>
                <textarea
                  className="modal-text-input"
                  rows="2"
                  placeholder={t('opdModal.complaintPlaceholder', 'e.g. Regular outpatient checkup, ECG review, prescription refill')}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Field 4: Next Follow-up Required? */}
              <div className="modal-form-group follow-up-toggle-card">
                <div className="toggle-card-header">
                  <Calendar size={18} className="text-blue" />
                  <span className="toggle-card-title">{t('opdModal.nextFollowUpRequired', 'Next Follow-up Required?')}</span>
                </div>

                <div className="followup-segmented-switch">
                  <button
                    type="button"
                    className={`seg-switch-btn ${followUpRequired ? 'active-yes' : ''}`}
                    onClick={() => setFollowUpRequired(true)}
                  >
                    <Check size={14} /> {t('opdModal.yesFollowUp', 'Yes, Follow-up Required')}
                  </button>

                  <button
                    type="button"
                    className={`seg-switch-btn ${!followUpRequired ? 'active-no' : ''}`}
                    onClick={() => setFollowUpRequired(false)}
                  >
                    <X size={14} /> {t('opdModal.noFollowUp', 'No Follow-up')}
                  </button>
                </div>

                {followUpRequired && (
                  <div className="timeframe-select-wrap" style={{ marginTop: '12px' }}>
                    <label className="sub-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', marginBottom: '6px', fontSize: '12.5px' }}>
                      <Calendar size={15} style={{ color: '#0284c7' }} />
                      {t('opdModal.selectFollowUpDate', 'Select Follow-up Date:')} <span className="req-star" style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="modal-text-input"
                      min={new Date().toISOString().split('T')[0]}
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      required={followUpRequired}
                      style={{
                        padding: '9px 12px',
                        fontSize: '13.5px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        width: '100%',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Field 7: Prescription Upload */}
              <div className="modal-form-group">
                <label className="modal-field-label">
                  {t('opdModal.prescriptionDoc', 'Prescription Document (Optional)')}
                </label>

                {attachedDoc ? (
                  <div className="attached-file-preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <FileCheck2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {attachedDoc.name}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{attachedDoc.size} • {t('opdModal.attached', 'Attached')}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-view-attached-file"
                        onClick={() => setPreviewDoc(attachedDoc)}
                        title="View Attached Prescription Document"
                        style={{
                          background: '#e0f2fe',
                          border: '1px solid #bae6fd',
                          color: '#0284c7',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Eye size={14} />
                        <span>{t('opdModal.view', 'View')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={() => setAttachedDoc(null)}
                        title="Remove file"
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="file-upload-dropzone">
                    <Upload size={20} className="upload-icon" />
                    <span>{t('opdModal.uploadDropzone', 'Click to attach doctor prescription slip or test report')}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      hidden
                      onChange={handlePrescriptionFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="web-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowLogModal(false)}
                  disabled={submitting}
                >
                  {t('opdModal.cancel', 'Cancel')}
                </button>

                <button type="submit" className="btn-modal-submit" disabled={submitting}>
                  {submitting ? t('opdModal.recordingBtn', 'Recording...') : t('opdModal.recordVisitBtn', 'Record OPD Visit')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OPDLogs;
