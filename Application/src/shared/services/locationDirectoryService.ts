import directoryData from '../data/maharashtraDirectory.json';
import talukasMapData from '../data/maharashtraTalukasMap.json';
import { AppLanguage, LocalizedString } from '../types/i18n.types';

export interface LocalizedTalukaEntry {
  id: string;
  name: string; // English canonical name
  names: LocalizedString;
}

export interface LocalizedDistrictEntry {
  id: string; // e.g. 'MH-PUN'
  name: string; // English canonical name
  names: LocalizedString;
  talukas: LocalizedTalukaEntry[];
}

export interface DistrictEntry {
  id?: string;
  name: string;
  names?: LocalizedString;
  talukas: string[];
}

export interface StateDirectory {
  state: string;
  districts: DistrictEntry[];
}

const data = directoryData as StateDirectory;

// Canonical Localized District Dictionary for Maharashtra
export const DISTRICT_LOCALIZATION_MAP: Record<string, { id: string; names: LocalizedString }> = {
  'Ahmednagar': { id: 'MH-AHM', names: { en: 'Ahmednagar', mr: 'अहमदनगर (अहिल्यानगर)', hi: 'अहमदनगर' } },
  'Akola': { id: 'MH-AKO', names: { en: 'Akola', mr: 'अकोला', hi: 'अकोला' } },
  'Amravati': { id: 'MH-AMR', names: { en: 'Amravati', mr: 'अमरावती', hi: 'अमरावती' } },
  'Beed': { id: 'MH-BEE', names: { en: 'Beed', mr: 'बीड', hi: 'बीड' } },
  'Bhandara': { id: 'MH-BHA', names: { en: 'Bhandara', mr: 'भंडारा', hi: 'भंडारा' } },
  'Buldhana': { id: 'MH-BUL', names: { en: 'Buldhana', mr: 'बुलढाणा', hi: 'बुलढाणा' } },
  'Chandrapur': { id: 'MH-CHA', names: { en: 'Chandrapur', mr: 'चंद्रपूर', hi: 'चंद्रपुर' } },
  'Chhatrapati Sambhajinagar': { id: 'MH-CSN', names: { en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', hi: 'छत्रपति संभाजीनगर' } },
  'Dharashiv': { id: 'MH-DHA', names: { en: 'Dharashiv', mr: 'धाराशिव', hi: 'धाराशिव' } },
  'Dhule': { id: 'MH-DHU', names: { en: 'Dhule', mr: 'धुळे', hi: 'धुले' } },
  'Gadchiroli': { id: 'MH-GAD', names: { en: 'Gadchiroli', mr: 'गडचिरोली', hi: 'गडचिरोली' } },
  'Gondia': { id: 'MH-GON', names: { en: 'Gondia', mr: 'गोंदिया', hi: 'गोंदिया' } },
  'Hingoli': { id: 'MH-HIN', names: { en: 'Hingoli', mr: 'हिंगोली', hi: 'हिंगोली' } },
  'Jalgaon': { id: 'MH-JAL', names: { en: 'Jalgaon', mr: 'जळगाव', hi: 'जलगांव' } },
  'Jalna': { id: 'MH-JLN', names: { en: 'Jalna', mr: 'जालना', hi: 'जालना' } },
  'Kolhapur': { id: 'MH-KOL', names: { en: 'Kolhapur', mr: 'कोल्हापूर', hi: 'कोल्हापुर' } },
  'Latur': { id: 'MH-LAT', names: { en: 'Latur', mr: 'लातूर', hi: 'लातूर' } },
  'Mumbai City': { id: 'MH-MUC', names: { en: 'Mumbai City', mr: 'मुंबई शहर', hi: 'मुंबई शहर' } },
  'Mumbai Suburban': { id: 'MH-MUS', names: { en: 'Mumbai Suburban', mr: 'मुंबई उपनगर', hi: 'मुंबई उपनगर' } },
  'Nagpur': { id: 'MH-NAG', names: { en: 'Nagpur', mr: 'नागपूर', hi: 'नागपुर' } },
  'Nanded': { id: 'MH-NAN', names: { en: 'Nanded', mr: 'नांदेड', hi: 'नांदेड़' } },
  'Nandurbar': { id: 'MH-NDB', names: { en: 'Nandurbar', mr: 'नंदुरबार', hi: 'नंदुरबार' } },
  'Nashik': { id: 'MH-NAS', names: { en: 'Nashik', mr: 'नाशिक', hi: 'नासिक' } },
  'Palghar': { id: 'MH-PAL', names: { en: 'Palghar', mr: 'पालघर', hi: 'पालघर' } },
  'Parbhani': { id: 'MH-PAR', names: { en: 'Parbhani', mr: 'परभणी', hi: 'परभणी' } },
  'Pune': { id: 'MH-PUN', names: { en: 'Pune', mr: 'पुणे', hi: 'पुणे' } },
  'Raigad': { id: 'MH-RAI', names: { en: 'Raigad', mr: 'रायगड', hi: 'रायगढ़' } },
  'Ratnagiri': { id: 'MH-RAT', names: { en: 'Ratnagiri', mr: 'रत्नागिरी', hi: 'रत्नागिरी' } },
  'Sangli': { id: 'MH-SAN', names: { en: 'Sangli', mr: 'सांगली', hi: 'सांगली' } },
  'Satara': { id: 'MH-SAT', names: { en: 'Satara', mr: 'सातारा', hi: 'सतारा' } },
  'Sindhudurg': { id: 'MH-SIN', names: { en: 'Sindhudurg', mr: 'सिंधुदुर्ग', hi: 'सिंधुदुर्ग' } },
  'Solapur': { id: 'MH-SOL', names: { en: 'Solapur', mr: 'सोलापूर', hi: 'सोलापुर' } },
  'Thane': { id: 'MH-THA', names: { en: 'Thane', mr: 'ठाणे', hi: 'ठाणे' } },
  'Wardha': { id: 'MH-WAR', names: { en: 'Wardha', mr: 'वर्धा', hi: 'वर्धा' } },
  'Washim': { id: 'MH-WAS', names: { en: 'Washim', mr: 'वाशिम', hi: 'वाशिम' } },
  'Yavatmal': { id: 'MH-YAV', names: { en: 'Yavatmal', mr: 'यवतमाळ', hi: 'यवतमाल' } },
};

// Complete 358-taluka Maharashtra Localization Map
export const TALUKA_LOCALIZATION_MAP: Record<string, LocalizedString> = talukasMapData as Record<string, LocalizedString>;

// Backward-compatible alias
export const TALUKA_LOCALIZATION_OVERRIDES: Record<string, LocalizedString> = TALUKA_LOCALIZATION_MAP;

export const normalizeLocationStr = (val: string): string => {
  return (val || '').trim().replace(/\s+/g, ' ');
};

/**
 * Finds localized entry for any taluka name, alias, or localized string
 */
export const findTalukaLocalization = (talukaNameOrCode: string): LocalizedString | undefined => {
  if (!talukaNameOrCode) return undefined;
  const clean = normalizeLocationStr(talukaNameOrCode);
  if (TALUKA_LOCALIZATION_MAP[clean]) {
    return TALUKA_LOCALIZATION_MAP[clean];
  }
  const cleanLower = clean.toLowerCase();
  for (const [key, loc] of Object.entries(TALUKA_LOCALIZATION_MAP)) {
    if (
      key.toLowerCase() === cleanLower ||
      loc.en?.toLowerCase() === cleanLower ||
      loc.mr?.toLowerCase() === cleanLower ||
      loc.hi?.toLowerCase() === cleanLower
    ) {
      return loc;
    }
  }
  return undefined;
};

/**
 * Resolves a localized display string using the deterministic fallback:
 * requested language -> English -> first available value
 */
export const resolveLocalizedText = (
  names?: Partial<LocalizedString> | LocalizedString | string,
  lang: AppLanguage = 'en'
): string => {
  if (!names) return '';
  if (typeof names === 'string') return names;
  return names[lang] || names['en'] || names['mr'] || names['hi'] || Object.values(names)[0] || '';
};

/**
 * Helper to compute collision-free canonical taluka codes for a district
 */
export const getDistrictTalukaCodeMap = (districtEntry: { id?: string; name: string; talukas: string[] }): Map<string, string> => {
  const codeMap = new Map<string, string>();
  const seenCodes = new Set<string>();
  const distId = districtEntry.id || `MH-${districtEntry.name.slice(0, 3).toUpperCase()}`;

  districtEntry.talukas.forEach((tName, idx) => {
    const cleanName = tName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let code = `${distId}-${cleanName.slice(0, 3)}`;
    if (seenCodes.has(code)) {
      code = `${distId}-${cleanName.slice(0, 4)}`;
      if (seenCodes.has(code)) {
        code = `${distId}-${cleanName.slice(0, 3)}${idx + 1}`;
      }
    }
    seenCodes.add(code);
    codeMap.set(tName, code);
  });

  return codeMap;
};

export const locationDirectoryService = {
  getStates(): string[] {
    return [data.state];
  },

  /**
   * Resolves district metadata by canonical name, localized name, or ID
   */
  getDistrictEntry(districtNameOrId: string): (DistrictEntry & { id: string; names: LocalizedString }) | undefined {
    const clean = normalizeLocationStr(districtNameOrId).toLowerCase();
    if (!clean) return undefined;

    // 1. Check direct English canonical name match
    const found = data.districts.find((d) => d.name.toLowerCase() === clean);
    if (found) {
      const loc = DISTRICT_LOCALIZATION_MAP[found.name] || {
        id: `MH-${found.name.slice(0, 3).toUpperCase()}`,
        names: { en: found.name, mr: found.name, hi: found.name },
      };
      return { ...found, id: loc.id, names: loc.names };
    }

    // 2. Check by ID (e.g. 'MH-PUN')
    for (const [canonicalName, loc] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
      if (loc.id.toLowerCase() === clean) {
        const dEntry = data.districts.find((d) => d.name === canonicalName);
        if (dEntry) {
          return { ...dEntry, id: loc.id, names: loc.names };
        }
      }
    }

    // 3. Check by localized Devanagari name (e.g. 'पुणे')
    for (const [canonicalName, loc] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
      if (
        loc.names.mr.toLowerCase() === clean ||
        loc.names.hi.toLowerCase() === clean ||
        loc.names.en.toLowerCase() === clean
      ) {
        const dEntry = data.districts.find((d) => d.name === canonicalName);
        if (dEntry) {
          return { ...dEntry, id: loc.id, names: loc.names };
        }
      }
    }

    return undefined;
  },

  /**
   * Get all districts with display names localized to the requested language.
   */
  getDistricts(prefixQuery?: string, lang: AppLanguage = 'en'): string[] {
    const cleanPrefix = normalizeLocationStr(prefixQuery || '').toLowerCase();
    const allDistricts = data.districts.map((d) => {
      const loc = DISTRICT_LOCALIZATION_MAP[d.name];
      return resolveLocalizedText(loc ? loc.names : d.name, lang);
    });

    if (!cleanPrefix) {
      return [...allDistricts].sort((a, b) => a.localeCompare(b));
    }

    return allDistricts
      .filter((name) => name.toLowerCase().startsWith(cleanPrefix) || name.toLowerCase().includes(cleanPrefix))
      .sort((a, b) => a.localeCompare(b));
  },

  /**
   * Get structured district items with canonical ID and localized display label
   */
  getStructuredDistricts(lang: AppLanguage = 'en'): Array<{ id: string; value: string; label: string; subLabel: string }> {
    return data.districts.map((d) => {
      const loc = DISTRICT_LOCALIZATION_MAP[d.name] || {
        id: `MH-${d.name.slice(0, 3).toUpperCase()}`,
        names: { en: d.name, mr: d.name, hi: d.name },
      };
      const localizedName = resolveLocalizedText(loc.names, lang);
      const enName = loc.names.en;
      return {
        id: loc.id,
        value: d.name,
        label: localizedName,
        subLabel: localizedName !== enName ? enName : `District • ${d.talukas.length} Talukas`,
      };
    });
  },

  /**
   * Get talukas for a specific district, with display names localized to requested language
   */
  getTalukas(districtNameOrId: string, prefixQuery?: string, lang: AppLanguage = 'en'): string[] {
    const districtEntry = this.getDistrictEntry(districtNameOrId);
    if (!districtEntry) return [];

    const cleanPrefix = normalizeLocationStr(prefixQuery || '').toLowerCase();
    const talukaNames = districtEntry.talukas.map((tName) => {
      const loc = findTalukaLocalization(tName);
      return resolveLocalizedText(loc || tName, lang);
    });

    if (!cleanPrefix) {
      return [...talukaNames].sort((a, b) => a.localeCompare(b));
    }

    return talukaNames
      .filter((t) => t.toLowerCase().startsWith(cleanPrefix) || t.toLowerCase().includes(cleanPrefix))
      .sort((a, b) => a.localeCompare(b));
  },

  /**
   * Get structured taluka items with canonical ID and localized display label (guaranteed collision-free unique IDs)
   */
  getStructuredTalukas(districtNameOrId: string, lang: AppLanguage = 'en'): Array<{ id: string; value: string; label: string; subLabel?: string }> {
    const districtEntry = this.getDistrictEntry(districtNameOrId);
    if (!districtEntry) return [];

    const codeMap = getDistrictTalukaCodeMap(districtEntry);

    return districtEntry.talukas.map((tName) => {
      const loc = findTalukaLocalization(tName);
      const localizedName = resolveLocalizedText(loc || tName, lang);
      const talukaCode = codeMap.get(tName) || `${districtEntry.id}-${tName.slice(0, 3).toUpperCase()}`;
      return {
        id: talukaCode,
        value: tName,
        label: localizedName,
        subLabel: localizedName !== tName ? tName : undefined,
      };
    });
  },

  /**
   * Resolves a district ID or localized string into the localized display string
   */
  resolveDistrictDisplay(districtNameOrId: string, lang: AppLanguage = 'en'): string {
    const entry = this.getDistrictEntry(districtNameOrId);
    if (!entry) return districtNameOrId;
    return resolveLocalizedText(entry.names, lang);
  },

  /**
   * Resolves a taluka string into the localized display string
   */
  resolveTalukaDisplay(talukaNameOrCode: string, lang: AppLanguage = 'en'): string {
    if (!talukaNameOrCode) return '';
    const loc = findTalukaLocalization(talukaNameOrCode);
    if (loc) {
      return resolveLocalizedText(loc, lang);
    }
    return talukaNameOrCode;
  },

  /**
   * Verify whether a district name or ID exists in the Maharashtra directory
   */
  isValidDistrict(districtNameOrId: string): boolean {
    return Boolean(this.getDistrictEntry(districtNameOrId));
  },

  /**
   * Verify whether a taluka belongs to a given district
   */
  isValidTaluka(districtNameOrId: string, talukaNameOrId: string): boolean {
    const districtEntry = this.getDistrictEntry(districtNameOrId);
    if (!districtEntry) return false;

    const cleanTal = normalizeLocationStr(talukaNameOrId).toLowerCase();
    return districtEntry.talukas.some((t) => {
      if (t.toLowerCase() === cleanTal) return true;
      const loc = findTalukaLocalization(t);
      if (loc) {
        return (
          loc.mr?.toLowerCase() === cleanTal ||
          loc.hi?.toLowerCase() === cleanTal ||
          loc.en?.toLowerCase() === cleanTal
        );
      }
      return false;
    });
  },

  /**
   * Get canonical English spelling for a district
   */
  getCanonicalDistrict(districtNameOrId: string): string | null {
    const entry = this.getDistrictEntry(districtNameOrId);
    return entry ? entry.name : null;
  },

  /**
   * Get canonical district ID (e.g. 'MH-PUN')
   */
  getDistrictId(districtNameOrId: string): string | null {
    const entry = this.getDistrictEntry(districtNameOrId);
    return entry ? entry.id : null;
  },

  /**
   * Get canonical taluka ID (e.g. 'MH-PUN-HAV')
   */
  getTalukaId(districtNameOrId: string, talukaNameOrCode: string): string | null {
    const districtEntry = this.getDistrictEntry(districtNameOrId);
    if (!districtEntry || !talukaNameOrCode) return null;

    const cleanTal = normalizeLocationStr(talukaNameOrCode).toLowerCase();
    const foundTaluka = districtEntry.talukas.find((t) => {
      if (t.toLowerCase() === cleanTal) return true;
      const loc = findTalukaLocalization(t);
      if (loc) {
        return (
          loc.mr?.toLowerCase() === cleanTal ||
          loc.hi?.toLowerCase() === cleanTal ||
          loc.en?.toLowerCase() === cleanTal
        );
      }
      return false;
    });

    if (foundTaluka) {
      const codeMap = getDistrictTalukaCodeMap(districtEntry);
      return codeMap.get(foundTaluka) || `${districtEntry.id}-${foundTaluka.slice(0, 3).toUpperCase()}`;
    }
    return null;
  },

  /**
   * Get canonical English spelling for a taluka
   */
  getCanonicalTaluka(districtNameOrId: string, talukaNameOrCode: string): string | null {
    const districtEntry = this.getDistrictEntry(districtNameOrId);
    if (!districtEntry || !talukaNameOrCode) return null;

    const cleanTal = normalizeLocationStr(talukaNameOrCode).toLowerCase();
    const foundTaluka = districtEntry.talukas.find((t) => {
      if (t.toLowerCase() === cleanTal) return true;
      const loc = findTalukaLocalization(t);
      if (loc) {
        return (
          loc.mr?.toLowerCase() === cleanTal ||
          loc.hi?.toLowerCase() === cleanTal ||
          loc.en?.toLowerCase() === cleanTal
        );
      }
      return false;
    });

    return foundTaluka || null;
  },
};

export default locationDirectoryService;
