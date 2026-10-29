import api from './api';

/**
 * AWS S3 Presigned Upload Client Service for WebFrontend
 * 
 * Flow:
 * 1. Request short-lived presigned PUT URL from Backend: POST /api/s3/presign-upload
 * 2. Upload file directly to S3 via HTTP PUT (with Content-Type matching presigned spec)
 * 3. Confirm upload & trigger backend HeadObject verification: POST /api/s3/confirm-upload
 * 
 * Note: Never contains any AWS credentials. All authentication is via standard JWT Bearer token.
 */
export const s3UploadService = {
  /**
   * Step 1: Request S3 presigned upload URL from backend
   */
  async getPresignedUploadUrl({
    fileName,
    fileType,
    fileSize,
    category = 'other',
    module = 'applications',
    applicationId,
    applicationNumber,
    hospitalId,
  }) {
    if (!fileName) throw new Error('File name is required for S3 presign');
    
    // Normalize MIME type
    let normalizedType = fileType || 'application/octet-stream';
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) normalizedType = 'application/pdf';
    else if (lower.endsWith('.png')) normalizedType = 'image/png';
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) normalizedType = 'image/jpeg';
    else if (lower.endsWith('.webp')) normalizedType = 'image/webp';
    else if (lower.endsWith('.docx')) normalizedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (lower.endsWith('.doc')) normalizedType = 'application/msword';
    else if (lower.endsWith('.csv')) normalizedType = 'text/csv';

    const payload = {
      fileName,
      fileType: normalizedType,
      fileSize: fileSize ? Number(fileSize) : undefined,
      category,
      module,
      applicationId: applicationId || undefined,
      applicationNumber: applicationNumber || undefined,
      hospitalId: hospitalId || undefined,
    };

    const res = await api.post('/s3/presign-upload', payload);
    if (!res?.success || !res?.data?.uploadUrl) {
      throw new Error(res?.message || 'Failed to acquire S3 presigned upload URL from server');
    }

    return res.data;
  },

  /**
   * Step 2: Upload file directly to AWS S3 via HTTP PUT
   * Supports real-time upload progress tracking.
   */
  async uploadDirectToS3(uploadUrl, file, fileType, onProgress) {
    if (!uploadUrl) throw new Error('S3 upload URL is required');
    if (!file) throw new Error('File object is required for S3 upload');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      // Must match the ContentType used during presigned URL generation
      const contentType = fileType || file.type || 'application/octet-stream';
      xhr.setRequestHeader('Content-Type', contentType);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        // S3 returns 200 OK on successful PUT
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          reject(new Error(`S3 direct upload failed with status ${xhr.status}: ${xhr.statusText || 'Upload Error'}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during direct S3 file upload. Please check your internet connection and CORS settings.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('S3 direct upload timed out.'));
      };

      xhr.send(file);
    });
  },

  /**
   * Step 3: Confirm S3 upload with backend (verifies existence via HeadObject before saving DB record)
   */
  async confirmUpload({
    key,
    fileName,
    fileType,
    fileSize,
    docTitle,
    category,
    applicationId,
    reqDocId,
    note,
  }) {
    if (!key) throw new Error('S3 object key is required for upload confirmation');

    const payload = {
      key,
      fileName,
      fileType,
      fileSize,
      docTitle,
      category,
      applicationId: applicationId || undefined,
      reqDocId: reqDocId || undefined,
      note: note || undefined,
    };

    const res = await api.post('/s3/confirm-upload', payload);
    if (!res?.success || !res?.data) {
      throw new Error(res?.message || 'Server failed to verify S3 upload and commit record.');
    }

    return res.data;
  },

  /**
   * Complete End-to-End Upload Pipeline
   * Runs Step 1 (Presign) -> Step 2 (S3 PUT) -> Step 3 (Backend HeadObject Verification & DB Commit)
   */
  async uploadFile(file, options = {}) {
    if (!file) throw new Error('No file provided for upload');

    const {
      category = 'other',
      module = 'applications',
      applicationId,
      applicationNumber,
      hospitalId,
      docTitle,
      reqDocId,
      note,
      onProgress,
    } = options;

    // 1. Acquire Presigned URL
    const presignData = await this.getPresignedUploadUrl({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category,
      module,
      applicationId,
      applicationNumber,
      hospitalId,
    });

    // 2. Direct S3 Upload
    await this.uploadDirectToS3(
      presignData.uploadUrl,
      file,
      presignData.fileType || file.type,
      onProgress
    );

    // 3. Confirm with Backend
    const confirmResult = await this.confirmUpload({
      key: presignData.key,
      fileName: file.name,
      fileType: presignData.fileType || file.type,
      fileSize: file.size,
      docTitle: docTitle || file.name,
      category,
      applicationId,
      reqDocId,
      note,
    });

    return {
      key: presignData.key,
      fileUrl: confirmResult.fileUrl || presignData.fileUrl,
      publicUrl: confirmResult.fileUrl || presignData.fileUrl,
      document: confirmResult.document || null,
      sizeBytes: confirmResult.sizeBytes || file.size,
      contentType: confirmResult.contentType || file.type,
    };
  },
};

export default s3UploadService;
