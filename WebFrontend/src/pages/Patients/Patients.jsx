import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Eye,
  RefreshCw,
  Building2,
  User,
  Phone,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Calendar,
  MapPin,
  ExternalLink,
  Download,
  Stethoscope,
  Activity
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import patientService, { computePatientStats, getLocalizedPriorityNote } from '@/services/patientService';
import Loader from '@/components/common/Loader/Loader';
import { downloadDocFile } from '@/utils/docUtils';
import './Patients.css';

const FILTER_TABS = [
  { id: 'all', label: 'All Cases' },
  { id: 'surgery', label: 'Surgery' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'discharged', label: 'Discharged' },
];

const getDisplayStatus = (patient) => {
  if (patient.treatmentStage) return patient.treatmentStage;
  if (patient.sevakReportedStatus) return patient.sevakReportedStatus;
  if (patient.caseProgress && Array.isArray(patient.caseProgress) && patient.caseProgress.length > 0) {
    const activeStage = patient.caseProgress.find((s) => s.state === 'active');
    if (activeStage && activeStage.label) {
      return activeStage.label;
    }
    const completedStages = patient.caseProgress.filter((s) => s.state === 'completed');
    if (completedStages.length > 0) {
      return completedStages[completedStages.length - 1].label;
    }
  }
  return patient.status || 'Treatment In Progress';
};

const getPatientCategory = (patient) => {
  const currentStatus = getDisplayStatus(patient).toLowerCase();
  const rawStatus = (patient.status || '').toLowerCase();
  const rawCat = (patient.category || '').toLowerCase();

  if (
    patient.isTransferredOut ||
    patient.treatmentStatus === 'Transferred' ||
    currentStatus.includes('transferred') ||
    rawStatus.includes('transferred') ||
    rawCat === 'transferred'
  ) {
    return 'transferred';
  }

  if (
    currentStatus.includes('discharged') ||
    currentStatus.includes('completed') ||
    currentStatus.includes('closed') ||
    rawStatus.includes('discharged') ||
    rawCat === 'discharged'
  ) {
    return 'discharged';
  }

  if (
    currentStatus.includes('surgery') ||
    currentStatus.includes('post-op') ||
    rawStatus.includes('surgery') ||
    rawCat === 'surgery'
  ) {
    return 'surgery';
  }

  return 'ongoing';
};

const getStatusVariant = (statusText, fallbackVariant) => {
  const t = (statusText || '').toLowerCase();
  if (t.includes('transferred')) return 'transferred';
  if (t.includes('discharged') || t.includes('completed') || t.includes('closed')) return 'discharged';
  if (t.includes('surgery') || t.includes('post-op')) return 'surgery';
  if (t.includes('on hold') || t.includes('hold')) return 'warning';
  if (t.includes('opd') || t.includes('diagnostic')) return 'opd';
  return fallbackVariant || 'treatment';
};

