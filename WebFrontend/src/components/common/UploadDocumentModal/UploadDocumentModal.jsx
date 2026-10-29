import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  FileCheck, 
  ExternalLink, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import s3UploadService from '@/services/s3UploadService';
import patientService from '@/services/patientService';
import { useLanguage } from '@/context/LanguageContext';
import './UploadDocumentModal.css';

const QUICK_CHIPS = [
  { key: 'dischargeSummary', label: 'Discharge Summary' },
  { key: 'ecgReport', label: 'ECG Report' },
  { key: 'bloodTest', label: 'Blood Test' },
  { key: 'ctXray', label: 'CT / X-Ray' },
  { key: 'consentForm', label: 'Consent Form' }
];

export const UploadDocumentModal = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  prefillTitle = '',
  reqDocId = null,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [docTitle, setDocTitle] = useState(prefillTitle || '');
  const [docNote, setDocNote] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  
  // AWS S3 Presigned Upload State
  const [s3FileUrl, setS3FileUrl] = useState('');
  const [s3Key, setS3Key] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingS3, setIsUploadingS3] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [localBase64Url, setLocalBase64Url] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setDocTitle(prefillTitle || '');
      setDocNote('');
      setAttachedFile(null);
      setFileSizeStr('');
      setS3FileUrl('');
      setS3Key('');
      setUploadProgress(0);
      setUploadError('');
      setLocalBase64Url('');
    }
  }, [isOpen, prefillTitle]);

  if (!isOpen) return null;

  const handleChipClick = (chipKey, fallbackLabel) => {
    const translated = t(`uploadModal.${chipKey}`, fallbackLabel);
    setDocTitle(translated);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setS3FileUrl('');
      setS3Key('');
      setUploadError('');
      setUploadProgress(0);
      setLocalBase64Url('');

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileSizeStr(`${Number(sizeMB) > 0.1 ? sizeMB : 0.5} MB`);
      if (!docTitle && !prefillTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setDocTitle(cleanName);
      }

      // Generate local base64 data preview for instant rendering
      try {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (loadEvent.target?.result) {
            setLocalBase64Url(loadEvent.target.result);
          }
        };
        reader.readAsDataURL(file);
      } catch (_) {}

      // Direct S3 Upload with Presigned URL
      setIsUploadingS3(true);
      try {
        // Step 1: Request presigned PUT URL from backend
        const presignRes = await s3UploadService.getPresignedUploadUrl({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          category: 'medical_documents',
          module: 'applications',
          applicationId: patientId || undefined,
        });

        // Step 2: Direct HTTP PUT to S3 with progress tracking
        await s3UploadService.uploadDirectToS3(
          presignRes.uploadUrl,
          file,
          presignRes.fileType || file.type,
          (pct) => setUploadProgress(pct)
        );

        setS3FileUrl(presignRes.fileUrl);
        setS3Key(presignRes.key);
      } catch (err) {
        console.error('[UploadDocumentModal] S3 Upload failed:', err);
        setUploadError(err.message || 'S3 direct upload failed');
      } finally {
        setIsUploadingS3(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setS3FileUrl('');
    setS3Key('');
    setLocalBase64Url('');
    setFileSizeStr('');
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveTitle = (docTitle || prefillTitle || '').trim();
    if (!effectiveTitle || !attachedFile) return;

    if (!s3Key && !s3FileUrl) {
      setUploadError('Please wait for the S3 file upload to complete.');
      return;
    }

    setIsSubmitting(true);
    setUploadError('');
    try {
      const cleanFileName = attachedFile.name;
      const finalUrl = s3FileUrl || localBase64Url || null;

      // Step 3: Backend HeadObject verification and record attachment
      let confirmResult = null;
      if (s3Key) {
        confirmResult = await s3UploadService.confirmUpload({
          key: s3Key,
          fileName: cleanFileName,
          fileType: attachedFile.type,
          fileSize: attachedFile.size,
          docTitle: effectiveTitle,
          category: effectiveTitle.includes('Report') ? 'diagnostic_reports' : 'medical_documents',
          applicationId: patientId || undefined,
          reqDocId: reqDocId || undefined,
          note: docNote.trim(),
        });
      }

      const docData = {
        title: effectiveTitle,
        type: effectiveTitle.includes('Report') ? 'Lab Report' : effectiveTitle.includes('Clearance') ? 'Clearance Form' : 'Clinical Record',
        fileName: cleanFileName,
        fileUrl: confirmResult?.fileUrl || finalUrl,
        url: confirmResult?.fileUrl || finalUrl,
        s3Key: s3Key || confirmResult?.key || null,
        note: docNote.trim(),
        reqDocId: reqDocId || null,
        document: confirmResult?.document || null,
      };

      if (patientId) {
        if (reqDocId || prefillTitle) {
          await patientService.uploadAdminRequestedDoc(patientId, reqDocId, effectiveTitle, cleanFileName, docData.fileUrl);
        } else {
          await patientService.addPatientDocument(patientId, docData);
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsSubmitting(false);
        setDocTitle('');
        setDocNote('');
        setAttachedFile(null);
        setS3FileUrl('');
        setS3Key('');
        if (onSuccess) onSuccess(docData);
        onClose();
      }, 700);
    } catch (err) {
      console.error('[UploadDocumentModal] Error confirming/saving document:', err);
      setUploadError(err.message || 'Failed to save document. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="udm-header">
          <div className="udm-title-group">
            <h3 className="udm-title">{t('uploadModal.uploadNewDoc', 'Upload New Document')}</h3>
            <p className="udm-subtitle">
              {t('patients.patientCol', 'Patient')}: {patientName || 'Patient'} ({patientId || 'AM-2026-00124'})
            </p>
          </div>
          <button type="button" className="udm-close-btn" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        {showSuccess ? (
          <div className="udm-success-state">
            <CheckCircle2 size={46} className="udm-success-icon" />
            <h4 className="udm-success-title">{t('uploadModal.docAttachedSuccess', 'Document Attached Successfully!')}</h4>
            <p className="udm-success-sub">{t('uploadModal.docAttachedSuccessSub', 'Record has been added to patient medical history.')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="udm-form">
            {/* 1. Document Title / Category */}
            <div className="udm-form-group">
              <label className="udm-label">{t('uploadModal.docTitleCategory', 'Document Title / Category *')}</label>
              <input
                type="text"
                className="udm-input-text"
                placeholder={t('uploadModal.docTitlePlaceholder', 'e.g. Discharge Summary, ECG, Lab Report...')}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
              />
              <div className="udm-chips-row">
                {QUICK_CHIPS.map((chip) => {
                  const translatedLabel = t(`uploadModal.${chip.key}`, chip.label);
                  const isActive = docTitle === translatedLabel || docTitle === chip.label;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      className={`udm-chip ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleChipClick(chip.key, chip.label)}
                    >
                      {translatedLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Select Document File */}
            <div className="udm-form-group">
              <label className="udm-label">{t('uploadModal.selectDocFile', 'Select Document File *')}</label>

              {/* Hidden file input for Files / Gallery */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                type="button"
                className={`udm-file-btn ${attachedFile ? 'udm-file-btn-active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Folder size={20} className="udm-gallery-icon" />
                <span>{t('uploadModal.selectFromFiles', 'Select from Files / Gallery')}</span>
              </button>

              {attachedFile && (
                <div className="udm-file-attached">
                  <div className="udm-file-attached-left">
                    <FileCheck size={16} />
                    <span>
                      {attachedFile.name} ({fileSizeStr || '1.2 MB'})
                    </span>
                  </div>
                  <button type="button" className="udm-file-remove" onClick={handleRemoveFile} title="Remove file">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* AWS S3 Direct Upload Progress & Testing Link Box */}
              {isUploadingS3 && (
                <div className="udm-cloudinary-loading">
                  <Loader2 size={16} className="udm-spinner" />
                  <span>Streaming directly to AWS S3 storage ({uploadProgress}%)...</span>
                </div>
              )}

              {uploadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {s3FileUrl && !isUploadingS3 && !uploadError && (
                <div className="udm-cloudinary-box">
                  <div className="udm-cloudinary-header">
                    <span className="udm-cloudinary-badge">
                      <CheckCircle2 size={12} /> S3 Storage Ready
                    </span>
                    <a
                      href={s3FileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="udm-cloudinary-open-btn"
                    >
                      <span>Open Link</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="udm-cloudinary-url" title={s3FileUrl}>
                    {s3FileUrl}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Document Note (Optional) */}
            <div className="udm-form-group">
              <label className="udm-label">{t('uploadModal.docNote', 'Document Note (Optional)')}</label>
              <textarea
                className="udm-textarea"
                placeholder={t('uploadModal.docNotePlaceholder', 'Add any remarks, doctor instructions or context...')}
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
              />
            </div>

            {/* 4. Submit Button */}
            <button
              type="submit"
              className="udm-submit-btn"
              disabled={isSubmitting || isUploadingS3 || !attachedFile || (!s3Key && !s3FileUrl)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="udm-spinner" />
                  <span>{t('uploadModal.verifyingAndAttaching', 'Verifying & Attaching Document...')}</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>{t('uploadModal.uploadAndAttach', 'Upload & Attach Document')}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadDocumentModal;
