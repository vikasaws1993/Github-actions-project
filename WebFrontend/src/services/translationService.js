/**
 * Auto-translation and Transliteration service for Multilingual Leadership & App Content
 * Translates English input to Marathi (mr) and Hindi (hi) in real-time
 */

const translationCache = new Map();

/**
 * Translate single text to target language using Google Translate engine
 * @param {string} text 
 * @param {'mr' | 'hi'} targetLang 
 * @param {string} sourceLang 
 * @returns {Promise<string>}
 */
export async function translateText(text, targetLang = 'mr', sourceLang = 'en') {
  const trimmed = text ? text.trim() : '';
  if (!trimmed) return '';

  const cacheKey = `${sourceLang}_${targetLang}_${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Translation failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment) => (segment && segment[0] ? segment[0] : ''))
        .join('');
      
      const cleanResult = translated.trim();
      translationCache.set(cacheKey, cleanResult);
      return cleanResult;
    }
    return '';
  } catch (err) {
    console.warn(`[translationService] Auto-translate error for (${targetLang}):`, err?.message);
    return '';
  }
}

/**
 * Auto-translate an English text to both Marathi and Hindi concurrently
 * @param {string} englishText 
 * @returns {Promise<{ mr: string, hi: string }>}
 */
export async function autoTranslateToMarathiAndHindi(englishText) {
  if (!englishText || !englishText.trim()) {
    return { mr: '', hi: '' };
  }

  const [mr, hi] = await Promise.all([
    translateText(englishText, 'mr', 'en'),
    translateText(englishText, 'hi', 'en'),
  ]);

  return { mr, hi };
}

export default {
  translateText,
  autoTranslateToMarathiAndHindi,
};
