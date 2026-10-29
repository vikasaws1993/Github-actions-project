import { AppLanguage, LocalizedString } from '../types/i18n.types';
import { resolveLocalizedText } from './locationDirectoryService';

export interface LocalizedSpecializationEntry {
  id: string; // e.g. 'SPEC_CARD'
  code: string; // 'CARDIOLOGY'
  name: string; // English canonical name
  names: LocalizedString; // { en, mr, hi }
}

export const SPECIALIZATION_LOCALIZATION_MAP: Record<string, LocalizedSpecializationEntry> = {
  'General Medicine': {
    id: 'SPEC_GEN_MED',
    code: 'GEN_MEDICINE',
    name: 'General Medicine',
    names: {
      en: 'General Medicine',
      mr: 'सामान्य औषधोपचार (General Medicine)',
      hi: 'सामान्य चिकित्सा (General Medicine)',
    },
  },
  'General Surgery': {
    id: 'SPEC_GEN_SURG',
    code: 'GEN_SURGERY',
    name: 'General Surgery',
    names: {
      en: 'General Surgery',
      mr: 'सामान्य शस्त्रक्रिया (General Surgery)',
      hi: 'सामान्य शल्यचिकित्सा (General Surgery)',
    },
  },
  'Obstetrics & Gynecology': {
    id: 'SPEC_OBGYN',
    code: 'OBGYN',
    name: 'Obstetrics & Gynecology',
    names: {
      en: 'Obstetrics & Gynecology',
      mr: 'स्त्रीरोग व प्रसूती (Gynecology)',
      hi: 'स्त्री एवं प्रसूति रोग (Gynecology)',
    },
  },
  'Pediatrics': {
    id: 'SPEC_PED',
    code: 'PEDIATRICS',
    name: 'Pediatrics',
    names: {
      en: 'Pediatrics',
      mr: 'बालरोग (Pediatrics)',
      hi: 'बाल चिकित्सा (Pediatrics)',
    },
  },
  'Orthopedics': {
    id: 'SPEC_ORTHO',
    code: 'ORTHOPEDICS',
    name: 'Orthopedics',
    names: {
      en: 'Orthopedics',
      mr: 'अस्थिरोग व हाडांचे विकार (Orthopedics)',
      hi: 'अस्थि रोग (Orthopedics)',
    },
  },
  'Cardiology': {
    id: 'SPEC_CARD',
    code: 'CARDIOLOGY',
    name: 'Cardiology',
    names: {
      en: 'Cardiology',
      mr: 'हृदयरोग (Cardiology)',
      hi: 'हृदय रोग (Cardiology)',
    },
  },
  'Neurology & Neurosurgery': {
    id: 'SPEC_NEURO',
    code: 'NEUROLOGY',
    name: 'Neurology & Neurosurgery',
    names: {
      en: 'Neurology & Neurosurgery',
      mr: 'मेंदू व मज्जारोग (Neurology)',
      hi: 'न्यूरोलॉजी एवं न्यूरोसर्जरी (Neurology)',
    },
  },
  'Nephrology & Dialysis': {
    id: 'SPEC_NEPHRO',
    code: 'NEPHROLOGY',
    name: 'Nephrology & Dialysis',
    names: {
      en: 'Nephrology & Dialysis',
      mr: 'मूत्रपिंडरोग व डायलिसिस (Nephrology)',
      hi: 'गुर्दा रोग एवं डायलिसिस (Nephrology)',
    },
  },
  'Emergency & Trauma': {
    id: 'SPEC_EMERG',
    code: 'EMERGENCY_TRAUMA',
    name: 'Emergency & Trauma',
    names: {
      en: 'Emergency & Trauma',
      mr: 'आपत्कालीन व अपघात विभाग (Emergency)',
      hi: 'आपातकालीन एवं ट्रॉमा (Emergency)',
    },
  },
  'Dermatology': {
    id: 'SPEC_DERMA',
    code: 'DERMATOLOGY',
    name: 'Dermatology',
    names: {
      en: 'Dermatology',
      mr: 'त्वचारोग (Dermatology)',
      hi: 'त्वचा रोग (Dermatology)',
    },
  },
  'Ophthalmology (Eye)': {
    id: 'SPEC_OPHTHAL',
    code: 'OPHTHALMOLOGY',
    name: 'Ophthalmology (Eye)',
    names: {
      en: 'Ophthalmology (Eye)',
      mr: 'नेत्ररोग (Eye / Ophthalmology)',
      hi: 'नेत्र रोग (Ophthalmology)',
    },
  },
  'ENT': {
    id: 'SPEC_ENT',
    code: 'ENT',
    name: 'ENT',
    names: {
      en: 'ENT (Ear, Nose, Throat)',
      mr: 'कान, नाक, घसा (ENT)',
      hi: 'कान, नाक, गला (ENT)',
    },
  },
  'Psychiatry': {
    id: 'SPEC_PSYCH',
    code: 'PSYCHIATRY',
    name: 'Psychiatry',
    names: {
      en: 'Psychiatry',
      mr: 'मानसोपचार (Psychiatry)',
      hi: 'मनोचिकित्सा (Psychiatry)',
    },
  },
  'Pulmonology': {
    id: 'SPEC_PULMO',
    code: 'PULMONOLOGY',
    name: 'Pulmonology',
    names: {
      en: 'Pulmonology',
      mr: 'फुप्फुसरोग व श्वसनविकार (Pulmonology)',
      hi: 'श्वसन रोग (Pulmonology)',
    },
  },
  'Urology': {
    id: 'SPEC_URO',
    code: 'UROLOGY',
    name: 'Urology',
    names: {
      en: 'Urology',
      mr: 'मूत्ररोग (Urology)',
      hi: 'मूत्र रोग (Urology)',
    },
  },
  'Gastroenterology': {
    id: 'SPEC_GASTRO',
    code: 'GASTROENTEROLOGY',
    name: 'Gastroenterology',
    names: {
      en: 'Gastroenterology',
      mr: 'पचनसंस्था व जठररोग (Gastroenterology)',
      hi: 'गैस्ट्रोएंटरोलॉजी (Gastroenterology)',
    },
  },
};

