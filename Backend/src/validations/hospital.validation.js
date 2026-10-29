import { z } from 'zod';

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;

/**
 * Zod validation schema for Add Hospital / Empanel Hospital
 * Preprocesses and normalizes camelCase frontend fields to backend equivalents.
 */
export const createHospitalSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };

      // Field aliases & fallbacks from UI form
      if (!copy.name && copy.hospital_name) copy.name = copy.hospital_name;
      if (!copy.type && copy.hospital_type) copy.type = copy.hospital_type;
      if (!copy.location && copy.city) copy.location = copy.city;
      if (!copy.location && copy.district) copy.location = copy.district;
      if (!copy.address && copy.address_line) copy.address = copy.address_line;
      if (!copy.areaTaluka && copy.taluka) copy.areaTaluka = copy.taluka;
      if (!copy.nearestLandmark && copy.nearest_landmark) copy.nearestLandmark = copy.nearest_landmark;
      if (!copy.contact && copy.contact_number) copy.contact = copy.contact_number;
      if (!copy.contact && copy.phone) copy.contact = copy.phone;

      // Preprocess empty contact string
      if (typeof copy.contact === 'string') {
        const trimmed = copy.contact.trim();
        copy.contact = trimmed === '' ? undefined : trimmed;
      }

      // Preprocess empty landmark string
      if (typeof copy.nearestLandmark === 'string') {
        const trimmed = copy.nearestLandmark.trim();
        copy.nearestLandmark = trimmed === '' ? undefined : trimmed;
      }

      // Handle specialties aliases and formatting
      if (!copy.specialties && copy.speciality) copy.specialties = copy.speciality;
      if (!copy.specialties && copy.specialities) copy.specialties = copy.specialities;
      if (typeof copy.specialties === 'string') {
        copy.specialties = copy.specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      }

      // Ensure pincode is string
      if (copy.pincode !== undefined && copy.pincode !== null) {
        copy.pincode = String(copy.pincode).trim();
      }

      // Consolidate selectedSevaks
      if (!copy.selectedSevaks && copy.sevak_ids) copy.selectedSevaks = copy.sevak_ids;
      if (!copy.selectedSevaks && copy.selectedSevakIds) copy.selectedSevaks = copy.selectedSevakIds;

      return copy;
    }
    return data;
  },
  z.object({
    name: z
      .string({
        required_error: 'Hospital name is required',
      })
      .trim()
      .min(2, { message: 'Hospital name must be at least 2 characters long' })
      .max(200, { message: 'Hospital name cannot exceed 200 characters' }),

    type: z
      .string({
        required_error: 'Hospital type is required',
      })
      .trim()
      .refine(
        (val) =>
          ['Government', 'Non-Government', 'Private', 'Semi-Government', 'Trust'].includes(val) ||
          val.toLowerCase().includes('govt') ||
          val.toLowerCase().includes('private'),
        {
          message: "Hospital type must be 'Government' or 'Non-Government'",
        }
      )
      .default('Government'),

    location: z
      .string({
        required_error: 'City / District is required',
      })
      .trim()
      .min(2, { message: 'City / District must be at least 2 characters long' })
      .max(100, { message: 'City / District cannot exceed 100 characters' }),

    address: z
      .string({
        required_error: 'Full street address is required',
      })
      .trim()
      .min(3, { message: 'Address must be at least 3 characters long' })
      .max(500, { message: 'Address cannot exceed 500 characters' }),

    areaTaluka: z
      .string()
      .trim()
      .max(100, { message: 'Taluka cannot exceed 100 characters' })
      .optional()
      .default('Haveli Taluka'),

    pincode: z
      .string({
        required_error: 'Pincode is required',
      })
      .trim()
      .regex(PINCODE_REGEX, {
        message: 'Please provide a valid 6-digit Indian PIN code (e.g. 411004)',
      }),

    scheme: z
      .string()
      .trim()
      .max(255, { message: 'Scheme cannot exceed 255 characters' })
      .optional()
      .default('PM-JAY, MJPJAY'),

    contact: z
      .string()
      .trim()
      .regex(PHONE_REGEX, {
        message: 'Please provide a valid contact number',
      })
      .optional()
      .nullable(),

    nearestLandmark: z
      .string()
      .trim()
      .max(255, { message: 'Nearest landmark cannot exceed 255 characters' })
      .optional()
      .nullable(),

    specialties: z
      .array(z.string())
      .optional()
      .default([]),

    hospital_code: z
      .string()
      .trim()
      .max(50, { message: 'Hospital code cannot exceed 50 characters' })
      .optional()
      .nullable(),

    status: z
      .enum(['ACTIVE', 'INACTIVE'])
      .optional()
      .default('ACTIVE'),

    selectedSevaks: z
      .array(z.union([z.string(), z.record(z.any())]))
      .optional()
      .default([]),

    selectedSevakIds: z
      .array(z.string())
      .optional()
      .default([]),

    doctors: z
      .array(z.any())
      .optional()
      .default([]),
  })
);

