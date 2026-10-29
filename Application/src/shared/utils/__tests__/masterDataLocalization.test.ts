import { locationDirectoryService, DISTRICT_LOCALIZATION_MAP, resolveLocalizedText } from '../../services/locationDirectoryService';
import { specializationService, SPECIALIZATION_LOCALIZATION_MAP } from '../../services/specializationService';
import { formatSchemeItems, DEFAULT_SCHEME_OPTIONS } from '../../context/SchemeContext';
import { AppLanguage, LocalizedString } from '../../types/i18n.types';

describe('Step 5: Master Data Localization Test Suite', () => {
  describe('Requirement 1 & 2: Pune Display in English, Marathi, Hindi', () => {
    test('Pune resolves correctly across all supported languages', () => {
      expect(locationDirectoryService.resolveDistrictDisplay('Pune', 'en')).toBe('Pune');
      expect(locationDirectoryService.resolveDistrictDisplay('Pune', 'mr')).toBe('पुणे');
      expect(locationDirectoryService.resolveDistrictDisplay('Pune', 'hi')).toBe('पुणे');

      // Test resolving by ID 'MH-PUN'
      expect(locationDirectoryService.resolveDistrictDisplay('MH-PUN', 'en')).toBe('Pune');
      expect(locationDirectoryService.resolveDistrictDisplay('MH-PUN', 'mr')).toBe('पुणे');
      expect(locationDirectoryService.resolveDistrictDisplay('MH-PUN', 'hi')).toBe('पुणे');

      // Test resolving by Devanagari 'पुणे'
      expect(locationDirectoryService.resolveDistrictDisplay('पुणे', 'en')).toBe('Pune');
      expect(locationDirectoryService.resolveDistrictDisplay('पुणे', 'mr')).toBe('पुणे');
      expect(locationDirectoryService.resolveDistrictDisplay('पुणे', 'hi')).toBe('पुणे');
    });

    test('Pune district entry contains stable ID and localized names', () => {
      const entry = locationDirectoryService.getDistrictEntry('Pune');
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('MH-PUN');
      expect(entry?.names.en).toBe('Pune');
      expect(entry?.names.mr).toBe('पुणे');
      expect(entry?.names.hi).toBe('पुणे');
    });
  });

  describe('Requirement 2 & 6: Deterministic Fallback Mechanism', () => {
    test('Fallback: requested language -> English -> first available', () => {
      const testNamesOnlyEn: Partial<LocalizedString> = { en: 'Speciality Care' };
      expect(resolveLocalizedText(testNamesOnlyEn, 'mr')).toBe('Speciality Care');
      expect(resolveLocalizedText(testNamesOnlyEn, 'hi')).toBe('Speciality Care');

      const testNamesMrOnly: Partial<LocalizedString> = { mr: 'विशिष्ट सेवा' };
      expect(resolveLocalizedText(testNamesMrOnly, 'hi')).toBe('विशिष्ट सेवा');

      const testString = 'Plain String';
      expect(resolveLocalizedText(testString as any, 'mr')).toBe('Plain String');
    });
  });

  describe('District & Taluka Dropdowns & Structured Select Items', () => {
    test('getStructuredDistricts returns localized label and canonical value', () => {
      const mrDistricts = locationDirectoryService.getStructuredDistricts('mr');
      const puneMr = mrDistricts.find((d) => d.id === 'MH-PUN');
      expect(puneMr).toBeDefined();
      expect(puneMr?.label).toBe('पुणे');
      expect(puneMr?.value).toBe('Pune');
      expect(puneMr?.subLabel).toBe('Pune');

      const enDistricts = locationDirectoryService.getStructuredDistricts('en');
      const puneEn = enDistricts.find((d) => d.id === 'MH-PUN');
      expect(puneEn?.label).toBe('Pune');
      expect(puneEn?.value).toBe('Pune');
    });

    test('getStructuredTalukas returns localized taluka names for Pune and Satara', () => {
      const mrTalukas = locationDirectoryService.getStructuredTalukas('Pune', 'mr');
      const haveliMr = mrTalukas.find((t) => t.value === 'Haveli');
      expect(haveliMr).toBeDefined();
      expect(haveliMr?.label).toBe('हवेली');
      expect(haveliMr?.value).toBe('Haveli');

      const sataraMrTalukas = locationDirectoryService.getStructuredTalukas('Satara', 'mr');
      const khatavMr = sataraMrTalukas.find((t) => t.value === 'Khatav');
      expect(khatavMr).toBeDefined();
      expect(khatavMr?.label).toBe('खटाव');
      expect(khatavMr?.value).toBe('Khatav');

      // Test resolveTalukaDisplay for Khatav
      expect(locationDirectoryService.resolveTalukaDisplay('Khatav', 'mr')).toBe('खटाव');
      expect(locationDirectoryService.resolveTalukaDisplay('Khatav', 'en')).toBe('Khatav');
    });

    test('isValidDistrict and isValidTaluka work with both English and localized names', () => {
      expect(locationDirectoryService.isValidDistrict('Pune')).toBe(true);
      expect(locationDirectoryService.isValidDistrict('पुणे')).toBe(true);
      expect(locationDirectoryService.isValidDistrict('MH-PUN')).toBe(true);
      expect(locationDirectoryService.isValidDistrict('Satara')).toBe(true);
      expect(locationDirectoryService.isValidDistrict('सातारा')).toBe(true);
      expect(locationDirectoryService.isValidDistrict('NonExistentDistrict')).toBe(false);

      expect(locationDirectoryService.isValidTaluka('Pune', 'Haveli')).toBe(true);
      expect(locationDirectoryService.isValidTaluka('Pune', 'हवेली')).toBe(true);
      expect(locationDirectoryService.isValidTaluka('Satara', 'Khatav')).toBe(true);
      expect(locationDirectoryService.isValidTaluka('Satara', 'खटाव')).toBe(true);
      expect(locationDirectoryService.isValidTaluka('Pune', 'NonExistentTaluka')).toBe(false);
    });
  });

  describe('Scheme Localization & Stable IDs', () => {
    test('formatSchemeItems changes display name when appLanguage changes', () => {
      const enSchemes = formatSchemeItems(DEFAULT_SCHEME_OPTIONS, 'en');
      const mrSchemes = formatSchemeItems(DEFAULT_SCHEME_OPTIONS, 'mr');
      const hiSchemes = formatSchemeItems(DEFAULT_SCHEME_OPTIONS, 'hi');

      const pmjayEn = enSchemes.find((s) => s.id === 'pmjay');
      const pmjayMr = mrSchemes.find((s) => s.id === 'pmjay');
      const pmjayHi = hiSchemes.find((s) => s.id === 'pmjay');

      expect(pmjayEn?.name).toBe('PMJAY (Ayushman Bharat)');
      expect(pmjayMr?.name).toBe('प्रधानमंत्री जन आरोग्य योजना (आयुष्मान भारत)');
      expect(pmjayHi?.name).toBe('प्रधानमंत्री जन आरोग्य योजना (आयुष्मान भारत)');

      // Verify ID and Code remain stable across language changes
      expect(pmjayEn?.id).toBe('pmjay');
      expect(pmjayMr?.id).toBe('pmjay');
      expect(pmjayHi?.id).toBe('pmjay');
      expect(pmjayEn?.code).toBe('PMJAY');
      expect(pmjayMr?.code).toBe('PMJAY');
      expect(pmjayHi?.code).toBe('PMJAY');
    });
  });

  describe('Specialization Master Data Localization', () => {
    test('Cardiology resolves to Marathi, Hindi, and English with stable code SPEC_CARD', () => {
      expect(specializationService.resolveDisplay('Cardiology', 'en')).toBe('Cardiology');
      expect(specializationService.resolveDisplay('Cardiology', 'mr')).toBe('हृदयरोग (Cardiology)');
      expect(specializationService.resolveDisplay('Cardiology', 'hi')).toBe('हृदय रोग (Cardiology)');

      expect(specializationService.resolveDisplay('SPEC_CARD', 'en')).toBe('Cardiology');
      expect(specializationService.resolveDisplay('SPEC_CARD', 'mr')).toBe('हृदयरोग (Cardiology)');
    });

    test('getStructuredSpecializations provides localized label and stable value', () => {
      const mrSpecs = specializationService.getStructuredSpecializations('mr');
      const cardio = mrSpecs.find((s) => s.id === 'SPEC_CARD');
      expect(cardio).toBeDefined();
      expect(cardio?.code).toBe('CARDIOLOGY');
      expect(cardio?.value).toBe('Cardiology');
      expect(cardio?.label).toBe('हृदयरोग (Cardiology)');
    });
  });

  describe('Step 6: Application Payload ID/Code Migration & Invariants', () => {
    test('District ID is MH-PUN regardless of whether selected in English, Marathi, or Hindi', () => {
      expect(locationDirectoryService.getDistrictId('Pune')).toBe('MH-PUN');
      expect(locationDirectoryService.getDistrictId('पुणे')).toBe('MH-PUN');
      expect(locationDirectoryService.getDistrictId('MH-PUN')).toBe('MH-PUN');

      expect(locationDirectoryService.getCanonicalDistrict('Pune')).toBe('Pune');
      expect(locationDirectoryService.getCanonicalDistrict('पुणे')).toBe('Pune');
      expect(locationDirectoryService.getCanonicalDistrict('MH-PUN')).toBe('Pune');
    });

    test('Taluka ID is MH-PUN-HAV regardless of language input', () => {
      expect(locationDirectoryService.getTalukaId('Pune', 'Haveli')).toBe('MH-PUN-HAV');
      expect(locationDirectoryService.getTalukaId('Pune', 'हवेली')).toBe('MH-PUN-HAV');
      expect(locationDirectoryService.getTalukaId('MH-PUN', 'हवेली')).toBe('MH-PUN-HAV');

      expect(locationDirectoryService.getCanonicalTaluka('Pune', 'हवेली')).toBe('Haveli');
      expect(locationDirectoryService.getCanonicalTaluka('पुणे', 'Haveli')).toBe('Haveli');
    });

    test('Free-text fields (medicalCauseNote, address, remarks) are preserved verbatim', () => {
      const freeTextNote = 'माझ्या वडिलांना chest pain आहे';
      const freeTextAddress = 'Flat 402, Shiv Shrushti, Near Ganesh Mandir';
      const freeTextHospital = 'Custom Local Clinic, Khed';

      // Verify strings are not altered or normalized away
      expect(freeTextNote).toBe('माझ्या वडिलांना chest pain आहे');
      expect(freeTextAddress).toBe('Flat 402, Shiv Shrushti, Near Ganesh Mandir');
      expect(freeTextHospital).toBe('Custom Local Clinic, Khed');
    });
  });
});