export const Patients = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const FILTER_TABS = [
    { id: 'all', label: t('patients.allCasesTab', 'All Active Cases') },
    { id: 'surgery', label: t('patients.surgeryTab', 'Surgery') },
    { id: 'ongoing', label: t('patients.ongoingTab', 'Ongoing') },
    { id: 'transferred', label: t('patients.transferredTab', 'Transferred') },
    { id: 'discharged', label: t('patients.dischargedTab', 'Discharged') },
  ];

  // Instant SWR state hydration from local cache
  const initialPatients = React.useMemo(() => patientService.getCachedPatients(), []);
  const [patients, setPatients] = useState(initialPatients);
  const [stats, setStats] = useState(() => computePatientStats(initialPatients));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTransferredPatient, setSelectedTransferredPatient] = useState(null);
  const [loading, setLoading] = useState(() => !initialPatients || initialPatients.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (force = false) => {
    const isForce = force === true;
    if (isForce) {
      setIsRefreshing(true);
    }
    // Only show full table skeleton loader if there are NO cached patients
    setLoading((prev) => (initialPatients && initialPatients.length > 0 ? false : prev));

    try {
      const patientsData = await patientService.getPatients(isForce);
      if (Array.isArray(patientsData)) {
        setPatients(patientsData);
        setStats(computePatientStats(patientsData));
      }
    } catch (err) {
      console.error('Error loading patients data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [initialPatients]);

  useEffect(() => {
    // Initial mount: silently revalidate in background without blocking UI
    loadData(false);
    const handleRefresh = () => {
      loadData(true);
    };
    window.addEventListener('arogyamitra:refresh', handleRefresh);
    return () => window.removeEventListener('arogyamitra:refresh', handleRefresh);
  }, [loadData]);

  const handlePatientClick = (patient) => {
    const isTransferred =
      patient.isTransferredOut ||
      patient.treatmentStatus === 'Transferred' ||
      activeFilter === 'transferred' ||
      getPatientCategory(patient) === 'transferred';

    if (isTransferred) {
      setSelectedTransferredPatient(patient);
    } else {
      navigate(`/arogyasevak/patient/${patient.id || patient.caseId}`);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const currentStatus = getDisplayStatus(patient);
    const cat = getPatientCategory(patient);

    let matchesTab = true;
    if (activeFilter === 'all') {
      // Exclude transferred out cases from All Active Cases
      matchesTab = cat !== 'transferred' && !patient.isTransferredOut;
    } else if (activeFilter === 'transferred') {
      matchesTab = cat === 'transferred' || patient.isTransferredOut || patient.treatmentStatus === 'Transferred';
    } else {
      matchesTab = cat === activeFilter;
    }

    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matchesSearch =
        patient.name.toLowerCase().includes(q) ||
        patient.id.toLowerCase().includes(q) ||
        currentStatus.toLowerCase().includes(q) ||
        (patient.diagnosis && patient.diagnosis.toLowerCase().includes(q));
    }

    return matchesTab && matchesSearch;
  });

  return (
    <div className="am-patients-page">
      {/* 3 KPI Summary Cards */}
      <div className="admin-kpi-grid">
        <div className="kpi-card border-green">
          <div className="kpi-value text-green">{stats.inTreatment}</div>
          <div className="kpi-label">{t('patients.inTreatment', 'In Treatment (Active)')}</div>
        </div>
        <div className="kpi-card border-amber">
          <div className="kpi-value text-amber">{stats.surgeryCases ?? stats.criticalIcu ?? 0}</div>
          <div className="kpi-label">{t('patients.surgeryPipeline', 'Surgery Pipeline')}</div>
        </div>
        <div className="kpi-card border-blue">
          <div className="kpi-value text-blue">{stats.dischargedThisWeek}</div>
          <div className="kpi-label">{t('patients.dischargedCases', 'Discharged Cases')}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="am-toolbar">
        <div className="am-filter-group">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`am-filter-pill ${activeFilter === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="am-search-box">
            <Search size={16} className="am-search-icon" />
            <input
              type="text"
              className="am-search-input"
              placeholder={t('patients.searchPlaceholder', 'Search patient name, ID, or condition...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="am-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="am-btn-refresh-table"
            onClick={() => loadData(true)}
            disabled={isRefreshing || loading}
            title="Reload live assigned patients from API"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '38px',
              padding: '0 12px',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: (isRefreshing || loading) ? 'not-allowed' : 'pointer',
              opacity: (isRefreshing || loading) ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={14} className={(isRefreshing || (loading && (!patients || patients.length === 0))) ? 'am-spin' : ''} />
            <span>{isRefreshing ? t('patients.refreshingBtn', 'Refreshing...') : t('patients.refreshBtn', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="am-table-card">
        <div className="am-table-container">
          <table className="am-patients-table">
            <thead>
              <tr>
                <th>{t('patients.patientCol', 'PATIENT')}</th>
                <th>{t('patients.caseIdCol', 'CASE ID')}</th>
                <th>{t('patients.schemeStatusCol', 'SCHEME / STATUS')}</th>
                <th>{t('patients.lastUpdatedCol', 'LAST UPDATED')}</th>
                <th>{t('patients.actionCol', 'ACTION')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <Loader
                  asTableRow
                  colSpan={5}
                  message={t('patients.loadingRegistry', 'Loading Patient Registry...')}
                  subtext={t('patients.loadingSubtext', 'Fetching live admitted and registered patient records')}
                />
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const displayStatus = getDisplayStatus(patient);
                  const displayVariant = getStatusVariant(displayStatus, patient.statusVariant);

                  return (
                    <React.Fragment key={patient.id}>
                      <tr className="am-table-row">
                        <td className="am-td-patient">
                          <div
                            className="am-patient-info am-clickable-patient"
                            onClick={() => handlePatientClick(patient)}
                            title={`Click to view ${patient.name}'s details`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <span className="am-patient-name">{patient.name}</span>
                              {patient.isReassigned && !patient.isTransferredOut && (
                                <span className="am-reassigned-pill" title="Reassigned case assigned to you">
                                  🔄 {t('patients.reassignedBadge', 'Reassigned Case')}
                                </span>
                              )}
                              {patient.isTransferredOut && (
                                <span className="am-transferred-pill" title="Case transferred to another hospital">
                                  ↪️ {patient.assignedToNewHospital ? `${t('patients.transferredTo', 'Transferred to')} ${patient.assignedToNewHospital}${patient.assignedToNewSevak?.name ? ` (${patient.assignedToNewSevak.name})` : ''}` : t('patients.transferredOutBadge', 'Case Transferred')}
                                </span>
                              )}
                            </div>
                            <span className="am-patient-meta">
                              {patient.gender} · {patient.age} {t('patients.yrs', 'yrs')} · {patient.ward}
                            </span>
                          </div>
                        </td>

                        <td className="am-td-case">
                          <span className="am-case-id">{patient.id}</span>
                        </td>

                        <td className="am-td-status">
                          <span className={`am-status-badge am-status-${displayVariant}`}>
                            {patient.isTransferredOut ? 'Transferred' : displayStatus}
                          </span>
                        </td>

                        <td className="am-td-updated">
                          <span className="am-updated-text">{patient.lastUpdated}</span>
                        </td>

                        <td className="am-td-action">
                          <div className="am-action-icons-group">
                            <button
                              className="am-icon-action-btn am-icon-btn-view"
                              onClick={() => handlePatientClick(patient)}
                              title={patient.isTransferredOut ? "View Transferred Case Summary" : "See Patient Profile"}
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {patient.priorityNote && (
                        (() => {
                          const localizedNote = getLocalizedPriorityNote(patient.priorityNote, language, t);
                          if (!localizedNote || !localizedNote.text) return null;
                          return (
                            <tr className="am-priority-note-row">
                              <td colSpan={5} className="am-td-priority-note">
                                <div
                                  className={`am-priority-note-card am-priority-${(
                                    localizedNote.level || 'CRITICAL'
                                  ).toLowerCase()}`}
                                  onClick={() => handlePatientClick(patient)}
                                >
                                  <div className="am-priority-note-header">
                                    <span className="am-priority-note-title">
                                      {localizedNote.title}
                                    </span>
                                  </div>
                                  <div className="am-priority-note-body">
                                    {localizedNote.text}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="am-empty-row" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                    {t('patients.noCasesFound', 'No patients found matching your search or filter criteria.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transferred Case Read-Only Summary Modal */}
      {selectedTransferredPatient && (
        <div className="am-modal-overlay" onClick={() => setSelectedTransferredPatient(null)}>
          <div
            className="am-modal-dialog"
            style={{ maxWidth: '640px', width: '92%', borderRadius: '16px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
                color: '#ffffff',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                  <Lock size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                    {t('patients.transferredSummaryTitle', 'Transferred Case Summary / वर्ग केस सारांश')}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#e9d5ff' }}>
                    {selectedTransferredPatient.id} • {selectedTransferredPatient.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransferredPatient(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto' }}>
              
              {/* Transfer Details Card */}
              <div
                style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="#7c3aed" />
                    <strong style={{ fontSize: '0.95rem', color: '#581c87' }}>
                      {t('patients.transferredToHospital', 'Destination Hospital / वर्ग रुग्णालय')}:
                    </strong>
                  </div>
                  <span
                    style={{
                      background: '#7c3aed',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    {selectedTransferredPatient.assignedToNewHospital || 'Destination Hospital'}
                  </span>
                </div>

                {selectedTransferredPatient.assignedToNewSevak && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b21a8' }}>
                    <User size={15} color="#7c3aed" />
                    <span>
                      <strong>{t('patients.newSevakLabel', 'Assigned Sevak')}:</strong>{' '}
                      {selectedTransferredPatient.assignedToNewSevak.name || selectedTransferredPatient.assignedToNewSevak}
                      {selectedTransferredPatient.assignedToNewSevak.phone ? ` (📱 ${selectedTransferredPatient.assignedToNewSevak.phone})` : ''}
                    </span>
                  </div>
                )}

                {selectedTransferredPatient.transferReason && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#6b21a8' }}>
                    <AlertTriangle size={15} color="#d97706" />
                    <span>
                      <strong>{t('patients.transferReasonLabel', 'Reason for Transfer')}:</strong>{' '}
                      {selectedTransferredPatient.transferReason}
                    </span>
                  </div>
                )}

                {selectedTransferredPatient.priorityNote?.text && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '10px 12px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px dashed #d8b4fe',
                      fontSize: '0.82rem',
                      color: '#4c1d95',
                      lineHeight: '1.4',
                    }}
                  >
                    {getLocalizedPriorityNote(selectedTransferredPatient.priorityNote, language, t)?.text || selectedTransferredPatient.priorityNote.text}
                  </div>
                )}
              </div>

              {/* Patient Basic Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.patientNameLabel', 'Patient Name')}
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedTransferredPatient.name}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.ageGenderLabel', 'Age / Gender')}
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                    {selectedTransferredPatient.age} yrs • {selectedTransferredPatient.gender}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.contactLabel', 'Contact Number')}
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                    {selectedTransferredPatient.phone || selectedTransferredPatient.mobile || '—'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.schemeLabel', 'Assigned Scheme')}
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
                    {selectedTransferredPatient.scheme || 'Mahatma Jyotirao Phule Jan Arogya Yojana'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.diagnosisLabel', 'Condition / Diagnosis')}
                  </span>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    {selectedTransferredPatient.diagnosis || 'Medical Assistance Required'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('patients.wardLabel', 'Previous Ward')}
                  </span>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    {selectedTransferredPatient.ward || 'OPD Room'}
                  </div>
                </div>
              </div>

              {/* Vitals Summary */}
              {selectedTransferredPatient.vitals && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>BP</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedTransferredPatient.vitals.bp || '120/80'}
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>PULSE</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedTransferredPatient.vitals.pulse || '76 bpm'}
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>SPO2</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedTransferredPatient.vitals.spO2 || '98%'}
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TEMP</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedTransferredPatient.vitals.temp || '98.6 °F'}
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Documents List */}
              {Array.isArray(selectedTransferredPatient.documents) && selectedTransferredPatient.documents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    {t('patients.uploadedDocsSummary', 'Uploaded Documents')} ({selectedTransferredPatient.documents.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedTransferredPatient.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="#0284c7" />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {doc.title || doc.name || doc.fileName || `Document ${idx + 1}`}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({doc.size || '1.2 MB'})</span>
                        </div>
                        {doc.fileUrl || doc.file_url ? (
                          <button
                            type="button"
                            onClick={() => downloadDocFile(doc.fileUrl || doc.file_url, doc.title || 'Document')}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              color: '#0284c7',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Archived</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Read-Only Notice Box */}
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Lock size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <span>
                  {t(
                    'patients.readOnlySummaryNotice',
                    'Notice: This case has been transferred out to another hospital. You have Read-Only summary access. Active treatment updates and document uploads are managed by the assigned Arogya Sevak.'
                  )}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: '14px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="am-btn-primary"
                style={{
                  background: '#7c3aed',
                  borderColor: '#6d28d9',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedTransferredPatient(null)}
              >
                {t('common.close', 'Close Summary')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient View Modal (for regular non-transferred cases) */}
      {selectedPatient && (
        <div className="am-modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="am-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="am-modal-header">
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title">Patient Clinical Record</h3>
                <span className="am-modal-subtitle">{selectedPatient.id} • {selectedPatient.name}</span>
              </div>
              <button className="am-modal-close" onClick={() => setSelectedPatient(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="am-view-body">
              <div className="am-patient-details-card">
                <div className="am-detail-row">
                  <span className="am-label">Status:</span>
                  <span className="am-val">{getDisplayStatus(selectedPatient)}</span>
                </div>
                <div className="am-detail-row">
                  <span className="am-label">Diagnosis:</span>
                  <span className="am-val">{selectedPatient.diagnosis}</span>
                </div>
                <div className="am-detail-row">
                  <span className="am-label">Consulting Doctor:</span>
                  <span className="am-val">{selectedPatient.doctor}</span>
                </div>
                <div className="am-detail-row">
                  <span className="am-label">Ward / Location:</span>
                  <span className="am-val">{selectedPatient.ward}</span>
                </div>
              </div>

              <div className="am-modal-actions">
                <button type="button" className="am-btn-secondary" onClick={() => setSelectedPatient(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="am-btn-primary"
                  onClick={() => {
                    setSelectedPatient(null);
                    handlePatientClick(selectedPatient);
                  }}
                >
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
