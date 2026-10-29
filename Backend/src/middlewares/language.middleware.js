/**
 * Accept-Language Parsing and Response Localization Middleware for ArogyaMitra
 * Standardizes requested language to 'mr', 'hi', or 'en' (default fallback).
 */

const SUPPORTED_LANGUAGES = ['en', 'mr', 'hi'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Normalizes HTTP Accept-Language string to canonical app language ('en' | 'mr' | 'hi')
 * @param {string} [rawHeader] - HTTP Accept-Language header value
 * @returns {'en' | 'mr' | 'hi'} Normalized language code
 */
export const parseAcceptLanguage = (rawHeader) => {
  if (!rawHeader || typeof rawHeader !== 'string') {
    return DEFAULT_LANGUAGE;
  }

  // Parse comma-separated weighted language tags, e.g. "mr-IN,mr;q=0.9,en-US;q=0.8,en;q=0.7"
  const tokens = rawHeader
    .split(',')
    .map((tag) => tag.trim().split(';')[0].toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    if (token === 'mr' || token.startsWith('mr-') || token.startsWith('mr_')) {
      return 'mr';
    }
    if (token === 'hi' || token.startsWith('hi-') || token.startsWith('hi_')) {
      return 'hi';
    }
    if (token === 'en' || token.startsWith('en-') || token.startsWith('en_')) {
      return 'en';
    }
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Localizes a multilingual names object ({ en, mr, hi }) based on requested language
 * Deterministic resolution: requested -> en -> mr -> hi -> first non-empty -> fallback
 *
 * NOTE: Only master-data dictionary objects should be passed here.
 * NEVER pass arbitrary user-entered free text.
 *
 * @param {Object|string} namesObj - Multilingual dictionary { en, mr, hi }
 * @param {string} [fallbackText=''] - Fallback text if resolution fails
 * @param {'en'|'mr'|'hi'} [lang='en'] - Target language
 * @returns {string}
 */
export const resolveLocalizedText = (namesObj, fallbackText = '', lang = DEFAULT_LANGUAGE) => {
  if (!namesObj) return fallbackText || '';
  if (typeof namesObj === 'string') return namesObj;

  const targetLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  if (typeof namesObj === 'object') {
    if (namesObj[targetLang] && typeof namesObj[targetLang] === 'string' && namesObj[targetLang].trim()) {
      return namesObj[targetLang].trim();
    }
    if (namesObj.en && typeof namesObj.en === 'string' && namesObj.en.trim()) {
      return namesObj.en.trim();
    }
    if (namesObj.mr && typeof namesObj.mr === 'string' && namesObj.mr.trim()) {
      return namesObj.mr.trim();
    }
    if (namesObj.hi && typeof namesObj.hi === 'string' && namesObj.hi.trim()) {
      return namesObj.hi.trim();
    }
    const firstVal = Object.values(namesObj).find((v) => typeof v === 'string' && v.trim());
    if (firstVal) return firstVal.trim();
  }

  return fallbackText || '';
};

/**
 * Express Middleware:
 * 1. Attaches `req.language` ('en' | 'mr' | 'hi')
 * 2. Attaches `res.localize(namesObj, fallbackText)` helper method
 */
export const languageMiddleware = (req, res, next) => {
  const headerVal = req.headers['accept-language'];
  req.language = parseAcceptLanguage(headerVal);

  res.localize = (namesObj, fallbackText = '') => {
    return resolveLocalizedText(namesObj, fallbackText, req.language);
  };

  next();
};

export default languageMiddleware;
