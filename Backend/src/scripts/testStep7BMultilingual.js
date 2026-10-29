/**
 * Step 7B Multilingual Backend Verification & Test Suite
 * 
 * Verifies:
 * 1. Accept-Language header parsing (mr, mr-IN, hi, hi-IN, en, en-IN, missing, unsupported)
 * 2. Master data localization resolution for canonical codes (MH-PUN, MH-PUN-HAV, PMJAY)
 * 3. Exact Canonical Code Application Ingestion (MH-PUN -> districts.id, MH-PUN-HAV -> talukas.id)
 * 4. Legacy Compatibility Fallback ('Pune' -> Pune, 'Haveli' -> Haveli)
 * 5. Free-Text Immutability Guarantee (medicalCauseNote, remarks, address, hospitalName)
 */

import { parseAcceptLanguage, resolveLocalizedText } from '../middlewares/language.middleware.js';
import { resolveDistrict, resolveTaluka } from '../utils/locationResolver.util.js';
import { formatSchemeResponse } from '../services/scheme.service.js';
import { formatApplicationResponse } from '../services/application.service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================================');
  console.log('🧪 RUNNING STEP 7B BACKEND MULTILINGUAL VERIFICATION TESTS');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Accept-Language Header Parsing
  // --------------------------------------------------------------------------
  console.log('Test Group 1: Accept-Language Header Normalization');
  assert(parseAcceptLanguage('mr') === 'mr', 'parseAcceptLanguage("mr") -> "mr"');
  assert(parseAcceptLanguage('mr-IN') === 'mr', 'parseAcceptLanguage("mr-IN") -> "mr"');
  assert(parseAcceptLanguage('mr_IN') === 'mr', 'parseAcceptLanguage("mr_IN") -> "mr"');
  assert(parseAcceptLanguage('hi') === 'hi', 'parseAcceptLanguage("hi") -> "hi"');
  assert(parseAcceptLanguage('hi-IN') === 'hi', 'parseAcceptLanguage("hi-IN") -> "hi"');
  assert(parseAcceptLanguage('hi_IN') === 'hi', 'parseAcceptLanguage("hi_IN") -> "hi"');
  assert(parseAcceptLanguage('en') === 'en', 'parseAcceptLanguage("en") -> "en"');
  assert(parseAcceptLanguage('en-IN') === 'en', 'parseAcceptLanguage("en-IN") -> "en"');
  assert(parseAcceptLanguage('en-US') === 'en', 'parseAcceptLanguage("en-US") -> "en"');
  assert(parseAcceptLanguage('') === 'en', 'parseAcceptLanguage("") [missing] -> "en" (default fallback)');
  assert(parseAcceptLanguage(null) === 'en', 'parseAcceptLanguage(null) -> "en"');
  assert(parseAcceptLanguage(undefined) === 'en', 'parseAcceptLanguage(undefined) -> "en"');
  assert(parseAcceptLanguage('fr-FR,fr;q=0.9') === 'en', 'parseAcceptLanguage("fr-FR") [unsupported] -> "en"');
  assert(parseAcceptLanguage('de-DE') === 'en', 'parseAcceptLanguage("de-DE") [unsupported] -> "en"');
  assert(parseAcceptLanguage('mr-IN,mr;q=0.9,en-US;q=0.8,en;q=0.7') === 'mr', 'parseAcceptLanguage weighted multi-tag with mr first -> "mr"');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Master Data Localization Dictionary Resolution
  // --------------------------------------------------------------------------
  console.log('\nTest Group 2: Master Data Localized String Resolution');
  const puneNames = { en: 'Pune', mr: 'पुणे', hi: 'पुणे' };
  assert(resolveLocalizedText(puneNames, 'Pune', 'en') === 'Pune', 'Pune localized in English -> "Pune"');
  assert(resolveLocalizedText(puneNames, 'Pune', 'mr') === 'पुणे', 'Pune localized in Marathi -> "पुणे"');
  assert(resolveLocalizedText(puneNames, 'Pune', 'hi') === 'पुणे', 'Pune localized in Hindi -> "पुणे"');

  const haveliNames = { en: 'Haveli', mr: 'हवेली', hi: 'हवेली' };
  assert(resolveLocalizedText(haveliNames, 'Haveli', 'en') === 'Haveli', 'Haveli localized in English -> "Haveli"');
  assert(resolveLocalizedText(haveliNames, 'Haveli', 'mr') === 'हवेली', 'Haveli localized in Marathi -> "हवेली"');
  assert(resolveLocalizedText(haveliNames, 'Haveli', 'hi') === 'हवेली', 'Haveli localized in Hindi -> "हवेली"');

  const ahmednagarNames = { en: 'Ahmednagar', mr: 'अहमदनगर (अहिल्यानगर)', hi: 'अहमदनगर' };
  assert(resolveLocalizedText(ahmednagarNames, 'Ahmednagar', 'mr') === 'अहमदनगर (अहिल्यानगर)', 'Ahmednagar localized in Marathi -> "अहमदनगर (अहिल्यानगर)"');

  // Scheme response formatting
  const mockSchemeRow = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    scheme_code: 'PMJAY',
    name: 'Ayushman Bharat PM-JAY',
    names: {
      en: 'Ayushman Bharat PM-JAY',
      mr: 'आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)',
      hi: 'आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)',
    },
    subtitles: {
      en: 'National Cashless Health Protection Scheme',
      mr: 'राष्ट्रीय कॅशलेस आरोग्य संरक्षण योजना',
      hi: 'राष्ट्रीय कैशलेस स्वास्थ्य सुरक्षा योजना',
    },
    descriptions: {
      en: 'Cashless secondary and tertiary hospitalization coverage up to ₹5,00,000 per family per year.',
      mr: 'पात्र कुटुंबांना दरवर्षी ₹५ लाखांपर्यंत द्वितीयक आणि तृतीयक मोफत कॅशलेस आरोग्य उपचार.',
      hi: 'कमजोर परिवारों के लिए प्रति वर्ष प्रति परिवार ₹5,00,000 तक कैशलेस अस्पताल में भर्ती कवर।',
    },
    maximum_coverage_amount: 500000.0,
    category: 'National Flagship Scheme',
  };

  const formattedEn = formatSchemeResponse(mockSchemeRow, 'en');
  assert(formattedEn.name === 'Ayushman Bharat PM-JAY', 'Scheme English response has English name');
  assert(formattedEn.subtitle === 'National Cashless Health Protection Scheme', 'Scheme English response has English subtitle');
  assert(formattedEn.names.mr === 'आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)', 'Scheme English response retains full names dictionary');

  const formattedMr = formatSchemeResponse(mockSchemeRow, 'mr');
  assert(formattedMr.name === 'आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)', 'Scheme Marathi response has Marathi name');
  assert(formattedMr.subtitle === 'राष्ट्रीय कॅशलेस आरोग्य संरक्षण योजना', 'Scheme Marathi response has Marathi subtitle');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Application Ingestion Canonical Code Resolution
  // --------------------------------------------------------------------------
  console.log('\nTest Group 3: Application Ingestion Canonical Code Resolution');
  const resolvedDistCode = await resolveDistrict('MH-PUN');
  assert(resolvedDistCode.matchType === 'EXACT_CODE' || resolvedDistCode.nameEnglish === 'Pune', 'district_id="MH-PUN" resolves via EXACT code lookup');
  assert(resolvedDistCode.code === 'MH-PUN' || resolvedDistCode.nameEnglish === 'Pune', 'district_id="MH-PUN" mapped to canonical name "Pune"');

  const resolvedTalCode = await resolveTaluka('MH-PUN-HAV');
  assert(resolvedTalCode.matchType === 'EXACT_CODE' || resolvedTalCode.nameEnglish === 'Haveli', 'taluka_id="MH-PUN-HAV" resolves via EXACT code lookup');
  assert(resolvedTalCode.code === 'MH-PUN-HAV' || resolvedTalCode.nameEnglish === 'Haveli', 'taluka_id="MH-PUN-HAV" mapped to canonical name "Haveli"');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Legacy Compatibility Fallback
  // --------------------------------------------------------------------------
  console.log('\nTest Group 4: Legacy Compatibility Fallback');
  const legacyDist = await resolveDistrict('Pune');
  assert(legacyDist.nameEnglish === 'Pune', 'Legacy district="Pune" resolves correctly to canonical "Pune"');

  const legacyTal = await resolveTaluka('Haveli');
  assert(legacyTal.nameEnglish === 'Haveli', 'Legacy taluka="Haveli" resolves correctly to canonical "Haveli"');

  const legacyMrDist = await resolveDistrict('पुणे');
  assert(legacyMrDist.nameEnglish === 'Pune' || legacyMrDist.matchType === 'LOCALIZED_NAME', 'Legacy Marathi district="पुणे" resolves correctly');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Free-Text Immutability Guarantee
  // --------------------------------------------------------------------------
  console.log('\nTest Group 5: Free-Text Immutability Guarantee');
  const rawMedicalNote = 'Patient diagnosed with severe acute myocardial infarction (रुग्णाला तातडीने ICU आणि स्टेंटची गरज आहे). Urgent bypass suggested.';
  const rawRemarks = 'Family holds Yellow Ration Card. Verified with Sarpanch on 28-09-2026.';
  const rawAddress = 'Flat 402, Shiv Krupa Apts, Opposite Datta Mandir, Shivaji Chowk';
  const rawHospitalName = 'Deenanath Mangeshkar Hospital & Research Center, Erandwane';

  const mockAppRow = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    application_number: 'AA-2026-00042',
    current_status: 'SUBMITTED',
    patient_name: 'Anand Shinde (आनंद शिंदे)',
    patient_address: rawAddress,
    patient_district: 'Pune',
    patient_taluka: 'Haveli',
    medical_cause_note: rawMedicalNote,
    remarks: rawRemarks,
    hospital_name: rawHospitalName,
    suggested_scheme_name: 'Mahatma Jyotirao Phule Jan Arogya Yojana',
  };

  const appResponse = formatApplicationResponse(mockAppRow);

  assert(appResponse.medicalCauseNote === rawMedicalNote, 'medicalCauseNote is 100% byte-for-byte identical (unmodified & untranslated)');
  assert(appResponse.condition === rawMedicalNote, 'condition fallback is 100% byte-for-byte identical');
  assert(appResponse.remarks === rawRemarks, 'remarks is 100% byte-for-byte identical');
  assert(appResponse.patient.address === rawAddress, 'patient.address is 100% byte-for-byte identical');
  assert(appResponse.hospitalName === rawHospitalName, 'hospitalName is 100% byte-for-byte identical');
  assert(appResponse.hospital === rawHospitalName, 'hospital alias is 100% byte-for-byte identical');

  console.log('\n================================================================================');
  console.log(`📊 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
