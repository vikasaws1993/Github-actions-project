import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { schemeApi } from '../../api/schemeApi';
import { APP_CONFIG } from '../constants/config';
import { storage } from '../services/storage/storage';
import { useLanguage } from './LanguageContext';
import { AppLanguage, LocalizedString } from '../types/i18n.types';

export interface DynamicSchemeItem {
  id: string;
  name: string; // Active localized display name
  names?: LocalizedString; // Full localized map
  subtitle: string; // Active localized subtitle
  subtitles?: LocalizedString; // Full localized subtitle map
  icon: string;
  isDashed?: boolean;
  code?: string;
  category?: string;
  coverageAmount?: string;
}

export const DEFAULT_SCHEME_OPTIONS: DynamicSchemeItem[] = [
  {
    id: 'pmjay',
    code: 'PMJAY',
    name: 'प्रधानमंत्री जन आरोग्य योजना (आयुष्मान भारत)',
    names: {
      en: 'PMJAY (Ayushman Bharat)',
      mr: 'प्रधानमंत्री जन आरोग्य योजना (आयुष्मान भारत)',
      hi: 'प्रधानमंत्री जन आरोग्य योजना (आयुष्मान भारत)',
    },
    subtitle: '₹५ लाखांपर्यंत मोफत उपचार',
    subtitles: {
      en: 'Free treatment up to ₹5 Lakh',
      mr: '₹५ लाखांपर्यंत मोफत उपचार',
      hi: '₹५ लाख तक मुफ्त इलाज',
    },
    icon: 'shield-checkmark',
  },
  {
    id: 'mjpjay',
    code: 'MJPJAY',
    name: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना',
    names: {
      en: 'Mahatma Jyotiba Phule Jan Arogya Yojana',
      mr: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना',
      hi: 'महात्मा ज्योतिराव फुले जन आरोग्य योजना',
    },
    subtitle: '₹१.५ लाख ते ₹५ लाखांपर्यंत मोफत उपचार',
    subtitles: {
      en: 'Free treatment up to ₹1.5 Lakh to ₹5 Lakh',
      mr: '₹१.५ लाख ते ₹५ लाखांपर्यंत मोफत उपचार',
      hi: '₹१.५ लाख से ₹५ लाख तक मुफ्त इलाज',
    },
    icon: 'medkit',
  },
  {
    id: 'cm_relief_fund',
    code: 'CMRF',
    name: 'मुख्यमंत्री वैद्यकीय सहाय्यता निधी (CMRF)',
    names: {
      en: 'CM Relief Fund (Chief Minister Medical Aid)',
      mr: 'मुख्यमंत्री वैद्यकीय सहाय्यता निधी (CMRF)',
      hi: 'मुख्यमंत्री चिकित्सा सहायता कोष (CMRF)',
    },
    subtitle: 'गंभीर आजार व शस्त्रक्रियांसाठी थेट शासकीय मदत',
    subtitles: {
      en: 'Govt financial grant for critical care & surgeries',
      mr: 'गंभीर आजार व शस्त्रक्रियांसाठी थेट शासकीय मदत',
      hi: 'गंभीर बीमारियों और सर्जरी के लिए सरकारी सहायता',
    },
    icon: 'heart-circle',
  },
  {
    id: 'other',
    code: 'OTHER',
    name: 'इतर शासकीय आरोग्य योजना',
    names: {
      en: 'Other Government Schemes',
      mr: 'इतर शासकीय आरोग्य योजना',
      hi: 'अन्य सरकारी स्वास्थ्य योजनाएं',
    },
    subtitle: 'उपलब्ध इतर शासकीय योजना व मदत',
    subtitles: {
      en: 'Other available govt schemes',
      mr: 'उपलब्ध इतर शासकीय योजना व मदत',
      hi: 'अन्य उपलब्ध सरकारी योजनाएं',
    },
    icon: 'business',
  },
  {
    id: 'dont_know_schemes',
    code: 'UNKNOWN',
    name: 'कोणती योजना निवडावी हे माहित नाही',
    names: {
      en: 'Not sure which scheme to choose',
      mr: 'कोणती योजना निवडावी हे माहित नाही',
      hi: 'कौन सी योजना चुनें यह स्पष्ट नहीं है',
    },
    subtitle: 'आमचे आरोग्य सेवक आपल्याला योग्य योजना निवडण्यात मदत करतील',
    subtitles: {
      en: 'Our Arogya Sevak will help you choose the right scheme',
      mr: 'आमचे आरोग्य सेवक आपल्याला योग्य योजना निवडण्यात मदत करतील',
      hi: 'हमारे आरोग्य सेवक सही योजना चुनने में आपकी मदद करेंगे',
    },
    icon: 'help-circle',
    isDashed: true,
  },
];

/**
 * Resolves localized name using fallback: requested lang -> en -> mr -> hi -> default
 */
const resolveLocalizedSchemeName = (names?: LocalizedString | string, fallbackName: string = '', lang: AppLanguage = 'mr'): string => {
  if (!names) return fallbackName;
  if (typeof names === 'string') return names;
  return names[lang] || names['en'] || names['mr'] || names['hi'] || fallbackName;
};

