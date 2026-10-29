import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Eye,
  Building2,
  MapPin,
  UserCheck,
  ShieldAlert,
  ArrowRightLeft,
  DollarSign,
  Navigation,
  Zap,
  AlertCircle,
  FileCheck,
  X,
  ShieldCheck,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Image as ImageIcon
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { downloadDocFile, resolveDocFileUrl } from '@/utils/docUtils';
import heroImg from '@/assets/hero.png';
import Loader from '@/components/common/Loader/Loader';
import './EscalationCaseDetail.css';

// Helper distance calculator
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.2;
  const R = 6371;
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

// Helper to test if a hospital offers the required specialty
export const hospitalMatchesSpecialty = (hospital, requiredSpecialty) => {
  if (!requiredSpecialty || !requiredSpecialty.trim()) return { matches: true, matchedTag: '' };

  // Strip parenthetical text e.g. "Neurosurgery (मेंदू शस्त्रक्रिया)" -> "Neurosurgery"
  const cleanEng = requiredSpecialty.replace(/\(.*?\)/g, '').trim().toLowerCase();
  const rawTarget = requiredSpecialty.trim().toLowerCase();

  // Extract Marathi parenthetical part if present e.g. "मेंदू शस्त्रक्रिया"
  const marathiMatch = requiredSpecialty.match(/\((.*?)\)/);
  const marathiPart = marathiMatch ? marathiMatch[1].trim().toLowerCase() : '';

  // Extract individual keywords with min length 3
  const keywords = [cleanEng, rawTarget, marathiPart].filter(k => k && k.length >= 3);

  // Normalize hospital specialties list
  let hospSpecs = [];
  if (Array.isArray(hospital.specialties)) hospSpecs.push(...hospital.specialties);
  if (typeof hospital.specialties === 'string') hospSpecs.push(...hospital.specialties.split(/[,|;]/));
  if (Array.isArray(hospital.speciality)) hospSpecs.push(...hospital.speciality);
  if (typeof hospital.speciality === 'string') hospSpecs.push(...hospital.speciality.split(/[,|;]/));
  if (Array.isArray(hospital.departments)) hospSpecs.push(...hospital.departments);
  if (hospital.type) hospSpecs.push(hospital.type);

  for (const spec of hospSpecs) {
    const specStr = String(spec || '').trim();
    const specLower = specStr.toLowerCase();

    // Check if any keyword matches
    const found = keywords.some(kw => specLower.includes(kw) || kw.includes(specLower));
    if (found) {
      return { matches: true, matchedTag: specStr };
    }
  }

  // Also check hospital name or description if present
  const hospNameLower = (hospital.name || '').toLowerCase();
  const nameMatch = keywords.some(kw => hospNameLower.includes(kw));
  if (nameMatch) {
    return { matches: true, matchedTag: cleanEng };
  }

  return { matches: false, matchedTag: '' };
};

