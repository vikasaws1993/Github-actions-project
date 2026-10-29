import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  X, 
  Search, 
  CheckCircle2, 
  FileCheck, 
  Building2, 
  UserCheck, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Upload,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import patientService from '@/services/patientService';
import { downloadDocFile, downloadRemoteFile, generateDocText } from '@/utils/docUtils';
import UploadDocumentModal from '@/components/common/UploadDocumentModal/UploadDocumentModal';
import { useLanguage } from '@/context/LanguageContext';
import './Documents.css';

export const Documents = () => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [expandedPatientIds, setExpandedPatientIds] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Add Document Form states
  const [modalPatientId, setModalPatientId] = useState('');

  const loadData = async (forceRefresh = false) => {
    setLoadingDocs(true);
    try {
      const allPatients = await patientService.getPatients({ forceRefresh });
      const validPatients = Array.isArray(allPatients) ? allPatients : [];
      setPatients(validPatients);

      // Expand the first patient by default if none expanded
      if (validPatients.length > 0 && Object.keys(expandedPatientIds).length === 0) {
        setExpandedPatientIds({ [validPatients[0].id]: true });
      }
    } catch (err) {
      console.error('[Documents] Failed to load data:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePatientExpand = async (id) => {
    const nextState = !expandedPatientIds[id];
    setExpandedPatientIds((prev) => ({
      ...prev,
      [id]: nextState,
    }));

    // If expanding and live docs need fresh pull, fetch for this patient
    if (nextState) {
      try {
        const liveDocs = await patientService.getPatientDocuments(id);
        if (Array.isArray(liveDocs) && liveDocs.length > 0) {
          setPatients((prev) =>
            prev.map((p) => {
              if (p.id === id) {
                const existing = p.documents || [];
                const merged = [...liveDocs];
                existing.forEach((ed) => {
                  const isDupe = merged.some(
                    (md) => md.id === ed.id || (md.file_url && (md.file_url === ed.fileUrl || md.file_url === ed.url))
                  );
                  if (!isDupe) merged.push(ed);
                });
                return { ...p, documents: merged };
              }
              return p;
            })
          );
        }
      } catch (err) {
        console.warn(`[Documents] Lazy refresh for ${id} notice:`, err.message);
      }
    }
  };

  const handleDownload = async (doc, patient) => {
    const fUrl = doc.fileUrl || doc.file_url || doc.url;
    const fName = doc.title || doc.name || doc.fileName || doc.file_name || 'document';
    setToastMessage(`Downloading "${fName}"...`);
    try {
      if (fUrl && (fUrl.startsWith('http://') || fUrl.startsWith('https://'))) {
        await downloadRemoteFile(fUrl, fName);
      } else {
        downloadDocFile({
          ...doc,
          patientName: patient?.name,
          patientId: patient?.id,
          hospital: patient?.hospital,
          doctor: patient?.doctor,
        });
      }
      setToastMessage(`Downloaded "${fName}" successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      setToastMessage(`Downloaded "${fName}"`);
    }
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenAddModal = (pId, e) => {
    if (e) e.stopPropagation();
    setModalPatientId(pId || patients[0]?.id || '');
    setShowAddModal(true);
  };

  // Search filter across patients and their documents
  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchPatient =
      p.name?.toLowerCase().includes(term) ||
      p.id?.toLowerCase().includes(term) ||
      (p.scheme && p.scheme.toLowerCase().includes(term)) ||
      (p.ward && p.ward.toLowerCase().includes(term));

    const matchDoc = p.documents && p.documents.some(
      (d) => (d.title && d.title.toLowerCase().includes(term)) || (d.name && d.name.toLowerCase().includes(term)) || (d.type && d.type.toLowerCase().includes(term))
    );

    return matchPatient || matchDoc;
  });

  return (
    <div className="am-documents-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="am-doc-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Search Input Box (Full Width) */}
      <div className="am-doc-search-card">
        <div className="am-doc-search-bar">
          <Search size={18} className="am-search-icon" />
          <input
            type="text"
            placeholder={t('documents.searchPlaceholder', 'Search patient, case ID or document...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="am-search-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Patient Cards Accordion Container (Full Width) */}
      <div className="am-patients-accordion-list">
        {loadingDocs ? (
          <div className="am-doc-list-loader">
            <div className="am-doc-spinner"></div>
            <p>{t('documents.loadingRecords', 'Loading patient records and documents...')}</p>
          </div>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => {
            const isExpanded = !!expandedPatientIds[patient.id];
            const docCount = patient.documents ? patient.documents.length : 0;
            const docs = patient.documents || [];

            return (
              <div key={patient.id} className={`am-patient-accordion-card ${isExpanded ? 'is-expanded' : ''}`}>
                {/* Accordion Header Bar */}
                <div className="am-accordion-header" onClick={() => togglePatientExpand(patient.id)}>
                  <div className="am-accordion-left">
                    <div className="am-patient-name-row">
                      <h3 className="am-patient-acc-name">{patient.name}</h3>
                      {patient.scheme && (
                        <span className="am-scheme-tag">{patient.scheme}</span>
                      )}
                      {patient.status === 'Discharged' || patient.category === 'discharged' ? (
                        <span className="am-closed-tag">{t('documents.closed', 'CLOSED')}</span>
                      ) : null}
                    </div>

                    <div className="am-patient-acc-sub">
                      <span>ID: {patient.id}</span>
                      <span className="am-sub-dot">•</span>
                      <span>{patient.ward || 'General Medical Ward'}</span>
                    </div>
                  </div>

                  <div className="am-accordion-right">
                    <button
                      className="am-docs-count-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePatientExpand(patient.id);
                      }}
                    >
                      <FileText size={15} />
                      <span>{docCount} {docCount === 1 ? t('documents.doc', 'Doc') : t('documents.docs', 'Docs')}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body Content (Expanded State) */}
                {isExpanded && (
                  <div className="am-accordion-body">
                    <div className="am-accordion-body-header">
                      <h4 className="am-uploaded-docs-title">
                        {t('documents.uploadedDocs', 'Uploaded Documents')} ({docCount})
                      </h4>

                      <button
                        className="am-btn-upload-doc"
                        onClick={(e) => handleOpenAddModal(patient.id, e)}
                      >
                        <UploadCloud size={16} />
                        <span>{t('documents.uploadNewDoc', 'Upload New Document')}</span>
                      </button>
                    </div>

                    {/* Patient Document List inside Accordion */}
                    <div className="am-accordion-docs-list">
                      {docs.length > 0 ? (
                        docs.map((doc, idx) => {
                          const targetUrl = doc.fileUrl || doc.file_url || doc.url;
                          const isImg = targetUrl && (targetUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i) || targetUrl.includes('cloudinary') || targetUrl.includes('/image/upload') || targetUrl.includes('amazonaws.com'));

                          return (
                            <div key={doc.id || idx} className="am-acc-doc-item">
                              <div className="am-acc-doc-icon-wrap" style={{ overflow: 'hidden' }}>
                                {isImg ? (
                                  <img
                                    src={targetUrl}
                                    alt={doc.title || doc.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <FileText size={22} className="am-acc-doc-icon" />
                                )}
                              </div>

                              <div className="am-acc-doc-info">
                                <h5 className="am-acc-doc-title">{doc.title || doc.name || `Document ${idx + 1}`}</h5>
                                <p className="am-acc-doc-filename">
                                  {doc.fileName || doc.file_name || doc.file || `${(doc.title || 'doc').toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`}
                                </p>
                                <span className="am-acc-doc-meta">
                                  {doc.size || doc.fileSize || '1.2 MB'} • Uploaded {doc.date || 'Recently'} • <span style={{ color: doc.verified ? '#16a34a' : '#0284c7', fontWeight: 600 }}>{doc.source || doc.by || 'Citizen Upload'}</span>
                                </span>
                              </div>

                              <div className="am-acc-doc-actions">
                                <button
                                  className="am-acc-btn-view"
                                  title="View Document Preview"
                                  onClick={() => {
                                    setDocPreviewLoading(true);
                                    setViewDoc({
                                      ...doc,
                                      patientName: patient.name,
                                      patientId: patient.id,
                                      patientAge: patient.age,
                                      patientGender: patient.gender,
                                      hospital: patient.hospital,
                                      doctor: patient.doctor,
                                      vitals: patient.vitals,
                                    });
                                  }}
                                >
                                  <Eye size={15} />
                                  <span>{t('documents.view', 'View')}</span>
                                </button>
                                <button
                                  className="am-acc-btn-download"
                                  title="Download File"
                                  onClick={() => handleDownload(doc, patient)}
                                >
                                  <Download size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="am-acc-doc-empty">
                          <FileText size={32} />
                          <p>{t('documents.noDocsYet', 'No documents uploaded yet for this patient.')}</p>
                          <button
                            className="am-btn-upload-doc"
                            style={{ marginTop: '8px' }}
                            onClick={(e) => handleOpenAddModal(patient.id, e)}
                          >
                            <UploadCloud size={14} />
                            <span>{t('documents.uploadDocNow', 'Upload Document Now')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="am-table-card am-doc-empty-state">
            <AlertCircle size={40} />
            <h4>{t('documents.noMatchingPatients', 'No matching patients found')}</h4>
            <p>{t('documents.noMatchingSub', 'Try searching with a different patient name, case ID, or document title.')}</p>
          </div>
        )}
      </div>

      {/* View Document Modal */}
      {viewDoc && (
        <div className="am-modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="am-doc-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '90%' }}>
            <div className="am-modal-header">
              <div className="am-modal-title-wrap">
                <h3 className="am-modal-title">{viewDoc.title || viewDoc.name || t('documents.docPreview', 'Document Preview')}</h3>
                <span className="am-modal-subtitle">
                  Case ID: {viewDoc.patientId} • Patient: {viewDoc.patientName}
                </span>
              </div>
              <button className="am-modal-close" onClick={() => setViewDoc(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="am-doc-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px', minHeight: '320px', position: 'relative' }}>
              {(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url) ? (
                (() => {
                  const targetUrl = viewDoc.fileUrl || viewDoc.file_url || viewDoc.url;
                  const isPdf = targetUrl.match(/\.pdf($|\?)/i) || targetUrl.toLowerCase().endsWith('.pdf') || targetUrl.includes('/raw/') || (viewDoc.fileName && viewDoc.fileName.toLowerCase().endsWith('.pdf'));

                  return (
                    <div style={{ position: 'relative', width: '100%', minHeight: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {docPreviewLoading && (
                        <div className="am-doc-preview-loader">
                          <div className="am-doc-preview-spinner"></div>
                          <p className="am-doc-preview-text">{t('documents.loadingPreview', 'Loading Document Preview...')}</p>
                          <span className="am-doc-preview-subtext">{t('documents.fetchingPreview', 'Fetching secure file from storage')}</span>
                        </div>
                      )}

                      {isPdf ? (
                        <div style={{ width: '100%', height: '540px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#fff', opacity: docPreviewLoading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                          <iframe
                            src={targetUrl}
                            title={viewDoc.title || 'PDF Document Preview'}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            onLoad={() => setDocPreviewLoading(false)}
                            onError={() => setDocPreviewLoading(false)}
                          />
                        </div>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', opacity: docPreviewLoading ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                          <img
                            src={targetUrl}
                            alt={viewDoc.title || 'Uploaded Document'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '520px',
                              borderRadius: '8px',
                              objectFit: 'contain',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                            }}
                            onLoad={() => setDocPreviewLoading(false)}
                            onError={() => setDocPreviewLoading(false)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div
                  style={{
                    width: '100%',
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    color: '#1e293b',
                    lineHeight: 1.6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {generateDocText(viewDoc)}
                </div>
              )}
            </div>

            <div className="am-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url) && (
                  <button
                    type="button"
                    className="am-acc-btn-view"
                    style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => window.open(viewDoc.fileUrl || viewDoc.file_url || viewDoc.url, '_blank')}
                  >
                    <ExternalLink size={14} />
                    <span>{t('documents.openInNewTab', 'Open in New Tab')}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="am-pd-modal-btn am-pd-modal-cancel" onClick={() => setViewDoc(null)}>
                  {t('documents.close', 'Close')}
                </button>
                <button
                  className="am-pd-modal-btn am-pd-modal-submit"
                  onClick={async () => {
                    const fUrl = viewDoc.fileUrl || viewDoc.file_url || viewDoc.url;
                    const fName = viewDoc.title || viewDoc.name || viewDoc.fileName || 'document';
                    setToastMessage(`Downloading ${fName}...`);
                    if (fUrl && (fUrl.startsWith('http://') || fUrl.startsWith('https://'))) {
                      await downloadRemoteFile(fUrl, fName);
                    } else {
                      downloadDocFile(viewDoc);
                    }
                    setToastMessage(`Downloaded ${fName}`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }}
                >
                  <Download size={16} />
                  <span>{t('documents.downloadDoc', 'Download Document')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal Matching Reference Form */}
      <UploadDocumentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        patientId={modalPatientId}
        patientName={patients.find((p) => p.id === modalPatientId)?.name || 'Patient'}
        onSuccess={() => {
          loadData();
          setToastMessage('Document uploaded successfully!');
          setTimeout(() => setToastMessage(''), 3000);
        }}
      />
    </div>
  );
};

export default Documents;


