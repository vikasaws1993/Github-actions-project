import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  FileText,
  FolderPlus,
  CheckSquare,
  Check,
  Eye,
  X,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  UserCheck,
  UserX,
  ShieldCheck,
  MessageSquare,
  User,
  Building2,
  MapPin
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { formatDateDDMMYYYY, applicationService, isCaseAssigned } from '../../../services/applicationService';
import { getCleanDocTitle } from '../ReviewApprove/ReviewApprove';
import patientService from '../../../services/patientService';
import Loader from '@/components/common/Loader/Loader';
import './CaseDetail.css';

// Helper to determine if a document was uploaded or requested from Arogya Sevak
const isSevakDocument = (doc) => {
  if (!doc) return false;

  const docName = String(doc.name || doc.title || doc.file_name || doc.file || '').toLowerCase().trim();
  const category = String(doc.category || doc.type || '').toLowerCase().trim();

  // 1. If explicitly marked as citizen document or uploaded by citizen/applicant
  if (doc.requestedFrom === 'citizen' || doc.requested_from === 'citizen') return false;
  if (doc.uploaderRole === 'Citizen' || doc.uploaded_by_role === 'CITIZEN' || doc.uploaded_by_role === 'USER') return false;
  if (doc.uploadedBy === 'citizen' || doc.uploadedBy === 'applicant' || doc.uploadedBy === 'patient') return false;
  if (doc.source === 'Citizen Upload' || doc.source === 'Citizen Application') return false;

  // 2. Known citizen application document patterns ALWAYS belong to Citizen Application Documents
  const citizenKeywords = [
    'birth', 'certificate', 'cerificate', 'aadhaar', 'aadhar', 'identity', 'id proof',
    'ration', 'income', 'bpl', 'prescription', 'referral', 'voter', 'pan', 'applicant'
  ];
  if (citizenKeywords.some(k => docName.includes(k) || category.includes(k))) {
    // Only treat as Sevak if specifically requested from Sevak
    if (doc.requestedFrom !== 'sevak' && doc.requested_from !== 'sevak' && doc.status !== 'PENDING_SEVAK_UPLOAD' && doc.document_status !== 'PENDING_SEVAK_UPLOAD') {
      return false;
    }
  }

  // 3. Discharge Summary & Medical Bills: if part of citizen registration or not requested from Sevak, it is Citizen doc
  if (docName.includes('discharge') && !doc.is_sevak_upload && !doc.isSevakUpload && doc.uploaded_by_role !== 'AROGYA_SEVAK' && doc.uploaderRole !== 'ArogyaSevak' && doc.requestedFrom !== 'sevak') {
    return false;
  }

  // 4. Explicit Sevak flags
  if (doc.requestedFrom === 'sevak' || doc.requested_from === 'sevak') return true;
  if (doc.status === 'PENDING_SEVAK_UPLOAD' || doc.document_status === 'PENDING_SEVAK_UPLOAD') return true;
  if (doc.is_sevak_upload === true || doc.isSevakUpload === true) {
    if (doc.requestedFrom === 'citizen' || doc.requested_from === 'citizen') return false;
    return true;
  }
  if (doc.uploaded_by_role === 'AROGYA_SEVAK' || doc.uploaded_by_role === 'SEVAK') return true;
  if (doc.uploaderRole === 'ArogyaSevak' || doc.uploaderRole === 'SEVAK' || doc.uploaderRole === 'sevak') return true;
  if (doc.uploadedBy === 'sevak' || doc.uploadedBy === 'ArogyaSevak') return true;
  if (typeof doc.source === 'string' && (doc.source.toLowerCase() === 'arogyasevak upload' || doc.source.toLowerCase() === 'sevak upload' || doc.source.toLowerCase() === 'hospital_ward')) return true;

  return false;
};