export const specializationService = {
  /**
   * Get list of English canonical specialization names
   */
  getStandardSpecializations(): string[] {
    return Object.keys(SPECIALIZATION_LOCALIZATION_MAP);
  },

  /**
   * Resolve a specialization display name based on current app language
   */
  resolveDisplay(nameOrCode?: string, lang: AppLanguage = 'en'): string {
    if (!nameOrCode) return '';
    const clean = nameOrCode.trim();

    // 1. Exact match in localization map
    const entry = SPECIALIZATION_LOCALIZATION_MAP[clean];
    if (entry) {
      return resolveLocalizedText(entry.names, lang);
    }

    // 2. Search by ID or Code or partial name
    const found = Object.values(SPECIALIZATION_LOCALIZATION_MAP).find(
      (e) =>
        e.id.toLowerCase() === clean.toLowerCase() ||
        e.code.toLowerCase() === clean.toLowerCase() ||
        e.name.toLowerCase() === clean.toLowerCase()
    );
    if (found) {
      return resolveLocalizedText(found.names, lang);
    }

    // 3. Fallback to raw string
    return clean;
  },

  /**
   * Get structured specialization items for dropdowns/selects
   */
  getStructuredSpecializations(lang: AppLanguage = 'en'): Array<{
    id: string;
    code: string;
    value: string;
    label: string;
    subLabel: string;
  }> {
    return Object.values(SPECIALIZATION_LOCALIZATION_MAP).map((e) => {
      const localizedLabel = resolveLocalizedText(e.names, lang);
      return {
        id: e.id,
        code: e.code,
        value: e.name, // Keep canonical English value for backward-compatible storage
        label: localizedLabel,
        subLabel: localizedLabel !== e.name ? e.name : e.code,
      };
    });
  },

  /**
   * Get list of localized specialization display names
   */
  getLocalizedSpecializationList(lang: AppLanguage = 'en'): string[] {
    return Object.values(SPECIALIZATION_LOCALIZATION_MAP).map((e) =>
      resolveLocalizedText(e.names, lang)
    );
  },
};

export default specializationService;