export const formatSchemeItems = (rawSchemes: any[], lang: AppLanguage = 'mr'): DynamicSchemeItem[] => {
  if (!Array.isArray(rawSchemes) || rawSchemes.length === 0) {
    return DEFAULT_SCHEME_OPTIONS.map((item) => ({
      ...item,
      name: resolveLocalizedSchemeName(item.names, item.name, lang),
      subtitle: resolveLocalizedSchemeName(item.subtitles, item.subtitle, lang),
    }));
  }

  const activeSchemes = rawSchemes.filter((s: any) => s.is_active !== false && s.status !== 'Inactive');
  const formatted: DynamicSchemeItem[] = activeSchemes.map((s: any) => {
    const defaultName = s.name || s.code || 'Healthcare Scheme';
    const localizedName = resolveLocalizedSchemeName(s.names, defaultName, lang);

    let coverageText = s.coverageAmount || s.coverage_amount_text;
    if (!coverageText && (s.maxCoverageVal || s.maximum_coverage_amount)) {
      const val = s.maxCoverageVal || s.maximum_coverage_amount;
      coverageText = lang === 'en'
        ? `Free treatment up to ₹${Number(val).toLocaleString('en-IN')}`
        : `₹${Number(val).toLocaleString('en-IN')} पर्यंत मोफत उपचार`;
    }
    if (!coverageText) {
      coverageText = lang === 'en' ? 'Govt health benefits & coverage' : 'शासकीय आरोग्य योजना व लाभ';
    }

    let icon = 'shield-checkmark';
    const nameLower = defaultName.toLowerCase();
    if (nameLower.includes('jyotirao') || nameLower.includes('mjpjay')) icon = 'medkit';
    else if (nameLower.includes('relief') || nameLower.includes('cmrf') || nameLower.includes('chief minister')) icon = 'heart-circle';
    else if (nameLower.includes('dialysis') || nameLower.includes('kidney')) icon = 'fitness';
    else if (nameLower.includes('nidhi') || nameLower.includes('ran')) icon = 'cash';

    return {
      id: s.id,
      name: localizedName,
      names: s.names,
      subtitle: coverageText,
      subtitles: s.subtitles,
      icon: icon,
      code: s.code || s.scheme_code,
      category: s.category,
      coverageAmount: coverageText,
    };
  });

  // Append fixed "Not sure which scheme to choose" option at end with localized text
  const unknownOption = DEFAULT_SCHEME_OPTIONS.find((s) => s.id === 'dont_know_schemes') || DEFAULT_SCHEME_OPTIONS[4];
  formatted.push({
    ...unknownOption,
    name: resolveLocalizedSchemeName(unknownOption.names, unknownOption.name, lang),
    subtitle: resolveLocalizedSchemeName(unknownOption.subtitles, unknownOption.subtitle, lang),
  });

  return formatted;
};

interface SchemeContextType {
  schemes: DynamicSchemeItem[];
  rawSchemes: any[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  refreshSchemes: (isManual?: boolean) => Promise<void>;
  getSchemeById: (id: string) => DynamicSchemeItem | undefined;
}

const SchemeContext = createContext<SchemeContextType | undefined>(undefined);

export const SchemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [rawSchemes, setRawSchemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load cached schemes from storage on startup
  useEffect(() => {
    const loadCachedSchemes = async () => {
      try {
        const cached = await storage.getItem<{ rawSchemes: any[]; formatted: DynamicSchemeItem[]; timestamp: string }>(
          APP_CONFIG.STORAGE_KEYS.SCHEMES_CACHE
        );
        if (cached && cached.rawSchemes && Array.isArray(cached.rawSchemes) && cached.rawSchemes.length > 0) {
          setRawSchemes(cached.rawSchemes);
          setLastUpdated(cached.timestamp || null);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[SchemeContext] Error loading cached schemes:', err);
      }
    };

    loadCachedSchemes();
  }, []);

  const refreshSchemes = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    try {
      const json = await schemeApi.getSchemes();
      const rawList = json?.data?.schemes || (json as any)?.schemes || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const timestamp = new Date().toISOString();
        setRawSchemes(rawList);
        setLastUpdated(timestamp);

        // Update local storage cache
        await storage.setItem(APP_CONFIG.STORAGE_KEYS.SCHEMES_CACHE, {
          rawSchemes: rawList,
          timestamp,
        });
      }
    } catch (err) {
      console.warn('[SchemeContext] Error refreshing schemes:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch fresh schemes in background on provider mount
  useEffect(() => {
    refreshSchemes(false);
  }, [refreshSchemes]);

  // Dynamically compute formatted schemes for the active language in real time
  const schemes = useMemo(() => {
    return formatSchemeItems(rawSchemes, language);
  }, [rawSchemes, language]);

  const getSchemeById = useCallback(
    (id: string) => {
      return schemes.find((s) => s.id === id);
    },
    [schemes]
  );

  return (
    <SchemeContext.Provider
      value={{
        schemes,
        rawSchemes,
        isLoading,
        isRefreshing,
        lastUpdated,
        refreshSchemes,
        getSchemeById,
      }}
    >
      {children}
    </SchemeContext.Provider>
  );
};

export const useSchemes = (): SchemeContextType => {
  const context = useContext(SchemeContext);
  if (!context) {
    throw new Error('useSchemes must be used within a SchemeProvider');
  }
  return context;
};