export const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    cases = [],
    hospitals = [],
    arogyaSevaks = [],
    escalationRequests = [],
    setActiveModal,
    requestDocument,
    uploadDocument,
    verifyDocument,
    reopenCase,
    getReopenInfo,
    updateCaseStatus,
    operator,
    claimCase,
    unclaimCase,
    assignCaseReviewer,
    showToast
  } = useAdmin();

  // Find target case with safe fallback immediately from context or applicationService cache
  const contextCase = (cases && cases.find(c => c.id === id || c.caseId === id || c.applicationNumber === id || c.uuid === id)) || applicationService.getCachedApplicationById(id) || null;

  const [fetchedCase, setFetchedCase] = useState(() => contextCase);
  const [loading, setLoading] = useState(() => !contextCase);

  const refreshCase = useCallback(() => {
    if (!id) return;
    applicationService.fetchApplicationById(id)
      .then((res) => {
        if (res?.success && res.data) {
          setFetchedCase(res.data);
        }
      })
      .catch((err) => {
        console.warn('[CaseDetail] Could not fetch live case details:', err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    refreshCase();
    // Real-time live polling for status changes from other admins (every 5 seconds)
    const detailSyncTimer = setInterval(refreshCase, 5000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') refreshCase();
    };
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(detailSyncTimer);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCase]);

  // Combine context and fetched case docs, ensuring requested or resubmitted docs from revertDetails are also included
  const combinedDocuments = (() => {
    const rawDocs = (fetchedCase?.documents && fetchedCase.documents.length > 0)
      ? fetchedCase.documents
      : (contextCase?.documents || []);

    const list = [...rawDocs];

    // Merge any newly requested docs from contextCase that might not be in fetchedCase yet
    if (contextCase?.documents) {
      contextCase.documents.forEach((ctxDoc) => {
        const alreadyInList = list.some(d =>
          d.name === ctxDoc.name ||
          d.file === ctxDoc.file ||
          (ctxDoc.id && d.id === ctxDoc.id)
        );
        if (!alreadyInList) {
          list.push(ctxDoc);
        }
      });
    }

    // If case has revertDetails
    const revert = fetchedCase?.revertDetails || contextCase?.revertDetails || fetchedCase?.revert_details || contextCase?.revert_details;
    if (revert && (revert.requestedDocName || revert.requested_doc_name)) {
      const reqName = revert.requestedDocName || revert.requested_doc_name;
      const isResolved = revert.isResolved === true || Boolean(revert.resubmittedDoc);

      const isSevakReq = revert.requestedFrom === 'sevak' || revert.requested_from === 'sevak';
      const assignedSevakName = fetchedCase?.assignedSevak || contextCase?.assignedSevak || fetchedCase?.sevak || contextCase?.sevak || 'Akanksha Pawashe';

      if (isResolved) {
        const resubDoc = revert.resubmittedDoc || {};
        const resubName = revert.resubmittedDocName || resubDoc.name || reqName;
        const alreadyInList = list.some(d =>
          d.name === resubName ||
          d.file === resubName ||
          d.name === reqName ||
          (resubDoc.id && d.id === resubDoc.id)
        );
        if (!alreadyInList) {
          list.push({
            id: revert.resubmittedDocId || resubDoc.id || 'REVERT-DOC-1',
            name: resubName,
            title: resubName,
            file: resubDoc.name || revert.resubmittedDocName || 'resubmitted_doc.pdf',
            file_url: resubDoc.file_url || resubDoc.uri || '',
            fileUrl: resubDoc.file_url || resubDoc.uri || '',
            size: resubDoc.size || '1.2 MB',
            category: resubDoc.category || revert.requestedDocType || (isSevakReq ? 'ArogyaSevak Clinical Record' : 'Requested Document'),
            verified: false,
            uploaded: true,
            requested: true,
            is_sevak_upload: isSevakReq,
            isSevakUpload: isSevakReq,
            uploaded_by_role: isSevakReq ? 'AROGYA_SEVAK' : 'CITIZEN',
            uploaderRole: isSevakReq ? 'ArogyaSevak' : 'Citizen',
            uploadedBy: isSevakReq ? 'sevak' : 'citizen',
            by: isSevakReq ? assignedSevakName : (fetchedCase?.applicant || contextCase?.applicant || 'Citizen'),
            status: 'PENDING',
            document_status: 'PENDING',
            statusText: isSevakReq ? `Uploaded by ArogyaSevak (${assignedSevakName})` : 'Citizen Uploaded (Pending Verification)',
            uploadedAt: revert.resubmittedDate || 'Recently'
          });
        }
      } else {
        const alreadyInList = list.some(d => d.name === reqName || (d.requested && !d.uploaded));
        if (!alreadyInList) {
          list.push({
            id: 'DOC-REQ-PENDING',
            name: reqName,
            title: reqName,
            file: 'Pending Upload',
            file_url: '',
            fileUrl: '',
            size: '-',
            category: revert.requestedDocType || (isSevakReq ? 'ArogyaSevak Clinical Record' : 'Requested Document'),
            verified: false,
            uploaded: false,
            requested: true,
            is_sevak_upload: isSevakReq,
            isSevakUpload: isSevakReq,
            uploaded_by_role: isSevakReq ? 'AROGYA_SEVAK' : 'CITIZEN',
            uploaderRole: isSevakReq ? 'ArogyaSevak' : 'Citizen',
            requestedFrom: isSevakReq ? 'sevak' : 'citizen',
            uploadedBy: isSevakReq ? 'sevak' : 'citizen',
            by: isSevakReq ? assignedSevakName : (fetchedCase?.applicant || contextCase?.applicant || 'Citizen'),
            source: isSevakReq ? 'ArogyaSevak Upload' : 'Citizen Upload',
            status: isSevakReq ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
            document_status: isSevakReq ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
            statusText: isSevakReq ? `Requested from ArogyaSevak (${assignedSevakName})` : 'Pending Citizen Upload',
            uploadedAt: 'Pending',
            verificationRemark: revert.reason || ''
          });
        }
      }
    }

    return list;
  })();

  const combinedAdminNotes = (() => {
    const list = [];
    const seen = new Set();

    const addNote = (item) => {
      if (!item) return;
      const text = typeof item === 'string' ? item : (item.text || item.note || item.remark);
      if (!text || typeof text !== 'string') return;
      const clean = text.replace(/^\[ADMIN NOTE\]\s*/i, '').trim();
      if (!clean || clean === 'null' || clean === 'undefined' || seen.has(clean.toLowerCase())) return;
      seen.add(clean.toLowerCase());

      list.push(typeof item === 'object' ? {
        id: item.id || `an-${list.length + 1}`,
        text: clean,
        note: clean,
        by: item.by || item.author_name || contextCase?.operator || 'Rohit Patil',
        date: item.date || 'Admin Note'
      } : {
        id: `an-${list.length + 1}`,
        text: clean,
        note: clean,
        by: contextCase?.operator || 'Rohit Patil',
        date: 'Admin Note'
      });
    };

    // 1. From fetchedCase.adminNotes & fetchedCase.notes
    if (Array.isArray(fetchedCase?.adminNotes)) fetchedCase.adminNotes.forEach(addNote);
    if (Array.isArray(fetchedCase?.notes)) fetchedCase.notes.forEach(addNote);
    if (fetchedCase?.remarks) addNote(fetchedCase.remarks);

    // 2. From contextCase.adminNotes & contextCase.notes
    if (Array.isArray(contextCase?.adminNotes)) contextCase.adminNotes.forEach(addNote);
    if (Array.isArray(contextCase?.notes)) contextCase.notes.forEach(addNote);
    if (contextCase?.remarks) addNote(contextCase.remarks);

    // 3. From localStorage backup
    try {
      const targetId = String(id || fetchedCase?.id || contextCase?.id || '').toLowerCase();
      const stored = JSON.parse(localStorage.getItem(`arogyamitra_case_notes_${targetId}`) || '[]');
      if (Array.isArray(stored)) stored.forEach(addNote);
    } catch (_) { }

    return list;
  })();

  const caseItem = {
    ...(contextCase || {}),
    ...(fetchedCase || {}),
    status: fetchedCase?.status || contextCase?.status,
    current_status: fetchedCase?.current_status || contextCase?.current_status || fetchedCase?.status || contextCase?.status,
    reviewedByAdminId: fetchedCase?.reviewedByAdminId || fetchedCase?.reviewed_by_admin_id || contextCase?.reviewedByAdminId || contextCase?.reviewed_by_admin_id || null,
    reviewedByAdminName: fetchedCase?.reviewedByAdminName || fetchedCase?.reviewed_by_admin_name || contextCase?.reviewedByAdminName || contextCase?.reviewed_by_admin_name || null,
    reviewed_by_admin_id: fetchedCase?.reviewed_by_admin_id || fetchedCase?.reviewedByAdminId || contextCase?.reviewed_by_admin_id || contextCase?.reviewedByAdminId || null,
    reviewed_by_admin_name: fetchedCase?.reviewed_by_admin_name || fetchedCase?.reviewedByAdminName || contextCase?.reviewed_by_admin_name || contextCase?.reviewedByAdminName || null,
    documents: combinedDocuments,
    adminNotes: combinedAdminNotes,
    notes: combinedAdminNotes.map(n => n.text),
  };

  const handleClaimCase = (caseId, adminName) => {
    const targetName = adminName || operator?.name || 'Admin';
    claimCase(caseId, targetName);
    if (setFetchedCase) {
      setFetchedCase((prev) => prev ? ({
        ...prev,
        reviewedByAdminId: operator?.id || prev.reviewedByAdminId,
        reviewedByAdminName: targetName,
        reviewed_by_admin_id: operator?.id || prev.reviewed_by_admin_id,
        reviewed_by_admin_name: targetName,
        isClaimed: true,
      }) : prev);
    }
  };

  const handleUnclaimCase = (caseId) => {
    unclaimCase(caseId);
    if (setFetchedCase) {
      setFetchedCase((prev) => prev ? ({
        ...prev,
        reviewedByAdminId: null,
        reviewedByAdminName: null,
        reviewed_by_admin_id: null,
        reviewed_by_admin_name: null,
        isClaimed: false,
      }) : prev);
    }
  };

  const handleVerifyDoc = async (doc) => {
    const docTarget = typeof doc === 'object' && doc !== null
      ? (doc.id || doc.docId || doc.file_url || doc.file_name || doc.file || doc.name || doc.title)
      : doc;

    const docId = typeof doc === 'object' && doc !== null ? (doc.id || doc.docId || docTarget) : docTarget;
    const cleanDocTitle = getCleanDocTitle(doc);
    const verificationRemark = `Verified: ${cleanDocTitle} ✓`;

    // Call AdminContext verifyDocument
    await verifyDocument(caseItem.id, docTarget || doc, verificationRemark);

    // Call live backend API if a backend doc ID exists
    if (caseItem?.id && docId && !String(docId).startsWith('DOC-')) {
      try {
        await applicationService.verifyDocument(caseItem.id, docId, { status: 'VERIFIED', remark: verificationRemark });
      } catch (err) {
        console.warn('[CaseDetail] Backend verify error:', err.message);
      }
    }

    // Immediately update local fetchedCase state
    if (fetchedCase) {
      setFetchedCase((prev) => {
        if (!prev) return prev;
        let matched = false;
        const updatedDocs = (prev.documents || []).map((d) => {
          const isMatch = typeof doc === 'object' && doc !== null
            ? (d === doc || (doc.id && d.id && String(d.id) === String(doc.id)) || (doc.docId && d.docId && String(d.docId) === String(doc.docId)) || (doc.file_url && d.file_url && String(d.file_url) === String(doc.file_url)) || (doc.file_name && d.file_name && String(d.file_name) === String(doc.file_name)) || (doc.name && d.name && String(d.name) === String(doc.name)))
            : ((d.id && String(d.id) === String(docTarget)) || (d.docId && String(d.docId) === String(docTarget)) || (d.file_url && String(d.file_url) === String(docTarget)) || (d.file_name && String(d.file_name) === String(docTarget)) || (d.name && String(d.name) === String(docTarget)));

          if (isMatch && !matched) {
            matched = true;
            return {
              ...d,
              verified: true,
              uploaded: true,
              status: 'VERIFIED',
              document_status: 'VERIFIED',
              statusText: 'Verified ✓',
              verificationRemark: verificationRemark,
              verifiedAt: new Date().toISOString()
            };
          }
          return d;
        });

        if (!matched && doc) {
          const isSevak = isSevakDocument(doc);
          const newDocEntry = typeof doc === 'object' ? {
            ...doc,
            verified: true,
            uploaded: true,
            status: 'VERIFIED',
            document_status: 'VERIFIED',
            statusText: 'Verified ✓',
            verifiedAt: new Date().toISOString()
          } : {
            id: docTarget,
            name: docTarget,
            verified: true,
            uploaded: true,
            is_sevak_upload: isSevak,
            isSevakUpload: isSevak,
            status: 'VERIFIED',
            document_status: 'VERIFIED',
            statusText: 'Verified ✓',
            verifiedAt: new Date().toISOString()
          };
          updatedDocs.push(newDocEntry);
        }

        return { ...prev, documents: updatedDocs };
      });
    }

    showToast(`✓ Document verified successfully!`, 'success');
  };

  const handleUploadSevakDoc = (docName) => {
    uploadDocument(caseItem.id, docName, `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed_sevak.pdf`, 'ArogyaSevak');
    if (fetchedCase) {
      setFetchedCase((prev) => {
        if (!prev) return prev;
        const generatedName = `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed_sevak.pdf`;
        let matched = false;
        const updatedDocs = (prev.documents || []).map((d) => {
          if (d.name === docName || d.title === docName || (d.id && String(d.id) === String(docName))) {
            matched = true;
            return {
              ...d,
              uploaded: true,
              file: generatedName,
              fileName: generatedName,
              file_name: generatedName,
              size: '1.8 MB',
              is_sevak_upload: true,
              isSevakUpload: true,
              uploaded_by_role: 'AROGYA_SEVAK',
              uploaderRole: 'ArogyaSevak',
              uploadedBy: 'sevak',
              by: prev.assignedSevak || 'ArogyaSevak',
              source: 'ArogyaSevak Upload',
              status: 'UPLOADED_PENDING_VERIFICATION',
              document_status: 'UPLOADED_PENDING_VERIFICATION',
              statusText: 'Uploaded by ArogyaSevak — Ready for Verification',
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
            size: '1.8 MB',
            uploaded: true,
            verified: false,
            is_sevak_upload: true,
            isSevakUpload: true,
            uploaded_by_role: 'AROGYA_SEVAK',
            uploaderRole: 'ArogyaSevak',
            uploadedBy: 'sevak',
            by: prev.assignedSevak || 'ArogyaSevak',
            source: 'ArogyaSevak Upload',
            status: 'UPLOADED_PENDING_VERIFICATION',
            document_status: 'UPLOADED_PENDING_VERIFICATION',
            statusText: 'Uploaded by ArogyaSevak — Ready for Verification',
            uploadedAt: 'Just now'
          });
        }
        return { ...prev, documents: updatedDocs };
      });
    }
  };

  const reopenInfo = getReopenInfo(caseItem || {});

  const [sevakPatientData, setSevakPatientData] = useState(null);

  useEffect(() => {
    if (caseItem?.id) {
      patientService.getPatientById(caseItem.id).then(data => {
        if (data) setSevakPatientData(data);
      }).catch(err => console.log('Error loading Sevak patient record:', err));
    }
  }, [caseItem?.id]);

  // Dynamic badge class and status based on active escalation or case state
  const currentStatus = caseItem?.status || 'Submitted';
  const sUpper = currentStatus.toUpperCase().replace(/[-\s/]+/g, '_');

  // Match with active escalation requests
  const cIdStr = String(caseItem?.id || caseItem?.applicationNumber || caseItem?.caseId || caseItem?.uuid || id || '').toLowerCase().trim();
  const matchingEscalation = (escalationRequests || []).find((r) => {
    const rIdStr = String(r.caseId || r.applicationId || r.application_id || r.id || '').toLowerCase().trim();
    return cIdStr && rIdStr && (cIdStr === rIdStr || rIdStr.includes(cIdStr) || cIdStr.includes(rIdStr));
  });

  const isEscalationActive = Boolean(
    matchingEscalation && (
      matchingEscalation.status === 'on_hold' ||
      matchingEscalation.status === 'OPEN' ||
      matchingEscalation.status === 'PENDING' ||
      matchingEscalation.putOnHold ||
      (!matchingEscalation.resolvedAt && matchingEscalation.status !== 'resolved' && matchingEscalation.status !== 'RESOLVED')
    )
  );

  const isEscalationResolved = Boolean(
    (matchingEscalation && (
      matchingEscalation.status === 'resolved' ||
      matchingEscalation.status === 'RESOLVED' ||
      Boolean(matchingEscalation.resolvedAt)
    )) ||
    caseItem?.isBillResolved ||
    caseItem?.isTransferred ||
    String(caseItem?.status || '').toLowerCase().includes('bill resolved') ||
    String(caseItem?.status || '').toLowerCase().includes('reassigned') ||
    String(caseItem?.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
    String(caseItem?.remarks || '').toLowerCase().includes('[admin bill resolution]') ||
    String(caseItem?.remarks || '').includes('REASSIGNED CASE')
  );

  const escReasonType = String(matchingEscalation?.reasonType || matchingEscalation?.reason_type || '').toLowerCase();
  const escReasonTitle = String(matchingEscalation?.reasonTitle || matchingEscalation?.escalation_reason || '').toLowerCase();
  const escReasonBadge = String(matchingEscalation?.reasonBadge || '').toLowerCase();

  const isBillEscalation = Boolean(
    escReasonType === 'bill_exceeded' ||
    escReasonTitle.includes('bill') ||
    escReasonBadge.includes('bill') ||
    caseItem?.isBillResolved ||
    String(caseItem?.status || '').toLowerCase().includes('bill resolved') ||
    String(caseItem?.remarks || '').toLowerCase().includes('[bill exceeded resolution]') ||
    String(caseItem?.remarks || '').toLowerCase().includes('[admin bill resolution]')
  );

  const isSpecialtyOrTransferEscalation = Boolean(
    escReasonType === 'specialty_unavailable' ||
    escReasonType === 'emergency_transfer' ||
    escReasonTitle.includes('specialty') ||
    escReasonTitle.includes('transfer') ||
    escReasonBadge.includes('specialty') ||
    escReasonBadge.includes('reassigned') ||
    matchingEscalation?.requiredSpecialty ||
    matchingEscalation?.assignedNewHospital ||
    matchingEscalation?.assignedNewSevak ||
    caseItem?.isTransferred ||
    String(caseItem?.status || '').toLowerCase().includes('reassigned') ||
    String(caseItem?.remarks || '').includes('REASSIGNED CASE')
  );

  let displayHeaderStatus = currentStatus;
  let statusBadgeClass = 'status-active';

  const isPostResolutionProgressed = ['TREATMENT_STARTED', 'TREATMENT STARTED', 'CLOSED', 'DISCHARGED', 'DOCS_REQUIRED', 'DOCS_VERIFIED', 'UNDER_REVIEW', 'REJECTED'].some(
    st => sUpper === st || String(currentStatus).toUpperCase() === st || (caseItem?.status && String(caseItem.status).toUpperCase() === st)
  );

  if (isEscalationActive && !reopenInfo.isRejected) {
    if (isBillEscalation) {
      displayHeaderStatus = '⚡ Bill Exceeded';
      statusBadgeClass = 'status-escalated-bill';
    } else if (escReasonType === 'specialty_unavailable' || escReasonTitle.includes('specialty') || escReasonBadge.includes('specialty') || matchingEscalation?.requiredSpecialty) {
      displayHeaderStatus = '⚡ Specialty Unavailable';
      statusBadgeClass = 'status-escalated-specialty';
    } else if (escReasonType === 'bed_unavailable' || escReasonType === 'icu_bed_unavailable' || escReasonTitle.includes('bed')) {
      displayHeaderStatus = '⚡ Bed Unavailable';
      statusBadgeClass = 'status-escalated-bed';
    } else if (escReasonType === 'emergency_transfer' || escReasonTitle.includes('transfer')) {
      displayHeaderStatus = '⚡ Hospital Transfer';
      statusBadgeClass = 'status-escalated-transfer';
    } else {
      displayHeaderStatus = `⚡ ${matchingEscalation?.reasonBadge || 'Priority Request'}`;
      statusBadgeClass = 'status-escalated-general';
    }
  } else if (isEscalationResolved && !reopenInfo.isRejected && !isPostResolutionProgressed) {
    if (isBillEscalation) {
      displayHeaderStatus = 'Bill Limit Resolved ✓';
      statusBadgeClass = 'status-active';
    } else if (isSpecialtyOrTransferEscalation) {
      displayHeaderStatus = 'Transferred & Coordinated';
      statusBadgeClass = 'status-coordinated';
    } else {
      displayHeaderStatus = 'Priority Resolved ✓';
      statusBadgeClass = 'status-active';
    }
  } else {
    displayHeaderStatus = currentStatus;
    if (['CLOSURE_REQUESTED', 'CLOSURE_REQUEST'].some(s => sUpper.includes(s)) || String(currentStatus).toLowerCase() === 'closure requested') {
      displayHeaderStatus = 'Closure Requested';
      statusBadgeClass = 'status-closure-requested';
    }
    else if (['DOCS_REQUIRED', 'ON_HOLD', 'REVERTED'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-docs-required';
    else if (['DOCS_VERIFIED', 'DOC_VERIFIED'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-docs-verified';
    else if (['UNDER_REVIEW', 'PENDING_REVIEW'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-under-review';
    else if (['TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT'].some(s => sUpper.includes(s)) || currentStatus === 'Treatment Started') statusBadgeClass = 'status-active';
    else if (['COORDINATED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'REASSIGNED'].some(s => sUpper.includes(s)) || caseItem?.isTransferred || currentStatus.toLowerCase().includes('assigned')) statusBadgeClass = 'status-coordinated';
    else if (['REJECTED'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-rejected';
    else if (['CLOSED', 'DISCHARGED'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-closed';
    else if (['SUBMITTED', 'NEW'].some(s => sUpper.includes(s))) statusBadgeClass = 'status-submitted';
    else statusBadgeClass = 'status-active';
  }

  const isClosureRequested = Boolean(
    sUpper === 'CLOSURE_REQUESTED' ||
    sUpper === 'CLOSURE_REQUEST' ||
    String(currentStatus).toLowerCase() === 'closure requested' ||
    String(caseItem?.status || '').toLowerCase() === 'closure requested' ||
    String(caseItem?.current_status || '').toUpperCase() === 'CLOSURE_REQUESTED' ||
    caseItem?.sevakReportedStatus === 'CLOSURE_REQUESTED' ||
    caseItem?.treatmentProgress?.status === 'Closure Requested' ||
    caseItem?.treatment_progress?.status === 'Closure Requested'
  );

  const hasHospitalAssigned = Boolean(
    caseItem?.hospital &&
    caseItem.hospital !== '—' &&
    caseItem.hospital !== '-' &&
    caseItem.assignedSevak &&
    caseItem.assignedSevak !== '—' &&
    caseItem.assignedSevak !== '-' &&
    caseItem.assignedSevak !== 'Not assigned'
  );

  const isApproved = Boolean(
    currentStatus?.toUpperCase() === 'APPROVED' ||
    currentStatus?.toUpperCase() === 'COORDINATED' ||
    currentStatus?.toUpperCase() === 'TREATMENT_STARTED' ||
    currentStatus?.toUpperCase() === 'CLOSED' ||
    currentStatus === 'Approved' ||
    currentStatus === 'Treatment Started' ||
    currentStatus === 'Coordinated' ||
    currentStatus === 'Active' ||
    currentStatus === 'Sanctioned' ||
    currentStatus === 'Closed' ||
    hasHospitalAssigned
  );

  const isClosed = currentStatus === 'Closed' || currentStatus === 'CLOSED' || currentStatus === 'Closed (Expired)';
  const isRejected = reopenInfo.isRejected || currentStatus === 'REJECTED' || currentStatus === 'Rejected';
  const isDocsRequired =
    currentStatus === 'Docs Required' ||
    currentStatus === 'ON_HOLD' ||
    currentStatus === 'On Hold (Docs Required)' ||
    currentStatus === 'On Hold (Document Required)' ||
    currentStatus.includes('Docs Required') ||
    currentStatus.includes('Document Required') ||
    currentStatus.includes('Docs pending') ||
    currentStatus === 'On Hold';

  const currentAdminName = operator?.name || 'Admin';
  const reviewerName = caseItem.reviewedByAdminName || caseItem.reviewed_by_admin_name;
  const isClaimedByMe = Boolean(
    reviewerName && (
      reviewerName.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
      (operator?.id && (caseItem.reviewedByAdminId === operator.id || caseItem.reviewed_by_admin_id === operator.id))
    )
  );
  const isClaimedByOther = false;
  const isAssignedToOther = Boolean(
    reviewerName && !isClaimedByMe
  );

  if (loading && !caseItem?.id) {
    return (
      <Loader
        fullPage
        message="Loading Case Details..."
        subtext="Fetching live case record, documents, and medical timeline"
      />
    );
  }

  return (
    <div className="case-detail-page">
      {/* Header with Back link, Case ID, Badge, and Action Buttons */}
      <div className="case-detail-header">

        {/* Row 1: Back Button */}
        <Link to="/admin/cases" className="back-escalations-btn">
          <ArrowLeft size={16} />
          <span>Back to Case Queue</span>
        </Link>

        {/* Row 2: Case ID + Status (left) | Action Buttons (right) */}
        <div className="detail-header-row">
          <div className="detail-title-wrap">
            <h1 className="case-detail-id">{caseItem.id}</h1>
            <span className={`case-status-badge ${statusBadgeClass}`}>{displayHeaderStatus}</span>

            {/* Admin Assignment Status */}
            {(() => {
              const currentAdminName = operator?.name || 'Admin';
              const reviewerName = caseItem.reviewedByAdminName || caseItem.reviewed_by_admin_name;
              const isClaimedByMe = reviewerName && (
                reviewerName.toLowerCase().trim() === currentAdminName.toLowerCase().trim() ||
                (operator?.id && (caseItem.reviewedByAdminId === operator.id || caseItem.reviewed_by_admin_id === operator.id))
              );

              if (isClaimedByMe) {
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      👤 Assigned: You ({currentAdminName})
                    </span>
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleUnclaimCase(caseItem.id)}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        title="Unassign case back to unassigned queue"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                );
              }

              if (reviewerName) {
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      👤 Assigned: {reviewerName}
                    </span>
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
                        style={{
                          border: '1px solid #86efac',
                          background: '#ffffff',
                          color: '#166534',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title={`Reassign this case to you (${currentAdminName})`}
                      >
                        Reassign to Me
                      </button>
                    )}
                  </div>
                );
              }

              if (isClosed) {
                return (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    👤 Case Closed
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
                  style={{
                    border: '1.5px solid #0284c7',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  title="Assign this case to yourself"
                >
                  + Assign to Me
                </button>
              );
            })()}
          </div>

          <div className="detail-action-buttons">
            {/* Contact Citizen (Applicant) Phone */}
            <button
              className="btn-detail-call"
              title="Call Applicant / Patient"
              onClick={() =>
                setActiveModal({
                  type: 'call',
                  payload: {
                    ...caseItem,
                    callTarget: 'applicant',
                    phoneToCall: caseItem.applicantPhone || caseItem.contact || '90765 43210'
                  }
                })
              }
            >
              <Phone size={15} />
              <span>Call Applicant</span>
            </button>

            {/* Contact Relative / Emergency Contact */}
            <button
              className="btn-detail-call-relative"
              title="Call Relative / Emergency Contact"
              onClick={() =>
                setActiveModal({
                  type: 'call',
                  payload: {
                    ...caseItem,
                    callTarget: 'relative',
                    phoneToCall: caseItem.relativePhone || caseItem.relativeContact || '98765 88990'
                  }
                })
              }
            >
              <Phone size={15} />
              <span>Call Relative</span>
            </button>

            {/* Contact Assigned ArogyaSevak */}
            <button
              className="btn-detail-call-sevak"
              title="Call Assigned ArogyaSevak"
              onClick={() =>
                setActiveModal({
                  type: 'call',
                  payload: {
                    ...caseItem,
                    callTarget: 'sevak',
                    phoneToCall: caseItem.sevakPhone || '91234 56789',
                    calleeName: caseItem.assignedSevak || 'ArogyaSevak'
                  }
                })
              }
            >
              <UserCheck size={15} />
              <span>Call ArogyaSevak</span>
            </button>

            {/* If Claimed by another Admin, lock actions in Read-Only Mode */}
            {isClaimedByOther ? (
              <div
                className="badge-cancelled-lock"
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  fontWeight: '700',
                  padding: '7px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px'
                }}
                title={`This case is claimed and under review by Admin ${reviewerName}. You have read-only access.`}
              >
                <ShieldCheck size={16} color="#d97706" />
                <span>🔒 Read-Only Mode (Claimed by {reviewerName})</span>
              </div>
            ) : (isClosed || (isRejected && !reopenInfo.isReopenable)) ? (
              <div className="badge-cancelled-lock">
                <ShieldCheck size={15} />
                <span>Case Locked ({caseItem.status})</span>
              </div>
            ) : isRejected && reopenInfo.isReopenable ? (
              <button
                className="btn-detail-status"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => {
                  reopenCase(caseItem.id);
                }}
                title={`Reopen Case (${reopenInfo.daysRemaining} days remaining in 60-day window)`}
              >
                <RotateCcw size={15} />
                <span>Reopen Case ({reopenInfo.daysRemaining}d Left)</span>
              </button>
            ) : (
              <>
                {/* Direct Status Update Button */}
                <button
                  className="btn-detail-status"
                  onClick={() => setActiveModal({ type: 'update-status', payload: caseItem })}
                >
                  <CheckSquare size={15} />
                  <span>Update Status</span>
                </button>

                {/* Reject Case Option */}
                {!isApproved && !isClosed && (
                  <button
                    className="btn-detail-status"
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                    onClick={() => setActiveModal({ type: 'reject-case', payload: caseItem })}
                  >
                    <X size={15} />
                    <span>Reject Case</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Informational Banner if assigned to another Admin */}
        {isAssignedToOther && !isClosed && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderLeft: '5px solid #16a34a',
              borderRadius: '8px',
              padding: '12px 18px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              color: '#14532d',
              fontSize: '0.85rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#166534', fontSize: '0.9rem' }}>👤 Assigned to Admin {reviewerName} (Multi-Admin Collaboration Active)</strong>
                <div style={{ marginTop: '2px', color: '#15803d' }}>
                  All administrators can process, update statuses, verify documents, and add notes. Any changes made will be logged with your admin identity.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleClaimCase(caseItem.id, currentAdminName)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#ffffff',
                color: '#166534',
                border: '1.5px solid #86efac',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reassign to Me
            </button>
          </div>
        )}
      </div>

      {/* SLA Action Required Escalation Alert Banner */}
      {!isClosed && !isApproved && caseItem.lastReminderSentAt && (
        <div
          className="case-sla-escalation-banner"
          style={{
            background: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderLeft: '5px solid #e11d48',
            color: '#881337',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#e11d48', color: '#ffffff', borderRadius: '50%', padding: '6px', display: 'flex' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#9f1239' }}>
                🚨 Action Required: Citizen SLA Reminder Received ({caseItem.priority || 'HIGH'} Priority)
              </strong>
              <div style={{ fontSize: '0.82rem', color: '#be123c', marginTop: '2px' }}>
                The citizen applicant sent an urgent reminder on {new Date(caseItem.lastReminderSentAt).toLocaleString('en-IN')}. Please review documents, assign scheme/hospital, or coordinate immediately.
              </div>
            </div>
          </div>
          {!isClaimedByOther ? (
            <button
              type="button"
              className="btn-detail-status"
              style={{ background: '#e11d48', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setActiveModal({ type: 'update-status', payload: caseItem })}
            >
              Take Action Now
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#9f1239', fontWeight: '700', background: '#fee2e2', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
              🔒 Under Review by {reviewerName}
            </span>
          )}
        </div>
      )}

      {/* Case Closure Requested by Sevak Banner */}
      {!isClosed && isClosureRequested && (
        <div
          className="case-closure-requested-banner"
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderLeft: '5px solid #d97706',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ background: '#d97706', color: '#ffffff', borderRadius: '50%', padding: '6px', display: 'flex', flexShrink: 0 }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: '#92400e' }}>
                  ⏳ Case Closure Requested by Arogya Sevak ({caseItem.assignedSevak || 'Assigned Sevak'})
                </strong>
                <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                  Awaiting Admin Approval
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#78350f' }}>
                <strong>Sevak Note / Reason:</strong> &ldquo;{
                  caseItem.closureRequestReason ||
                  caseItem.remarks ||
                  caseItem.treatmentProgress?.notes ||
                  caseItem.treatment_progress?.notes ||
                  'Patient treatment/consultation has concluded or patient did not respond after follow-up period. Sevak requested case closure.'
                }&rdquo;
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
              }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to approve and officially close this case?')) {
                  await updateCaseStatus(caseItem.id, 'CLOSED', 'Case closure approved and finalized by District Health Administrator');
                }
              }}
            >
              <Check size={16} />
              <span>Approve & Final Close Case</span>
            </button>
          </div>
        </div>
      )}

      {/* Case Closed / Resolved Success Banner */}
      {isClosed && (
        <div
          className="case-rejected-banner"
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderLeft: '5px solid #166534',
            color: '#14532d'
          }}
        >
          <Check size={20} color="#166534" />
          <div>
            <strong>Case Resolved & Closed:</strong>
            <span> This case has been officially completed and closed. No further status updates or document requests can be performed.</span>
          </div>
        </div>
      )}

      {/* Case Rejected Alert Banner */}
      {!isClosed && isRejected && (
        <div
          className="case-rejected-banner"
          style={{
            background: reopenInfo.reopenRequested ? '#fefce8' : (reopenInfo.isReopenable ? '#eff6ff' : '#fef2f2'),
            border: `1px solid ${reopenInfo.reopenRequested ? '#fde047' : (reopenInfo.isReopenable ? '#bfdbfe' : '#fecaca')}`,
            borderLeft: `5px solid ${reopenInfo.reopenRequested ? '#eab308' : (reopenInfo.isReopenable ? '#2563eb' : '#dc2626')}`,
            color: reopenInfo.reopenRequested ? '#713f12' : (reopenInfo.isReopenable ? '#1e40af' : '#991b1b'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <AlertCircle size={22} color={reopenInfo.reopenRequested ? '#ca8a04' : (reopenInfo.isReopenable ? '#1d4ed8' : '#b91c1c')} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.92rem' }}>Case Status: {reopenInfo.displayStatus}</strong>
                {reopenInfo.reopenRequested && (
                  <span style={{ background: '#ca8a04', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                    🚨 Citizen Reopen Request Pending
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '3px' }}>
                {reopenInfo.reopenRequested ? (
                  <span>
                    <strong>Citizen Reason:</strong> &ldquo;{reopenInfo.reopenRequestReason || caseItem.reopenRequestReason || 'Citizen requested re-evaluation of this rejected application within the 60-day eligibility window.'}&rdquo;
                  </span>
                ) : reopenInfo.isReopenable ? (
                  `— This case was rejected, but remains eligible for reopening and re-review within 60 days (${reopenInfo.daysRemaining} days remaining). Only Admin has authority to reopen the case.`
                ) : (
                  `— The 60-day reopen window has expired. Status automatically converted to Closed.`
                )}
              </div>
            </div>
          </div>
          {reopenInfo.isReopenable && (
            <button
              className="btn-detail-status"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => reopenCase(caseItem.id)}
            >
              <RotateCcw size={15} />
              <span>{reopenInfo.reopenRequested ? 'Approve & Reopen Case' : `Reopen Case (${reopenInfo.daysRemaining}d Left)`}</span>
            </button>
          )}
        </div>
      )}

      {/* Horizontal Case Timeline Card — Displayed ABOVE Applicant Details */}
      <div className="detail-card horizontal-timeline-card">
        <div style={{ marginBottom: '16px' }}>
          <h3 className="section-card-title" style={{ margin: 0 }}>Case Timeline & Review Progress</h3>
        </div>

        <div className="hz-timeline-stepper">
          {(() => {
            const sUpper = String(caseItem?.status || caseItem?.current_status || '').toUpperCase().trim().replace(/[-\s/]+/g, '_');
            const isClosed = ['CLOSED', 'COMPLETED', 'DISCHARGED', 'CLOSED_EXPIRED'].includes(sUpper) || Boolean(caseItem?.isClosed);
            const isRejected = sUpper === 'REJECTED' || reopenInfo.isRejected;

            // Check if this case is an Approved / Assigned case (or in Treatment)
            const isApprovedCase =
              ['APPROVED', 'COORDINATED', 'HOSPITAL_SEVAK_ASSIGNED', 'SEVAK_HOSPITAL_ASSIGNED', 'ASSIGNED', 'SEVAK_ASSIGNED', 'TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT', 'POST_OP_RECOVERY'].some((s) => sUpper.includes(s)) ||
              Boolean(caseItem?.isTransferred) ||
              Boolean(hasHospitalAssigned) ||
              caseItem?.status === 'Approved' ||
              caseItem?.status === 'Hospital, Sevak Assigned' ||
              caseItem?.status === 'Treatment Started' ||
              caseItem?.status === 'Bill Resolved & Approved' ||
              caseItem?.status === 'Reassigned & Coordinated';

            const isTreatmentStarted =
              ['TREATMENT_STARTED', 'ACTIVE', 'IN_TREATMENT', 'POST_OP_RECOVERY'].some((s) => sUpper.includes(s)) ||
              caseItem?.status === 'Treatment Started';

            // Check if documents are requested from ArogyaSevak (post-approval doc request)
            const hasSevakDocsRequested = (caseItem?.documents || []).some((d) => {
              const isExplicitlyRequested = Boolean(
                d.requested ||
                d.status === 'PENDING_SEVAK_UPLOAD' ||
                d.document_status === 'PENDING_SEVAK_UPLOAD' ||
                d.status === 'REQUESTED' ||
                d.document_status === 'REQUESTED'
              );
              const isNotUploaded = !d.uploaded && (!d.file || d.file === 'Pending Upload' || d.file === '') && !d.fileUrl && !d.file_url && !d.document_url && !d.url;
              const isNotVerified = !d.verified && d.status !== 'VERIFIED' && d.document_status !== 'VERIFIED';
              const isFromSevak = d.requestedFrom === 'sevak' || d.requestedFrom === 'ArogyaSevak' || d.requested_from === 'SEVAK' || (isApprovedCase && isExplicitlyRequested);

              return isExplicitlyRequested && isNotUploaded && isNotVerified && isFromSevak;
            });

            // Pre-approval hold check (initial intake review)
            const isPreApprovalHold =
              !isApprovedCase &&
              (caseItem?.isOnHold ||
                ['DOCS_REQUIRED', 'ON_HOLD', 'REVERTED'].some((s) => sUpper.includes(s)) ||
                (caseItem?.documents || []).some((d) => d.requested && !d.verified));

            let stepList = [];
            let activeStep = 1;

            if (isApprovedCase) {
              if (hasSevakDocsRequested) {
                if (isTreatmentStarted) {
                  // Scenario: Treatment Started -> Then requested docs from Sevak
                  stepList = [
                    { num: 1, label: 'Application Received' },
                    { num: 2, label: 'Documents Verified' },
                    { num: 3, label: 'Hospital & Sevak Assigned' },
                    { num: 4, label: 'Treatment Started' },
                    { num: 5, label: 'Documents (On Hold ⏳)', isOnHold: true },
                    { num: 6, label: isRejected ? 'Case Rejected ✕' : 'Closed / Discharged' }
                  ];
                  activeStep = isClosed || isRejected ? 6 : 5;
                } else {
                  // Scenario: Approved (Hospital & Sevak Assigned) -> Then requested docs from Sevak
                  stepList = [
                    { num: 1, label: 'Application Received' },
                    { num: 2, label: 'Documents Verified' },
                    { num: 3, label: 'Hospital & Sevak Assigned' },
                    { num: 4, label: 'Documents (On Hold ⏳)', isOnHold: true },
                    { num: 5, label: 'Treatment Started' },
                    { num: 6, label: isRejected ? 'Case Rejected ✕' : 'Closed / Discharged' }
                  ];
                  activeStep = isClosed || isRejected ? 6 : 4;
                }
              } else {
                // Scenario: Approved case without doc request (Clean standard 5 steps)
                stepList = [
                  { num: 1, label: 'Application Received' },
                  { num: 2, label: 'Documents Verified' },
                  { num: 3, label: 'Hospital & Sevak Assigned' },
                  { num: 4, label: 'Treatment Started' },
                  { num: 5, label: isRejected ? 'Case Rejected ✕' : 'Closed / Discharged' }
                ];
                if (isClosed || isRejected) activeStep = 5;
                else if (isTreatmentStarted) activeStep = 4;
                else activeStep = 3;
              }
            } else {
              // Pre-approval / standard intake cases (Keep original flow)
              stepList = [
                { num: 1, label: 'Application Received' },
                {
                  num: 2,
                  label: isPreApprovalHold ? 'Documents (On Hold ⏳)' : 'Documents Verified',
                  isOnHold: isPreApprovalHold
                },
                { num: 3, label: 'Hospital & Sevak Assigned' },
                { num: 4, label: 'Treatment Started' },
                {
                  num: 5,
                  label: isRejected ? 'Case Rejected ✕' : 'Closed / Discharged'
                }
              ];
              if (isClosed || isRejected) activeStep = 5;
              else if (
                sUpper === 'DOCS_VERIFIED' ||
                sUpper === 'DOCUMENTS_VERIFIED' ||
                sUpper === 'DOC_VERIFIED' ||
                sUpper === 'UNDER_REVIEW' ||
                sUpper === 'IN_REVIEW' ||
                isPreApprovalHold ||
                (caseItem?.documents || []).some((d) => d.verified)
              )
                activeStep = 2;
              else activeStep = 1;
            }

            const isCurrentStepOnHold = stepList.find((s) => s.num === activeStep)?.isOnHold;

            const handleStepClick = async (targetStepNum) => {
              if (isRejected) {
                showToast('🔒 Case is currently Rejected. Reopen the case first to advance review progress.', 'warning');
                return;
              }
              if (isClosed) {
                showToast('🔒 Case is closed. Status cannot be modified.', 'warning');
                return;
              }
              if (isCurrentStepOnHold) {
                showToast('🔒 Case is On Hold (Docs Required). Status cannot be updated until requested documents are uploaded & verified.', 'warning');
                return;
              }
              if (targetStepNum <= activeStep) {
                showToast('🔒 Forward step progression only! Cannot reverse to previous completed stages.', 'warning');
                return;
              }

              const targetStepObj = stepList.find((s) => s.num === targetStepNum);
              if (!targetStepObj) return;

              let newStatusToSet = 'DOCS_VERIFIED';
              if (targetStepObj.label.includes('Hospital & Sevak')) newStatusToSet = 'COORDINATED';
              else if (targetStepObj.label.includes('Treatment Started')) newStatusToSet = 'TREATMENT_STARTED';
              else if (targetStepObj.label.includes('Closed')) newStatusToSet = 'CLOSED';
              else if (targetStepObj.label.includes('Documents Verified')) newStatusToSet = 'DOCS_VERIFIED';

              const targetId = caseItem?.id || caseItem?.uuid || caseItem?.caseId || id;
              await updateCaseStatus(targetId, newStatusToSet);
              const displayStatusName =
                newStatusToSet === 'TREATMENT_STARTED'
                  ? 'Treatment Started'
                  : newStatusToSet === 'COORDINATED'
                    ? 'Hospital, Sevak Assigned'
                    : newStatusToSet === 'CLOSED'
                      ? 'Closed'
                      : 'Docs Verified';
              setFetchedCase((prev) => (prev ? { ...prev, status: displayStatusName, current_status: newStatusToSet } : prev));
              showToast(`⚡ Progress updated forward to: "${displayStatusName}"`, 'success');
            };

            return stepList.map((st, idx) => {
              const isFinalStep = activeStep === stepList.length;
              const isCompleted = st.num < activeStep || (st.num === activeStep && (isFinalStep || isClosed));
              const isActive = st.num === activeStep && !isFinalStep && !isClosed;
              const isLast = idx === stepList.length - 1;
              const isRejectedNode = isRejected && st.num === activeStep;

              return (
                <React.Fragment key={st.num}>
                  <div
                    className="hz-timeline-step"
                    style={{ cursor: isCurrentStepOnHold || isClosed ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleStepClick(st.num)}
                    title={
                      isClosed
                        ? 'Case is closed. Status cannot be modified.'
                        : isCurrentStepOnHold
                          ? '🔒 On Hold: Pending requested document upload & verification'
                          : st.num <= activeStep
                            ? 'Completed stage (Reverse progression restricted)'
                            : `Click to advance case progress to Step ${st.num}`
                    }
                  >
                    <div
                      className={`hz-timeline-node ${isRejectedNode
                        ? 'hz-node-rejected'
                        : isCompleted
                          ? 'hz-node-completed'
                          : isActive
                            ? 'hz-node-current'
                            : 'hz-node-pending'
                        }`}
                    >
                      {isRejectedNode ? (
                        <X size={14} />
                      ) : st.isOnHold ? (
                        <span style={{ fontSize: '13px' }}>⏳</span>
                      ) : isCompleted ? (
                        <Check size={14} className="hz-node-check" />
                      ) : (
                        st.num
                      )}
                    </div>
                    <div className="hz-timeline-info">
                      <span className={`hz-timeline-title ${isActive ? 'title-current' : isCompleted ? 'text-green font-bold' : ''}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  {!isLast && <div className={`hz-timeline-line ${(isCompleted || isActive) ? 'line-completed' : ''}`}></div>}
                </React.Fragment>
              );
            });
          })()}
        </div>
      </div>

      {/* Admin Action & Activity History Card */}
      {(() => {
        const actionLogs = [];
        const seenKeys = new Set();
        const applicantName = String(caseItem.applicant || caseItem.patientName || caseItem.name || caseItem.applicant_name || '').trim().toLowerCase();

        const isCitizenOrSystem = (name, role, actionTitle = '') => {
          const n = String(name || '').trim().toLowerCase();
          const r = String(role || '').trim().toLowerCase();
          const a = String(actionTitle || '').trim().toLowerCase();

          // Explicit citizen/system role
          if (r === 'citizen' || r === 'patient' || r === 'applicant' || r === 'system') return true;

          // Explicit citizen/system name
          if (n === 'citizen' || n === 'patient' || n === 'applicant' || n === 'system' || n === 'user') return true;
          if (applicantName && (n === applicantName || (applicantName.length > 3 && (n.includes(applicantName) || applicantName.includes(n))))) {
            return true;
          }

          // Initial citizen submission / upload actions
          if (
            a.includes('application submitted') ||
            a.includes('application received') ||
            a.includes('application created') ||
            a.includes('form submitted') ||
            a.includes('citizen upload') ||
            a.includes('documents uploaded') ||
            a.includes('document uploaded') ||
            a.includes('registration complete')
          ) {
            if (!n.includes('admin')) return true;
          }

          return false;
        };

        const seenDetails = new Set();
        const normalizeStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const addAction = (item) => {
          if (!item) return;
          const key = item.id ? `id_${item.id}` : `${item.action || item.title || ''}_${item.detail || ''}_${item.admin || item.by || ''}`;
          if (seenKeys.has(key)) return;

          const dNorm = normalizeStr(item.detail || item.action || '');
          if (dNorm && dNorm.length > 5) {
            for (const seen of seenDetails) {
              if (
                seen === dNorm ||
                (dNorm.includes('alldocument') && seen.includes('alldocument')) ||
                (dNorm.includes('docsverified') && seen.includes('alldocument')) ||
                (seen.includes('docsverified') && dNorm.includes('alldocument')) ||
                (dNorm.length > 15 && seen.length > 15 && (dNorm.includes(seen) || seen.includes(dNorm)))
              ) {
                return;
              }
            }
            seenDetails.add(dNorm);
          }
          seenKeys.add(key);

          // Calculate numeric timestamp for descending sort (newest at top)
          let parsedTime = 0;
          if (item.rawTimestamp) {
            const t = new Date(item.rawTimestamp).getTime();
            if (!isNaN(t)) parsedTime = t;
          } else if (item.date && item.date !== 'Recent' && item.date !== 'Recently') {
            const t = new Date(item.date).getTime();
            if (!isNaN(t)) parsedTime = t;
          } else if (item.time && item.time.includes('/')) {
            const t = new Date(item.time).getTime();
            if (!isNaN(t)) parsedTime = t;
          }

          if (!parsedTime) {
            if (item.time === 'Just now' || item.date === 'Just now') {
              parsedTime = Date.now() + 1000;
            } else if (item.time === 'Recently' || item.date === 'Recently') {
              parsedTime = Date.now();
            }
          }

          actionLogs.push({ ...item, timestamp: parsedTime });
        };

        // 1. From status_history / statusHistory (Admin changes only)
        const rawHistory = caseItem.status_history || caseItem.statusHistory || [];
        if (Array.isArray(rawHistory)) {
          rawHistory.forEach((sh, idx) => {
            const adminName = sh.by || sh.adminName || sh.changed_by_name || sh.author_name;
            const role = sh.role || sh.changed_by_role;
            const rawStatus = sh.new_status || sh.title || 'Updated';
            const actionTitle = rawStatus === 'DOCS_VERIFIED' ? 'Docs Verified' : (rawStatus === 'COORDINATED' ? 'Hospital & Sevak Assigned' : rawStatus);

            if (isCitizenOrSystem(adminName, role, actionTitle)) return;
            const displayAdmin = adminName && !['citizen', 'system', 'user'].includes(String(adminName).toLowerCase()) ? adminName : 'Admin';

            const rawTs = sh.created_at || sh.date;
            const remarkText = sh.description || sh.remark || '';
            let formattedAction = `Status Updated: ${actionTitle}`;
            let formattedDetail = remarkText || `Status changed to ${actionTitle}`;

            if (rawStatus === 'DOCS_VERIFIED' || rawStatus === 'Docs Verified' || remarkText.toLowerCase().includes('all documents verified')) {
              formattedAction = 'All Documents Verified';
              formattedDetail = 'All uploaded citizen documents verified by Admin ✓';
            } else if (remarkText.startsWith('Verified: ') || remarkText.includes('Verified document')) {
              formattedAction = 'Document Verified';
              formattedDetail = remarkText;
            }

            addAction({
              id: sh.id || `sh-${idx}`,
              action: formattedAction,
              detail: formattedDetail,
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: sh.time || (rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently'),
              date: sh.date || (rawTs ? new Date(rawTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'),
            });
          });
        }

        // 2. From timeline (Admin steps only)
        if (Array.isArray(caseItem.timeline)) {
          caseItem.timeline.forEach((t, idx) => {
            const adminName = t.by || t.adminName;
            const role = t.role;
            const actionTitle = t.title || '';

            if (isCitizenOrSystem(adminName, role, actionTitle)) return;
            const displayAdmin = adminName && !['citizen', 'system', 'user'].includes(String(adminName).toLowerCase()) ? adminName : 'Admin';

            const rawTs = t.date || t.created_at;
            addAction({
              id: t.id || `tl-${idx}`,
              action: t.title || 'Action Performed',
              detail: t.description || t.title || '',
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: t.time || (rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently'),
              date: t.date || 'Recent',
            });
          });
        }

        // 3. From adminNotes (Always admin actions, excluding automatic status mirrors)
        if (Array.isArray(caseItem.adminNotes)) {
          caseItem.adminNotes.forEach((an, idx) => {
            const adminName = an.by || an.author_name || 'Admin';
            if (isCitizenOrSystem(adminName, null, 'Admin Note')) return;
            const noteContent = an.text || an.note || '';
            if (noteContent.toLowerCase().includes('all documents verified')) return; // Mirrors status update
            const rawTs = an.created_at || an.date;
            addAction({
              id: an.id || `an-${idx}`,
              action: `Admin Note Added`,
              detail: noteContent,
              admin: adminName,
              rawTimestamp: rawTs,
              time: an.time || an.date || 'Recently',
              date: an.date || 'Recent',
            });
          });
        }

        // 4. From individual verified documents (Shows exact document title)
        (caseItem.documents || []).forEach((doc, idx) => {
          const isDocVerified = Boolean(
            doc && (
              doc.verified === true ||
              doc.document_status === 'VERIFIED' ||
              doc.status === 'VERIFIED' ||
              (typeof doc.statusText === 'string' && doc.statusText.includes('Verified')) ||
              (typeof doc.verification_remark === 'string' && doc.verification_remark.includes('Verified')) ||
              (typeof doc.verificationRemark === 'string' && doc.verificationRemark.includes('Verified'))
            )
          );
          if (isDocVerified) {
            const rawVerifier = doc.verifiedBy || doc.verified_by || doc.verified_by_name || doc.verified_by_admin_name;
            const displayAdmin = rawVerifier && !['citizen', 'system', 'user', 'applicant'].includes(String(rawVerifier).toLowerCase()) ? rawVerifier : 'Admin';

            const rawTs = doc.verifiedAt || doc.verified_at || doc.uploaded_at || doc.uploadedAt;
            const docName = getCleanDocTitle(doc);
            const tsDate = rawTs ? new Date(rawTs) : null;
            const validDate = tsDate && !isNaN(tsDate.getTime());

            addAction({
              id: `doc-v-${doc.id || doc.docId || doc.file_name || doc.name || idx}`,
              action: `Document Verified: ${docName}`,
              detail: doc.verificationRemark || doc.verification_remark || `Verified: ${docName} ✓`,
              admin: displayAdmin,
              rawTimestamp: rawTs,
              time: validDate ? tsDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              date: validDate ? tsDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            });
          }
        });

        // 5. From Admin Claim/Ownership
        if (caseItem.claimedByAdmin || caseItem.claimed_by_name) {
          const claimAdmin = caseItem.claimed_by_name || caseItem.claimedByAdmin;
          if (!isCitizenOrSystem(claimAdmin, null, 'Case Claimed')) {
            const rawTs = caseItem.claimedAt || caseItem.claimed_at;
            addAction({
              id: 'claim-log',
              action: 'Case Claimed for Review',
              detail: `Assigned review ownership to ${claimAdmin}`,
              admin: claimAdmin,
              rawTimestamp: rawTs,
              time: rawTs ? new Date(rawTs).toLocaleString('en-IN') : 'Recently',
              date: rawTs ? new Date(rawTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            });
          }
        }

        // Sort descending: Newest actions ALWAYS at top!
        actionLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return (
          <div
            className="detail-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🛡️</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Admin Action History & Collaborative Activity Log
                </h4>
                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                  {actionLogs.length} admin action{actionLogs.length !== 1 ? 's' : ''} logged
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Recent actions appear at the top · Only admin actions are tracked here
              </div>
            </div>

            {actionLogs.length === 0 ? (
              <div
                style={{
                  padding: '20px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.82rem'
                }}
              >
                <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '6px' }}>🛡️</span>
                <strong style={{ color: '#334155' }}>No administrator actions recorded yet</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Actions performed by administrators (such as status updates, document verifications, assignments, and notes) will be tracked and displayed here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {actionLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '9px 12px',
                      background: idx === 0 ? '#f0fdf4' : '#ffffff',
                      border: idx === 0 ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                      borderRadius: '8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#dcfce7' : '#dbeafe',
                          color: idx === 0 ? '#15803d' : '#1d4ed8',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {log.admin ? log.admin.substring(0, 2).toUpperCase() : 'AD'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                          <span style={{ color: '#475569' }}>by</span>
                          <span style={{ color: '#1e40af', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            👤 {log.admin}
                          </span>
                          {idx === 0 && (
                            <span style={{ background: '#16a34a', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                              Latest
                            </span>
                          )}
                        </div>
                        {log.detail && log.detail !== log.action && (
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.detail}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', flexShrink: 0, textAlign: 'right', fontWeight: idx === 0 ? 700 : 500 }}>
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ArogyaSevak Real-Time Ward & Clinical Progress Card */}
      {(() => {
        const assignedSevakName = caseItem?.assignedSevak?.name || caseItem?.sevakName || (typeof caseItem?.assignedSevak === 'string' && caseItem.assignedSevak !== 'Not assigned' && caseItem.assignedSevak !== '-' && caseItem.assignedSevak !== '—' ? caseItem.assignedSevak : null);
        const sevakDisplayName = assignedSevakName || 'Akanksha Pawashe';

        // The Sevak reported status must ONLY be the clinical treatment progress stage updated by the assigned ArogyaSevak
        // and NEVER any admin workflow status (such as Approved, Treatment Started, Docs Verified, Closed, Submitted, etc.)
        const adminWorkflowStatuses = [
          'APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_REQUIRED', 'REJECTED',
          'CLOSED', 'DOCS_VERIFIED', 'COORDINATED', 'TREATMENT_STARTED',
          'HOSPITAL_SEVAK_ASSIGNED', 'SEVAK_HOSPITAL_ASSIGNED', 'ASSIGNED',
          'ON_HOLD', 'HOLD', 'REVERTED', 'PENDING_REVIEW', 'IN_REVIEW',
          'APPLICATION_RECEIVED', 'PENDING', 'ACTIVE'
        ];

        const nonAdminStatus = (val) => {
          if (!val) return null;
          const s = String(val).trim().toUpperCase().replace(/[-\s/]+/g, '_');
          if (adminWorkflowStatuses.some(adminS => s === adminS || s.includes(adminS))) {
            return null;
          }
          return val;
        };

        const sevakStatus =
          nonAdminStatus(caseItem?.treatmentStage) ||
          nonAdminStatus(caseItem?.treatment_stage) ||
          nonAdminStatus(caseItem?.sevakReportedStatus) ||
          nonAdminStatus(caseItem?.sevak_reported_status) ||
          nonAdminStatus(sevakPatientData?.treatmentStage) ||
          nonAdminStatus(sevakPatientData?.treatment_stage) ||
          nonAdminStatus(sevakPatientData?.sevakReportedStatus) ||
          'Admitted';

        const lastUpdatedStr = caseItem?.sevakLastUpdatedAt
          ? new Date(caseItem.sevakLastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (sevakPatientData?.lastUpdated || 'Just now');

        // Only include clinical notes / ward entries authored by the ArogyaSevak (never admin notes)
        const isSevakClinicalEntry = (item) => {
          if (!item) return false;
          const text = String(item.update || item.note || '').trim();
          if (!text) return false;
          if (text.startsWith('[ADMIN') || text.includes('[DOCUMENT REQUEST') || text.includes('[ADMIN NOTICE]')) {
            return false;
          }
          return true;
        };

        const sevakHistory = [
          ...(caseItem?.updateHistory || []),
          ...(sevakPatientData?.updateHistory || []),
          ...(sevakPatientData?.clinicalNotes || [])
        ].filter(isSevakClinicalEntry);

        const rawLatestEntry = sevakHistory[0] || (isSevakClinicalEntry({ update: caseItem?.latestWardUpdate }) ? {
          update: caseItem.latestWardUpdate,
          by: sevakDisplayName,
          date: 'Just now'
        } : (isSevakClinicalEntry({ update: sevakPatientData?.latestWardUpdate }) ? {
          update: sevakPatientData.latestWardUpdate,
          by: sevakDisplayName,
          date: 'Just now'
        } : null));

        const latestEntry = rawLatestEntry ? {
          ...rawLatestEntry,
          by: rawLatestEntry.by || sevakDisplayName
        } : null;

        return (
          <div
            className="detail-card sevak-progress-card"
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '18px 22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#0284c7', color: '#ffffff', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0369a1' }}>
                    ArogyaSevak Live Ward Updates — {sevakDisplayName}
                  </h4>
                  <span style={{ fontSize: '0.775rem', color: '#0284c7' }}>
                    Real-time bed monitoring & hospital ward status reported from patient unit · Last update: {lastUpdatedStr}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: '700', color: '#0369a1', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #7dd3fc', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  👤 Sevak Reported Status: <strong style={{ color: '#0284c7' }}>{sevakStatus}</strong>
                </span>
              </div>
            </div>

            {latestEntry && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e0f2fe', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Latest Clinical Ward Entry by ArogyaSevak:
                </span>
                <div style={{ fontSize: '0.85rem', color: '#0c4a6e', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd', fontWeight: '500', lineHeight: '1.45' }}>
                  💬 "{latestEntry.update}"
                  <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                    Reported by {sevakDisplayName} · {latestEntry.date || 'Recently'}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Reassigned Case Dual Sevak Handover & Intake Banner */}
      {caseItem.previousSevak && (() => {
        const prevSevakDisplay = typeof caseItem.previousSevak === 'object' && caseItem.previousSevak !== null
          ? (caseItem.previousSevak.name || caseItem.previousSevak.sevak_name || caseItem.previousSevak.full_name || 'Previous ArogyaSevak')
          : String(caseItem.previousSevak || 'Previous ArogyaSevak');

        const assignedSevakDisplay = typeof caseItem.assignedSevak === 'object' && caseItem.assignedSevak !== null
          ? (caseItem.assignedSevak.name || caseItem.assignedSevak.sevak_name || caseItem.assignedSevak.full_name || 'ArogyaSevak')
          : String(caseItem.assignedSevak || caseItem.assigned_sevak || 'Om Kolekar');

        const hospitalDisplay = typeof caseItem.hospital === 'object' && caseItem.hospital !== null
          ? (caseItem.hospital.name || caseItem.hospital.hospital_name || 'Hospital')
          : String(caseItem.hospital || caseItem.assigned_hospital || 'Assigned Hospital');

        return (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderLeft: '5px solid #16a34a',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#16a34a', color: '#ffffff', padding: '7px', borderRadius: '50%', display: 'flex' }}>
                  <UserCheck size={18} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#14532d' }}>
                  🔀 Specialty Re-Assignment & Telemetry Handover
                </h4>
              </div>
              <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>
                ✓ Sevak Handover Active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }} className="sevak-handover-dual-grid">
              {/* Old Sevak Notice Box */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderLeft: '4px solid #64748b', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '3px' }}>
                  🚨 Previous ArogyaSevak (Released)
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                  <span style={{ textDecoration: 'line-through' }}>{prevSevakDisplay}</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                  Received handover notification. Case transferred due to specialty availability.
                </div>
              </div>

              {/* New Sevak Active Management Box */}
              <div style={{ background: '#ffffff', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#15803d', textTransform: 'uppercase', marginBottom: '3px' }}>
                  📥 New ArogyaSevak (Active Handling)
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#14532d' }}>
                  👤 {assignedSevakDisplay} ({hospitalDisplay})
                </div>
                <div style={{ fontSize: '0.775rem', color: '#166534', marginTop: '3px', lineHeight: '1.4' }}>
                  Assigned to handle all further admission, treatment, and clinical coordination processes.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Structured Applicant, Relative, Patient & Case Details Summary Card */}
      {(() => {
        const formatAddressDisplay = (data) => {
          if (!data) return '';
          if (typeof data === 'string') {
            data = { addressLine: data };
          }

          const rawLine = (data.addressLine || data.address_line || data.address || '').trim();
          const rawVillage = (data.village || data.villageCity || data.area || '').trim();
          const rawCity = (data.city || '').trim();
          const rawTaluka = (data.taluka || '').trim();
          const rawDistrict = (data.district || '').trim();
          const rawPin = (data.pincode || data.pin || '').trim();

          let extractedPin = rawPin;
          const pinMatch = rawLine.match(/\b(\d{6})\b/);
          if (pinMatch) {
            extractedPin = pinMatch[1];
          }

          const rawSegments = rawLine
            ? rawLine.split(',').map(s => s.trim()).filter(Boolean)
            : [];

          const segments = [];
          for (let seg of rawSegments) {
            seg = seg.replace(/\b\d{6}\b/g, '').replace(/pin\s*[-:]?\s*/gi, '').trim();
            if (seg) segments.push(seg);
          }

          if (rawDistrict && segments.length > 0) {
            const distRegex = new RegExp(`^${rawDistrict}\\s+`, 'i');
            if (distRegex.test(segments[0]) && segments[0].length > rawDistrict.length + 2) {
              segments[0] = segments[0].replace(distRegex, '').trim();
            }
          }

          const containsTerm = (term) => {
            if (!term) return true;
            const clean = term.toLowerCase().replace(/\s*taluka\s*/gi, '').replace(/\s*district\s*/gi, '').trim();
            if (!clean) return true;
            return segments.some(s => {
              const sClean = s.toLowerCase();
              return sClean === clean || sClean.includes(clean) || clean.includes(sClean);
            });
          };

          if (rawVillage && !containsTerm(rawVillage)) {
            segments.push(rawVillage);
          }
          if (rawCity && rawCity.toLowerCase() !== rawDistrict.toLowerCase() && !containsTerm(rawCity)) {
            segments.push(rawCity);
          }
          if (rawTaluka && !containsTerm(rawTaluka)) {
            const talukaStr = rawTaluka.toLowerCase().endsWith('taluka') ? rawTaluka : `${rawTaluka} Taluka`;
            segments.push(talukaStr);
          }
          if (rawDistrict && !containsTerm(rawDistrict)) {
            segments.push(rawDistrict);
          }

          const uniqueSegments = [];
          const seenLower = new Set();
          for (const s of segments) {
            const norm = s.toLowerCase().trim();
            if (!norm) continue;
            if (!seenLower.has(norm)) {
              seenLower.add(norm);
              const formattedSeg = s.charAt(0).toUpperCase() + s.slice(1);
              uniqueSegments.push(formattedSeg);
            }
          }

          if (uniqueSegments.length === 0 && rawDistrict) {
            uniqueSegments.push(rawDistrict);
          }

          let formatted = uniqueSegments.join(', ');
          if (extractedPin && !formatted.includes(extractedPin)) {
            formatted = `${formatted} - ${extractedPin}`;
          }

          return formatted || 'Pune';
        };

        const patientDataObj = typeof caseItem.patient === 'object' && caseItem.patient ? caseItem.patient : {};
        const applicantDataObj = typeof caseItem.applicantObj === 'object' && caseItem.applicantObj ? caseItem.applicantObj : (typeof caseItem.applicant === 'object' ? caseItem.applicant : {});
        const relativeDataObj = typeof caseItem.relative === 'object' && caseItem.relative ? caseItem.relative : {};

        const patientFormattedAddress = formatAddressDisplay({
          addressLine: caseItem.addressLine || caseItem.address_line || caseItem.address || patientDataObj.addressLine || patientDataObj.address,
          village: caseItem.village || patientDataObj.village,
          city: caseItem.city || patientDataObj.city,
          taluka: caseItem.taluka || patientDataObj.taluka,
          district: caseItem.district || patientDataObj.district,
          pincode: caseItem.pincode || patientDataObj.pincode,
        });

        const applicantFormattedAddress = formatAddressDisplay({
          addressLine: applicantDataObj.addressLine || applicantDataObj.address || caseItem.applicantAddress,
          village: applicantDataObj.village,
          city: applicantDataObj.city || caseItem.city,
          taluka: applicantDataObj.taluka || caseItem.taluka,
          district: applicantDataObj.district || caseItem.district,
          pincode: applicantDataObj.pincode || caseItem.pincode,
        }) || patientFormattedAddress;

        const relativeFormattedAddress = formatAddressDisplay({
          addressLine: caseItem.relativeAddress || caseItem.relative_address || relativeDataObj.addressLine || relativeDataObj.address,
          village: caseItem.relativeVillage || relativeDataObj.village,
          city: caseItem.relativeCity || relativeDataObj.city,
          taluka: caseItem.relativeTaluka || relativeDataObj.taluka,
          district: caseItem.relativeDistrict || relativeDataObj.district,
          pincode: caseItem.relativePincode || relativeDataObj.pincode,
        }) || (caseItem.relativeAddress ? formatAddressDisplay(caseItem.relativeAddress) : patientFormattedAddress);

        const isSelf = Boolean(
          caseItem.isSelf ||
          (caseItem.patient && caseItem.patient.toLowerCase().includes('(self)')) ||
          (caseItem.applicant && caseItem.patient && caseItem.applicant.trim().toLowerCase() === caseItem.patient.replace(/\(self\)/i, '').trim().toLowerCase())
        );

        return (

          <div className="detail-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="case-detail-top-grid" style={{ display: 'grid', gridTemplateColumns: isSelf ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>

              {/* Row 1: Applicant Details (or Combined Self Patient Details) */}
              {isSelf ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <User size={16} color="#0284c7" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Applicant & Patient Details (Self)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Patient Name:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{caseItem.applicant || caseItem.patient} (Self)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>ABHA Number:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', letterSpacing: '0.02em' }}>
                        {caseItem.abhaNumber || caseItem.abha_number || caseItem.abha || caseItem.patientAbha || caseItem.patient_abha || '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Age & Gender:</span>
                      <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>{caseItem.age} yrs · {caseItem.gender}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Mobile Number:</span>
                      <span style={{ color: '#0284c7', fontWeight: 700, textAlign: 'right' }}>{caseItem.contact || '90765 43210'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Address:</span>
                      <span style={{ color: '#0369a1', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word', lineHeight: '1.35' }}>
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#0284c7' }} />
                        <span>{patientFormattedAddress}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <User size={16} color="#0284c7" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Applicant Details</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Applicant Name:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{caseItem.applicant}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Mobile Number:</span>
                      <span style={{ color: '#0284c7', fontWeight: 700, textAlign: 'right' }}>{caseItem.contact || '90765 43210'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Applicant Address:</span>
                      <span style={{ color: '#0369a1', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word', lineHeight: '1.35' }}>
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#0284c7' }} />
                        <span>{applicantFormattedAddress}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 1/2: Relative / Emergency Contact */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <Phone size={16} color="#0d9488" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Relative / Emergency Contact</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Name:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{caseItem.relativeName || 'Sunita Sharma'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relation:</span>
                    <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>{caseItem.relativeRelation || 'Family'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Mobile:</span>
                    <span style={{ color: '#0d9488', fontWeight: 700, textAlign: 'right' }}>{caseItem.relativeContact || caseItem.relativePhone || '98765 88990'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Relative Address:</span>
                    <span style={{ color: '#0d9488', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word', lineHeight: '1.35' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#0d9488' }} />
                      <span>{relativeFormattedAddress}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Patient & Condition Details (Displayed if NOT self applicant) */}
              {!isSelf && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <UserCheck size={16} color="#4338ca" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Patient & Condition Details</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Patient Name:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{caseItem.patient}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Age & Gender:</span>
                      <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>{caseItem.age} yrs · {caseItem.gender}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Medical Condition:</span>
                      <span style={{ color: '#4338ca', fontWeight: 700, textAlign: 'right' }}>{caseItem.condition}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Patient Location:</span>
                      <span style={{ color: '#0369a1', fontWeight: 700, textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', wordBreak: 'break-word' }}>
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px' }} /> {patientFormattedAddress}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Row 2: Scheme & Hospital Assignment (Positioned below top cards, full width) */}
            {(() => {
              const rawHosp = caseItem.hospital || caseItem.assignedHospital || caseItem.assigned_hospital || caseItem.hospitalName || caseItem.active_assignment?.hospital_name;
              const isHospAssigned = Boolean(
                rawHosp &&
                rawHosp !== '-' &&
                rawHosp !== '—' &&
                rawHosp !== 'Government Hospital' &&
                rawHosp !== 'Empanelled Hospital' &&
                rawHosp !== 'Not assigned' &&
                rawHosp !== 'Unassigned'
              );

              const svkCandidate = caseItem.assignedSevak || caseItem.sevak || caseItem.assigned_sevak || caseItem.sevakName || caseItem.active_assignment?.sevak_name;
              const rawSvk = typeof svkCandidate === 'string'
                ? svkCandidate
                : (svkCandidate?.sevak_name || svkCandidate?.name || '');
              const isSvkAssigned = Boolean(
                rawSvk &&
                rawSvk !== '-' &&
                rawSvk !== '—' &&
                rawSvk !== 'Not assigned' &&
                rawSvk !== 'Unassigned'
              );

              const isCaseAssignedOrApproved = Boolean(
                isApproved ||
                isHospAssigned ||
                isSvkAssigned ||
                caseItem.status === 'Approved' ||
                caseItem.status === 'Treatment Started' ||
                caseItem.status === 'TREATMENT_STARTED' ||
                caseItem.status === 'Coordinated' ||
                caseItem.status === 'COORDINATED' ||
                caseItem.status === 'Active' ||
                caseItem.status === 'Reassigned & Coordinated' ||
                caseItem.status?.includes('Approved') ||
                caseItem.status?.includes('Bill Resolved')
              );

              const displayCitizenScheme = caseItem.citizenSelectedScheme || caseItem.suggestedScheme?.name || caseItem.appliedScheme || (caseItem.assignedScheme ? (caseItem.originalScheme || caseItem.initialScheme) : null) || caseItem.scheme || 'Mukhyamantri Sahayata Nidhi (CM Relief Fund)';

              const displayAssignedScheme = (caseItem.assignedScheme?.name || (typeof caseItem.assignedScheme === 'string' ? caseItem.assignedScheme : null) || caseItem.assigned_scheme || caseItem.active_assignment?.scheme_name || caseItem.active_assignment?.scheme || (isCaseAssignedOrApproved ? caseItem.scheme : null) || 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)');

              const formatCleanPersonName = (name) => {
                if (!name) return '';
                let str = String(name).trim();
                const matchParen = str.match(/\(([^)]+)\)/);
                if (matchParen && matchParen[1]) {
                  str = matchParen[1].trim();
                }
                str = str.replace(/^(arogya\s*sevak|sevak|dr\.?|mr\.?|mrs\.?)\s*/i, '');
                str = str.split('—')[0].trim();
                return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
              };

              const displayAssignedHospital = matchingEscalation?.assignedNewHospital ||
                ((isHospAssigned && rawHosp !== 'Government Hospital' && rawHosp !== 'Empanelled Hospital')
                  ? rawHosp
                  : (caseItem.assignedHospital && caseItem.assignedHospital !== 'Government Hospital' && caseItem.assignedHospital !== '-' ? caseItem.assignedHospital : (caseItem.active_assignment?.hospital_name || (isCaseAssignedOrApproved ? 'Narhe hospital pune' : '-'))));

              const candidateNewSvk = matchingEscalation?.assignedNewSevak ||
                (isSvkAssigned ? rawSvk : null) ||
                caseItem.active_assignment?.sevak_name ||
                (isCaseAssignedOrApproved ? 'Om Kolekar' : 'Pending Assignment');
              const displayAssignedSevak = formatCleanPersonName(candidateNewSvk) || candidateNewSvk;

              const displaySevakPhone = caseItem.sevakPhone || caseItem.assigned_sevak_phone || caseItem.active_assignment?.sevak_phone || caseItem.sevakContact || (displayAssignedSevak === 'Om Kolekar' ? '8381053553' : '98230 12345');

              const isTransferredCase = Boolean(
                caseItem.isTransferred ||
                caseItem.previousHospital ||
                caseItem.previousSevak ||
                matchingEscalation?.assignedNewHospital ||
                String(caseItem.status || '').toLowerCase().includes('reassigned') ||
                String(caseItem.status || '').toLowerCase().includes('transferred') ||
                String(caseItem.remarks || '').includes('REASSIGNED CASE')
              );

              const displayAdmissionDate = caseItem.admissionDate || caseItem.admission_date || caseItem.visitDate || caseItem.active_assignment?.admission_date;

              let rawPrevHosp =
                (caseItem.previousHospital && String(caseItem.previousHospital).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? caseItem.previousHospital : null) ||
                (caseItem.prevHospital && String(caseItem.prevHospital).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? caseItem.prevHospital : null) ||
                (caseItem.fromHospital && String(caseItem.fromHospital).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? caseItem.fromHospital : null) ||
                (matchingEscalation?.previousHospital && String(matchingEscalation.previousHospital).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? matchingEscalation.previousHospital : null) ||
                (matchingEscalation?.fromHospital && String(matchingEscalation.fromHospital).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? matchingEscalation.fromHospital : null) ||
                (matchingEscalation?.hospitalName && String(matchingEscalation.hospitalName).toLowerCase().trim() !== String(displayAssignedHospital).toLowerCase().trim() ? matchingEscalation.hospitalName : null) ||
                (isTransferredCase ? 'Govind Kale Hospital' : null);

              if (isTransferredCase && (!rawPrevHosp || String(rawPrevHosp).toLowerCase().trim() === String(displayAssignedHospital).toLowerCase().trim())) {
                rawPrevHosp = 'Govind Kale Hospital';
              }

              const lookupHospPhone = (hName) => {
                if (!hName) return null;
                const target = String(hName).toLowerCase().trim();
                const matched = (hospitals || []).find((h) => {
                  const name = String(h.name || '').toLowerCase().trim();
                  return name === target || name.includes(target) || target.includes(name);
                });
                return matched?.phone || matched?.contact_number || matched?.mobile || matched?.contact || (target.includes('govind') ? '020-24451234' : target.includes('narhe') ? '9999999999' : '020-25444000');
              };

              const lookupSvkPhone = (sName) => {
                if (!sName) return null;
                const clean = String(sName).replace(/\s*\(.*?\)/g, '').split('—')[0].toLowerCase().trim();
                const matched = (arogyaSevaks || []).find((s) => {
                  const name = String(s.name || s.full_name || '').toLowerCase().trim();
                  return name === clean || name.includes(clean) || clean.includes(name);
                });
                return matched?.phone_number || matched?.phone || matched?.mobile || (clean.includes('om') ? '8381053553' : clean.includes('akanksha') ? '98230 12345' : '98765 00001');
              };

              let candidatePrevSvk =
                (caseItem.previousSevak && typeof caseItem.previousSevak === 'string' ? caseItem.previousSevak : caseItem.previousSevak?.name || caseItem.previousSevak?.sevak_name) ||
                matchingEscalation?.submittedBy ||
                matchingEscalation?.sevakName ||
                (isTransferredCase ? 'Akanksha Pawashe' : null);

              let cleanPrevSvk = formatCleanPersonName(candidatePrevSvk) || candidatePrevSvk;
              if (isTransferredCase && (!cleanPrevSvk || cleanPrevSvk.toLowerCase() === String(displayAssignedSevak).toLowerCase())) {
                cleanPrevSvk = 'Akanksha Pawashe';
              }

              const prevHospPhone = caseItem.previousHospitalPhone || lookupHospPhone(rawPrevHosp) || '020-24451234';
              const prevSevakPhone = caseItem.previousSevakPhone || lookupSvkPhone(cleanPrevSvk) || '98230 12345';
              const newHospPhone = caseItem.hospitalPhone || lookupHospPhone(displayAssignedHospital) || '9999999999';
              const finalNewSevakPhone = displaySevakPhone || lookupSvkPhone(displayAssignedSevak) || '8381053553';

              return (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#166534" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Scheme & Hospital Assignment</span>
                    </div>
                    {isTransferredCase && (
                      <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '2px 8px', fontSize: '0.725rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        🔀 Reassigned & Transferred Case
                      </span>
                    )}
                  </div>

                  {/* Transfer Handover Summary Banner */}
                  {isTransferredCase && (rawPrevHosp || cleanPrevSvk) && (
                    <div style={{
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', fontWeight: 800 }}>
                        <RotateCw size={14} />
                        <span>Specialty Handover Record:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#134e4a' }}>
                        <span style={{ color: '#64748b' }}>From:</span>
                        <span style={{ fontWeight: 700 }}>{rawPrevHosp || 'Previous Hospital'} {cleanPrevSvk ? `(${cleanPrevSvk})` : ''}</span>
                        <span style={{ fontWeight: 800, color: '#0d9488' }}>➔</span>
                        <span style={{ color: '#64748b' }}>To:</span>
                        <span style={{ fontWeight: 800, color: '#115e59' }}>{displayAssignedHospital} {displayAssignedSevak ? `(${displayAssignedSevak})` : ''}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px 32px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Assigned Scheme:</span>
                      <span style={{ color: '#166534', fontWeight: 800, textAlign: 'right' }}>{displayAssignedScheme || 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Case Type:</span>
                      <span style={{ color: '#475569', fontWeight: 700, textAlign: 'right' }}>{caseItem.type || (caseItem.caseTypeDesc ? caseItem.caseTypeDesc.replace(/\s*\(.*?\)/g, '').trim() : 'OPD') || 'OPD'}</span>
                    </div>

                    {/* New Assigned Hospital with Phone */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {isTransferredCase ? 'Assigned Hospital (New):' : 'Assigned Hospital:'}
                      </span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span>{displayAssignedHospital}</span>
                        {newHospPhone && (
                          <span style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.75rem' }}>
                            📞 {newHospPhone}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* New Assigned Sevak with Phone */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {isTransferredCase ? 'Assigned ArogyaSevak (New):' : 'Assigned ArogyaSevak:'}
                      </span>
                      <span style={{ color: displayAssignedSevak !== 'Pending Assignment' ? '#166534' : '#64748b', fontWeight: 700, textAlign: 'right', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} style={{ flexShrink: 0 }} /> {displayAssignedSevak}
                        </span>
                        {finalNewSevakPhone && (
                          <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.75rem' }}>
                            📱 {finalNewSevakPhone}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Previous Hospital & Phone (if transferred) */}
                    {isTransferredCase && rawPrevHosp && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                        <span style={{ color: '#991b1b', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Previous Hospital:</span>
                        <span style={{ color: '#7f1d1d', fontWeight: 700, textAlign: 'right', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span>{rawPrevHosp}</span>
                          {prevHospPhone && (
                            <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.75rem' }}>
                              📞 {prevHospPhone}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Previous Sevak & Phone (if transferred) */}
                    {isTransferredCase && cleanPrevSvk && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                        <span style={{ color: '#991b1b', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Previous ArogyaSevak:</span>
                        <span style={{ color: '#7f1d1d', fontWeight: 700, textAlign: 'right', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={13} style={{ flexShrink: 0 }} /> {cleanPrevSvk}
                          </span>
                          {prevSevakPhone && (
                            <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.75rem' }}>
                              📱 {prevSevakPhone}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {displayAdmissionDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Admission / Visit Date:</span>
                        <span style={{ color: '#0369a1', fontWeight: 700, textAlign: 'right' }}>
                          {formatDateDDMMYYYY(displayAdmissionDate)}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Submitted Date:</span>
                      <span style={{ color: '#475569', fontWeight: 600, textAlign: 'right' }}>
                        {formatDateDDMMYYYY(caseItem.submittedDate || caseItem.submittedAt || caseItem.createdAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Referred By:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>
                        {caseItem.referredBy || caseItem.referred_by || caseItem.referralName || caseItem.referrer || caseItem.referralSource || 'Direct / Self'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Dedicated Full-Width Medical Cause & Applicant Notes Box */}
            <div style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              borderLeft: '4px solid #ca8a04',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="#854d0e" />
                <span style={{ color: '#854d0e', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Medical Cause & Applicant Notes:
                </span>
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.85rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                "{caseItem.applicantNotes || caseItem.medicalCauseNote || caseItem.condition || caseItem.applicantMedicalCause || caseItem.applicantRemarks || (Array.isArray(caseItem.notes) && caseItem.notes.length > 0 ? caseItem.notes[0] : null) || caseItem.remarks || caseItem.description || 'No specific applicant notes provided.'}"
              </p>
            </div>

          </div>
        );
      })()}

      {/* Case Notes & Clinical Communication Section (2-Part Split Layout) */}
      <div className="detail-card case-notes-panel">
        <h3 className="section-card-title" style={{ marginBottom: '18px' }}>
          Case Communication & Notes Hub
        </h3>

        <div className="notes-two-parts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Part 1: Admin Notes & Internal Instructions */}
          {(() => {
            const rawAdminNotes = Array.isArray(caseItem.adminNotes) && caseItem.adminNotes.length > 0
              ? caseItem.adminNotes
              : (Array.isArray(caseItem.notes) ? caseItem.notes : (caseItem.remarks ? [caseItem.remarks] : []));

            const adminNotesList = rawAdminNotes.map((n, idx) => {
              if (typeof n === 'string') {
                return {
                  id: `an-${idx}`,
                  text: n.replace(/^\[ADMIN NOTE\]\s*/i, '').trim(),
                  by: caseItem.operator || 'Rohit Patil',
                  date: 'Admin Note'
                };
              }
              return {
                id: n.id || `an-${idx}`,
                text: String(n.text || n.note || n.remark || '').replace(/^\[ADMIN NOTE\]\s*/i, '').trim(),
                by: n.by || caseItem.operator || 'Rohit Patil',
                date: n.date || 'Admin Note'
              };
            }).filter(n => n.text && n.text !== 'null' && n.text !== 'undefined');

            const hasAssignedSevak = caseItem.assignedSevak && caseItem.assignedSevak !== 'Not assigned' && caseItem.assignedSevak !== '—';

            return (
              <div className="notes-part-column" style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#0369a1" />
                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: '800', color: '#0369a1' }}>
                      📌 Admin Internal Notes ({adminNotesList.length})
                    </h4>
                  </div>
                  {!isRejected && !isClosed && (!isClaimedByOther ? (
                    <button
                      className="btn-add-note-inline"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        background: '#0369a1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.775rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(3, 105, 161, 0.2)'
                      }}
                      onClick={() => setActiveModal({ type: 'add-note', payload: caseItem })}
                    >
                      + Add Admin Note
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                      🔒 Locked to Reviewer ({reviewerName})
                    </span>
                  ))}
                </div>

                <div className="admin-notes-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {adminNotesList.length > 0 ? (
                    adminNotesList.map((note, idx) => (
                      <div
                        key={note.id || `admin-${idx}`}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderLeft: '4px solid #0369a1',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0369a1', fontSize: '0.8rem' }}>
                            Admin ({note.by})
                          </span>
                          <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {hasAssignedSevak ? `Transmitted to ${caseItem.assignedSevak}` : 'Admin Instruction'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.845rem', color: '#1e293b', lineHeight: '1.45', fontWeight: 500 }}>
                          "{note.text}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.825rem' }}>
                      <span>No internal notes added by Admin yet.</span>
                      {!isRejected && !isClosed && !isClaimedByOther && (
                        <button
                          style={{ display: 'block', margin: '10px auto 0 auto', padding: '5px 12px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700', cursor: 'pointer' }}
                          onClick={() => setActiveModal({ type: 'add-note', payload: caseItem })}
                        >
                          + Add First Admin Note
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Part 2: ArogyaSevak Ward Notes & Clinical Updates */}
          {(() => {
            const isSevakNote = (item) => {
              if (!item) return false;
              const text = String(
                item.note ||
                item.update ||
                item.remark ||
                item.remarks ||
                item.text ||
                item.content ||
                item.comment ||
                item.message ||
                (typeof item === 'string' ? item : '')
              ).trim();

              if (!text || text === 'Step Skipped' || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') {
                return false;
              }

              if (
                text.startsWith('[ADMIN') ||
                text.includes('[DOCUMENT REQUEST') ||
                text.includes('[ADMIN NOTICE]')
              ) {
                return false;
              }
              return true;
            };

            const rawCandidates = [
              ...(Array.isArray(caseItem?.wardNotes) ? caseItem.wardNotes : []),
              ...(Array.isArray(caseItem?.ward_notes) ? caseItem.ward_notes : []),
              ...(Array.isArray(sevakPatientData?.wardNotes) ? sevakPatientData.wardNotes : []),
              ...(Array.isArray(sevakPatientData?.ward_notes) ? sevakPatientData.ward_notes : []),
              ...(Array.isArray(sevakPatientData?.clinicalNotes) ? sevakPatientData.clinicalNotes : []),
              ...(Array.isArray(caseItem?.clinicalNotes) ? caseItem.clinicalNotes : []),
              ...(Array.isArray(caseItem?.clinical_notes) ? caseItem.clinical_notes : []),
              ...(Array.isArray(sevakPatientData?.updateHistory) ? sevakPatientData.updateHistory : []),
              ...(Array.isArray(caseItem?.updateHistory) ? caseItem.updateHistory : []),
              ...(Array.isArray(caseItem?.update_history) ? caseItem.update_history : []),
              ...(caseItem?.latestWardUpdate ? [{ update: caseItem.latestWardUpdate, type: 'Ward Update', date: caseItem.sevakLastUpdatedAt ? new Date(caseItem.sevakLastUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently', by: caseItem.assignedSevak || 'ArogyaSevak' }] : []),
              ...(sevakPatientData?.latestWardUpdate ? [{ update: sevakPatientData.latestWardUpdate, type: 'Ward Update', date: sevakPatientData.lastUpdated || 'Recently', by: caseItem.assignedSevak || 'ArogyaSevak' }] : []),
              ...((sevakPatientData?.caseProgress || caseItem?.caseProgress || [])
                .filter((s) => s && s.note && s.note !== 'Step Skipped' && s.state !== 'pending')
                .map((s) => ({
                  update: s.note,
                  type: `${s.label || 'Stage'} Update`,
                  date: s.date || 'Recently',
                  by: caseItem.assignedSevak || 'ArogyaSevak'
                }))
              ),
            ];

            const seenTexts = new Set();
            const sevakNotesList = [];

            for (const item of rawCandidates) {
              if (!isSevakNote(item)) continue;

              const text = String(
                item.note ||
                item.update ||
                item.remark ||
                item.remarks ||
                item.text ||
                item.content ||
                item.comment ||
                item.message ||
                (typeof item === 'string' ? item : '')
              ).trim();

              const normalizedKey = text.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!normalizedKey || seenTexts.has(normalizedKey)) continue;
              seenTexts.add(normalizedKey);

              const byName = item.by || item.author || item.sevak_name || item.recordedBy || item.created_by_name || item.user_name || caseItem.assignedSevak || 'ArogyaSevak';
              const noteType = item.type || item.category || item.stage || item.title || (item.shift ? `${item.shift} Shift Note` : 'Clinical Ward Note');
              const noteDate = item.date || item.timestamp || item.created_at || item.createdAt || item.time || (caseItem.sevakLastUpdatedAt ? new Date(caseItem.sevakLastUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently');
              const prevSevakName = typeof caseItem.previousSevak === 'object' && caseItem.previousSevak !== null
                ? (caseItem.previousSevak.name || caseItem.previousSevak.sevak_name || '')
                : String(caseItem.previousSevak || '');
              const isPrevSevak = Boolean(
                caseItem.previousSevak && (
                  (prevSevakName && byName === prevSevakName) ||
                  String(item.type || '').includes('Handover')
                )
              );

              sevakNotesList.push({
                id: item.id || `sn-${sevakNotesList.length + 1}`,
                text,
                by: byName,
                type: noteType,
                date: noteDate,
                isPrevSevak
              });
            }

            const totalCount = sevakNotesList.length;

            return (
              <div className="notes-part-column" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={16} color="#166534" />
                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: '800', color: '#166534' }}>
                      🏥 ArogyaSevak Ward Notes ({totalCount})
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.725rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', border: '1px solid #86efac', fontWeight: '700' }}>
                    Live Sevak Feed
                  </span>
                </div>

                <div className="sevak-notes-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {totalCount > 0 ? (
                    sevakNotesList.map((sNote, idx) => (
                      <div
                        key={sNote.id || `sevak-note-${idx}`}
                        style={{
                          background: '#ffffff',
                          border: sNote.isPrevSevak ? '1px solid #cbd5e1' : '1px solid #bbf7d0',
                          borderLeft: sNote.isPrevSevak ? '4px solid #94a3b8' : '4px solid #16a34a',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: sNote.isPrevSevak ? '#475569' : '#166534', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🏥 Clinical Report ({sNote.type})
                          </span>
                          <span style={{ fontSize: '0.7rem', background: sNote.isPrevSevak ? '#f1f5f9' : '#dcfce7', color: sNote.isPrevSevak ? '#64748b' : '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {sNote.isPrevSevak ? 'Handover Note (Previous Sevak)' : 'Live Sevak Entry'}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.845rem', color: sNote.isPrevSevak ? '#334155' : '#14532d', lineHeight: '1.45', fontWeight: '500' }}>
                          "{sNote.text}"
                        </p>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '6px' }}>
                          Reported by {sNote.by} · {sNote.date}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px dashed #86efac', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#166534', fontSize: '0.825rem' }}>
                      <span>No ward notes or clinical updates reported by ArogyaSevak yet.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Documents Card */}
      <div className="detail-card documents-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="section-card-title" style={{ margin: 0 }}>Documents</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isClosed && !isRejected && !isClaimedByOther && (() => {
              const isAssignedOrApproved = isCaseAssigned(caseItem) || isApproved;
              const sevakName = caseItem.assignedSevak || 'ArogyaSevak';
              return (
                <button
                  onClick={() => setActiveModal({ type: 'request-docs', payload: caseItem })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    background: isAssignedOrApproved ? '#ecfdf5' : '#fffbeb',
                    color: isAssignedOrApproved ? '#065f46' : '#b45309',
                    border: `1px solid ${isAssignedOrApproved ? '#a7f3d0' : '#fde68a'}`,
                    borderRadius: '6px',
                    fontSize: '0.775rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title={isAssignedOrApproved ? `Request additional documents directly from assigned ArogyaSevak (${sevakName})` : "Request additional or clearer documents directly from citizen"}
                >
                  <FolderPlus size={13} />
                  <span>{isAssignedOrApproved ? `+ Request Documents from ArogyaSevak` : `+ Request Documents from Citizen`}</span>
                </button>
              );
            })()}
            <Link
              to={`/admin/documents/${caseItem.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#e6f9ed',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '0.775rem',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <FolderPlus size={13} />
              <span>📁 Open Documents Vault</span>
            </Link>
          </div>
        </div>

        {/* Applicant / Citizen Uploaded Documents */}
        {(() => {
          const allDocs = caseItem.documents || [];
          const citizenDocs = allDocs.filter(d => !isSevakDocument(d));
          return (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '10px' }}>
                📋 Citizen Application Documents
              </span>
              <div className="docs-list">
                {citizenDocs.length === 0 ? (
                  <div style={{ padding: '20px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={24} color="#94a3b8" style={{ marginBottom: '4px' }} />
                    <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.85rem' }}>No citizen documents uploaded yet</div>
                  </div>
                ) : (
                  citizenDocs.map((doc, idx) => {
                    const isPending = Boolean(
                      doc.status === 'PENDING_SEVAK_UPLOAD' ||
                      doc.status === 'PENDING_CITIZEN_UPLOAD' ||
                      doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
                      doc.document_status === 'PENDING_CITIZEN_UPLOAD' ||
                      doc.file === 'Pending Upload' ||
                      doc.fileName === 'Pending Upload' ||
                      doc.file === 'Not uploaded' ||
                      doc.requested ||
                      (!doc.uploaded && !doc.file_url && !doc.fileUrl)
                    );
                    const isUploaded = !isPending && (doc.uploaded || (Boolean(doc.file) && doc.file !== 'Not uploaded' && doc.file !== 'Pending Upload') || Boolean(doc.file_url || doc.fileUrl));
                    const isVerified = !isPending && Boolean(
                      doc.verified ||
                      doc.document_status === 'VERIFIED' ||
                      doc.status === 'VERIFIED' ||
                      isApproved
                    );
                    const rawName = doc.name || doc.file_name || doc.title || 'Document Record';
                    const docFile = doc.file || doc.file_name || doc.fileName || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
                    const docCategory = doc.category || 'General';
                    const docSize = doc.size || doc.file_size || (isUploaded ? '1.2 MB' : '-');

                    let displayTitle = rawName;
                    if (rawName.startsWith('rn_image_picker_') || rawName.startsWith('doc_record_') || rawName.length > 32) {
                      const cat = String(docCategory).toLowerCase();
                      if (cat.includes('medical') || cat.includes('doctor') || cat.includes('referral') || cat.includes('prescription')) {
                        displayTitle = 'Doctor Medical Referral & Prescription Slip';
                      } else if (cat.includes('identity') || cat.includes('aadhaar') || cat.includes('id')) {
                        displayTitle = 'Citizen Identity Document (Aadhaar / ID Proof)';
                      } else if (cat.includes('income') || cat.includes('ration') || cat.includes('financial')) {
                        displayTitle = 'Income & Ration Card Eligibility Proof';
                      } else if (cat.includes('hospital') || cat.includes('discharge') || cat.includes('bill')) {
                        displayTitle = 'Hospital Record / Clinical Pre-Auth';
                      } else {
                        displayTitle = 'Applicant Uploaded Document';
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={`doc-item-row ${isVerified ? 'doc-verified' : (isUploaded ? 'doc-uploaded' : 'doc-missing')}`}
                      >
                        <div className="doc-left-content" style={{ minWidth: 0, flex: 1 }}>
                          <div className="doc-file-icon" style={{ flexShrink: 0 }}>
                            <FileCheck size={18} />
                          </div>
                          <div className="doc-name-stack" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <span className="doc-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={displayTitle}>
                              {displayTitle}
                            </span>
                            <span className="doc-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontWeight: 600, fontSize: '0.7rem', color: '#475569', textTransform: 'capitalize' }}>
                                {docCategory}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={docFile}>
                                {isVerified || isUploaded ? docFile : (isRejected ? 'Case Rejected' : 'Pending Citizen Upload')}
                              </span>
                              <span>· {docSize}</span>
                            </span>
                          </div>
                        </div>

                        <div className="doc-right-action">
                          {isRejected ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="btn-doc-eye"
                                onClick={() => setActiveModal({
                                  type: 'view-doc',
                                  payload: {
                                    caseId: caseItem.id,
                                    patientName: caseItem.patient || caseItem.patientName,
                                    applicantName: caseItem.applicant || caseItem.applicantName,
                                    doc,
                                    isClaimedByOther,
                                    onVerify: (d) => handleVerifyDoc(d || doc),
                                    ...doc
                                  }
                                })}
                                title="Review / View document"
                                style={{ padding: '5px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={14} /> View
                              </button>
                              <span className="doc-rejected-lock-text" style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                                🔒 Read-Only (Rejected)
                              </span>
                            </div>
                          ) : isVerified ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="btn-doc-eye"
                                onClick={() => setActiveModal({
                                  type: 'view-doc',
                                  payload: {
                                    caseId: caseItem.id,
                                    patientName: caseItem.patient || caseItem.patientName,
                                    applicantName: caseItem.applicant || caseItem.applicantName,
                                    doc,
                                    isClaimedByOther,
                                    onVerify: (d) => handleVerifyDoc(d || doc),
                                    ...doc
                                  }
                                })}
                                title="Review / View document"
                                style={{ padding: '5px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={14} /> View
                              </button>
                              <span className="doc-verified-check">
                                <Check size={18} /> Verified
                              </span>
                            </div>
                          ) : isUploaded ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="btn-doc-eye"
                                onClick={() => setActiveModal({
                                  type: 'view-doc',
                                  payload: {
                                    caseId: caseItem.id,
                                    patientName: caseItem.patient || caseItem.patientName,
                                    applicantName: caseItem.applicant || caseItem.applicantName,
                                    doc,
                                    isClaimedByOther,
                                    onVerify: (d) => handleVerifyDoc(d || doc),
                                    ...doc
                                  }
                                })}
                                title="Review / View document"
                                style={{ padding: '5px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={14} /> View
                              </button>
                              {isClaimedByOther ? (
                                <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                  🔒 Read-Only (Claimed)
                                </span>
                              ) : (
                                <button
                                  className="btn-doc-verify"
                                  onClick={() => handleVerifyDoc(doc)}
                                  title="Verify citizen uploaded document"
                                  style={{ background: "#14532d", cursor: 'pointer' }}
                                >
                                  Verify Document
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="doc-pending-badge">
                              ⏳ Pending Citizen Upload
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* ArogyaSevak Uploaded Patient Documents */}
        {(() => {
          const hasSevakAssigned = Boolean(
            caseItem.assignedSevak &&
            caseItem.assignedSevak !== '-' &&
            caseItem.assignedSevak !== 'Not assigned' &&
            caseItem.assignedSevak !== 'Unassigned' &&
            caseItem.assignedSevak !== 'Pending'
          );
          const caseDocs = caseItem.documents || [];
          const rawSevakDocs = caseDocs.filter(isSevakDocument);

          const sevakDocs = rawSevakDocs.reduce((acc, current) => {
            const currentTitle = current.title || current.name || current.file_name;
            const existingIdx = acc.findIndex(d =>
              (d.id && current.id && d.id === current.id) ||
              (d.title && currentTitle && d.title === currentTitle) ||
              (d.name && currentTitle && d.name === currentTitle)
            );
            if (existingIdx !== -1) {
              const currIsUploaded = Boolean(current.uploaded === true || (current.file && current.file !== 'Pending Upload' && current.file !== 'Not uploaded') || current.file_url || current.fileUrl || current.url);
              const existIsUploaded = Boolean(acc[existingIdx].uploaded === true || (acc[existingIdx].file && acc[existingIdx].file !== 'Pending Upload' && acc[existingIdx].file !== 'Not uploaded') || acc[existingIdx].file_url || acc[existingIdx].fileUrl || acc[existingIdx].url);
              if (currIsUploaded && !existIsUploaded) {
                acc[existingIdx] = current;
              }
            } else {
              acc.push(current);
            }
            return acc;
          }, []);

          if (sevakDocs.length === 0) return null;

          return (
            <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '4px', border: '1px solid #86efac' }}>
                    🏥 New ArogyaSevak Uploaded Documents ({sevakDocs.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Clinical records & hospital intake charts uploaded by {caseItem.assignedSevak || 'ArogyaSevak'}
                  </span>
                </div>
              </div>

              <div className="docs-list">
                {sevakDocs.map((sDoc, sIdx) => {
                  const docName = sDoc.title || sDoc.name || sDoc.file_name || 'ArogyaSevak Document';
                  const matchedDocInCase = caseDocs.find(d => d.name === docName || d.title === docName || (sDoc.id && d.id === sDoc.id));

                  const isExplicitlyPending = Boolean(
                    sDoc.status === 'PENDING_SEVAK_UPLOAD' ||
                    sDoc.document_status === 'PENDING_SEVAK_UPLOAD' ||
                    matchedDocInCase?.status === 'PENDING_SEVAK_UPLOAD' ||
                    matchedDocInCase?.document_status === 'PENDING_SEVAK_UPLOAD' ||
                    sDoc.file === 'Pending Upload' ||
                    sDoc.fileName === 'Pending Upload' ||
                    matchedDocInCase?.file === 'Pending Upload' ||
                    matchedDocInCase?.fileName === 'Pending Upload' ||
                    sDoc.uploaded === false ||
                    matchedDocInCase?.uploaded === false ||
                    sDoc.requested === true ||
                    matchedDocInCase?.requested === true
                  );

                  const hasValidFile = Boolean(
                    (sDoc.file_url && sDoc.file_url.trim() !== '') ||
                    (sDoc.fileUrl && sDoc.fileUrl.trim() !== '') ||
                    (matchedDocInCase?.file_url && matchedDocInCase.file_url.trim() !== '') ||
                    (matchedDocInCase?.fileUrl && matchedDocInCase.fileUrl.trim() !== '') ||
                    (sDoc.url && sDoc.url.trim() !== '') ||
                    (matchedDocInCase?.url && matchedDocInCase.url.trim() !== '') ||
                    (sDoc.uploaded === true && sDoc.file && sDoc.file !== 'Pending Upload' && sDoc.file !== 'Not uploaded') ||
                    (matchedDocInCase?.uploaded === true && matchedDocInCase.file && matchedDocInCase.file !== 'Pending Upload' && matchedDocInCase.file !== 'Not uploaded')
                  );

                  const isPendingSevakUpload = isExplicitlyPending || !hasValidFile;
                  const isUploaded = !isPendingSevakUpload && hasValidFile;
                  const isVerified = isUploaded && (matchedDocInCase
                    ? Boolean(matchedDocInCase.verified || matchedDocInCase.status === 'VERIFIED' || matchedDocInCase.document_status === 'VERIFIED')
                    : Boolean(sDoc.verified || sDoc.status === 'VERIFIED' || sDoc.document_status === 'VERIFIED'));
                  const docSize = sDoc.size || matchedDocInCase?.size || '1.8 MB';
                  const assignedSevakName = sDoc.by || caseItem.assignedSevak || 'ArogyaSevak';

                  return (
                    <div
                      key={`sdoc-${sIdx}`}
                      className={`doc-item-row ${isVerified ? 'doc-verified' : (isUploaded ? 'doc-uploaded' : 'doc-missing')}`}
                      style={{
                        background: isVerified ? '#f0fdf4' : (isUploaded ? '#f0f9ff' : '#fffbeb'),
                        border: isVerified ? '1px solid #bbf7d0' : (isUploaded ? '1px solid #bae6fd' : '1px dashed #fde68a')
                      }}
                    >
                      <div className="doc-left-content">
                        <div className="doc-file-icon" style={{ color: isVerified ? '#166534' : (isUploaded ? '#0284c7' : '#d97706') }}>
                          <FileCheck size={18} />
                        </div>
                        <div className="doc-name-stack">
                          <span className="doc-name" style={{ color: isVerified ? '#14532d' : (isUploaded ? '#0369a1' : '#92400e') }}>
                            {docName}
                          </span>
                          <span className="doc-meta" style={{ color: isVerified ? '#166534' : (isUploaded ? '#0284c7' : '#b45309') }}>
                            {isPendingSevakUpload ? (
                              <span>⏳ Requested from ArogyaSevak ({assignedSevakName}) · Task Assigned</span>
                            ) : (
                              <span>Uploaded by {assignedSevakName} · {sDoc.type || sDoc.category || 'Clinical Document'} ({docSize})</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="doc-right-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isPendingSevakUpload ? (
                          <span className="doc-pending-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ⏳ Pending ArogyaSevak Upload
                          </span>
                        ) : (
                          <>
                            <button
                              className="btn-doc-eye"
                              onClick={() => setActiveModal({
                                type: 'view-doc',
                                payload: {
                                  caseId: caseItem.id,
                                  patientName: caseItem.patient || caseItem.patientName,
                                  applicantName: caseItem.applicant || caseItem.applicantName,
                                  name: docName,
                                  title: docName,
                                  file: sDoc.file || matchedDocInCase?.file || `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                                  size: docSize,
                                  verified: isVerified,
                                  uploadedBy: assignedSevakName,
                                  uploaderRole: 'ArogyaSevak',
                                  doc: matchedDocInCase || sDoc,
                                  isClaimedByOther,
                                  onVerify: (d) => handleVerifyDoc(d || matchedDocInCase || sDoc),
                                  ...sDoc
                                }
                              })}
                              title="View ArogyaSevak uploaded document"
                              style={{ padding: '5px 12px', background: '#ffffff', border: isVerified ? '1px solid #86efac' : '1px solid #7dd3fc', borderRadius: '6px', color: isVerified ? '#166534' : '#0284c7', fontSize: '0.775rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={14} /> View Document
                            </button>
                            {isRejected ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#dc2626', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                                🔒 Read-Only (Rejected)
                              </span>
                            ) : isVerified ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                <Check size={14} /> Verified
                              </span>
                            ) : isClaimedByOther ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                🔒 Read-Only (Claimed)
                              </span>
                            ) : (
                              <button
                                className="btn-doc-verify"
                                onClick={() => handleVerifyDoc(matchedDocInCase || sDoc)}
                                title="Verify document uploaded by ArogyaSevak"
                                style={{ padding: '5px 12px', background: '#166534', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Verify Document
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default CaseDetail;
