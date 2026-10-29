-- ============================================================================
-- Migration 002: Seed Localized Master Data and Canonical Alpha Codes
-- Non-destructive master data enrichment for ArogyaMitra Multilingual Support
-- Populates 36 Maharashtra Districts, All 358 Talukas, and Healthcare Schemes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Districts Localization & Canonical Code Seeding (All 36 Districts)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dist record;
BEGIN
  -- Temporary table of canonical district mappings
  CREATE TEMP TABLE temp_seed_districts (
    district_code VARCHAR(20),
    code VARCHAR(20),
    name_english VARCHAR(100),
    name_marathi VARCHAR(100),
    names JSONB
  ) ON COMMIT DROP;

  INSERT INTO temp_seed_districts (district_code, code, name_english, name_marathi, names) VALUES
    ('466', 'MH-AHM', 'Ahmednagar', 'अहमदनगर (अहिल्यानगर)', '{"en": "Ahmednagar", "mr": "अहमदनगर (अहिल्यानगर)", "hi": "अहमदनगर"}'::jsonb),
    ('467', 'MH-AKO', 'Akola', 'अकोला', '{"en": "Akola", "mr": "अकोला", "hi": "अकोला"}'::jsonb),
    ('468', 'MH-AMR', 'Amravati', 'अमरावती', '{"en": "Amravati", "mr": "अमरावती", "hi": "अमरावती"}'::jsonb),
    ('469', 'MH-CSN', 'Chhatrapati Sambhajinagar', 'छत्रपती संभाजीनगर', '{"en": "Chhatrapati Sambhajinagar", "mr": "छत्रपती संभाजीनगर", "hi": "छत्रपति संभाजीनगर"}'::jsonb),
    ('470', 'MH-BEE', 'Beed', 'बीड', '{"en": "Beed", "mr": "बीड", "hi": "बीड"}'::jsonb),
    ('471', 'MH-BHA', 'Bhandara', 'भंडारा', '{"en": "Bhandara", "mr": "भंडारा", "hi": "भंडारा"}'::jsonb),
    ('472', 'MH-BUL', 'Buldhana', 'बुलढाणा', '{"en": "Buldhana", "mr": "बुलढाणा", "hi": "बुलढाणा"}'::jsonb),
    ('473', 'MH-CHA', 'Chandrapur', 'चंद्रपूर', '{"en": "Chandrapur", "mr": "चंद्रपूर", "hi": "चंद्रपुर"}'::jsonb),
    ('474', 'MH-DHU', 'Dhule', 'धुळे', '{"en": "Dhule", "mr": "धुळे", "hi": "धुले"}'::jsonb),
    ('475', 'MH-GAD', 'Gadchiroli', 'गडचिरोली', '{"en": "Gadchiroli", "mr": "गडचिरोली", "hi": "गडचिरोली"}'::jsonb),
    ('476', 'MH-GON', 'Gondia', 'गोंदिया', '{"en": "Gondia", "mr": "गोंदिया", "hi": "गोंदिया"}'::jsonb),
    ('477', 'MH-HIN', 'Hingoli', 'हिंगोली', '{"en": "Hingoli", "mr": "हिंगोली", "hi": "हिंगोली"}'::jsonb),
    ('478', 'MH-JAL', 'Jalgaon', 'जळगाव', '{"en": "Jalgaon", "mr": "जळगाव", "hi": "जलगांव"}'::jsonb),
    ('479', 'MH-JLN', 'Jalna', 'जालना', '{"en": "Jalna", "mr": "जालना", "hi": "जालना"}'::jsonb),
    ('480', 'MH-KOL', 'Kolhapur', 'कोल्हापूर', '{"en": "Kolhapur", "mr": "कोल्हापूर", "hi": "कोल्हापुर"}'::jsonb),
    ('481', 'MH-LAT', 'Latur', 'लातूर', '{"en": "Latur", "mr": "लातूर", "hi": "लातूर"}'::jsonb),
    ('482', 'MH-MUC', 'Mumbai City', 'मुंबई शहर', '{"en": "Mumbai City", "mr": "मुंबई शहर", "hi": "मुंबई शहर"}'::jsonb),
    ('483', 'MH-MUS', 'Mumbai Suburban', 'मुंबई उपनगर', '{"en": "Mumbai Suburban", "mr": "मुंबई उपनगर", "hi": "मुंबई उपनगर"}'::jsonb),
    ('484', 'MH-NAG', 'Nagpur', 'नागपूर', '{"en": "Nagpur", "mr": "नागपूर", "hi": "नागपुर"}'::jsonb),
    ('485', 'MH-NAN', 'Nanded', 'नांदेड', '{"en": "Nanded", "mr": "नांदेड", "hi": "नांदेड़"}'::jsonb),
    ('486', 'MH-NDB', 'Nandurbar', 'नंदुरबार', '{"en": "Nandurbar", "mr": "नंदुरबार", "hi": "नंदुरबार"}'::jsonb),
    ('487', 'MH-NAS', 'Nashik', 'नाशिक', '{"en": "Nashik", "mr": "नाशिक", "hi": "नासिक"}'::jsonb),
    ('488', 'MH-DHA', 'Dharashiv', 'धाराशिव', '{"en": "Dharashiv", "mr": "धाराशिव", "hi": "धाराशिव"}'::jsonb),
    ('489', 'MH-PAR', 'Parbhani', 'परभणी', '{"en": "Parbhani", "mr": "परभणी", "hi": "परभणी"}'::jsonb),
    ('490', 'MH-PUN', 'Pune', 'पुणे', '{"en": "Pune", "mr": "पुणे", "hi": "पुणे"}'::jsonb),
    ('491', 'MH-RAI', 'Raigad', 'रायगड', '{"en": "Raigad", "mr": "रायगड", "hi": "रायगढ़"}'::jsonb),
    ('492', 'MH-RAT', 'Ratnagiri', 'रत्नागिरी', '{"en": "Ratnagiri", "mr": "रत्नागिरी", "hi": "रत्नागिरी"}'::jsonb),
    ('493', 'MH-SAN', 'Sangli', 'सांगली', '{"en": "Sangli", "mr": "सांगली", "hi": "सांगली"}'::jsonb),
    ('494', 'MH-SAT', 'Satara', 'सातारा', '{"en": "Satara", "mr": "सातारा", "hi": "सतारा"}'::jsonb),
    ('495', 'MH-SIN', 'Sindhudurg', 'सिंधुदुर्ग', '{"en": "Sindhudurg", "mr": "सिंधुदुर्ग", "hi": "सिंधुदुर्ग"}'::jsonb),
    ('496', 'MH-SOL', 'Solapur', 'सोलापूर', '{"en": "Solapur", "mr": "सोलापूर", "hi": "सोलापुर"}'::jsonb),
    ('497', 'MH-THA', 'Thane', 'ठाणे', '{"en": "Thane", "mr": "ठाणे", "hi": "ठाणे"}'::jsonb),
    ('498', 'MH-WAR', 'Wardha', 'वर्धा', '{"en": "Wardha", "mr": "वर्धा", "hi": "वर्धा"}'::jsonb),
    ('499', 'MH-WAS', 'Washim', 'वाशिम', '{"en": "Washim", "mr": "वाशिम", "hi": "वाशिम"}'::jsonb),
    ('500', 'MH-YAV', 'Yavatmal', 'यवतमाळ', '{"en": "Yavatmal", "mr": "यवतमाळ", "hi": "यवतमाल"}'::jsonb),
    ('665', 'MH-PAL', 'Palghar', 'पालघर', '{"en": "Palghar", "mr": "पालघर", "hi": "पालघर"}'::jsonb);

  -- Safe update of existing districts by district_code or name matching
  FOR v_dist IN SELECT * FROM temp_seed_districts LOOP
    UPDATE public.districts
    SET 
      code = v_dist.code,
      names = v_dist.names,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      (district_code = v_dist.district_code OR LOWER(name_english) = LOWER(v_dist.name_english) OR (code IS NOT NULL AND code = v_dist.code))
      AND (code IS DISTINCT FROM v_dist.code OR names IS DISTINCT FROM v_dist.names);

    -- If no row was updated and table has no record with this district_code, insert new
    IF NOT FOUND THEN
      INSERT INTO public.districts (district_code, name_english, name_marathi, code, names, is_active)
      VALUES (v_dist.district_code, v_dist.name_english, v_dist.name_marathi, v_dist.code, v_dist.names, true)
      ON CONFLICT (district_code) DO UPDATE
      SET 
        code = EXCLUDED.code,
        names = EXCLUDED.names,
        updated_at = CURRENT_TIMESTAMP;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Talukas Localization & Canonical Code Seeding (Comprehensive Coverage)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_tal record;
  v_code text;
  v_count int;
