import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

/**
 * Allowed Document & Image MIME types for uploads
 */
const ALLOWED_DOCUMENT_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/svg+xml',
  'application/pdf',
];

/**
 * Default maximum file size: 10 Megabytes
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * In-memory storage engine
 * Keeps uploaded files in memory as Buffer (req.file.buffer)
 * Best practice when forwarding files directly to cloud streams (e.g. AWS S3).
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate image & PDF MIME types
 */
const documentFileFilter = (req, file, cb) => {
  const isAllowedMime = ALLOWED_DOCUMENT_MIMETYPES.includes(file.mimetype);
  const isAllowedExt = /\.(jpe?g|png|webp|svg|pdf)$/i.test(file.originalname || '');
  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype || 'unknown'}. Allowed formats: JPEG, PNG, WEBP, JPG, SVG, PDF.`
      ),
      false
    );
  }
};

/**
 * Base Multer instance configured for images
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: DEFAULT_MAX_FILE_SIZE,
  },
  fileFilter: documentFileFilter,
});

/**
 * Helper to wrap multer execution and convert MulterError to standard ApiError
 *
 * @param {Function} multerMiddleware - e.g. upload.single('image')
 * @returns {Function} Express middleware
 */
export const handleUpload = (multerMiddleware) => {
  return (req, res, next) => {
    // Only invoke multer if the request is actually multipart/form-data
    if (!req.is('multipart/form-data')) {
      return next();
    }

    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, `File size exceeds the allowed limit of 10MB.`));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            // If unexpected file field, allow controller to inspect req.body / files
            return next();
          }
          return next(new ApiError(400, `File upload error: ${err.message}`));
        }
        if (err.message && err.message.toLowerCase().includes('field name missing')) {
          // In Postman if key name was empty, continue to controller
          return next();
        }
        return next(err);
      }
      next();
    });
  };
};

/**
 * Single file upload middleware
 * Usage: router.post('/profile', uploadSingle('avatar'), controller)
 *
 * @param {string} [fieldName='file']
 */
export const uploadSingle = (fieldName = 'file') => {
  return handleUpload(upload.single(fieldName));
};

/**
 * Multiple files upload middleware (same field)
 * Usage: router.post('/gallery', uploadArray('images', 5), controller)
 *
 * @param {string} [fieldName='files']
 * @param {number} [maxCount=5]
 */
export const uploadArray = (fieldName = 'files', maxCount = 5) => {
  return handleUpload(upload.array(fieldName, maxCount));
};

/**
 * Multiple fields upload middleware
 * Usage: router.post('/docs', uploadFields([{ name: 'id_proof', maxCount: 1 }]), controller)
 *
 * @param {Array<{name: string, maxCount: number}>} fields
 */
export const uploadFields = (fields) => {
  return handleUpload(upload.fields(fields));
};

/**
 * CSV File filter to validate CSV / text files
 */
const csvFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/csv',
    'text/plain',
    'application/csv',
    'application/x-csv',
    'text/comma-separated-values',
    'text/x-comma-separated-values',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ];
  const isCsvExt = file.originalname && file.originalname.toLowerCase().endsWith('.csv');
  if (allowedMimes.includes(file.mimetype) || isCsvExt || !file.mimetype) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Only CSV files (.csv) are allowed.`
      ),
      false
    );
  }
};

/**
 * Multer instance configured for CSV uploads (up to 10MB)
 */
export const csvUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: csvFileFilter,
});

/**
 * CSV single file upload middleware
 * Accepts field names 'file', 'csv', 'csv_file', 'hospital_csv', or 'hospitals'
 */
export const uploadCsv = (fieldName = 'file') => {
  return handleUpload(csvUpload.single(fieldName));
};

/**
 * Flexible CSV upload middleware accepting any field name
 */
export const uploadCsvAny = () => {
  return handleUpload(csvUpload.any());
};

export default {
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  uploadCsv,
  uploadCsvAny,
  handleUpload,
};