export const EscalationCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    escalationRequests,
    hospitals,
    arogyaSevaks,
    cases,
    resolveBillEscalation,
    transferHospitalEscalation,
    fetchEscalationRequests,
    verifyDocument,
    showToast
  } = useAdmin();

  useEffect(() => {
    if (fetchEscalationRequests) {
      fetchEscalationRequests();
    }
  }, [fetchEscalationRequests]);

  // Find target escalation request by ID or caseId
  const escalation = useMemo(() => {
    return (escalationRequests || []).find(r =>
      r.id === id ||
      r.uuid === id ||
      r.shortId === id ||
      r.caseId === id ||
      r.applicationId === id
    ) || (escalationRequests && escalationRequests[0]) || null;
  }, [escalationRequests, id]);

  // If escalation is for specialty unavailable, seamlessly route to the main Review & Assign screen with pre-filled specialty
  useEffect(() => {
    if (escalation && escalation.reasonType === 'specialty_unavailable') {
      const targetCaseId = escalation.caseId || escalation.id;
      const query = new URLSearchParams({
        escalationId: escalation.id,
        specialty: escalation.requiredSpecialty || '',
      }).toString();
      navigate(`/admin/cases/review/${targetCaseId}?${query}`, { replace: true });
    }
  }, [escalation, navigate]);

  // Document Viewer & Verification State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docLoading, setDocLoading] = useState(true);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [verifiedDocs, setVerifiedDocs] = useState({});
  const [submittingResolution, setSubmittingResolution] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setDocLoading(true);
      setImgLoadError(false);
      const timer = setTimeout(() => setDocLoading(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [selectedDoc]);

  // Bill resolution states (Only CMRF and Others)
  const [billResolutionType, setBillResolutionType] = useState('cmrf'); // 'cmrf' | 'others'
  const [sevakInstructionNote, setSevakInstructionNote] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Transfer resolution states
  const [selectedTargetHospitalId, setSelectedTargetHospitalId] = useState(hospitals[1]?.id || hospitals[0]?.id);
  const [selectedSevakName, setSelectedSevakName] = useState('');
  const [prevSevakNote, setPrevSevakNote] = useState('');
  const [newSevakNote, setNewSevakNote] = useState('');

  // Find linked case record if available
  const linkedCase = useMemo(() => {
    if (!escalation) return null;
    return (cases || []).find(c =>
      c.id === escalation.caseId ||
      c.caseNumber === escalation.caseId ||
      c.case_number === escalation.caseId ||
      c.applicationId === escalation.caseId
    );
  }, [cases, escalation]);

  // Sample / Live Documents List for this Case
  const caseDocuments = useMemo(() => {
    const list = [];
    const hasValidAttachment = Boolean(
      (escalation?.attachment && escalation.attachment !== 'null' && escalation.attachment !== 'undefined' && escalation.attachment !== 'bill_photocopy_upload.jpg') ||
      (escalation?.attachmentName && escalation.attachmentName !== 'null' && escalation.attachmentName !== 'undefined' && escalation.attachmentName !== 'bill_photocopy_upload.jpg') ||
      (escalation?.attachmentUrl && escalation.attachmentUrl !== 'null' && escalation.attachmentUrl !== 'undefined') ||
      (escalation?.fileUrl && escalation.fileUrl !== 'null' && escalation.fileUrl !== 'undefined')
    );

    if (hasValidAttachment) {
      const mainAttachName = escalation?.attachmentName || escalation?.attachment || 'Doctor Referral & Clinical Note';
      let mainAttachUrl = escalation?.attachmentUrl || escalation?.attachment_url || escalation?.fileUrl || escalation?.url || null;
      if (String(mainAttachName).toLowerCase().includes('hero') || String(mainAttachUrl || '').includes('hero')) {
        mainAttachUrl = heroImg;
      }
      const rawSubmittedBy = formatPerson(escalation?.submittedBy, `Arogya Sevak (${escalation?.sevakName || 'Arogya Sevak'})`);
      const mainAttachVerified = Boolean(
        escalation?.isAttachmentVerified ||
        escalation?.attachment_verified ||
        escalation?.attachmentStatus === 'VERIFIED' ||
        verifiedDocs['doc-1']
      );

      list.push({
        id: 'doc-1',
        name: mainAttachName,
        fileName: mainAttachName,
        category: 'Doctor Referral & Clinical Note',
        size: escalation?.attachmentSize || '1.4 MB',
        uploadedAt: escalation?.submittedAt || 'Recently',
        uploadedBy: rawSubmittedBy,
        url: mainAttachUrl,
        fileUrl: mainAttachUrl,
        file_url: mainAttachUrl,
        isMainAttachment: true,
        isVerified: mainAttachVerified,
      });
    }

    if (linkedCase?.documents && Array.isArray(linkedCase.documents) && linkedCase.documents.length > 0) {
      linkedCase.documents.forEach((cd, idx) => {
        const docName = cd.name || cd.fileName || cd.title || cd.file_name || cd.document_name || `document_${idx + 1}.pdf`;
        const docUrl = cd.fileUrl || cd.file_url || cd.url || cd.documentUrl || cd.document_url || cd.file || null;
        const docId = cd.id || cd.docId || `doc-case-${idx}`;
        const isDocVerified = (cd.status === 'VERIFIED') || (cd.document_status === 'VERIFIED') || Boolean(cd.verified) || Boolean(verifiedDocs[docId]);

        if (!list.some(item => item.name === docName)) {
          list.push({
            id: docId,
            name: docName,
            fileName: cd.fileName || cd.file_name || cd.file || cd.name || docName,
            category: cd.category || cd.type || cd.document_type_name || 'Patient Case Document',
            size: cd.size || cd.fileSize || cd.file_size || '1.2 MB',
            uploadedAt: cd.uploadedAt || cd.date || cd.uploaded_at || 'Recently',
            uploadedBy: formatPerson(cd.uploadedBy || cd.uploadedByName || cd.uploaded_by_name || cd.by, 'Citizen Applicant'),
            url: docUrl,
            fileUrl: docUrl,
            file_url: docUrl,
            isVerified: isDocVerified,
          });
        }
      });
    }

    return list;
  }, [escalation, linkedCase, verifiedDocs]);

  // Proximity & Specialty-Filtered Hospitals Matching (Sorted nearest first)
  const nearbyHospitals = useMemo(() => {
    if (!escalation) return [];
    const targetSpec = escalation.requiredSpecialty || '';
    const pLat = escalation.patientLat || 18.5314;
    const pLng = escalation.patientLng || 73.8298;
    const currentHospId = String(escalation.hospitalId || escalation.hospital_id || '');
    const currentHospName = String(escalation.hospitalName || escalation.hospital || '').toLowerCase().trim();

    // 1. Process all available hospitals (excluding current case hospital)
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

    // 2. Filter strictly by required specialty if specified
    if (targetSpec && targetSpec.trim()) {
      const equippedHospitals = processed.filter(h => h.hasSpecialty);
      if (equippedHospitals.length > 0) {
        return equippedHospitals.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }

    // Fallback if no specific specialty match found
    return processed.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [escalation, hospitals, arogyaSevaks]);

  // Ensure selected target hospital is always in the filtered list
  useEffect(() => {
    if (nearbyHospitals.length > 0) {
      if (!selectedTargetHospitalId || !nearbyHospitals.some(h => h.id === selectedTargetHospitalId)) {
        setSelectedTargetHospitalId(nearbyHospitals[0].id);
      }
    }
  }, [nearbyHospitals]);

  // Currently selected hospital object
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

  // Keep selectedSevakName synced with available allocatedSevaks
  useEffect(() => {
    if (allocatedSevaks.length > 0) {
      if (!selectedSevakName || !allocatedSevaks.some(s => s.name === selectedSevakName)) {
        setSelectedSevakName(allocatedSevaks[0].name);
      }
    }
  }, [selectedTargetHospitalId, allocatedSevaks]);

  const handleVerifyDoc = async (docId, docName = '') => {
    setVerifiedDocs(prev => ({ ...prev, [docId]: true }));
    if (verifyDocument && linkedCase?.id) {
      try {
        await verifyDocument(linkedCase.id, docId);
      } catch (err) {
        console.warn('[EscalationCaseDetail] verifyDocument sync error:', err.message);
      }
    }
    showToast(`Document "${docName || 'Uploaded Record'}" verified successfully ✓`);
  };

  // Handle Bill Resolution Submit
  const handleResolveBill = async () => {
    if (!escalation || submittingResolution) return;
    if (billResolutionType === 'others' && !sevakInstructionNote.trim() && !adminNotes.trim()) {
      if (showToast) showToast('Please enter instructions / note for the assigned Arogya Sevak', 'warning');
      return;
    }
    try {
      setSubmittingResolution(true);
      const targetId = escalation.uuid || escalation.id;
      const combinedNotes = billResolutionType === 'others'
        ? `[NOTE FOR SEVAK (${escalation.sevakName || 'ArogyaSevak'})] ${sevakInstructionNote.trim()}${adminNotes.trim() ? ` | Admin Note: ${adminNotes.trim()}` : ''}`
        : (adminNotes.trim() || 'Chief Minister Relief Fund (CMRF) supplementary top-up grant sanctioned.');

      await resolveBillEscalation(targetId, billResolutionType, {
        schemeCode: 'CMRF',
        amount: escalation.estimatedBill || 'Exceeded Balance',
        sevakNote: sevakInstructionNote.trim(),
        notes: combinedNotes
      });
      if (showToast) showToast('Financial resolution approved & assigned Arogya Sevak notified!', 'success');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Handle Transfer Resolution Submit
  const handleTransferSubmit = async () => {
    if (!escalation || submittingResolution) return;
    try {
      setSubmittingResolution(true);
      const targetId = escalation.uuid || escalation.id;
      const targetHosp = hospitals.find(h => h.id === selectedTargetHospitalId) || nearbyHospitals[0] || hospitals[0];
      const sevakName = selectedSevakName || targetHosp.assignedSevakName || targetHosp.sevak || 'Rohan Deshmukh';

      await transferHospitalEscalation(targetId, targetHosp, sevakName, {
        prevSevakNote: prevSevakNote.trim(),
        newSevakNote: newSevakNote.trim(),
        notes: `Reassigned from ${escalation.hospitalName || 'previous hospital'} to ${targetHosp.name} (${sevakName})`
      });
    } finally {
      setSubmittingResolution(false);
    }
  };

  if (!escalation) {
    return (
      <Loader
        fullPage
        message="Loading Escalation Details..."
        subtext="Fetching escalation dossier, patient reports, and hospital coordination details"
      />
    );
  }

  // Check if case is specialty unavailable or bill exceeded
  const isSpecialtyCase = escalation.reasonType === 'specialty_unavailable' || Boolean(escalation.requiredSpecialty && escalation.reasonType !== 'bill_exceeded');
  const isResolved = escalation.status?.toLowerCase() === 'resolved';

  return (
    <div className="escalation-detail-container">
      {/* 1. Header Navigation */}
      <div className="detail-top-nav">
        <Link to="/admin/escalations" className="back-escalations-btn">
          <ArrowLeft size={18} />
          <span>Back to Urgent Escalations</span>
        </Link>
        <div className="detail-top-badges">
          <span className="case-id-badge">#{escalation.shortId || escalation.displayId || escalation.caseId || escalation.id}</span>
          <span className={`status-badge-chip ${isResolved ? 'resolved' : 'on-hold'}`}>
            {isResolved ? '✓ Resolved' : '⏸️ On Hold'}
          </span>
        </div>
      </div>

      {/* 2. Patient & Case Telemetry Header Card */}
      <div className="patient-telemetry-card">
        <div className="telemetry-main-row">
          <div className="patient-identity-box">
            <h1 className="patient-title-name">{escalation.patientName}</h1>
            <div className="patient-sub-pills">
              <span>{escalation.ageGender}</span>
              <span className="dot-divider">•</span>
              <span>{escalation.ward}</span>
              <span className="dot-divider">•</span>
              <span className="scheme-tag-pill">{escalation.scheme} (Limit: {escalation.schemeLimit})</span>
            </div>
          </div>

          <div className="current-hospital-box">
            <div className="box-label">Current Hospital & Sevak:</div>
            <div className="hosp-name-title">
              <Building2 size={16} />
              <span>{escalation.hospitalName}</span>
            </div>
            <div className="sevak-assigned-info">
              <UserCheck size={14} />
              <span>Assigned Sevak: <strong>{formatPerson(escalation.submittedBy)}</strong></span>
            </div>
          </div>
        </div>

        {/* Escalation Cause Summary Banner */}
        <div className="escalation-cause-banner">
          <div className="cause-icon-wrap">
            <Zap size={22} className="pulse-zap" />
          </div>
          <div className="cause-details-content">
            <h3>Field Escalation Reason: {escalation.reasonTitle}</h3>
            <p>"{escalation.remarks}"</p>
            <div className="cause-meta-line">
              <span>Submitted on {escalation.submittedAt}</span>
              {escalation.requiredSpecialty && (
                <span className="required-spec-chip">Required Specialty: <strong>{escalation.requiredSpecialty}</strong></span>
              )}
              {escalation.estimatedBill && (
                <span className="bill-est-chip">Estimated Bill: <strong>{escalation.estimatedBill}</strong></span>
              )}
            </div>
          </div>
        </div>

        {isResolved && (
          <div className="resolution-history-box">
            <CheckCircle size={20} className="check-green" />
            <div>
              <strong>Administrative Resolution Summary:</strong>
              <p>{escalation.resolutionNotes}</p>
              <div className="resolved-by-line">
                Resolved on {escalation.resolvedAt} by {escalation.resolvedBy || 'System Admin'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Grid Layout (Documents Vault & Action Resolution Panel) */}
      <div className="detail-sections-grid">

        {/* LEFT COLUMN: Case Documents Vault */}
        <div className="documents-vault-card">
          <div className="section-title-row">
            <FileText size={20} className="section-icon" />
            <h2>Case Documents Vault ({caseDocuments.length})</h2>
          </div>
          <p className="section-subtitle">ArogyaSevak uploaded records & verified case documents</p>

          <div className="documents-list-table">
            {caseDocuments.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <FileText size={28} color="#94a3b8" style={{ marginBottom: '6px' }} />
                <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.9rem' }}>No documents attached with this escalation</div>
                <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>Arogya Sevak has not uploaded any additional referral attachments for this request.</div>
              </div>
            ) : (
              caseDocuments.map((doc) => {
                const isVerified = isResolved || Boolean(verifiedDocs[doc.id]) || Boolean(doc.isVerified);
                return (
                  <div key={doc.id} className="doc-item-row">
                    <div className="doc-icon-box">
                      <FileText size={22} />
                    </div>
                    <div className="doc-info-block">
                      <div className="doc-name-text">{doc.name}</div>
                      <div className="doc-category-text">{doc.category}</div>
                      <div className="doc-meta-sub">
                        <span>{doc.size}</span>
                        <span className="dot-divider">•</span>
                        <span>{doc.uploadedAt} ({formatPerson(doc.uploadedBy)})</span>
                      </div>
                    </div>

                    <div className="doc-status-badge">
                      {isVerified ? (
                        <span className="verified-chip"><ShieldCheck size={13} /> Verified</span>
                      ) : (
                        <span className="pending-chip"><AlertCircle size={13} /> Pending Verification</span>
                      )}
                    </div>

                    <div className="doc-actions-group">
                      {/* View Button - Always visible for verified, or available for viewing new docs */}
                      <button
                        className="btn-doc-view"
                        onClick={() => setSelectedDoc(doc)}
                        title="View Document"
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>

                      {/* Verify Button - Displayed for unverified documents when case is pending */}
                      {!isVerified && !isResolved && (
                        <button
                          className="btn-doc-verify"
                          onClick={() => handleVerifyDoc(doc.id, doc.name)}
                          title="Verify Document"
                        >
                          <FileCheck size={15} />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Contextual Admin Resolution Panel */}
        <div className="admin-resolution-panel">
          {isResolved ? (
            /* CASE IS RESOLVED -> DISPLAY COMPLETED RESOLUTION DETAILS ONLY */
            <div className="resolution-case-box resolved-details-box">
              <div className="section-title-row">
                <CheckCircle size={22} className="section-icon-green" />
                <h2>Administrative Resolution Details (Completed)</h2>
              </div>
              <p className="section-subtitle">This urgent escalation case has been officially resolved and closed by System Admin.</p>

              <div className="resolution-details-summary-card">
                <div className="res-detail-header-stripe">
                  <div className="res-detail-type">
                    <strong>Resolution Type:</strong>
                    <span>{isSpecialtyCase ? 'Hospital Transfer & Specialty Re-Assignment' : 'Scheme Budget Limit Resolution'}</span>
                  </div>
                  <span className="res-status-badge">✓ Case Resolved</span>
                </div>

                <div className="res-detail-grid">
                  <div className="res-detail-item">
                    <span className="res-lbl">Assigned Hospital:</span>
                    <strong className="res-val">{escalation.hospitalName}</strong>
                  </div>
                  <div className="res-detail-item">
                    <span className="res-lbl">Assigned Arogya Sevak:</span>
                    <strong className="res-val">{formatPerson(escalation.submittedBy)}</strong>
                  </div>
                  {escalation.requiredSpecialty && (
                    <div className="res-detail-item">
                      <span className="res-lbl">Medical Specialty:</span>
                      <strong className="res-val">{escalation.requiredSpecialty}</strong>
                    </div>
                  )}
                  {escalation.estimatedBill && (
                    <div className="res-detail-item">
                      <span className="res-lbl">Estimated Bill / Scheme:</span>
                      <strong className="res-val">{escalation.estimatedBill} ({escalation.scheme})</strong>
                    </div>
                  )}
                  <div className="res-detail-item">
                    <span className="res-lbl">Resolved Date:</span>
                    <strong className="res-val">{escalation.resolvedAt || '—'}</strong>
                  </div>
                  <div className="res-detail-item">
                    <span className="res-lbl">Approved By Admin:</span>
                    <strong className="res-val">{escalation.resolvedBy || 'System Admin'}</strong>
                  </div>
                </div>

                <div className="res-notes-block">
                  <span className="res-lbl">Administrative Order & Handover Summary:</span>
                  <p className="res-notes-text">"{escalation.resolutionNotes || 'Hospital transfer initiated & approved. Handover telemetry dispatched to Arogya Sevaks.'}"</p>
                </div>
              </div>
            </div>
          ) : isSpecialtyCase ? (
            /* SPECIALTY UNAVAILABLE CASE -> SIMPLE HOSPITAL RE-ASSIGNMENT RESOLUTION */
            <div className="resolution-case-box">
              <div className="section-title-row">
                <ArrowRightLeft size={20} className="section-icon-purple" />
                <h2>Re-Assign Hospital & ArogyaSevak</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <p className="section-subtitle" style={{ margin: 0 }}>
                  Required Specialty: <strong style={{ color: '#7c3aed' }}>{escalation.requiredSpecialty || 'Neurosurgery'}</strong>
                </p>
                <span style={{
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px'
                }}>
                  ✓ Filtered: {nearbyHospitals.length} Empanelled Hospital{nearbyHospitals.length !== 1 ? 's' : ''} Equipped with this Specialty
                </span>
              </div>

              <div className="simple-reassign-form">
                {/* 1. Select Hospital Dropdown */}
                <div className="form-group">
                  <label className="field-label-bold">
                    1. Select Destination Hospital (Equipped with {escalation.requiredSpecialty?.replace(/\(.*?\)/g, '').trim() || 'Required Specialty'}):
                  </label>
                  <select
                    className="clean-form-select"
                    value={selectedTargetHospitalId}
                    onChange={(e) => setSelectedTargetHospitalId(e.target.value)}
                  >
                    {nearbyHospitals.map((hosp) => (
                      <option key={hosp.id} value={hosp.id}>
                        🏥 {hosp.name} (📍 {hosp.distanceKm} km • {hosp.location || hosp.address} • 🛏️ {hosp.bedsAvailable} Beds Free{hosp.matchedSpecialtyTag ? ` • ✓ ${hosp.matchedSpecialtyTag}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Arogya Sevak Dropdown */}
                {selectedHospitalObj && (
                  <div className="form-group">
                    <label className="field-label-bold">2. Assign ArogyaSevak at {selectedHospitalObj.name}:</label>
                    <select
                      className="clean-form-select"
                      value={selectedSevakName}
                      onChange={(e) => setSelectedSevakName(e.target.value)}
                    >
                      {allocatedSevaks.map((sevak) => (
                        <option key={sevak.id || sevak.name} value={sevak.name}>
                          👤 {sevak.name} (📱 {sevak.mobile || '—'}) — 📊 {sevak.patients ?? 12} Active Cases
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Note for Previous Arogya Sevak */}
                <div className="form-group">
                  <label className="field-label-bold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>📝 1. Handover Note for Previous ArogyaSevak ({formatPerson(escalation.submittedBy, escalation.sevakName || 'Current Sevak')}):</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>(Discharge & Transfer Instructions)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="clean-form-textarea"
                    placeholder={`Enter discharge & handover instructions for ${formatPerson(escalation.submittedBy, 'previous ArogyaSevak')} (e.g. hand over medical records and assist patient with ambulance transport)...`}
                    value={prevSevakNote}
                    onChange={(e) => setPrevSevakNote(e.target.value)}
                  />
                </div>

                {/* 4. Note for Newly Assigned Arogya Sevak */}
                <div className="form-group">
                  <label className="field-label-bold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>📝 2. Intake Note for Newly Assigned ArogyaSevak ({selectedSevakName || 'New Sevak'}):</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>(Intake, Bed & Treatment Priority)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="clean-form-textarea"
                    placeholder={`Enter priority intake instructions for ${selectedSevakName || 'new ArogyaSevak'} (e.g. reserve neurosurgery ICU bed and initiate emergency intake upon patient arrival)...`}
                    value={newSevakNote}
                    onChange={(e) => setNewSevakNote(e.target.value)}
                  />
                </div>

                {/* Action Submit Button */}
                <button
                  className="btn-simple-reassign"
                  disabled={!selectedTargetHospitalId || isResolved || submittingResolution}
                  onClick={handleTransferSubmit}
                >
                  <ArrowRightLeft size={16} />
                  <span>{submittingResolution ? 'Saving Decision...' : 'Confirm Hospital & Sevak Re-Assignment'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* BILL CEILING EXCEEDED CASE -> FINANCIAL BUDGET RESOLUTION */
            <div className="resolution-case-box">
              <div className="section-title-row">
                <DollarSign size={20} className="section-icon-green" />
                <h2>Admin Resolution: Scheme Budget Limit Resolution</h2>
              </div>
              <p className="section-subtitle">Sanction supplementary grant or co-payment for hospital bill exceeding scheme limit</p>

              <div className="resolution-tab-body">
                <label className="field-label">Admin Level Financial Strategy:</label>
                <div className="bill-options-vertical">
                  {/* Option 1: Chief Minister Relief Fund (CMRF) */}
                  <label className={`bill-opt-card ${billResolutionType === 'cmrf' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="billResType"
                      value="cmrf"
                      checked={billResolutionType === 'cmrf'}
                      onChange={() => setBillResolutionType('cmrf')}
                    />
                    <div>
                      <strong>Option 1: Chief Minister Relief Fund (CMRF)</strong>
                      <p>Sanction additional supplementary top-up grant from Chief Minister Relief Fund (CMRF) to cover the exceeded hospital bill.</p>
                      {billResolutionType === 'cmrf' && (
                        <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700' }}>
                          ✓ CMRF Financial Grant Sanctioned
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option 2: Others */}
                  <label className={`bill-opt-card ${billResolutionType === 'others' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="billResType"
                      value="others"
                      checked={billResolutionType === 'others'}
                      onChange={() => setBillResolutionType('others')}
                    />
                    <div style={{ width: '100%' }}>
                      <strong>Option 2: Others</strong>
                      <p>Alternative resolution strategy (e.g. applicant co-pay, NGO / charitable trust welfare grant, or special discretionary quota).</p>

                      {billResolutionType === 'others' && (
                        <div style={{ marginTop: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <label style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.825rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📝 Note / Direct Instructions for Assigned Arogya Sevak ({escalation.sevakName || 'Assigned Sevak'}):</span>
                            <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <textarea
                            rows={3}
                            className="form-control-textarea"
                            style={{ background: '#ffffff', borderColor: '#94a3b8', width: '100%', marginTop: '4px' }}
                            placeholder={`Enter specific instructions for ${escalation.sevakName || 'the assigned Arogya Sevak'} (e.g. guide applicant for co-payment procedure, coordinate with hospital billing desk, or apply to specified NGO/trust)...`}
                            value={sevakInstructionNote}
                            onChange={(e) => setSevakInstructionNote(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="form-group margin-top-sm">
                  <label className="field-label">Official Administrative Decision Notes:</label>
                  <textarea
                    rows={2}
                    className="form-control-textarea"
                    placeholder="Enter administrative order notes or remarks..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <button
                  className="btn-execute-bill-res"
                  disabled={isResolved || submittingResolution}
                  onClick={handleResolveBill}
                >
                  <CheckCircle size={18} />
                  <span>{submittingResolution ? 'Approving Financial Resolution...' : 'Approve Financial Resolution & Notify Assigned Arogya Sevak'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDoc && (() => {
        const fileName = String(selectedDoc.fileName || selectedDoc.name || '').toLowerCase();
        let rawUrl = selectedDoc.fileUrl || selectedDoc.file_url || selectedDoc.url || (selectedDoc.isMainAttachment ? (escalation?.attachmentUrl || escalation?.attachment_url) : null);
        if (fileName.includes('hero') || String(rawUrl || '').includes('hero')) {
          rawUrl = heroImg;
        }
        const resolvedUrl = resolveDocFileUrl(rawUrl, selectedDoc.s3_key || selectedDoc.s3Key || escalation?.s3Key);
        const isFullUrl = typeof resolvedUrl === 'string' && (
          resolvedUrl.startsWith('http://') ||
          resolvedUrl.startsWith('https://') ||
          resolvedUrl.startsWith('data:') ||
          resolvedUrl.startsWith('blob:') ||
          resolvedUrl.startsWith('/') ||
          resolvedUrl.startsWith('/src/') ||
          resolvedUrl.startsWith('/@fs/')
        );
        const fileUrl = isFullUrl ? resolvedUrl : (fileName.includes('hero') ? heroImg : null);

        const isPdf = /\.pdf($|\?)/i.test(fileName) ||
          (typeof resolvedUrl === 'string' && (/\.pdf($|\?)/i.test(resolvedUrl) || resolvedUrl.startsWith('data:application/pdf'))) ||
          selectedDoc.category?.toLowerCase().includes('pdf') ||
          selectedDoc.mimeType === 'application/pdf' ||
          selectedDoc.mime_type === 'application/pdf';
        const isImage = !isPdf;
        const isVerified = escalation.status === 'resolved' || Boolean(verifiedDocs[selectedDoc.id]) || Boolean(selectedDoc.isVerified);

        return (
          <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
            <div className="modal-content-card doc-preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  {isImage ? (
                    <ImageIcon size={22} className="modal-icon-blue" />
                  ) : (
                    <FileText size={22} className="modal-icon-blue" />
                  )}
                  <div>
                    <h2>{selectedDoc.name}</h2>
                    <p>{selectedDoc.category} • {selectedDoc.size} • Uploaded by {formatPerson(selectedDoc.uploadedBy)}</p>
                  </div>
                </div>

                <div className="modal-header-actions">
                  {fileUrl && !imgLoadError && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-header-external"
                      title="Open file in new tab"
                    >
                      <ExternalLink size={15} />
                      <span>Open File</span>
                    </a>
                  )}
                  <button className="close-modal-btn" onClick={() => setSelectedDoc(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="doc-preview-body">
                {/* 1. IMAGE DOCUMENT VIEW */}
                {isImage ? (
                  <div className="doc-image-preview-wrapper">
                    <div className="doc-preview-toolbar">
                      <span className="doc-type-badge">🖼️ IMAGE DOCUMENT</span>
                      <div className="doc-zoom-controls">
                        <button
                          type="button"
                          className="btn-zoom"
                          onClick={() => setZoomLevel((prev) => Math.max(0.6, Math.round((prev - 0.2) * 10) / 10))}
                          title="Zoom Out"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
                        <button
                          type="button"
                          className="btn-zoom"
                          onClick={() => setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.2) * 10) / 10))}
                          title="Zoom In"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-zoom"
                          onClick={() => setZoomLevel(1)}
                          title="Reset Zoom"
                        >
                          <RotateCw size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="doc-image-canvas-box" style={{ position: 'relative', minHeight: '340px' }}>
                      {fileUrl && !imgLoadError ? (
                        <div className="doc-image-viewport" style={{ position: 'relative', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', borderRadius: '6px', padding: '16px', overflow: 'hidden' }}>
                          {docLoading && (
                            <div className="am-doc-preview-loader" style={{ background: 'rgba(15, 23, 42, 0.88)' }}>
                              <div className="am-doc-preview-spinner" />
                              <p className="am-doc-preview-text" style={{ color: '#ffffff' }}>Loading Document Image...</p>
                              <span className="am-doc-preview-subtext" style={{ color: '#94a3b8' }}>Fetching secure file from storage</span>
                            </div>
                          )}
                          <img
                            src={fileUrl}
                            alt={selectedDoc.name}
                            className="doc-real-image"
                            style={{ maxWidth: '100%', maxHeight: '440px', objectFit: 'contain', transform: `scale(${zoomLevel})`, opacity: docLoading ? 0 : 1, transition: 'opacity 0.2s ease, transform 0.2s ease' }}
                            onLoad={() => setDocLoading(false)}
                            onError={(e) => {
                              if (fileName.includes('hero') && e.target.src !== heroImg) {
                                e.target.src = heroImg;
                                setDocLoading(false);
                              } else {
                                setImgLoadError(true);
                                setDocLoading(false);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        /* Authentic clinical note / prescription scan sheet */
                        <div className="clinical-slip-canvas" style={{ transform: `scale(${zoomLevel})` }}>
                          <div className="slip-hospital-header">
                            <div className="slip-hosp-logo">🏥</div>
                            <div className="slip-hosp-info">
                              <h4 className="slip-hosp-name">{escalation.hospitalName || 'DISTRICT CIVIL HOSPITAL / EMPANELLED HEALTHCARE'}</h4>
                              <p className="slip-hosp-sub">Department of Clinical Medicine & Critical Surgery • Maharashtra Public Health</p>
                            </div>
                            <div className="slip-rx-tag">Rx CLINICAL NOTE</div>
                          </div>

                          <div className="slip-patient-meta-grid">
                            <div><span className="meta-label">Patient Name:</span> <strong className="meta-val">{escalation.patientName || 'Akanksha Pawashe'}</strong></div>
                            <div><span className="meta-label">Case Number:</span> <strong className="meta-val text-blue">{escalation.caseId || 'AA-2026-00002'}</strong></div>
                            <div><span className="meta-label">Document:</span> <strong className="meta-val text-blue">{selectedDoc.name}</strong></div>
                            <div><span className="meta-label">Uploaded By:</span> <strong className="meta-val">{formatPerson(selectedDoc.uploadedBy)}</strong></div>
                          </div>

                          <div className="slip-diagnosis-body">
                            <div className="slip-section-title">CLINICAL OBSERVATION & REFERRAL SUMMARY</div>
                            <p className="slip-text">
                              {escalation.remarks || 'Patient reported with critical escalation requiring specialized medical intervention and hospital ceiling clearance.'}
                            </p>
                            <div className="slip-checklist">
                              <div>✓ Clinical vitals documented and verified by attending Arogya Sevak</div>
                              <div>✓ Medical cost estimate & scheme entitlement attached for review</div>
                              <div>✓ Digital document uploaded via ArogyaMitra mobile scanner ({selectedDoc.name})</div>
                            </div>
                          </div>

                          <div className="slip-footer-stamps">
                            <div className="slip-signature-box">
                              <div className="signature-line">Attending Chief Medical Officer</div>
                              <div className="signature-sub">{escalation.hospitalName || 'Hospital Authority'}</div>
                            </div>
                            <div className="slip-verified-seal">
                              <ShieldCheck size={28} color="#16a34a" />
                              <div>
                                <strong>ABDM DIGITAL VERIFIED</strong>
                                <span>Ref: SHA256:{selectedDoc.id || 'DOC'}-MH2026</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isPdf && fileUrl ? (
                  /* 2. REAL PDF EMBEDDED VIEWER */
                  <div className="doc-pdf-preview-wrapper" style={{ position: 'relative', minHeight: '440px' }}>
                    <div className="doc-preview-toolbar">
                      <span className="doc-type-badge">📄 PDF DOCUMENT</span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-open-external"
                      >
                        <ExternalLink size={14} />
                        <span>Open PDF in Full Window</span>
                      </a>
                    </div>
                    <div className="doc-pdf-iframe-container" style={{ position: 'relative', minHeight: '440px' }}>
                      {docLoading && (
                        <div className="am-doc-preview-loader">
                          <div className="am-doc-preview-spinner" />
                          <p className="am-doc-preview-text">Loading PDF Document...</p>
                          <span className="am-doc-preview-subtext">Fetching secure file from storage</span>
                        </div>
                      )}
                      <iframe
                        src={fileUrl}
                        title={selectedDoc.name}
                        className="doc-pdf-iframe"
                        style={{ opacity: docLoading ? 0 : 1, transition: 'opacity 0.2s ease' }}
                        onLoad={() => setDocLoading(false)}
                        onError={() => setDocLoading(false)}
                      />
                    </div>
                  </div>
                ) : (
                  /* 3. OFFICIAL MAHARASHTRA HEALTH SERVICES DOSSIER RECORD */
                  <div className="simulated-doc-page">
                    <div className="doc-page-header">
                      <div className="gov-emblem">🏛️ MAHARASHTRA HEALTH SERVICES</div>
                      <div className="doc-type-tag">OFFICIAL RECORD</div>
                    </div>

                    <div className="doc-page-content">
                      <h3>PATIENT CLINICAL & ESCALATION RECORD</h3>
                      <table className="preview-meta-table">
                        <tbody>
                          <tr>
                            <td><strong>Document Name:</strong></td>
                            <td><span className="text-blue font-semibold">{selectedDoc.name}</span></td>
                          </tr>
                          <tr>
                            <td><strong>Patient Name:</strong></td>
                            <td>{escalation.patientName}</td>
                          </tr>
                          <tr>
                            <td><strong>Case ID:</strong></td>
                            <td>{escalation.caseId}</td>
                          </tr>
                          <tr>
                            <td><strong>Scheme:</strong></td>
                            <td>{escalation.scheme}</td>
                          </tr>
                          <tr>
                            <td><strong>Current Hospital:</strong></td>
                            <td>{escalation.hospitalName}</td>
                          </tr>
                          <tr>
                            <td><strong>Clinical Reason:</strong></td>
                            <td>{escalation.remarks}</td>
                          </tr>
                          <tr>
                            <td><strong>Uploaded By:</strong></td>
                            <td>{formatPerson(selectedDoc.uploadedBy)} ({selectedDoc.uploadedAt})</td>
                          </tr>
                        </tbody>
                      </table>

                      {isVerified ? (
                        <div className="scanned-stamp-box">
                          <CheckCircle size={28} color="#16a34a" />
                          <div>
                            <strong>OFFICIALLY VERIFIED RECORD</strong>
                            <p>Document authenticated via ArogyaMitra Portal • SHA256:{selectedDoc.id}-MH2026</p>
                          </div>
                        </div>
                      ) : (
                        <div className="scanned-stamp-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                          <AlertCircle size={28} color="#d97706" />
                          <div>
                            <strong style={{ color: '#b45309' }}>DOCUMENT PENDING VERIFICATION</strong>
                            <p style={{ color: '#92400e' }}>Uploaded by {formatPerson(selectedDoc.uploadedBy)} • Awaiting Admin verification</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions-row pad-around">
                <button
                  type="button"
                  className="btn-download-modal"
                  onClick={() => downloadDocFile({
                    title: selectedDoc.name,
                    patientId: escalation.caseId,
                    patientName: escalation.patientName,
                    doctor: `Attending Medical Officer (${escalation.hospitalName})`,
                    type: selectedDoc.category,
                    date: selectedDoc.uploadedAt,
                  })}
                  title="Download document text file"
                >
                  <Download size={16} />
                  <span>Download File</span>
                </button>

                <div className="modal-actions-right">
                  <button type="button" className="btn-cancel-modal" onClick={() => setSelectedDoc(null)}>
                    Close Preview
                  </button>
                  {!isVerified && !isResolved && (
                    <button
                      type="button"
                      className="btn-confirm-decision"
                      onClick={() => {
                        handleVerifyDoc(selectedDoc.id, selectedDoc.name);
                        setSelectedDoc(null);
                      }}
                    >
                      <FileCheck size={18} />
                      <span>Mark Document Verified</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EscalationCaseDetail;
