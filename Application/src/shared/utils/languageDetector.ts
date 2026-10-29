import { AppLanguage, InputLanguage, InputScript } from '../types/i18n.types';

export interface DetectionResult {
  inputLanguage: InputLanguage;
  inputScript: InputScript;
  confidence: number;
}

/**
 * Common Marathi Devanagari lexical tokens and root words
 */
const MARATHI_DEVANAGARI_TOKENS = new Set([
  'आहे', 'आहेत', 'नाही', 'नाहीत', 'झाले', 'झाला', 'झाली', 'होते', 'होता', 'होती',
  'करणे', 'करावे', 'केले', 'केला', 'केली', 'उपचार', 'तपासणी', 'रुग्ण', 'रुग्णालय',
  'योजना', 'माझ्या', 'माझे', 'माझी', 'वडिलांना', 'आईला', 'मुलाला', 'मुलीस',
  'त्रास', 'दुखत', 'दुखणे', 'दाखल', 'पाहिजे', 'द्यावे', 'यांच्या', 'त्यांच्या',
  'सोबत', 'प्रत', 'आम्ही', 'आणि', 'सादर', 'केलेले', 'पुढील', 'मदत', 'तीव्र'
]);

/**
 * Common Hindi Devanagari lexical tokens and root words
 */
const HINDI_DEVANAGARI_TOKENS = new Set([
  'है', 'हैं', 'नहीं', 'हुआ', 'हुई', 'हुए', 'था', 'थी', 'थे',
  'करना', 'किया', 'किए', 'इलाज', 'जांच', 'मरीज', 'अस्पताल',
  'मेरे', 'मेरी', 'मेरा', 'पिता', 'माता', 'बच्चे', 'बच्चा',
  'दर्द', 'तकलीफ', 'भर्ती', 'चाहिए', 'दीजिए', 'इनके', 'उनके',
  'साथ', 'प्रति', 'हम', 'और', 'प्रस्तुत', 'कृपया', 'मदद',
  'सीने', 'में', 'को', 'बहुत', 'परेशान'
]);

/**
 * Phonetic Romanized Marathi tokens (Latin script)
 */
const ROMANIZED_MARATHI_TOKENS = new Set([
  'aahe', 'aahet', 'nahi', 'nahit', 'majhya', 'maze', 'maza', 'mazi',
  'vadilanna', 'vadilanche', 'aamhi', 'aani', 'kela', 'keli', 'kele',
  'tras', 'dukhana', 'dukhra', 'shikshan', 'yojana', 'rupalaya', 'dakhava',
  'dakhala', 'karaycha', 'karave', 'pahije', 'sathi', 'mule', 'kharach',
  'bhet', 'sevak', 'aarogya', 'jodle', 'patil', 'shinde', 'ghari'
]);

/**
 * Phonetic Romanized Hindi tokens (Latin script)
 */
const ROMANIZED_HINDI_TOKENS = new Set([
  'hai', 'hain', 'nahi', 'mera', 'meri', 'mere', 'pita', 'pitaji',
  'pariwar', 'dard', 'hoga', 'hogi', 'karna', 'kiya', 'chahiye',
  'bhai', 'dava', 'ilaj', 'taklif', 'saas', 'lena', 'bahut', 'khabar',
  'kripya', 'madad', 'aspataal', 'seene', 'me', 'ko'
]);

/**
 * Common English medical & conversational lexical tokens
 */
const ENGLISH_TOKENS = new Set([
  'the', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'my', 'father',
  'mother', 'son', 'daughter', 'patient', 'chest', 'pain', 'suffering',
  'since', 'days', 'doctor', 'hospital', 'surgery', 'treatment', 'medical',
  'cause', 'acute', 'severe', 'admission', 'admitted', 'emergency', 'heart',
  'problem', 'issue', 'need', 'needs', 'urgent', 'urgently', 'attached',
  'prescription', 'report', 'card', 'scheme', 'please', 'help', 'with'
]);

