/**
 * ArogyaMitra Shared Multilingual Type System
 * Defines core types for UI languages, user-entered text classifications,
 * script orthography, and localized data models.
 */

/**
 * Supported UI application languages
 */
export type AppLanguage = 'mr' | 'hi' | 'en';

/**
 * Backward compatibility alias for AppLanguage
 */
export type LanguageCode = AppLanguage;

/**
 * Linguistic classification of user-entered free-text content
 */
export type InputLanguage = 'mr' | 'hi' | 'en' | 'mixed' | 'unknown';

/**
 * Orthographic script categorization for text analysis
 */
export type InputScript = 'Devanagari' | 'Latin' | 'Mixed' | 'Unknown';

/**
 * Citizen preferred language for outbound system communications (SMS, WhatsApp, Push)
 */
export type PreferredCommunicationLanguage = 'mr' | 'hi' | 'en';

/**
 * Language selection option metadata for UI selectors/modals
 */
export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  pillLabel: string;
}

/**
 * Configuration for next language cycling
 */
export interface NextLanguageConfig {
  code: AppLanguage;
  label: string;
}

/**
 * Canonical dictionary mapping for multilingual string representations
 */
export interface LocalizedString {
  en: string;
  mr: string;
  hi: string;
  [key: string]: string;
}

/**
 * Container structure for a free-text input with associated linguistic metadata
 */
export interface UserTextInput {
  text: string;
  inputLanguage: InputLanguage;
  inputScript?: InputScript;
}

/**
 * Per-field linguistic descriptor for form fields
 */
export interface TextFieldWithLanguage {
  value: string;
  inputLanguage: InputLanguage;
  inputScript?: InputScript;
}
