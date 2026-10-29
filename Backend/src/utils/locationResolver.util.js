import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalizes input string (trims and collapses whitespace)
 */
export const normalizeLocationStr = (val) => {
  return (val || '').trim().replace(/\s+/g, ' ');
};

export const DISTRICT_LOCALIZATION_MAP = {
  'Ahmednagar': { code: 'MH-AHM', district_code: '466', names: { en: 'Ahmednagar', mr: 'अहमदनगर (अहिल्यानगर)', hi: 'अहमदनगर' } },
  'Akola': { code: 'MH-AKO', district_code: '467', names: { en: 'Akola', mr: 'अकोला', hi: 'अकोला' } },
  'Amravati': { code: 'MH-AMR', district_code: '468', names: { en: 'Amravati', mr: 'अमरावती', hi: 'अमरावती' } },
  'Beed': { code: 'MH-BEE', district_code: '470', names: { en: 'Beed', mr: 'बीड', hi: 'बीड' } },
  'Bhandara': { code: 'MH-BHA', district_code: '471', names: { en: 'Bhandara', mr: 'भंडारा', hi: 'भंडारा' } },
  'Buldhana': { code: 'MH-BUL', district_code: '472', names: { en: 'Buldhana', mr: 'बुलढाणा', hi: 'बुलढाणा' } },
  'Chandrapur': { code: 'MH-CHA', district_code: '473', names: { en: 'Chandrapur', mr: 'चंद्रपूर', hi: 'चंद्रपुर' } },
  'Chhatrapati Sambhajinagar': { code: 'MH-CSN', district_code: '469', names: { en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', hi: 'छत्रपति संभाजीनगर' } },
  'Dharashiv': { code: 'MH-DHA', district_code: '488', names: { en: 'Dharashiv', mr: 'धाराशिव', hi: 'धाराशिव' } },
  'Dhule': { code: 'MH-DHU', district_code: '474', names: { en: 'Dhule', mr: 'धुळे', hi: 'धुले' } },
  'Gadchiroli': { code: 'MH-GAD', district_code: '475', names: { en: 'Gadchiroli', mr: 'गडचिरोली', hi: 'गडचिरोली' } },
  'Gondia': { code: 'MH-GON', district_code: '476', names: { en: 'Gondia', mr: 'गोंदिया', hi: 'गोंदिया' } },
  'Hingoli': { code: 'MH-HIN', district_code: '477', names: { en: 'Hingoli', mr: 'हिंगोली', hi: 'हिंगोली' } },
  'Jalgaon': { code: 'MH-JAL', district_code: '478', names: { en: 'Jalgaon', mr: 'जळगाव', hi: 'जलगांव' } },
  'Jalna': { code: 'MH-JLN', district_code: '479', names: { en: 'Jalna', mr: 'जालना', hi: 'जालना' } },
  'Kolhapur': { code: 'MH-KOL', district_code: '480', names: { en: 'Kolhapur', mr: 'कोल्हापूर', hi: 'कोल्हापुर' } },
  'Latur': { code: 'MH-LAT', district_code: '481', names: { en: 'Latur', mr: 'लातूर', hi: 'लातूर' } },
  'Mumbai City': { code: 'MH-MUC', district_code: '482', names: { en: 'Mumbai City', mr: 'मुंबई शहर', hi: 'मुंबई शहर' } },
  'Mumbai Suburban': { code: 'MH-MUS', district_code: '483', names: { en: 'Mumbai Suburban', mr: 'मुंबई उपनगर', hi: 'मुंबई उपनगर' } },
  'Nagpur': { code: 'MH-NAG', district_code: '484', names: { en: 'Nagpur', mr: 'नागपूर', hi: 'नागपुर' } },
  'Nanded': { code: 'MH-NAN', district_code: '485', names: { en: 'Nanded', mr: 'नांदेड', hi: 'नांदेड़' } },
  'Nandurbar': { code: 'MH-NDB', district_code: '486', names: { en: 'Nandurbar', mr: 'नंदुरबार', hi: 'नंदुरबार' } },
  'Nashik': { code: 'MH-NAS', district_code: '487', names: { en: 'Nashik', mr: 'नाशिक', hi: 'नासिक' } },
  'Palghar': { code: 'MH-PAL', district_code: '665', names: { en: 'Palghar', mr: 'पालघर', hi: 'पालघर' } },
  'Parbhani': { code: 'MH-PAR', district_code: '489', names: { en: 'Parbhani', mr: 'परभणी', hi: 'परभणी' } },
  'Pune': { code: 'MH-PUN', district_code: '490', names: { en: 'Pune', mr: 'पुणे', hi: 'पुणे' } },
  'Raigad': { code: 'MH-RAI', district_code: '491', names: { en: 'Raigad', mr: 'रायगड', hi: 'रायगढ़' } },
  'Ratnagiri': { code: 'MH-RAT', district_code: '492', names: { en: 'Ratnagiri', mr: 'रत्नागिरी', hi: 'रत्नागिरी' } },
  'Sangli': { code: 'MH-SAN', district_code: '493', names: { en: 'Sangli', mr: 'सांगली', hi: 'सांगली' } },
  'Satara': { code: 'MH-SAT', district_code: '494', names: { en: 'Satara', mr: 'सातारा', hi: 'सतारा' } },
  'Sindhudurg': { code: 'MH-SIN', district_code: '495', names: { en: 'Sindhudurg', mr: 'सिंधुदुर्ग', hi: 'सिंधुदुर्ग' } },
  'Solapur': { code: 'MH-SOL', district_code: '496', names: { en: 'Solapur', mr: 'सोलापूर', hi: 'सोलापुर' } },
  'Thane': { code: 'MH-THA', district_code: '497', names: { en: 'Thane', mr: 'ठाणे', hi: 'ठाणे' } },
  'Wardha': { code: 'MH-WAR', district_code: '498', names: { en: 'Wardha', mr: 'वर्धा', hi: 'वर्धा' } },
  'Washim': { code: 'MH-WAS', district_code: '499', names: { en: 'Washim', mr: 'वाशिम', hi: 'वाशिम' } },
  'Yavatmal': { code: 'MH-YAV', district_code: '500', names: { en: 'Yavatmal', mr: 'यवतमाळ', hi: 'यवतमाल' } },
};

export const TALUKA_LOCALIZATION_MAP = {
  'Haveli': { code: 'MH-PUN-HAV', district_code: '490', subdistrict_code: '4193', names: { en: 'Haveli', mr: 'हवेली', hi: 'हवेली' } },
  'Pune City': { code: 'MH-PUN-PUN', district_code: '490', subdistrict_code: '4194', names: { en: 'Pune City', mr: 'पुणे शहर', hi: 'पुणे शहर' } },
  'Khed': { code: 'MH-PUN-KHE', district_code: '490', subdistrict_code: '4190', names: { en: 'Khed', mr: 'खेड (राजगुरुनगर)', hi: 'खेड' } },
  'Baramati': { code: 'MH-PUN-BAR', district_code: '490', subdistrict_code: '4199', names: { en: 'Baramati', mr: 'बारामती', hi: 'बारामती' } },
  'Mawal': { code: 'MH-PUN-MAV', district_code: '490', subdistrict_code: '4191', names: { en: 'Mawal', mr: 'मावळ (वडगाव)', hi: 'मावल' } },
  'Mulshi': { code: 'MH-PUN-MUL', district_code: '490', subdistrict_code: '4192', names: { en: 'Mulshi', mr: 'मुळशी (पौड)', hi: 'मुलशी' } },
  'Shirur': { code: 'MH-PUN-SHI', district_code: '490', subdistrict_code: '4189', names: { en: 'Shirur', mr: 'शिरूर', hi: 'शिरूर' } },
  'Ambegaon': { code: 'MH-PUN-AMB', district_code: '490', subdistrict_code: '4188', names: { en: 'Ambegaon', mr: 'आंबेगाव (घोडेगाव)', hi: 'आंबेगांव' } },
  'Daund': { code: 'MH-PUN-DAU', district_code: '490', subdistrict_code: '4195', names: { en: 'Daund', mr: 'दौंड', hi: 'दौंड' } },
  'Indapur': { code: 'MH-PUN-IND', district_code: '490', subdistrict_code: '4200', names: { en: 'Indapur', mr: 'इंदापूर', hi: 'इंदापुर' } },
  'Junnar': { code: 'MH-PUN-JUN', district_code: '490', subdistrict_code: '4187', names: { en: 'Junnar', mr: 'जुन्नर', hi: 'जुन्नर' } },
  'Purandhar': { code: 'MH-PUN-PUR', district_code: '490', subdistrict_code: '4196', names: { en: 'Purandhar', mr: 'पुरंदर (सासवड)', hi: 'पुरंदर' } },
  'Bhor': { code: 'MH-PUN-BHO', district_code: '490', subdistrict_code: '4198', names: { en: 'Bhor', mr: 'भोर', hi: 'भोर' } },
  'Velhe': { code: 'MH-PUN-VEL', district_code: '490', subdistrict_code: '4197', names: { en: 'Velhe', mr: 'वेल्हे (राजगड)', hi: 'वेल्हे' } },
  'Kalyan': { code: 'MH-THA-KAL', district_code: '497', subdistrict_code: '4158', names: { en: 'Kalyan', mr: 'कल्याण', hi: 'कल्याण' } },
  'Thane': { code: 'MH-THA-THA', district_code: '497', subdistrict_code: '4157', names: { en: 'Thane', mr: 'ठाणे', hi: 'ठाणे' } },
  'Panvel': { code: 'MH-RAI-PAN', district_code: '491', subdistrict_code: '4173', names: { en: 'Panvel', mr: 'पनवेल', hi: 'पनवेल' } },
  'Karjat': { code: 'MH-RAI-KAR', district_code: '491', subdistrict_code: '4174', names: { en: 'Karjat', mr: 'कर्जत', hi: 'कर्जत' } },
  'Vasai': { code: 'MH-PAL-VAS', district_code: '665', subdistrict_code: '4164', names: { en: 'Vasai', mr: 'वसई', hi: 'वसई' } },
  'Sangamner': { code: 'MH-AHM-SAN', district_code: '466', subdistrict_code: '4202', names: { en: 'Sangamner', mr: 'संगमनेर', hi: 'संगमनेर' } },
  'Khatav': { code: 'MH-SAT-KHA', district_code: '494', subdistrict_code: '4260', names: { en: 'Khatav', mr: 'खटाव', hi: 'खटाव' } },
  'Satara': { code: 'MH-SAT-SAT', district_code: '494', subdistrict_code: '4262', names: { en: 'Satara', mr: 'सातारा', hi: 'सतारा' } },
  'Karad': { code: 'MH-SAT-KRD', district_code: '494', subdistrict_code: '4265', names: { en: 'Karad', mr: 'कराड', hi: 'कराड' } },
  'Wai': { code: 'MH-SAT-WAI', district_code: '494', subdistrict_code: '4256', names: { en: 'Wai', mr: 'वाई', hi: 'वाई' } },
  'Phaltan': { code: 'MH-SAT-PHA', district_code: '494', subdistrict_code: '4258', names: { en: 'Phaltan', mr: 'फलटण', hi: 'फलटण' } },
  'Aurangabad': { code: 'MH-CSN-CSN', district_code: '469', subdistrict_code: '4137', names: { en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', hi: 'छत्रपति संभाजीनगर' } },
  'Chhatrapati Sambhajinagar': { code: 'MH-CSN-CSN', district_code: '469', subdistrict_code: '4137', names: { en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', hi: 'छत्रपति संभाजीनगर' } },
};

/**
 * Resolves district identity from new canonical code, UUID, or legacy text.
 * Strict Resolution Hierarchy:
 * 1. UUID -> Exact primary key lookup
 * 2. Canonical Alpha Code ('MH-PUN') -> EXACT lookup on districts.code (NO fuzzy matching)
 * 3. LGD Numeric Code ('490') -> EXACT lookup on districts.district_code
 * 4. Legacy String ('Pune' / 'पुणे') -> Exact case-insensitive match on name_english, name_marathi, or JSONB names
 */
export async function resolveDistrict(districtInput) {
  const clean = normalizeLocationStr(districtInput);
  if (!clean) {
    return { id: null, code: null, district_code: null, nameEnglish: null, nameMarathi: null, names: null, matchType: 'UNMATCHED' };
  }

  // 1. Direct UUID Lookup
  if (UUID_REGEX.test(clean)) {
    try {
      const res = await query('SELECT * FROM public.districts WHERE id = $1 LIMIT 1', [clean]);
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          code: row.code || null,
          district_code: row.district_code,
          nameEnglish: row.name_english,
          nameMarathi: row.name_marathi,
          names: row.names || {},
          matchType: 'EXACT_UUID',
        };
      }
    } catch (_) {}
  }

  // 2. Exact Canonical Alpha Code Lookup (e.g. 'MH-PUN')
  try {
    const res = await query('SELECT * FROM public.districts WHERE UPPER(code) = UPPER($1) LIMIT 1', [clean]);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code,
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'EXACT_CODE',
      };
    }
  } catch (_) {}

  // Check in-memory canonical map for EXACT code
  for (const [canonicalName, data] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
    if (data.code.toUpperCase() === clean.toUpperCase()) {
      return {
        id: null,
        code: data.code,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'EXACT_CODE',
      };
    }
  }

  // 3. Exact LGD Numeric Code Lookup (e.g. '490')
  if (/^\d+$/.test(clean)) {
    try {
      const res = await query('SELECT * FROM public.districts WHERE district_code = $1 LIMIT 1', [clean]);
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          code: row.code || null,
          district_code: row.district_code,
          nameEnglish: row.name_english,
          nameMarathi: row.name_marathi,
          names: row.names || {},
          matchType: 'LGD_CODE',
        };
      }
    } catch (_) {}

    for (const [canonicalName, data] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
      if (data.district_code === clean) {
        return {
          id: null,
          code: data.code,
          district_code: data.district_code,
          nameEnglish: canonicalName,
          nameMarathi: data.names.mr,
          names: data.names,
          matchType: 'LGD_CODE',
        };
      }
    }
  }

  // 4. Legacy English Name Lookup (Exact case-insensitive)
  try {
    const res = await query('SELECT * FROM public.districts WHERE LOWER(name_english) = LOWER($1) LIMIT 1', [clean]);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code || (DISTRICT_LOCALIZATION_MAP[row.name_english]?.code || null),
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'LEGACY_ENGLISH',
      };
    }
  } catch (_) {}

  for (const [canonicalName, data] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
    if (canonicalName.toLowerCase() === clean.toLowerCase()) {
      return {
        id: null,
        code: data.code,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'LEGACY_ENGLISH',
      };
    }
  }

  // 5. Localized Name Lookup (Marathi / Hindi / JSONB names)
  try {
    const res = await query(`
      SELECT * FROM public.districts 
      WHERE name_marathi = $1 
         OR (names IS NOT NULL AND (names->>'mr' = $1 OR names->>'hi' = $1 OR names->>'en' ILIKE $1))
      LIMIT 1
    `, [clean]);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code || (DISTRICT_LOCALIZATION_MAP[row.name_english]?.code || null),
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'LOCALIZED_NAME',
      };
    }
  } catch (_) {}

  for (const [canonicalName, data] of Object.entries(DISTRICT_LOCALIZATION_MAP)) {
    if (data.names.mr === clean || data.names.hi === clean) {
      return {
        id: null,
        code: data.code,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'LOCALIZED_NAME',
      };
    }
  }

  return { id: null, code: null, district_code: null, nameEnglish: clean, nameMarathi: null, names: null, matchType: 'UNMATCHED' };
}