/**
 * Known short acronyms / common codes
 */
const KNOWN_ACRONYMS = new Set([
  'bp', 'ecg', 'icd', 'icu', 'opd', 'ipd', 'ct', 'mri', 'usg', 'abg', 'cbc',
  'ot', 'ent', 'pune', 'mumbai', 'nagpur', 'abc', 'xyz', 'na', 'ok', 'yes', 'no'
]);

/**
 * Detects the script and linguistic classification of user-entered text.
 * 
 * Rules:
 * - Pure Devanagari with Marathi markers/stop-words -> 'mr'
 * - Pure Devanagari with Hindi markers/stop-words -> 'hi'
 * - Mixed Devanagari + Latin -> 'mixed'
 * - Mixed Marathi + Hindi Devanagari markers -> 'mixed'
 * - Pure Latin with Romanized Marathi phonetics -> 'mr' (script: 'Latin')
 * - Pure Latin with Romanized Hindi phonetics -> 'hi' (script: 'Latin')
 * - Pure Latin with English lexicon -> 'en' (script: 'Latin')
 * - Mixed Latin (English + Romanized regional) -> 'mixed' (script: 'Latin')
 * - Short strings (< 15 chars), acronyms, numbers, symbols -> 'unknown'
 * 
 * @param text The raw input text
 * @param fallbackAppLanguage Optional active app UI language for ambiguous Devanagari tie-breaking
 * @returns DetectionResult containing inputLanguage, inputScript, and confidence
 */
