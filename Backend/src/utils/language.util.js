/**
 * Utility functions for handling bilingual (Marathi / English) text,
 * Devanagari numerals, and cross-language normalizations.
 */

const MARATHI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts Marathi / Devanagari numerals (०-९) to standard ASCII digits (0-9).
 * E.g., "४२१३०१" -> "421301", "१५/०५/१९९०" -> "15/05/1990"
 *
 * @param {string|number} input
 * @returns {string}
 */
export function toStandardDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[०-९]/g, (char) => {
    const index = MARATHI_DIGITS.indexOf(char);
    return index !== -1 ? String(index) : char;
  });
}

/**
 * Normalizes Gender from Marathi ("पुरुष", "स्त्री", "इतर") or English to standard enum:
 * 'MALE', 'FEMALE', or 'OTHER'.
 *
 * @param {string} gender
 * @returns {'MALE'|'FEMALE'|'OTHER'|null}
 */
export function normalizeGender(gender) {
  if (!gender) return null;
  const clean = String(gender).trim().toUpperCase();

  const maleAliases = ['पुरुष', 'पुरूष', 'MALE', 'M', 'MAN', 'BOY'];
  const femaleAliases = ['स्त्री', 'महिला', 'FEMALE', 'F', 'WOMAN', 'GIRL'];
  const otherAliases = ['इतर', 'OTHER', 'O', 'TRANSGENDER', 'THIRD GENDER'];

  if (maleAliases.includes(clean) || maleAliases.includes(gender.trim())) return 'MALE';
  if (femaleAliases.includes(clean) || femaleAliases.includes(gender.trim())) return 'FEMALE';
  if (otherAliases.includes(clean) || otherAliases.includes(gender.trim())) return 'OTHER';

  return null;
}

/**
 * Parses birthdate in DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD format
 * (supports both Devanagari and English digits) and returns standard ISO 'YYYY-MM-DD'.
 *
 * @param {string} dobStr - e.g. "15/05/1990" or "१५/०५/१९९०"
 * @returns {string|null} - '1990-05-15' or null if invalid
 */
export function parseBirthDate(dobStr) {
  if (!dobStr) return null;
  const normalized = toStandardDigits(String(dobStr).trim());

  // Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = normalized.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
      return null;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Check ISO YYYY-MM-DD
  const yyyymmdd = normalized.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10);
    const day = parseInt(yyyymmdd[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
      return null;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}
