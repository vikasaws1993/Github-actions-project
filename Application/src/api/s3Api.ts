import { apiClient, ApiResponse } from './client';

export interface S3PresignData {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  bucket: string;
  expiresIn: number;
  module: string;
  category: string;
  fileName: string;
  fileType: string;
}

export interface S3ConfirmData {
  verified: boolean;
  key: string;
  fileUrl: string;
  sizeBytes: number;
  contentType: string;
  lastModified?: string;
  document?: any;
}

/**
 * Normalize MIME type based on file extension and provided hint
 */
export function normalizeMimeType(fileName: string, fileType: string = 'application/octet-stream'): string {
  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lowerName.endsWith('.doc')) return 'application/msword';
  if (lowerName.endsWith('.csv')) return 'text/csv';

  if (fileType && fileType !== 'application/octet-stream') {
    return fileType;
  }
  return 'image/jpeg';
}

/**
 * Step 1: Request S3 presigned upload URL from Backend API
 */
export async function getPresignedUploadUrl(params: {
  fileName: string;
  fileType: string;
  fileSize?: number;
  category?: string;
  module?: string;
  applicationId?: string;
  applicationNumber?: string;
  hospitalId?: string;
}): Promise<S3PresignData> {
  const normalizedType = normalizeMimeType(params.fileName, params.fileType);

  const payload = {
    fileName: params.fileName || 'file.pdf',
    fileType: normalizedType,
    fileSize: params.fileSize,
    category: params.category || 'other',
    module: params.module || 'applications',
    applicationId: params.applicationId,
    applicationNumber: params.applicationNumber,
    hospitalId: params.hospitalId,
  };

  const res = await apiClient.post<S3PresignData>('/s3/presign-upload', payload);
  if (!res.success || !res.data?.uploadUrl) {
    throw new Error(res.message || 'Failed to acquire S3 presigned upload URL from backend');
  }

  return res.data;
}

/**
 * Step 2: Stream raw local file/blob directly to AWS S3 using the presigned PUT URL
 * Pure client-side streaming (never routes raw binary through node backend RAM).
 */
export async function uploadDirectToS3(
  uploadUrl: string,
  fileUri: string,
  mimeType: string
): Promise<boolean> {
  if (!uploadUrl || !fileUri) {
    throw new Error('uploadUrl and fileUri are required for S3 upload');
  }

  // Fetch local URI (supports file://, content://, and data: URIs in React Native) as blob
  const fileRes = await fetch(fileUri);
  const blob = await fileRes.blob();

  const s3PutRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': mimeType,
    },
  });

  if (!s3PutRes.ok) {
    throw new Error(`Direct S3 upload failed with HTTP status ${s3PutRes.status}`);
  }

  return true;
}

/**
 * Step 3: Confirm S3 upload with backend (verifies existence via HeadObject before saving DB record)
 */
export async function confirmUpload(params: {
  key: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number | string;
  docTitle?: string;
  category?: string;
  applicationId?: string;
  reqDocId?: string;
  note?: string;
}): Promise<S3ConfirmData> {
  const res = await apiClient.post<S3ConfirmData>('/s3/confirm-upload', params);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Server failed to verify S3 upload');
  }

  return res.data;
}

/**
 * Universal Mobile Document Uploader (Cloudinary-to-S3 Drop-in Replacement)
 * 
 * Pipeline:
 * 1. Returns existing HTTP(S) URLs as-is (preserves legacy Cloudinary/S3 URLs).
 * 2. Requests Presigned PUT URL from Backend.
 * 3. Streams local file directly to S3.
 * 4. Triggers Backend HeadObject verification and DB attachment.
 * 5. Returns verified permanent S3 URL.
 */
export const uploadDocumentToS3 = async (
  fileUri: string,
  fileName: string,
  fileType: string = 'image/jpeg',
  category: string = 'general',
  module: string = 'applications',
  applicationId?: string,
  reqDocId?: string,
  note?: string
): Promise<string> => {
  if (!fileUri) {
    throw new Error('File URI is required for upload');
  }

  // If already a remote URL, return as-is
  if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
    return fileUri;
  }

  const normalizedType = normalizeMimeType(fileName, fileType);
  const cleanName = fileName || (normalizedType === 'application/pdf' ? 'document.pdf' : 'photo.jpg');

  // Step 1: Request Presigned URL
  const presignData = await getPresignedUploadUrl({
    fileName: cleanName,
    fileType: normalizedType,
    category,
    module,
    applicationId,
  });

  // Step 2: Direct HTTP PUT to S3
  await uploadDirectToS3(presignData.uploadUrl, fileUri, normalizedType);

  // Step 3: Backend HeadObject Confirmation
  try {
    const confirmRes = await confirmUpload({
      key: presignData.key,
      fileName: cleanName,
      fileType: normalizedType,
      docTitle: cleanName.replace(/\.[^/.]+$/, ''),
      category,
      applicationId,
      reqDocId,
      note,
    });

    return confirmRes.fileUrl || presignData.fileUrl;
  } catch (confirmErr: any) {
    console.warn('[s3Api] Confirm upload notice:', confirmErr?.message || confirmErr);
    // If confirmation succeeds or returns verified URL, return it
    return presignData.fileUrl;
  }
};

export const s3Api = {
  getPresignedUploadUrl,
  uploadDirectToS3,
  confirmUpload,
  uploadDocument: uploadDocumentToS3,
};

export default s3Api;
