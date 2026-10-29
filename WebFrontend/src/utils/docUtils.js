// docUtils.js - Document generation and download utilities

export function generateDocText(doc) {
  const patientId = doc.patientId || doc.caseId || doc.id || 'AM-2026-00124';
  const patientName = doc.patientName || doc.name || 'Patient Record';
  const docTitle = doc.title || 'Clinical Clearance Report';
  const docType = doc.type || 'Medical Report';
  const date = doc.date || '12 Jun 2026';
  const doctor = doc.doctor || 'Dr. Ananya Deshmukh (M.D. Cardiology, Reg #MH-88492)';

  return `================================================================================
                     AROGYA MITRA HEALTHCARE SYSTEM
                  NATIONAL HEALTH AUTHORITY - ABDM INTEGRATED
                      OFFICIAL MEDICAL RECORD & CASE FILE
================================================================================

DOCUMENT TITLE  : ${docTitle.toUpperCase()}
DOCUMENT TYPE   : ${docType}
ISSUE DATE      : ${date}
CASE ID (ABHA)  : ${patientId}
PATIENT NAME    : ${patientName}
HOSPITAL        : City Care Super Specialty Hospital, Pune

--------------------------------------------------------------------------------
1. PATIENT DEMOGRAPHICS & CLINICAL OVERVIEW
--------------------------------------------------------------------------------
Patient Name    : ${patientName}
Case Reference  : ${patientId}
Admission Status: Active Inpatient
Attending MD    : ${doctor}
Department      : ICU / Critical Care Unit

--------------------------------------------------------------------------------
2. CLINICAL VITALS & OBSERVATIONS
--------------------------------------------------------------------------------
Blood Pressure  : 124/82 mmHg (Normal Range)
Heart Rate      : 76 bpm (Regular Sinus Rhythm)
SpO2 Level      : 98% on Room Air
Body Temp       : 98.4°F
Respiratory Rate: 16 breaths/min
Blood Glucose   : 110 mg/dL (Fasting)

--------------------------------------------------------------------------------
3. DIAGNOSTIC FINDINGS & CLINICAL SUMMARY
--------------------------------------------------------------------------------
- Cardiovascular evaluation shows normal sinus rhythm with no ST segment elevation.
- Pre-op clinical markers cleared for scheduled procedure under general anesthesia.
- Pulmonary function test (PFT) parameters within baseline standard.
- Blood panel report indicates Hb: 13.8 g/dL, WBC: 7,200 /mm³, Platelets: 240,000 /mm³.
- All ABDM health records synced with Central Health Repository.

--------------------------------------------------------------------------------
4. MEDICAL ADVICE & FOLLOW-UP INSTRUCTIONS
--------------------------------------------------------------------------------
- Continue prescribed oral medications at 08:00 AM & 08:00 PM.
- Daily vitals monitor update via ArogyaMitra Mobile/Web Portal.
- Next clinical consultation scheduled in 7 days.

================================================================================
DIGITAL VERIFICATION & STAMP
Digital Signature : SHA256:7F8A9B2C4D5E6F1A2B3C4D5E6F7A8B9C0D1E2F3A
ABDM Registry ID  : IND-ABDM-2026-99384721
Issued By         : ArogyaMitra Auto-Doc Service
================================================================================`;
}

export function downloadDocFile(doc) {
  const content = generateDocText(doc);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const rawTitle = doc.title || 'Document';
  const rawId = doc.patientId || doc.id || 'Case';
  const cleanName = `${rawTitle}_${rawId}`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  link.setAttribute('download', `${cleanName}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a remote file (e.g. Cloudinary image) as a real file download.
 * Fetches the file as a blob, then triggers the browser's native Save dialog.
 * @param {string} remoteUrl - The full HTTP(S) URL of the file
 * @param {string} [fileName] - Desired filename for the download
 */
export async function downloadRemoteFile(remoteUrl, fileName) {
  if (!remoteUrl) return;

  // Derive a good filename
  const fallbackName = remoteUrl.split('/').pop().split('?')[0] || 'document';
  const downloadName = fileName || fallbackName;

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', downloadName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke after a short delay so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.warn('[downloadRemoteFile] Fetch failed, falling back to window.open:', err.message);
    // Fallback: open in new tab if fetch/CORS fails
    window.open(remoteUrl, '_blank');
  }
}

/**
 * Resolves any document file URL (including S3 direct links, backend proxy endpoints, and data URLs)
 * into a securely viewable URL that does not fail with AWS S3 AccessDenied errors.
 */
export function resolveDocFileUrl(fileUrl, s3Key = null) {
  if (!fileUrl && !s3Key) return '';
  const url = String(fileUrl || '').trim();

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

  // If relative backend API path like /api/s3/view?...
  if (url.startsWith('/api/')) {
    return `${BACKEND_ORIGIN}${url}`;
  }

  // If it has an S3 key or contains direct S3 amazonaws.com URL
  let key = s3Key;
  if (!key && (url.includes('amazonaws.com') || url.startsWith('arogyamitra/'))) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const u = new URL(url);
        key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      } else {
        key = url;
      }
    } catch (_) {
      const m = url.match(/amazonaws\.com\/(.+)$/);
      if (m) key = decodeURIComponent(m[1]);
    }
  }

  if (key) {
    return `${API_BASE}/s3/view?key=${encodeURIComponent(key)}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return url;
}