export const validateCreateHospital = (data) => {
  const result = createHospitalSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

/**
 * Utility to parse a single CSV line while respecting quoted commas and quotes
 */
export const parseCsvLine = (line) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
};

/**
 * Parses raw CSV content into array of normalized hospital objects matching createHospitalSchema
 */
export const parseCsvToHospitalRecords = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];

  // Remove UTF-8 BOM if present and normalize line breaks
  const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row = {};
    headers.forEach((header, idx) => {
      const val = values[idx] || '';
      if (header.includes('name') || header === 'hospital') {
        row.name = val;
      } else if (header.includes('type')) {
        row.type = val;
      } else if (header.includes('scheme')) {
        row.scheme = val;
      } else if (
        header.includes('contact') ||
        header.includes('phone') ||
        header.includes('mobile') ||
        header.includes('landline')
      ) {
        row.contact = val;
      } else if (header.includes('special')) {
        row.specialties = val.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      } else if (header.includes('address') || header.includes('street')) {
        row.address = val;
      } else if (header.includes('city') || header.includes('district') || header.includes('location')) {
        row.location = val;
      } else if (header.includes('taluka') || header.includes('subdistrict') || header.includes('area')) {
        row.areaTaluka = val;
      } else if (header.includes('pincode') || header.includes('zip') || header.includes('pin') || header.includes('postal')) {
        row.pincode = val;
      } else if (header.includes('landmark') || header.includes('station')) {
        row.nearestLandmark = val;
      } else if (header.includes('sevak') || header.includes('representative')) {
        row.sevak = val;
      } else if (header.includes('bed')) {
        row.bedsAvailable = Number(val) || 15;
      } else if (header.includes('email')) {
        row.email = val;
      } else if (header.includes('code')) {
        row.hospital_code = val;
      } else {
        row[header] = val;
      }
    });

    if (row.name && row.name.trim()) {
      // Provide defaults for CSV rows if missing non-critical required fields
      if (!row.type) row.type = row.name.toLowerCase().includes('govt') || row.name.toLowerCase().includes('civil') ? 'Government' : 'Non-Government';
      if (!row.location) row.location = 'Pune';
      if (!row.address) row.address = `${row.name}, ${row.location}`;
      if (!row.pincode || !PINCODE_REGEX.test(row.pincode)) row.pincode = '411004';
      if (!row.scheme) row.scheme = 'PM-JAY, MJPJAY';
      records.push(row);
    }
  }

  return records;
};

/**
 * Validates array of hospital objects for bulk creation
 */
export const validateBulkCreateHospitals = (input) => {
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (input && Array.isArray(input.hospitals)) {
    list = input.hospitals;
  } else if (typeof input === 'string') {
    list = parseCsvToHospitalRecords(input);
  } else if (input && typeof input.csv === 'string') {
    list = parseCsvToHospitalRecords(input.csv);
  }

  if (!Array.isArray(list) || list.length === 0) {
    return {
      success: false,
      error: 'No valid hospital entries provided. Ensure CSV content or hospital array is not empty.',
      data: [],
    };
  }

  const validatedList = [];
  const errors = [];

  list.forEach((item, index) => {
    const res = createHospitalSchema.safeParse(item);
    if (res.success) {
      validatedList.push(res.data);
    } else {
      errors.push({
        row: index + 1,
        name: item?.name || `Row #${index + 1}`,
        error: res.error.errors[0]?.message || 'Validation error',
      });
    }
  });

  if (validatedList.length === 0 && errors.length > 0) {
    return {
      success: false,
      error: `Validation failed for all rows: ${errors[0].error}`,
      errors,
      data: [],
    };
  }

  return {
    success: true,
    data: validatedList,
    errors: errors.length > 0 ? errors : undefined,
  };
};

export default {
  createHospitalSchema,
  validateCreateHospital,
  parseCsvLine,
  parseCsvToHospitalRecords,
  validateBulkCreateHospitals,
};