export function detectInputLanguage(
  text: string | null | undefined,
  fallbackAppLanguage?: AppLanguage
): DetectionResult {
  if (!text || typeof text !== 'string') {
    return {
      inputLanguage: 'unknown',
      inputScript: 'Unknown',
      confidence: 0,
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      inputLanguage: 'unknown',
      inputScript: 'Unknown',
      confidence: 0,
    };
  }

  // Count character code points
  let devanagariCount = 0;
  let latinCount = 0;
  let marathiSpecialCharCount = 0; // e.g. 'ळ' (\u0933)

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    // Devanagari block: 0x0900 - 0x097F
    if (code >= 0x0900 && code <= 0x097F) {
      devanagariCount++;
      if (code === 0x0933) {
        marathiSpecialCharCount++;
      }
    }
    // Latin alphabetic characters
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      latinCount++;
    }
  }

  const totalLetters = devanagariCount + latinCount;

  // Case 1: Numbers, symbols, or whitespace only
  if (totalLetters === 0) {
    return {
      inputLanguage: 'unknown',
      inputScript: 'Unknown',
      confidence: 0,
    };
  }

  // Tokenize words (lowercase, strip non-alphanumeric/marks except spaces)
  // Preserving \p{M} so Devanagari matras / marks are retained during normalization
  const normalizedWords = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const wordCount = normalizedWords.length;

  // Case 2: Short / Ambiguous text (< 15 characters AND <= 2 words, or known acronyms)
  const isAcronym = wordCount === 1 && (KNOWN_ACRONYMS.has(normalizedWords[0]) || trimmed.length <= 4);
  if ((trimmed.length < 15 && wordCount <= 2 && marathiSpecialCharCount === 0) || isAcronym) {
    const script: InputScript =
      devanagariCount > 0 && latinCount > 0
        ? 'Mixed'
        : devanagariCount > 0
        ? 'Devanagari'
        : latinCount > 0
        ? 'Latin'
        : 'Unknown';

    return {
      inputLanguage: 'unknown',
      inputScript: script,
      confidence: 0.3,
    };
  }

  const devanagariRatio = devanagariCount / totalLetters;
  const latinRatio = latinCount / totalLetters;

  // Case 3: Dual-script mixed text (e.g. Marathi Devanagari + English words)
  if (devanagariRatio >= 0.15 && latinRatio >= 0.15) {
    return {
      inputLanguage: 'mixed',
      inputScript: 'Mixed',
      confidence: 0.95,
    };
  }

  // Case 4: Predominantly Devanagari script (>= 85%)
  if (devanagariRatio >= 0.85) {
    let marathiTokenScore = marathiSpecialCharCount * 2;
    let hindiTokenScore = 0;

    for (const word of normalizedWords) {
      if (MARATHI_DEVANAGARI_TOKENS.has(word)) marathiTokenScore++;
      if (HINDI_DEVANAGARI_TOKENS.has(word)) hindiTokenScore++;
    }

    // Both Marathi and Hindi strong markers present
    if (marathiTokenScore >= 2 && hindiTokenScore >= 2) {
      return {
        inputLanguage: 'mixed',
        inputScript: 'Devanagari',
        confidence: 0.85,
      };
    }

    if (marathiTokenScore > hindiTokenScore || marathiSpecialCharCount > 0) {
      return {
        inputLanguage: 'mr',
        inputScript: 'Devanagari',
        confidence: 0.9,
      };
    }

    if (hindiTokenScore > marathiTokenScore) {
      return {
        inputLanguage: 'hi',
        inputScript: 'Devanagari',
        confidence: 0.9,
      };
    }

    // Devanagari without distinctive stop-words -> fallback to active appLanguage if 'mr' or 'hi'
    const fallback = fallbackAppLanguage === 'hi' ? 'hi' : 'mr';
    return {
      inputLanguage: fallback,
      inputScript: 'Devanagari',
      confidence: 0.65,
    };
  }

  // Case 5: Predominantly Latin script (>= 85%)
  if (latinRatio >= 0.85) {
    let romanizedMarathiScore = 0;
    let romanizedHindiScore = 0;
    let englishScore = 0;

    for (const word of normalizedWords) {
      if (ROMANIZED_MARATHI_TOKENS.has(word)) romanizedMarathiScore++;
      if (ROMANIZED_HINDI_TOKENS.has(word)) romanizedHindiScore++;
      if (ENGLISH_TOKENS.has(word)) englishScore++;
    }

    // Mixed English + Romanized Marathi/Hindi (e.g. "father has pain but scheme problem aahe")
    if ((romanizedMarathiScore >= 1 || romanizedHindiScore >= 1) && englishScore >= 2) {
      if (romanizedMarathiScore >= 2) {
        return {
          inputLanguage: 'mr',
          inputScript: 'Latin',
          confidence: 0.85,
        };
      }
      if (romanizedHindiScore >= 2) {
        return {
          inputLanguage: 'hi',
          inputScript: 'Latin',
          confidence: 0.85,
        };
      }
      return {
        inputLanguage: 'mixed',
        inputScript: 'Latin',
        confidence: 0.85,
      };
    }

    if (romanizedMarathiScore > 0 && romanizedMarathiScore >= romanizedHindiScore && romanizedMarathiScore >= englishScore) {
      return {
        inputLanguage: 'mr',
        inputScript: 'Latin',
        confidence: 0.85,
      };
    }

    if (romanizedHindiScore > 0 && romanizedHindiScore > romanizedMarathiScore && romanizedHindiScore >= englishScore) {
      return {
        inputLanguage: 'hi',
        inputScript: 'Latin',
        confidence: 0.85,
      };
    }

    if (englishScore > 0) {
      return {
        inputLanguage: 'en',
        inputScript: 'Latin',
        confidence: 0.9,
      };
    }

    // Default Latin classification for general text > 15 chars
    return {
      inputLanguage: 'en',
      inputScript: 'Latin',
      confidence: 0.7,
    };
  }

  // Fallback for unclassified boundary conditions
  return {
    inputLanguage: 'unknown',
    inputScript: 'Unknown',
    confidence: 0.3,
  };
}

export const languageDetector = {
  detect: detectInputLanguage,
};

export default languageDetector;