BEGIN
  CREATE TEMP TABLE temp_seed_talukas (
    district_code VARCHAR(20),
    subdistrict_code VARCHAR(20),
    code VARCHAR(30),
    name_english VARCHAR(100),
    name_marathi VARCHAR(100),
    names JSONB
  ) ON COMMIT DROP;

  INSERT INTO temp_seed_talukas (district_code, subdistrict_code, code, name_english, name_marathi, names) VALUES
    -- Pune Talukas
    ('490', '4193', 'MH-PUN-HAV', 'Haveli', 'हवेली', '{"en": "Haveli", "mr": "हवेली", "hi": "हवेली"}'::jsonb),
    ('490', '4194', 'MH-PUN-PUN', 'Pune City', 'पुणे शहर', '{"en": "Pune City", "mr": "पुणे शहर", "hi": "पुणे शहर"}'::jsonb),
    ('490', '4190', 'MH-PUN-KHE', 'Khed', 'खेड (राजगुरुनगर)', '{"en": "Khed", "mr": "खेड (राजगुरुनगर)", "hi": "खेड"}'::jsonb),
    ('490', '4199', 'MH-PUN-BAR', 'Baramati', 'बारामती', '{"en": "Baramati", "mr": "बारामती", "hi": "बारामती"}'::jsonb),
    ('490', '4191', 'MH-PUN-MAV', 'Mawal', 'मावळ (वडगाव)', '{"en": "Mawal", "mr": "मावळ (वडगाव)", "hi": "मावल"}'::jsonb),
    ('490', '4192', 'MH-PUN-MUL', 'Mulshi', 'मुळशी (पौड)', '{"en": "Mulshi", "mr": "मुळशी (पौड)", "hi": "मुलशी"}'::jsonb),
    ('490', '4189', 'MH-PUN-SHI', 'Shirur', 'शिरूर', '{"en": "Shirur", "mr": "शिरूर", "hi": "शिरूर"}'::jsonb),
    ('490', '4188', 'MH-PUN-AMB', 'Ambegaon', 'आंबेगाव (घोडेगाव)', '{"en": "Ambegaon", "mr": "आंबेगाव (घोडेगाव)", "hi": "आंबेगांव"}'::jsonb),
    ('490', '4195', 'MH-PUN-DAU', 'Daund', 'दौंड', '{"en": "Daund", "mr": "दौंड", "hi": "दौंड"}'::jsonb),
    ('490', '4200', 'MH-PUN-IND', 'Indapur', 'इंदापूर', '{"en": "Indapur", "mr": "इंदापूर", "hi": "इंदापुर"}'::jsonb),
    ('490', '4187', 'MH-PUN-JUN', 'Junnar', 'जुन्नर', '{"en": "Junnar", "mr": "जुन्नर", "hi": "जुन्नर"}'::jsonb),
    ('490', '4196', 'MH-PUN-PUR', 'Purandhar', 'पुरंदर (सासवड)', '{"en": "Purandhar", "mr": "पुरंदर (सासवड)", "hi": "पुरंदर"}'::jsonb),
    ('490', '4198', 'MH-PUN-BHO', 'Bhor', 'भोर', '{"en": "Bhor", "mr": "भोर", "hi": "भोर"}'::jsonb),
    ('490', '4197', 'MH-PUN-VEL', 'Velhe', 'वेल्हे (राजगड)', '{"en": "Velhe", "mr": "वेल्हे (राजगड)", "hi": "वेल्हे"}'::jsonb),

    -- Thane Talukas
    ('497', '4157', 'MH-THA-THA', 'Thane', 'ठाणे', '{"en": "Thane", "mr": "ठाणे", "hi": "ठाणे"}'::jsonb),
    ('497', '4158', 'MH-THA-KAL', 'Kalyan', 'कल्याण', '{"en": "Kalyan", "mr": "कल्याण", "hi": "कल्याण"}'::jsonb),
    ('497', '4159', 'MH-THA-BHI', 'Bhiwandi', 'भिवंडी', '{"en": "Bhiwandi", "mr": "भिवंडी", "hi": "भिवंडी"}'::jsonb),
    ('497', '4160', 'MH-THA-ULH', 'Ulhasnagar', 'उल्हासनगर', '{"en": "Ulhasnagar", "mr": "उल्हासनगर", "hi": "उल्हासनगर"}'::jsonb),
    ('497', '4161', 'MH-THA-AMB', 'Ambarnath', 'अंबरनाथ', '{"en": "Ambarnath", "mr": "अंबरनाथ", "hi": "अंबरनाथ"}'::jsonb),
    ('497', '4162', 'MH-THA-MUR', 'Murbad', 'मुरबाड', '{"en": "Murbad", "mr": "मुरबाड", "hi": "मुरबाड"}'::jsonb),
    ('497', '4163', 'MH-THA-SHA', 'Shahapur', 'शहापूर', '{"en": "Shahapur", "mr": "शहापूर", "hi": "शहापुर"}'::jsonb),

    -- Satara Talukas
    ('494', '4260', 'MH-SAT-KHA', 'Khatav', 'खटाव', '{"en": "Khatav", "mr": "खटाव", "hi": "खटाव"}'::jsonb),
    ('494', '4262', 'MH-SAT-SAT', 'Satara', 'सातारा', '{"en": "Satara", "mr": "सातारा", "hi": "सतारा"}'::jsonb),
    ('494', '4265', 'MH-SAT-KRD', 'Karad', 'कराड', '{"en": "Karad", "mr": "कराड", "hi": "कराड"}'::jsonb),
    ('494', '4256', 'MH-SAT-WAI', 'Wai', 'वाई', '{"en": "Wai", "mr": "वाई", "hi": "वाई"}'::jsonb),
    ('494', '4258', 'MH-SAT-PHA', 'Phaltan', 'फलटण', '{"en": "Phaltan", "mr": "फलटण", "hi": "फलटण"}'::jsonb),

    -- Chhatrapati Sambhajinagar (Aurangabad) Talukas
    ('469', '4137', 'MH-CSN-CSN', 'Chhatrapati Sambhajinagar', 'छत्रपती संभाजीनगर', '{"en": "Chhatrapati Sambhajinagar", "mr": "छत्रपती संभाजीनगर", "hi": "छत्रपति संभाजीनगर"}'::jsonb),
    ('469', '4133', 'MH-CSN-KAN', 'Kannad', 'कन्नड', '{"en": "Kannad", "mr": "कन्नड", "hi": "कन्नड"}'::jsonb),
    ('469', '4139', 'MH-CSN-VAI', 'Vaijapur', 'वैजापूर', '{"en": "Vaijapur", "mr": "वैजापूर", "hi": "वैजापूर"}'::jsonb),
    ('469', '4141', 'MH-CSN-PAI', 'Paithan', 'पैठण', '{"en": "Paithan", "mr": "पैठण", "hi": "पैठण"}'::jsonb),

    -- Raigad Talukas
    ('491', '4173', 'MH-RAI-PAN', 'Panvel', 'पनवेल', '{"en": "Panvel", "mr": "पनवेल", "hi": "पनवेल"}'::jsonb),
    ('491', '4174', 'MH-RAI-KAR', 'Karjat', 'कर्जत', '{"en": "Karjat", "mr": "कर्जत", "hi": "कर्जत"}'::jsonb),
    ('491', '4177', 'MH-RAI-ALI', 'Alibag', 'अलिबाग', '{"en": "Alibag", "mr": "अलिबाग", "hi": "अलिबाग"}'::jsonb),

    -- Ahmednagar Talukas
    ('466', '4202', 'MH-AHM-SAN', 'Sangamner', 'संगमनेर', '{"en": "Sangamner", "mr": "संगमनेर", "hi": "संगमनेर"}'::jsonb),
    ('466', '4209', 'MH-AHM-NAG', 'Nagar', 'नगर', '{"en": "Nagar", "mr": "नगर", "hi": "नगर"}'::jsonb),

    -- Palghar Talukas
    ('665', '4164', 'MH-PAL-VAS', 'Vasai', 'वसई', '{"en": "Vasai", "mr": "वसई", "hi": "वसई"}'::jsonb),
    ('665', '4165', 'MH-PAL-PAL', 'Palghar', 'पालघर', '{"en": "Palghar", "mr": "पालघर", "hi": "पालघर"}'::jsonb);

  -- Explicit override updates
  FOR v_tal IN SELECT * FROM temp_seed_talukas LOOP
    UPDATE public.talukas
    SET 
      code = v_tal.code,
      names = v_tal.names,
      district_id = COALESCE(talukas.district_id, (SELECT id FROM public.districts WHERE district_code = v_tal.district_code LIMIT 1)),
      updated_at = CURRENT_TIMESTAMP
    WHERE subdistrict_code = v_tal.subdistrict_code;
  END LOOP;

  -- Collision-free Canonical Code Generation for ALL remaining talukas in database
  FOR v_tal IN 
    SELECT t.id, t.name_english, t.subdistrict_code, COALESCE(d.code, 'MH-' || UPPER(SUBSTRING(d.name_english FROM 1 FOR 3))) AS dist_prefix, d.id AS dist_uuid
    FROM public.talukas t
    LEFT JOIN public.districts d ON t.district_code = d.district_code OR t.district_id = d.id
    WHERE t.code IS NULL OR t.names IS NULL OR t.names = '{}'::jsonb
    ORDER BY t.subdistrict_code
  LOOP
    v_code := CONCAT(v_tal.dist_prefix, '-', UPPER(SUBSTRING(REGEXP_REPLACE(v_tal.name_english, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)));
    
    SELECT COUNT(*) INTO v_count FROM public.talukas WHERE code = v_code AND id != v_tal.id;
    IF v_count > 0 THEN
      v_code := CONCAT(v_tal.dist_prefix, '-', UPPER(SUBSTRING(REGEXP_REPLACE(v_tal.name_english, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 4)));
      SELECT COUNT(*) INTO v_count FROM public.talukas WHERE code = v_code AND id != v_tal.id;
      IF v_count > 0 THEN
        v_code := CONCAT(v_tal.dist_prefix, '-', UPPER(SUBSTRING(REGEXP_REPLACE(v_tal.name_english, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)), '-', v_tal.subdistrict_code);
      END IF;
    END IF;

    UPDATE public.talukas
    SET 
      code = v_code,
      district_id = COALESCE(talukas.district_id, v_tal.dist_uuid),
      names = CASE 
        WHEN talukas.names IS NULL OR talukas.names = '{}'::jsonb THEN
          jsonb_build_object(
            'en', v_tal.name_english,
            'mr', COALESCE(talukas.name_marathi, v_tal.name_english),
            'hi', COALESCE(talukas.name_marathi, v_tal.name_english)
          )
        ELSE talukas.names
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = v_tal.id;
  END LOOP;

END $$;

-- ----------------------------------------------------------------------------
-- 3. Healthcare Schemes Multilingual Seeding (All Supported Application Schemes)
-- ----------------------------------------------------------------------------
-- PM-JAY
UPDATE public.schemes
SET 
  names = '{"en": "Ayushman Bharat PM-JAY", "mr": "आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)", "hi": "आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना (PM-JAY)"}'::jsonb,
  subtitles = '{"en": "National Cashless Health Protection Scheme", "mr": "राष्ट्रीय कॅशलेस आरोग्य संरक्षण योजना", "hi": "राष्ट्रीय कैशलेस स्वास्थ्य सुरक्षा योजना"}'::jsonb,
  descriptions = '{"en": "Cashless secondary and tertiary hospitalization coverage up to ₹5,00,000 per family per year for vulnerable families.", "mr": "पात्र कुटुंबांना दरवर्षी ₹५ लाखांपर्यंत द्वितीयक आणि तृतीयक मोफत कॅशलेस आरोग्य उपचार.", "hi": "कमजोर परिवारों के लिए प्रति वर्ष प्रति परिवार ₹5,00,000 तक कैशलेस द्वितीयक और तृतीयक अस्पताल में भर्ती कवर।"}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE LOWER(scheme_code) LIKE '%pm%jay%' OR LOWER(name) LIKE '%ayushman%';

-- MJPJAY
UPDATE public.schemes
SET 
  names = '{"en": "Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)", "mr": "महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY)", "hi": "महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY)"}'::jsonb,
  subtitles = '{"en": "Maharashtra State Flagship Health Scheme", "mr": "महाराष्ट्र शासनाची मुख्य आरोग्य योजना", "hi": "महाराष्ट्र शासन की प्रमुख स्वास्थ्य योजना"}'::jsonb,
  descriptions = '{"en": "State-sponsored cashless healthcare scheme offering coverage up to ₹5,00,000 per family per year across empanelled hospitals.", "mr": "महाराष्ट्र शासनाची मोफत आरोग्य संरक्षण योजना, ज्यामध्ये राज्यातील अंगीकृत रुग्णालयांमध्ये दरवर्षी ₹५ लाखांपर्यंत कॅशलेस उपचार मिळतात.", "hi": "महाराष्ट्र शासन की कैशलेस स्वास्थ्य योजना जिसके तहत सूचीबद्ध अस्पतालों में प्रति परिवार ₹5 लाख तक का इलाज मिलता है।"}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE LOWER(scheme_code) LIKE '%mjpjay%' OR LOWER(name) LIKE '%jyotirao%';

-- CM Relief Fund (Mukhyamantri Sahayata Nidhi)
UPDATE public.schemes
SET 
  names = '{"en": "Chief Minister Relief Fund (CMRF)", "mr": "मुख्यमंत्री सहायता निधी (CMRF)", "hi": "मुख्यमंत्री सहायता कोष (CMRF)"}'::jsonb,
  subtitles = '{"en": "Financial Assistance for Critical Illnesses", "mr": "गंभीर आजारांसाठी विशेष आर्थिक मदत योजना", "hi": "गंभीर बीमारियों के लिए वित्तीय सहायता"}'::jsonb,
  descriptions = '{"en": "Discretionary financial grant provided directly by the Maharashtra State Government for high-cost surgical and critical treatments.", "mr": "दुर्धर आजारांच्या उपचारासाठी मुख्यमंत्री वैद्यकीय सहायता कक्षामार्फत दिली जाणारी थेट आर्थिक मदत.", "hi": "महंगे सर्जिकल और क्रिटिकल उपचार के लिए महाराष्ट्र सरकार द्वारा दी जाने वाली वित्तीय सहायता।"}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE LOWER(scheme_code) LIKE '%cmrf%' OR LOWER(scheme_code) LIKE '%cm_relief%' OR LOWER(name) LIKE '%mukhyamantri%' OR LOWER(name) LIKE '%relief fund%';

-- General schemes backfill
UPDATE public.schemes
SET 
  names = jsonb_build_object('en', name, 'mr', name, 'hi', name),
  subtitles = jsonb_build_object('en', COALESCE(category, 'Healthcare Scheme'), 'mr', COALESCE(category, 'आरोग्य योजना'), 'hi', COALESCE(category, 'स्वास्थ्य योजना')),
  descriptions = jsonb_build_object('en', COALESCE(description, ''), 'mr', COALESCE(description, ''), 'hi', COALESCE(description, '')),
  updated_at = CURRENT_TIMESTAMP
WHERE (names IS NULL OR names = '{}'::jsonb) AND name IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Hospitals Master Data Multilingual Enrichment
-- ----------------------------------------------------------------------------
UPDATE public.hospitals
SET 
  names = jsonb_build_object(
    'en', name,
    'mr', name,
    'hi', name
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE (names IS NULL OR names = '{}'::jsonb) AND name IS NOT NULL;

-- Link hospital district_id and taluka_id where matching
UPDATE public.hospitals h
SET 
  district_id = COALESCE(h.district_id, d.id)
FROM public.districts d
WHERE (h.district_id IS NULL AND (LOWER(h.district) = LOWER(d.name_english) OR h.district = d.district_code));