/**
 * Resolves taluka identity from new canonical code, UUID, or legacy text.
 */
export async function resolveTaluka(talukaInput, districtContext = null) {
  const clean = normalizeLocationStr(talukaInput);
  if (!clean) {
    return { id: null, code: null, subdistrict_code: null, district_id: null, district_code: null, nameEnglish: null, nameMarathi: null, names: null, matchType: 'UNMATCHED' };
  }

  // 1. Direct UUID Lookup
  if (UUID_REGEX.test(clean)) {
    try {
      const res = await query('SELECT * FROM public.talukas WHERE id = $1 LIMIT 1', [clean]);
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          code: row.code || null,
          subdistrict_code: row.subdistrict_code,
          district_id: row.district_id,
          district_code: row.district_code,
          nameEnglish: row.name_english,
          nameMarathi: row.name_marathi,
          names: row.names || {},
          matchType: 'EXACT_UUID',
        };
      }
    } catch (_) {}
  }

  // 2. Exact Canonical Alpha Code Lookup (e.g. 'MH-PUN-HAV') - Strict exact matching
  try {
    const res = await query('SELECT * FROM public.talukas WHERE UPPER(code) = UPPER($1) LIMIT 1', [clean]);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code,
        subdistrict_code: row.subdistrict_code,
        district_id: row.district_id,
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'EXACT_CODE',
      };
    }
  } catch (_) {}

  for (const [canonicalName, data] of Object.entries(TALUKA_LOCALIZATION_MAP)) {
    if (data.code.toUpperCase() === clean.toUpperCase()) {
      return {
        id: null,
        code: data.code,
        subdistrict_code: data.subdistrict_code,
        district_id: null,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'EXACT_CODE',
      };
    }
  }

  // 3. Exact LGD Numeric Code Lookup (e.g. '4193')
  if (/^\d+$/.test(clean)) {
    try {
      const res = await query('SELECT * FROM public.talukas WHERE subdistrict_code = $1 LIMIT 1', [clean]);
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          code: row.code || null,
          subdistrict_code: row.subdistrict_code,
          district_id: row.district_id,
          district_code: row.district_code,
          nameEnglish: row.name_english,
          nameMarathi: row.name_marathi,
          names: row.names || {},
          matchType: 'LGD_CODE',
        };
      }
    } catch (_) {}

    for (const [canonicalName, data] of Object.entries(TALUKA_LOCALIZATION_MAP)) {
      if (data.subdistrict_code === clean) {
        return {
          id: null,
          code: data.code,
          subdistrict_code: data.subdistrict_code,
          district_id: null,
          district_code: data.district_code,
          nameEnglish: canonicalName,
          nameMarathi: data.names.mr,
          names: data.names,
          matchType: 'LGD_CODE',
        };
      }
    }
  }

  // 4. Legacy English Name Lookup
  try {
    let sql = 'SELECT * FROM public.talukas WHERE LOWER(name_english) = LOWER($1)';
    const params = [clean];
    if (districtContext) {
      sql += ' AND (district_code = $2 OR district_id::text = $2)';
      params.push(districtContext);
    }
    sql += ' LIMIT 1';

    const res = await query(sql, params);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code || (TALUKA_LOCALIZATION_MAP[row.name_english]?.code || null),
        subdistrict_code: row.subdistrict_code,
        district_id: row.district_id,
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'LEGACY_ENGLISH',
      };
    }
  } catch (_) {}

  for (const [canonicalName, data] of Object.entries(TALUKA_LOCALIZATION_MAP)) {
    if (canonicalName.toLowerCase() === clean.toLowerCase()) {
      let dbId = null;
      let dbDistId = null;
      try {
        const r = await query('SELECT id, district_id FROM public.talukas WHERE code = $1 OR subdistrict_code = $2 LIMIT 1', [data.code, data.subdistrict_code]);
        if (r.rows[0]) {
          dbId = r.rows[0].id;
          dbDistId = r.rows[0].district_id;
        }
      } catch (_) {}

      return {
        id: dbId,
        code: data.code,
        subdistrict_code: data.subdistrict_code,
        district_id: dbDistId,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'LEGACY_ENGLISH',
      };
    }
  }

  // 5. Localized Name Lookup
  try {
    let sql = `
      SELECT * FROM public.talukas 
      WHERE (name_marathi = $1 OR (names IS NOT NULL AND (names->>'mr' = $1 OR names->>'hi' = $1 OR names->>'en' ILIKE $1)))
    `;
    const params = [clean];
    if (districtContext) {
      sql += ' AND (district_code = $2 OR district_id::text = $2)';
      params.push(districtContext);
    }
    sql += ' LIMIT 1';

    const res = await query(sql, params);
    if (res.rows[0]) {
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code || (TALUKA_LOCALIZATION_MAP[row.name_english]?.code || null),
        subdistrict_code: row.subdistrict_code,
        district_id: row.district_id,
        district_code: row.district_code,
        nameEnglish: row.name_english,
        nameMarathi: row.name_marathi,
        names: row.names || {},
        matchType: 'LOCALIZED_NAME',
      };
    }
  } catch (_) {}

  for (const [canonicalName, data] of Object.entries(TALUKA_LOCALIZATION_MAP)) {
    if (data.names.mr === clean || data.names.hi === clean) {
      let dbId = null;
      let dbDistId = null;
      try {
        const r = await query('SELECT id, district_id FROM public.talukas WHERE code = $1 OR subdistrict_code = $2 LIMIT 1', [data.code, data.subdistrict_code]);
        if (r.rows[0]) {
          dbId = r.rows[0].id;
          dbDistId = r.rows[0].district_id;
        }
      } catch (_) {}

      return {
        id: dbId,
        code: data.code,
        subdistrict_code: data.subdistrict_code,
        district_id: dbDistId,
        district_code: data.district_code,
        nameEnglish: canonicalName,
        nameMarathi: data.names.mr,
        names: data.names,
        matchType: 'LOCALIZED_NAME',
      };
    }
  }

  return { id: null, code: null, subdistrict_code: null, district_id: null, district_code: null, nameEnglish: clean, nameMarathi: null, names: null, matchType: 'UNMATCHED' };
}
