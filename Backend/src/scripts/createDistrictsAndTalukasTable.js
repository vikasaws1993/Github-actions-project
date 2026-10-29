import { query, pool } from '../config/db.js';

/**
 * Migration & Seeder Script for Districts and Talukas (Subdistricts)
 * Connected using district_code (foreign key)
 */

export const DISTRICTS_DATA = [
  { "district_code": "466", "name_english": "Ahilyanagar", "name_marathi": "अहिल्यानगर", "is_active": true },
  { "district_code": "467", "name_english": "Akola", "name_marathi": "अकोला", "is_active": true },
  { "district_code": "468", "name_english": "Amravati", "name_marathi": "अमरावती", "is_active": true },
  { "district_code": "469", "name_english": "Chhatrapati Sambhajinagar", "name_marathi": "छत्रपती संभाजीनगर", "is_active": true },
  { "district_code": "470", "name_english": "Beed", "name_marathi": "बीड", "is_active": true },
  { "district_code": "471", "name_english": "Bhandara", "name_marathi": "भंडारा", "is_active": true },
  { "district_code": "472", "name_english": "Buldhana", "name_marathi": "बुलढाणा", "is_active": true },
  { "district_code": "473", "name_english": "Chandrapur", "name_marathi": "चंद्रपूर", "is_active": true },
  { "district_code": "474", "name_english": "Dhule", "name_marathi": "धुळे", "is_active": true },
  { "district_code": "475", "name_english": "Gadchiroli", "name_marathi": "गडचिरोली", "is_active": true },
  { "district_code": "476", "name_english": "Gondia", "name_marathi": "गोंदिया", "is_active": true },
  { "district_code": "477", "name_english": "Hingoli", "name_marathi": "हिंगोली", "is_active": true },
  { "district_code": "478", "name_english": "Jalgaon", "name_marathi": "जळगाव", "is_active": true },
  { "district_code": "479", "name_english": "Jalna", "name_marathi": "जालना", "is_active": true },
  { "district_code": "480", "name_english": "Kolhapur", "name_marathi": "कोल्हापूर", "is_active": true },
  { "district_code": "481", "name_english": "Latur", "name_marathi": "लातूर", "is_active": true },
  { "district_code": "483", "name_english": "Mumbai Suburban", "name_marathi": "मुंबई उपनगर", "is_active": true },
  { "district_code": "484", "name_english": "Nagpur", "name_marathi": "नागपूर", "is_active": true },
  { "district_code": "485", "name_english": "Nanded", "name_marathi": "नांदेड", "is_active": true },
  { "district_code": "486", "name_english": "Nandurbar", "name_marathi": "नंदुरबार", "is_active": true },
  { "district_code": "487", "name_english": "Nashik", "name_marathi": "नाशिक", "is_active": true },
  { "district_code": "488", "name_english": "Dharashiv", "name_marathi": "धाराशिव", "is_active": true },
  { "district_code": "489", "name_english": "Parbhani", "name_marathi": "परभणी", "is_active": true },
  { "district_code": "490", "name_english": "Pune", "name_marathi": "पुणे", "is_active": true },
  { "district_code": "491", "name_english": "Raigad", "name_marathi": "रायगड", "is_active": true },
  { "district_code": "492", "name_english": "Ratnagiri", "name_marathi": "रत्नागिरी", "is_active": true },
  { "district_code": "493", "name_english": "Sangli", "name_marathi": "सांगली", "is_active": true },
  { "district_code": "494", "name_english": "Satara", "name_marathi": "सातारा", "is_active": true },
  { "district_code": "495", "name_english": "Sindhudurg", "name_marathi": "सिंधुदुर्ग", "is_active": true },
  { "district_code": "496", "name_english": "Solapur", "name_marathi": "सोलापूर", "is_active": true },
  { "district_code": "497", "name_english": "Thane", "name_marathi": "ठाणे", "is_active": true },
  { "district_code": "498", "name_english": "Wardha", "name_marathi": "वर्धा", "is_active": true },
  { "district_code": "499", "name_english": "Washim", "name_marathi": "वाशिम", "is_active": true },
  { "district_code": "500", "name_english": "Yavatmal", "name_marathi": "यवतमाळ", "is_active": true },
  { "district_code": "665", "name_english": "Palghar", "name_marathi": "पालघर", "is_active": true }
];

export const TALUKAS_DATA = [
  { "districtcode": "466", "subdistrictcode": "4201", "subdistrictnameenglish": "Akole", "subdistrictlocalname": "अकोले" },
  { "districtcode": "466", "subdistrictcode": "4202", "subdistrictnameenglish": "Sangamner", "subdistrictlocalname": "संगमनेर" },
  { "districtcode": "466", "subdistrictcode": "4203", "subdistrictnameenglish": "Kopargaon", "subdistrictlocalname": "कोपरगाव" },
  { "districtcode": "466", "subdistrictcode": "4204", "subdistrictnameenglish": "Rahta", "subdistrictlocalname": "रहाता" },
  { "districtcode": "466", "subdistrictcode": "4205", "subdistrictnameenglish": "Shrirampur", "subdistrictlocalname": "श्रीरामपूर" },
  { "districtcode": "466", "subdistrictcode": "4206", "subdistrictnameenglish": "Nevasa", "subdistrictlocalname": "नेवासा" },
  { "districtcode": "466", "subdistrictcode": "4207", "subdistrictnameenglish": "Shevgaon", "subdistrictlocalname": "शेगाव" },
  { "districtcode": "466", "subdistrictcode": "4208", "subdistrictnameenglish": "Pathardi", "subdistrictlocalname": "पाथर्डी" },
  { "districtcode": "466", "subdistrictcode": "4209", "subdistrictnameenglish": "Nagar", "subdistrictlocalname": "नगर" },
  { "districtcode": "466", "subdistrictcode": "4210", "subdistrictnameenglish": "Rahuri", "subdistrictlocalname": "राहुरी" },
  { "districtcode": "466", "subdistrictcode": "4211", "subdistrictnameenglish": "Parner", "subdistrictlocalname": "पारनेर" },
  { "districtcode": "466", "subdistrictcode": "4212", "subdistrictnameenglish": "Shrigonda", "subdistrictlocalname": "श्रीगोंदा" },
  { "districtcode": "466", "subdistrictcode": "4213", "subdistrictnameenglish": "Karjat", "subdistrictlocalname": "कर्जत" },
  { "districtcode": "466", "subdistrictcode": "4214", "subdistrictnameenglish": "Jamkhed", "subdistrictlocalname": "जामखेड" },
  { "districtcode": "467", "subdistrictcode": "3988", "subdistrictnameenglish": "Telhara", "subdistrictlocalname": "तेल्हारा" },
  { "districtcode": "467", "subdistrictcode": "3989", "subdistrictnameenglish": "Akot", "subdistrictlocalname": "अकोट" },
  { "districtcode": "467", "subdistrictcode": "3990", "subdistrictnameenglish": "Balapur", "subdistrictlocalname": "बाळापूर" },
  { "districtcode": "467", "subdistrictcode": "3991", "subdistrictnameenglish": "Akola", "subdistrictlocalname": "अकोला" },
  { "districtcode": "467", "subdistrictcode": "3992", "subdistrictnameenglish": "Murtijapur", "subdistrictlocalname": "मुर्तिजापूर" },
  { "districtcode": "467", "subdistrictcode": "3993", "subdistrictnameenglish": "Patur", "subdistrictlocalname": "पातूर" },
  { "districtcode": "467", "subdistrictcode": "3994", "subdistrictnameenglish": "Barshitakli", "subdistrictlocalname": "बार्शीटाकळी" },
  { "districtcode": "468", "subdistrictcode": "4001", "subdistrictnameenglish": "Dharni", "subdistrictlocalname": "धारणी" },
  { "districtcode": "468", "subdistrictcode": "4002", "subdistrictnameenglish": "Chikhaldara", "subdistrictlocalname": "चिखलदरा" },
  { "districtcode": "468", "subdistrictcode": "4003", "subdistrictnameenglish": "Anjangaon Surji", "subdistrictlocalname": "अंजनगाव सुर्जी" },
  { "districtcode": "468", "subdistrictcode": "4004", "subdistrictnameenglish": "Achalpur", "subdistrictlocalname": "अचलपूर" },
  { "districtcode": "468", "subdistrictcode": "4005", "subdistrictnameenglish": "Chandurbazar", "subdistrictlocalname": "चांदूर बाजार" },
  { "districtcode": "468", "subdistrictcode": "4006", "subdistrictnameenglish": "Morshi", "subdistrictlocalname": "मोर्शी" },
  { "districtcode": "468", "subdistrictcode": "4007", "subdistrictnameenglish": "Warud", "subdistrictlocalname": "वरूड" },
  { "districtcode": "468", "subdistrictcode": "4008", "subdistrictnameenglish": "Tiosa", "subdistrictlocalname": "तिवसा" },
  { "districtcode": "468", "subdistrictcode": "4009", "subdistrictnameenglish": "Amravati", "subdistrictlocalname": "अमरावती" },
  { "districtcode": "468", "subdistrictcode": "4010", "subdistrictnameenglish": "Bhatkuli", "subdistrictlocalname": "भातकुली" },
  { "districtcode": "468", "subdistrictcode": "4011", "subdistrictnameenglish": "Daryapur", "subdistrictlocalname": "दर्यापूर" },
  { "districtcode": "468", "subdistrictcode": "4012", "subdistrictnameenglish": "Nandgaon-Khandeshwar", "subdistrictlocalname": "नांदगाव खंडेश्वर" },
  { "districtcode": "468", "subdistrictcode": "4013", "subdistrictnameenglish": "Chandur Railway", "subdistrictlocalname": "चांदूर रेल्वे" },
  { "districtcode": "468", "subdistrictcode": "4014", "subdistrictnameenglish": "Dhamangaon Railway", "subdistrictlocalname": "धामनगाव रेल्वे" },
  { "districtcode": "469", "subdistrictcode": "4133", "subdistrictnameenglish": "Kannad", "subdistrictlocalname": "कन्नड" },
  { "districtcode": "469", "subdistrictcode": "4134", "subdistrictnameenglish": "Soegaon", "subdistrictlocalname": "सोयगाव" },
  { "districtcode": "469", "subdistrictcode": "4135", "subdistrictnameenglish": "Sillod", "subdistrictlocalname": "सिल्लोड" },
  { "districtcode": "469", "subdistrictcode": "4136", "subdistrictnameenglish": "Phulambri", "subdistrictlocalname": "फुलंब्री" },
  { "districtcode": "469", "subdistrictcode": "4137", "subdistrictnameenglish": "Chhatrapati Sambhajinagar", "subdistrictlocalname": "छत्रपती संभाजीनगर" },
  { "districtcode": "469", "subdistrictcode": "4138", "subdistrictnameenglish": "Khuldabad", "subdistrictlocalname": "खुलताबाद" },
  { "districtcode": "469", "subdistrictcode": "4139", "subdistrictnameenglish": "Vaijapur", "subdistrictlocalname": "वैजापूर" },
  { "districtcode": "469", "subdistrictcode": "4140", "subdistrictnameenglish": "Gangapur", "subdistrictlocalname": "गंगापूर" },
  { "districtcode": "469", "subdistrictcode": "4141", "subdistrictnameenglish": "Paithan", "subdistrictlocalname": "पैठण" },
  { "districtcode": "470", "subdistrictcode": "4215", "subdistrictnameenglish": "Ashti", "subdistrictlocalname": "आष्टी" },
  { "districtcode": "470", "subdistrictcode": "4216", "subdistrictnameenglish": "Patoda", "subdistrictlocalname": "पाटोदा" },
  { "districtcode": "470", "subdistrictcode": "4217", "subdistrictnameenglish": "Shirur (Kasar)", "subdistrictlocalname": "शिरूर (कासार)" },
  { "districtcode": "470", "subdistrictcode": "4218", "subdistrictnameenglish": "Georai", "subdistrictlocalname": "गेवराई" },
  { "districtcode": "470", "subdistrictcode": "4219", "subdistrictnameenglish": "Majalgaon", "subdistrictlocalname": "माजलगाव" },
  { "districtcode": "470", "subdistrictcode": "4220", "subdistrictnameenglish": "Wadwani", "subdistrictlocalname": "वडवणी" },
  { "districtcode": "470", "subdistrictcode": "4221", "subdistrictnameenglish": "Beed", "subdistrictlocalname": "बीड" },
  { "districtcode": "470", "subdistrictcode": "4222", "subdistrictnameenglish": "Kaij", "subdistrictlocalname": "केज" },
  { "districtcode": "470", "subdistrictcode": "4223", "subdistrictnameenglish": "Dharur", "subdistrictlocalname": "धारूर" },
  { "districtcode": "470", "subdistrictcode": "4224", "subdistrictnameenglish": "Parli", "subdistrictlocalname": "परळी" },
  { "districtcode": "470", "subdistrictcode": "4225", "subdistrictnameenglish": "Ambejogai", "subdistrictlocalname": "आंबेजोगाई" },
  { "districtcode": "471", "subdistrictcode": "4037", "subdistrictnameenglish": "Tumsar", "subdistrictlocalname": "तुमसर" },
  { "districtcode": "471", "subdistrictcode": "4038", "subdistrictnameenglish": "Mohadi", "subdistrictlocalname": "मोहाडी" },
  { "districtcode": "471", "subdistrictcode": "4039", "subdistrictnameenglish": "Bhandara", "subdistrictlocalname": "भंडारा" },
  { "districtcode": "471", "subdistrictcode": "4040", "subdistrictnameenglish": "Sakoli", "subdistrictlocalname": "साकोली" },
  { "districtcode": "471", "subdistrictcode": "4041", "subdistrictnameenglish": "Lakhani", "subdistrictlocalname": "लाखनी" },
  { "districtcode": "471", "subdistrictcode": "4042", "subdistrictnameenglish": "Pauni", "subdistrictlocalname": "पवनी" },
  { "districtcode": "471", "subdistrictcode": "4043", "subdistrictnameenglish": "Lakhandur", "subdistrictlocalname": "लाखंदूर" },
  { "districtcode": "472", "subdistrictcode": "3975", "subdistrictnameenglish": "Jalgaon (Jamod)", "subdistrictlocalname": "जळगाव (जामोद)" },
  { "districtcode": "472", "subdistrictcode": "3976", "subdistrictnameenglish": "Sangrampur", "subdistrictlocalname": "संग्रामपूर" },
  { "districtcode": "472", "subdistrictcode": "3977", "subdistrictnameenglish": "Shegaon", "subdistrictlocalname": "शेगाव" },
  { "districtcode": "472", "subdistrictcode": "3978", "subdistrictnameenglish": "Nandura", "subdistrictlocalname": "नांदुरा" },
  { "districtcode": "472", "subdistrictcode": "3979", "subdistrictnameenglish": "Malkapur", "subdistrictlocalname": "मलकापूर" },
  { "districtcode": "472", "subdistrictcode": "3980", "subdistrictnameenglish": "Motala", "subdistrictlocalname": "मोताळा" },
  { "districtcode": "472", "subdistrictcode": "3981", "subdistrictnameenglish": "Khamgaon", "subdistrictlocalname": "खामगाव" },
  { "districtcode": "472", "subdistrictcode": "3982", "subdistrictnameenglish": "Mehkar", "subdistrictlocalname": "मेहकर" },
  { "districtcode": "472", "subdistrictcode": "3983", "subdistrictnameenglish": "Chikhli", "subdistrictlocalname": "चिखली" },
  { "districtcode": "472", "subdistrictcode": "3984", "subdistrictnameenglish": "Buldana", "subdistrictlocalname": "बुलडाणा" },
  { "districtcode": "472", "subdistrictcode": "3985", "subdistrictnameenglish": "Deolgaon Raja", "subdistrictlocalname": "देउळगाव राजा" },
  { "districtcode": "472", "subdistrictcode": "3986", "subdistrictnameenglish": "Sindkhed Raja", "subdistrictlocalname": "सिंदखेड राजा" },
  { "districtcode": "472", "subdistrictcode": "3987", "subdistrictnameenglish": "Lonar", "subdistrictlocalname": "लोणार" },
  { "districtcode": "473", "subdistrictcode": "4064", "subdistrictnameenglish": "Warora", "subdistrictlocalname": "वरोरा " },
  { "districtcode": "473", "subdistrictcode": "4065", "subdistrictnameenglish": "Chimur", "subdistrictlocalname": "चिमूर" },
  { "districtcode": "473", "subdistrictcode": "4066", "subdistrictnameenglish": "Nagbhid", "subdistrictlocalname": "नागभिड" },
  { "districtcode": "473", "subdistrictcode": "4067", "subdistrictnameenglish": "Brahmapuri", "subdistrictlocalname": "ब्रम्हपुरी" },
  { "districtcode": "473", "subdistrictcode": "4068", "subdistrictnameenglish": "Sawali", "subdistrictlocalname": "सावली " },
  { "districtcode": "473", "subdistrictcode": "4069", "subdistrictnameenglish": "Sindewahi", "subdistrictlocalname": "सिंदेवाही " },
  { "districtcode": "473", "subdistrictcode": "4070", "subdistrictnameenglish": "Bhadravati", "subdistrictlocalname": "भद्रावती " },
  { "districtcode": "473", "subdistrictcode": "4071", "subdistrictnameenglish": "Chandrapur", "subdistrictlocalname": "चंद्रपूर " },
  { "districtcode": "473", "subdistrictcode": "4072", "subdistrictnameenglish": "Mul", "subdistrictlocalname": "मुल" },
  { "districtcode": "473", "subdistrictcode": "4073", "subdistrictnameenglish": "Pombhurna", "subdistrictlocalname": "पोम्भूर्णा" },
  { "districtcode": "473", "subdistrictcode": "4074", "subdistrictnameenglish": "Ballarpur", "subdistrictlocalname": "बल्लारपूर" },
  { "districtcode": "473", "subdistrictcode": "4075", "subdistrictnameenglish": "Korpana", "subdistrictlocalname": "कोरपना" },
  { "districtcode": "473", "subdistrictcode": "4076", "subdistrictnameenglish": "Jiwati", "subdistrictlocalname": "जिवती" },
  { "districtcode": "473", "subdistrictcode": "4077", "subdistrictnameenglish": "Rajura", "subdistrictlocalname": "राजुरा " },
  { "districtcode": "473", "subdistrictcode": "4078", "subdistrictnameenglish": "Gondpipri", "subdistrictlocalname": "गोंडपिपरी" },
  { "districtcode": "474", "subdistrictcode": "3956", "subdistrictnameenglish": "Shirpur", "subdistrictlocalname": "शिरपूर" },
  { "districtcode": "474", "subdistrictcode": "3957", "subdistrictnameenglish": "Sindkhede", "subdistrictlocalname": "सिंदखेडे" },
  { "districtcode": "474", "subdistrictcode": "3958", "subdistrictnameenglish": "Sakri", "subdistrictlocalname": "साक्री" },
  { "districtcode": "474", "subdistrictcode": "3959", "subdistrictnameenglish": "Dhule", "subdistrictlocalname": "धुळे" },
  { "districtcode": "475", "subdistrictcode": "4052", "subdistrictnameenglish": "Desaiganj (Vadasa)", "subdistrictlocalname": "देसाईगंज (वडसा)" },
  { "districtcode": "475", "subdistrictcode": "4053", "subdistrictnameenglish": "Armori", "subdistrictlocalname": "आरमोरी" },
  { "districtcode": "475", "subdistrictcode": "4054", "subdistrictnameenglish": "Kurkheda", "subdistrictlocalname": "कुरखेडा " },
  { "districtcode": "475", "subdistrictcode": "4055", "subdistrictnameenglish": "Korchi", "subdistrictlocalname": "कोरची" },
  { "districtcode": "475", "subdistrictcode": "4056", "subdistrictnameenglish": "Dhanora", "subdistrictlocalname": "धानोरा " },
  { "districtcode": "475", "subdistrictcode": "4057", "subdistrictnameenglish": "Gadchiroli", "subdistrictlocalname": "गडचिरोली " },
  { "districtcode": "475", "subdistrictcode": "4058", "subdistrictnameenglish": "Chamorshi", "subdistrictlocalname": "चामोर्शी " },
  { "districtcode": "475", "subdistrictcode": "4059", "subdistrictnameenglish": "Mulchera", "subdistrictlocalname": "मुलचेरा " },
  { "districtcode": "475", "subdistrictcode": "4060", "subdistrictnameenglish": "Etapalli", "subdistrictlocalname": "एटापल्ली " },
  { "districtcode": "475", "subdistrictcode": "4061", "subdistrictnameenglish": "Bhamragad", "subdistrictlocalname": "भामरागड " },
  { "districtcode": "475", "subdistrictcode": "4062", "subdistrictnameenglish": "Aheri", "subdistrictlocalname": "अहेरी " },
  { "districtcode": "475", "subdistrictcode": "4063", "subdistrictnameenglish": "Sironcha", "subdistrictlocalname": "सिरोंचा " },
  { "districtcode": "476", "subdistrictcode": "4044", "subdistrictnameenglish": "Tirora", "subdistrictlocalname": "तिरोडा" },
  { "districtcode": "476", "subdistrictcode": "4045", "subdistrictnameenglish": "Goregaon", "subdistrictlocalname": "गोरेगाव" },
  { "districtcode": "476", "subdistrictcode": "4046", "subdistrictnameenglish": "Gondiya", "subdistrictlocalname": "गोंदिया" },
  { "districtcode": "476", "subdistrictcode": "4047", "subdistrictnameenglish": "Amgaon", "subdistrictlocalname": "आमगाव" },
  { "districtcode": "476", "subdistrictcode": "4048", "subdistrictnameenglish": "Salekasa", "subdistrictlocalname": "सालेकसा" },
  { "districtcode": "476", "subdistrictcode": "4049", "subdistrictnameenglish": "Sadak-Arjuni", "subdistrictlocalname": "सडक अर्जुनी" },
  { "districtcode": "476", "subdistrictcode": "4050", "subdistrictnameenglish": "Arjuni Morgaon", "subdistrictlocalname": "अर्जुनी मोरगाव" },
  { "districtcode": "476", "subdistrictcode": "4051", "subdistrictnameenglish": "Deori", "subdistrictlocalname": "देवरी" },
  { "districtcode": "477", "subdistrictcode": "4111", "subdistrictnameenglish": "Sengaon", "subdistrictlocalname": "सेनगाव" },
  { "districtcode": "477", "subdistrictcode": "4112", "subdistrictnameenglish": "Hingoli", "subdistrictlocalname": "हिंगोली " },
  { "districtcode": "477", "subdistrictcode": "4113", "subdistrictnameenglish": "Aundha (Nagnath)", "subdistrictlocalname": "औंढा (नागनाथ)" },
  { "districtcode": "477", "subdistrictcode": "4114", "subdistrictnameenglish": "Kalamnuri", "subdistrictlocalname": "कळमनुरी" },
  { "districtcode": "477", "subdistrictcode": "4115", "subdistrictnameenglish": "Vasmath", "subdistrictlocalname": "वसमत" },
  { "districtcode": "478", "subdistrictcode": "3960", "subdistrictnameenglish": "Chopda", "subdistrictlocalname": "चोपडा" },
  { "districtcode": "478", "subdistrictcode": "3961", "subdistrictnameenglish": "Yawal", "subdistrictlocalname": "यावल" },
  { "districtcode": "478", "subdistrictcode": "3962", "subdistrictnameenglish": "Raver", "subdistrictlocalname": "रावेर" },
  { "districtcode": "478", "subdistrictcode": "3963", "subdistrictnameenglish": "Muktainagar (Edlabad)", "subdistrictlocalname": "मुक्ताईनगर(एदलाबाद)" },
  { "districtcode": "478", "subdistrictcode": "3964", "subdistrictnameenglish": "Bodvad", "subdistrictlocalname": "बोधवड" },
  { "districtcode": "478", "subdistrictcode": "3965", "subdistrictnameenglish": "Bhusawal", "subdistrictlocalname": "भुसावळ" },
  { "districtcode": "478", "subdistrictcode": "3966", "subdistrictnameenglish": "Jalgaon", "subdistrictlocalname": "जळगाव" },
  { "districtcode": "478", "subdistrictcode": "3967", "subdistrictnameenglish": "Erandol", "subdistrictlocalname": "एरंडोल" },
  { "districtcode": "478", "subdistrictcode": "3968", "subdistrictnameenglish": "Dharangaon", "subdistrictlocalname": "धरणगाव" },
  { "districtcode": "478", "subdistrictcode": "3969", "subdistrictnameenglish": "Amalner", "subdistrictlocalname": "अमळनेर" },
  { "districtcode": "478", "subdistrictcode": "3970", "subdistrictnameenglish": "Parola", "subdistrictlocalname": "पारोळा" },
  { "districtcode": "478", "subdistrictcode": "3971", "subdistrictnameenglish": "Bhadgaon", "subdistrictlocalname": "भडगाव" },
  { "districtcode": "478", "subdistrictcode": "3972", "subdistrictnameenglish": "Chalisgaon", "subdistrictlocalname": "चाळीसगाव" },
  { "districtcode": "478", "subdistrictcode": "3973", "subdistrictnameenglish": "Pachora", "subdistrictlocalname": "पाचोरा" },
  { "districtcode": "478", "subdistrictcode": "3974", "subdistrictnameenglish": "Jamner", "subdistrictlocalname": "जामनेर" },
  { "districtcode": "479", "subdistrictcode": "4125", "subdistrictnameenglish": "Bhokardan", "subdistrictlocalname": "भोकरदन" },
  { "districtcode": "479", "subdistrictcode": "4126", "subdistrictnameenglish": "Jafrabad", "subdistrictlocalname": "जाफ्राबाद" },
  { "districtcode": "479", "subdistrictcode": "4127", "subdistrictnameenglish": "Jalna", "subdistrictlocalname": "जालना" },
  { "districtcode": "479", "subdistrictcode": "4128", "subdistrictnameenglish": "Badnapur", "subdistrictlocalname": "बदनापूर" },
  { "districtcode": "479", "subdistrictcode": "4129", "subdistrictnameenglish": "Ambad", "subdistrictlocalname": "अंबड" },
  { "districtcode": "479", "subdistrictcode": "4130", "subdistrictnameenglish": "Ghansawangi", "subdistrictlocalname": "घनसावंगी" },
  { "districtcode": "479", "subdistrictcode": "4131", "subdistrictnameenglish": "Partur", "subdistrictlocalname": "परतूर" },
  { "districtcode": "479", "subdistrictcode": "4132", "subdistrictnameenglish": "Mantha", "subdistrictlocalname": "मंठा" },
  { "districtcode": "480", "subdistrictcode": "4283", "subdistrictnameenglish": "Shahuwadi", "subdistrictlocalname": "शाहूवाडी" },
  { "districtcode": "480", "subdistrictcode": "4284", "subdistrictnameenglish": "Panhala", "subdistrictlocalname": "पन्हाळा" },
  { "districtcode": "480", "subdistrictcode": "4285", "subdistrictnameenglish": "Hatkanangle", "subdistrictlocalname": "हातकणंगले" },
  { "districtcode": "480", "subdistrictcode": "4286", "subdistrictnameenglish": "Shirol", "subdistrictlocalname": "शिरोळ" },
  { "districtcode": "480", "subdistrictcode": "4287", "subdistrictnameenglish": "Karvir", "subdistrictlocalname": "करवीर" },
  { "districtcode": "480", "subdistrictcode": "4288", "subdistrictnameenglish": "Gaganbawada", "subdistrictlocalname": "गगनबावडा" },
  { "districtcode": "480", "subdistrictcode": "4289", "subdistrictnameenglish": "Radhanagari", "subdistrictlocalname": "राधानगरी" },
  { "districtcode": "480", "subdistrictcode": "4290", "subdistrictnameenglish": "Kagal", "subdistrictlocalname": "कागल" },
  { "districtcode": "480", "subdistrictcode": "4291", "subdistrictnameenglish": "Bhudargad", "subdistrictlocalname": "भूदरगड" },
  { "districtcode": "480", "subdistrictcode": "4292", "subdistrictnameenglish": "Ajra", "subdistrictlocalname": "आजरा" },
  { "districtcode": "480", "subdistrictcode": "4293", "subdistrictnameenglish": "Gadhinglaj", "subdistrictlocalname": "गडहिंग्लज" },
  { "districtcode": "480", "subdistrictcode": "4294", "subdistrictnameenglish": "Chandgad", "subdistrictlocalname": "चंदगड" },
  { "districtcode": "481", "subdistrictcode": "4226", "subdistrictnameenglish": "Latur", "subdistrictlocalname": "लातूर" },
  { "districtcode": "481", "subdistrictcode": "4227", "subdistrictnameenglish": "Renapur", "subdistrictlocalname": "रेनापूर" },
  { "districtcode": "481", "subdistrictcode": "4228", "subdistrictnameenglish": "Ahmadpur", "subdistrictlocalname": "अहमदपूर" },
  { "districtcode": "481", "subdistrictcode": "4229", "subdistrictnameenglish": "Jalkot", "subdistrictlocalname": "जलकोट" },
  { "districtcode": "481", "subdistrictcode": "4230", "subdistrictnameenglish": "Chakur", "subdistrictlocalname": "चाकूर" },
  { "districtcode": "481", "subdistrictcode": "4231", "subdistrictnameenglish": "Shirur Anantpal", "subdistrictlocalname": "शिरूर अनंतपाळ" },
  { "districtcode": "481", "subdistrictcode": "4232", "subdistrictnameenglish": "Ausa", "subdistrictlocalname": "औसा" },
  { "districtcode": "481", "subdistrictcode": "4233", "subdistrictnameenglish": "Nilanga", "subdistrictlocalname": "निलंगा" },
  { "districtcode": "481", "subdistrictcode": "4234", "subdistrictnameenglish": "Deoni", "subdistrictlocalname": "देवनी" },
  { "districtcode": "481", "subdistrictcode": "4235", "subdistrictnameenglish": "Udgir", "subdistrictlocalname": "उदगीर" },
  { "districtcode": "483", "subdistrictcode": "7179", "subdistrictnameenglish": "Andheri", "subdistrictlocalname": "अंधेरी" },
  { "districtcode": "483", "subdistrictcode": "7180", "subdistrictnameenglish": "Kurla", "subdistrictlocalname": "कुर्ला" },
  { "districtcode": "483", "subdistrictcode": "7181", "subdistrictnameenglish": "Borivali", "subdistrictlocalname": "बोरीवली" },
  { "districtcode": "484", "subdistrictcode": "4023", "subdistrictnameenglish": "Narkhed", "subdistrictlocalname": "नरखेड" },
  { "districtcode": "484", "subdistrictcode": "4024", "subdistrictnameenglish": "Katol", "subdistrictlocalname": "काटोल" },
  { "districtcode": "484", "subdistrictcode": "4025", "subdistrictnameenglish": "Kalameshwar", "subdistrictlocalname": "कळमेश्वर " },
  { "districtcode": "484", "subdistrictcode": "4026", "subdistrictnameenglish": "Savner", "subdistrictlocalname": "सावनेर" },
  { "districtcode": "484", "subdistrictcode": "4027", "subdistrictnameenglish": "Parseoni", "subdistrictlocalname": "पारशिवनी" },
  { "districtcode": "484", "subdistrictcode": "4028", "subdistrictnameenglish": "Ramtek", "subdistrictlocalname": "रामटेक" },
  { "districtcode": "484", "subdistrictcode": "4029", "subdistrictnameenglish": "Mauda", "subdistrictlocalname": "मौदा" },
  { "districtcode": "484", "subdistrictcode": "4030", "subdistrictnameenglish": "Kamptee", "subdistrictlocalname": "कामठी" },
  { "districtcode": "484", "subdistrictcode": "4031", "subdistrictnameenglish": "Nagpur (Rural)", "subdistrictlocalname": "नागपूर (ग्रामीण)" },
  { "districtcode": "484", "subdistrictcode": "4032", "subdistrictnameenglish": "Nagpur (Urban)", "subdistrictlocalname": "नागपूर (शहर)" },
  { "districtcode": "484", "subdistrictcode": "4033", "subdistrictnameenglish": "Hingna", "subdistrictlocalname": "हिंगणा" },
  { "districtcode": "484", "subdistrictcode": "4034", "subdistrictnameenglish": "Umred", "subdistrictlocalname": "उमरेड" },
  { "districtcode": "484", "subdistrictcode": "4035", "subdistrictnameenglish": "Kuhi", "subdistrictlocalname": "कुही" },
  { "districtcode": "484", "subdistrictcode": "4036", "subdistrictnameenglish": "Bhiwapur", "subdistrictlocalname": "भिवापूर" },
  { "districtcode": "485", "subdistrictcode": "4095", "subdistrictnameenglish": "Mahur", "subdistrictlocalname": "माहूर" },
  { "districtcode": "485", "subdistrictcode": "4096", "subdistrictnameenglish": "Kinwat", "subdistrictlocalname": "किनवत" },
  { "districtcode": "485", "subdistrictcode": "4097", "subdistrictnameenglish": "Himayatnagar", "subdistrictlocalname": "हिमायतनगर" },
  { "districtcode": "485", "subdistrictcode": "4098", "subdistrictnameenglish": "Hadgaon", "subdistrictlocalname": "हदगाव" },
  { "districtcode": "485", "subdistrictcode": "4099", "subdistrictnameenglish": "Ardhapur", "subdistrictlocalname": "अर्धापूर" },
  { "districtcode": "485", "subdistrictcode": "4100", "subdistrictnameenglish": "Nanded", "subdistrictlocalname": "नांदेड" },
  { "districtcode": "485", "subdistrictcode": "4101", "subdistrictnameenglish": "Mudkhed", "subdistrictlocalname": "मुदखेड" },
  { "districtcode": "485", "subdistrictcode": "4102", "subdistrictnameenglish": "Bhokar", "subdistrictlocalname": "भोकर" },
  { "districtcode": "485", "subdistrictcode": "4103", "subdistrictnameenglish": "Umri", "subdistrictlocalname": "उमरी" },
  { "districtcode": "485", "subdistrictcode": "4104", "subdistrictnameenglish": "Dharmabad", "subdistrictlocalname": "धर्माबाद" },
  { "districtcode": "485", "subdistrictcode": "4105", "subdistrictnameenglish": "Biloli", "subdistrictlocalname": "बिलोली" },
  { "districtcode": "485", "subdistrictcode": "4106", "subdistrictnameenglish": "Naigaon (Khairgaon)", "subdistrictlocalname": "नायगाव (खैरगाव)" },
  { "districtcode": "485", "subdistrictcode": "4107", "subdistrictnameenglish": "Loha", "subdistrictlocalname": "लोहा" },
  { "districtcode": "485", "subdistrictcode": "4108", "subdistrictnameenglish": "Kandhar", "subdistrictlocalname": "कंधार" },
  { "districtcode": "485", "subdistrictcode": "4109", "subdistrictnameenglish": "Mukhed", "subdistrictlocalname": "मुखेड" },
  { "districtcode": "485", "subdistrictcode": "4110", "subdistrictnameenglish": "Deglur", "subdistrictlocalname": "देगलुर" },
  { "districtcode": "486", "subdistrictcode": "3950", "subdistrictnameenglish": "Akkalkuwa", "subdistrictlocalname": "अक्कलकुवा" },
  { "districtcode": "486", "subdistrictcode": "3951", "subdistrictnameenglish": "Akrani", "subdistrictlocalname": "अकर्नी" },
  { "districtcode": "486", "subdistrictcode": "3952", "subdistrictnameenglish": "Talode", "subdistrictlocalname": "तलोदा" },
  { "districtcode": "486", "subdistrictcode": "3953", "subdistrictnameenglish": "Shahade", "subdistrictlocalname": "शहादा" },
  { "districtcode": "486", "subdistrictcode": "3954", "subdistrictnameenglish": "Nandurbar", "subdistrictlocalname": "नंदूरबार" },
  { "districtcode": "486", "subdistrictcode": "3955", "subdistrictnameenglish": "Nawapur", "subdistrictlocalname": "नवापूर" },
  { "districtcode": "487", "subdistrictcode": "4142", "subdistrictnameenglish": "Surgana", "subdistrictlocalname": "सुरगना" },
  { "districtcode": "487", "subdistrictcode": "4143", "subdistrictnameenglish": "Kalwan", "subdistrictlocalname": "कालवण" },
  { "districtcode": "487", "subdistrictcode": "4144", "subdistrictnameenglish": "Deola", "subdistrictlocalname": "देवळा" },
  { "districtcode": "487", "subdistrictcode": "4145", "subdistrictnameenglish": "Baglan", "subdistrictlocalname": "बागलण" },
  { "districtcode": "487", "subdistrictcode": "4146", "subdistrictnameenglish": "Malegaon", "subdistrictlocalname": "मालेगाव" },
  { "districtcode": "487", "subdistrictcode": "4147", "subdistrictnameenglish": "Nandgaon", "subdistrictlocalname": "नांदगाव" },
  { "districtcode": "487", "subdistrictcode": "4148", "subdistrictnameenglish": "Chandvad", "subdistrictlocalname": "चांदवड" },
  { "districtcode": "487", "subdistrictcode": "4149", "subdistrictnameenglish": "Dindori", "subdistrictlocalname": "दिंडोरी" },
  { "districtcode": "487", "subdistrictcode": "4150", "subdistrictnameenglish": "Peth", "subdistrictlocalname": "पेठ" },
  { "districtcode": "487", "subdistrictcode": "4151", "subdistrictnameenglish": "Trimbakeshwar", "subdistrictlocalname": "त्र्यंबक" },
  { "districtcode": "487", "subdistrictcode": "4152", "subdistrictnameenglish": "Nashik", "subdistrictlocalname": "नाशिक" },
  { "districtcode": "487", "subdistrictcode": "4153", "subdistrictnameenglish": "Igatpuri", "subdistrictlocalname": "इगतपूरी" },
  { "districtcode": "487", "subdistrictcode": "4154", "subdistrictnameenglish": "Sinnar", "subdistrictlocalname": "सिन्नर" },
  { "districtcode": "487", "subdistrictcode": "4155", "subdistrictnameenglish": "Niphad", "subdistrictlocalname": "निफाड" },
  { "districtcode": "487", "subdistrictcode": "4156", "subdistrictnameenglish": "Yevla", "subdistrictlocalname": "येवला" },
  { "districtcode": "488", "subdistrictcode": "4236", "subdistrictnameenglish": "Paranda", "subdistrictlocalname": "परंडा" },
  { "districtcode": "488", "subdistrictcode": "4237", "subdistrictnameenglish": "Bhum", "subdistrictlocalname": "भूम" },
  { "districtcode": "488", "subdistrictcode": "4238", "subdistrictnameenglish": "Washi", "subdistrictlocalname": "वाशी" },
  { "districtcode": "488", "subdistrictcode": "4239", "subdistrictnameenglish": "Kalamb", "subdistrictlocalname": "कळंब" },
  { "districtcode": "488", "subdistrictcode": "4240", "subdistrictnameenglish": "Dharashiv", "subdistrictlocalname": "धाराशिव" },
  { "districtcode": "488", "subdistrictcode": "4241", "subdistrictnameenglish": "Tuljapur", "subdistrictlocalname": "तुळजापूर" },
  { "districtcode": "488", "subdistrictcode": "4242", "subdistrictnameenglish": "Lohara", "subdistrictlocalname": "लोहारा" },
  { "districtcode": "488", "subdistrictcode": "4243", "subdistrictnameenglish": "Omarga", "subdistrictlocalname": "उमरगा" },
  { "districtcode": "489", "subdistrictcode": "4116", "subdistrictnameenglish": "Selu", "subdistrictlocalname": "सेलू" },
  { "districtcode": "489", "subdistrictcode": "4117", "subdistrictnameenglish": "Jintur", "subdistrictlocalname": "जिंतुर" },
  { "districtcode": "489", "subdistrictcode": "4118", "subdistrictnameenglish": "Parbhani", "subdistrictlocalname": "परभणी" },
  { "districtcode": "489", "subdistrictcode": "4119", "subdistrictnameenglish": "Manwath", "subdistrictlocalname": "मानवत" },
  { "districtcode": "489", "subdistrictcode": "4120", "subdistrictnameenglish": "Pathri", "subdistrictlocalname": "पाथ्री" },
  { "districtcode": "489", "subdistrictcode": "4121", "subdistrictnameenglish": "Sonpeth", "subdistrictlocalname": "सोनपेठ" },
  { "districtcode": "489", "subdistrictcode": "4122", "subdistrictnameenglish": "Gangakhed", "subdistrictlocalname": "गंगाखेड" },
  { "districtcode": "489", "subdistrictcode": "4123", "subdistrictnameenglish": "Palam", "subdistrictlocalname": "पालम" },
  { "districtcode": "489", "subdistrictcode": "4124", "subdistrictnameenglish": "Purna", "subdistrictlocalname": "पुर्णा" },
  { "districtcode": "490", "subdistrictcode": "4187", "subdistrictnameenglish": "Junnar", "subdistrictlocalname": "जुन्नर" },
  { "districtcode": "490", "subdistrictcode": "4188", "subdistrictnameenglish": "Ambegaon", "subdistrictlocalname": "आंबेगाव" },
  { "districtcode": "490", "subdistrictcode": "4189", "subdistrictnameenglish": "Shirur", "subdistrictlocalname": "शिरूर" },
  { "districtcode": "490", "subdistrictcode": "4190", "subdistrictnameenglish": "Khed", "subdistrictlocalname": "खेड" },
  { "districtcode": "490", "subdistrictcode": "4191", "subdistrictnameenglish": "Mawal", "subdistrictlocalname": "मावळ" },
  { "districtcode": "490", "subdistrictcode": "4192", "subdistrictnameenglish": "Mulshi", "subdistrictlocalname": "मुळशी" },
  { "districtcode": "490", "subdistrictcode": "4193", "subdistrictnameenglish": "Haveli", "subdistrictlocalname": "हवेली" },
  { "districtcode": "490", "subdistrictcode": "4194", "subdistrictnameenglish": "Pune City", "subdistrictlocalname": "पुणे शहर" },
  { "districtcode": "490", "subdistrictcode": "4195", "subdistrictnameenglish": "Daund", "subdistrictlocalname": "दौंड" },
  { "districtcode": "490", "subdistrictcode": "4196", "subdistrictnameenglish": "Purandhar", "subdistrictlocalname": "पुरंदर" },
  { "districtcode": "490", "subdistrictcode": "4197", "subdistrictnameenglish": "Velhe", "subdistrictlocalname": "वेल्हे" },
  { "districtcode": "490", "subdistrictcode": "4198", "subdistrictnameenglish": "Bhor", "subdistrictlocalname": "भोर" },
  { "districtcode": "490", "subdistrictcode": "4199", "subdistrictnameenglish": "Baramati", "subdistrictlocalname": "बारामती" },
  { "districtcode": "490", "subdistrictcode": "4200", "subdistrictnameenglish": "Indapur", "subdistrictlocalname": "इंदापूर" },
  { "districtcode": "491", "subdistrictcode": "4172", "subdistrictnameenglish": "Uran", "subdistrictlocalname": "उरण" },
  { "districtcode": "491", "subdistrictcode": "4173", "subdistrictnameenglish": "Panvel", "subdistrictlocalname": "पनवेल" },
  { "districtcode": "491", "subdistrictcode": "4174", "subdistrictnameenglish": "Karjat", "subdistrictlocalname": "कर्जत" },
  { "districtcode": "491", "subdistrictcode": "4175", "subdistrictnameenglish": "Khalapur", "subdistrictlocalname": "खालापूर" },
  { "districtcode": "491", "subdistrictcode": "4176", "subdistrictnameenglish": "Pen", "subdistrictlocalname": "पेण" },
  { "districtcode": "491", "subdistrictcode": "4177", "subdistrictnameenglish": "Alibag", "subdistrictlocalname": "अलिबाग" },
  { "districtcode": "491", "subdistrictcode": "4178", "subdistrictnameenglish": "Murud", "subdistrictlocalname": "मुरूड" },
  { "districtcode": "491", "subdistrictcode": "4179", "subdistrictnameenglish": "Roha", "subdistrictlocalname": "रोहा" },
  { "districtcode": "491", "subdistrictcode": "4180", "subdistrictnameenglish": "Sudhagad", "subdistrictlocalname": "सुधागड" },
  { "districtcode": "491", "subdistrictcode": "4181", "subdistrictnameenglish": "Mangaon", "subdistrictlocalname": "मानगाव" },
  { "districtcode": "491", "subdistrictcode": "4182", "subdistrictnameenglish": "Tala", "subdistrictlocalname": "तळा" },
  { "districtcode": "491", "subdistrictcode": "4183", "subdistrictnameenglish": "Shrivardhan", "subdistrictlocalname": "श्रीवर्धन" },
  { "districtcode": "491", "subdistrictcode": "4184", "subdistrictnameenglish": "Mhasla", "subdistrictlocalname": "म्हासळा" },
  { "districtcode": "491", "subdistrictcode": "4185", "subdistrictnameenglish": "Mahad", "subdistrictlocalname": "महाड" },
  { "districtcode": "491", "subdistrictcode": "4186", "subdistrictnameenglish": "Poladpur", "subdistrictlocalname": "पोलादपूर" },
  { "districtcode": "492", "subdistrictcode": "4266", "subdistrictnameenglish": "Mandangad", "subdistrictlocalname": "मंडणगड" },
  { "districtcode": "492", "subdistrictcode": "4267", "subdistrictnameenglish": "Dapoli", "subdistrictlocalname": "दापोली" },
  { "districtcode": "492", "subdistrictcode": "4268", "subdistrictnameenglish": "Khed", "subdistrictlocalname": "खेड" },
  { "districtcode": "492", "subdistrictcode": "4269", "subdistrictnameenglish": "Chiplun", "subdistrictlocalname": "चिपळूण" },
  { "districtcode": "492", "subdistrictcode": "4270", "subdistrictnameenglish": "Guhagar", "subdistrictlocalname": "गुहाघर" },
  { "districtcode": "492", "subdistrictcode": "4271", "subdistrictnameenglish": "Ratnagiri", "subdistrictlocalname": "रत्नागिरी" },
  { "districtcode": "492", "subdistrictcode": "4272", "subdistrictnameenglish": "Sangameshwar", "subdistrictlocalname": "संगमेश्वर" },
  { "districtcode": "492", "subdistrictcode": "4273", "subdistrictnameenglish": "Lanja", "subdistrictlocalname": "लांजा" },
  { "districtcode": "492", "subdistrictcode": "4274", "subdistrictnameenglish": "Rajapur", "subdistrictlocalname": "राजापूर" },
  { "districtcode": "493", "subdistrictcode": "4295", "subdistrictnameenglish": "Shirala", "subdistrictlocalname": "शिराळा" },
  { "districtcode": "493", "subdistrictcode": "4296", "subdistrictnameenglish": "Walwa", "subdistrictlocalname": "वाळवा" },
  { "districtcode": "493", "subdistrictcode": "4297", "subdistrictnameenglish": "Palus", "subdistrictlocalname": "पलुस" },
  { "districtcode": "493", "subdistrictcode": "4298", "subdistrictnameenglish": "Kadegaon", "subdistrictlocalname": "कडेगाव" },
  { "districtcode": "493", "subdistrictcode": "4299", "subdistrictnameenglish": "Khanapur", "subdistrictlocalname": "खानापूर" },
  { "districtcode": "493", "subdistrictcode": "4300", "subdistrictnameenglish": "Atpadi", "subdistrictlocalname": "आटपाडी" },
  { "districtcode": "493", "subdistrictcode": "4301", "subdistrictnameenglish": "Tasgaon", "subdistrictlocalname": "तासगाव" },
  { "districtcode": "493", "subdistrictcode": "4302", "subdistrictnameenglish": "Miraj", "subdistrictlocalname": "मिरज" },
  { "districtcode": "493", "subdistrictcode": "4303", "subdistrictnameenglish": "Kavathemahankal", "subdistrictlocalname": "कवठेमहांकाळ" },
  { "districtcode": "493", "subdistrictcode": "4304", "subdistrictnameenglish": "Jat", "subdistrictlocalname": "जत" },
  { "districtcode": "494", "subdistrictcode": "4255", "subdistrictnameenglish": "Mahabaleshwar", "subdistrictlocalname": "महाबळेश्वर" },
  { "districtcode": "494", "subdistrictcode": "4256", "subdistrictnameenglish": "Wai", "subdistrictlocalname": "वाई" },
  { "districtcode": "494", "subdistrictcode": "4257", "subdistrictnameenglish": "Khandala", "subdistrictlocalname": "खंडाळा" },
  { "districtcode": "494", "subdistrictcode": "4258", "subdistrictnameenglish": "Phaltan", "subdistrictlocalname": "फलटण" },
  { "districtcode": "494", "subdistrictcode": "4259", "subdistrictnameenglish": "Man", "subdistrictlocalname": "माण" },
  { "districtcode": "494", "subdistrictcode": "4260", "subdistrictnameenglish": "Khatav", "subdistrictlocalname": "खटाव" },
  { "districtcode": "494", "subdistrictcode": "4261", "subdistrictnameenglish": "Koregaon", "subdistrictlocalname": "कोरेगाव" },
  { "districtcode": "494", "subdistrictcode": "4262", "subdistrictnameenglish": "Satara", "subdistrictlocalname": "सातारा" },
  { "districtcode": "494", "subdistrictcode": "4263", "subdistrictnameenglish": "Jaoli", "subdistrictlocalname": "जावळी" },
  { "districtcode": "494", "subdistrictcode": "4264", "subdistrictnameenglish": "Patan", "subdistrictlocalname": "पाटण" },
  { "districtcode": "494", "subdistrictcode": "4265", "subdistrictnameenglish": "Karad", "subdistrictlocalname": "कराड" },
  { "districtcode": "495", "subdistrictcode": "4275", "subdistrictnameenglish": "Devgad", "subdistrictlocalname": "देवगड" },
  { "districtcode": "495", "subdistrictcode": "4276", "subdistrictnameenglish": "Vaibhavvadi", "subdistrictlocalname": "वैभववाडी" },
  { "districtcode": "495", "subdistrictcode": "4277", "subdistrictnameenglish": "Kankavli", "subdistrictlocalname": "कणकवली" },
  { "districtcode": "495", "subdistrictcode": "4278", "subdistrictnameenglish": "Malwan", "subdistrictlocalname": "मालवण" },
  { "districtcode": "495", "subdistrictcode": "4279", "subdistrictnameenglish": "Vengurla", "subdistrictlocalname": "वेंगुर्ला" },
  { "districtcode": "495", "subdistrictcode": "4280", "subdistrictnameenglish": "Kudal", "subdistrictlocalname": "कुडाळ" },
  { "districtcode": "495", "subdistrictcode": "4281", "subdistrictnameenglish": "Sawantwadi", "subdistrictlocalname": "सावंतवाडी" },
  { "districtcode": "495", "subdistrictcode": "4282", "subdistrictnameenglish": "Dodamarg", "subdistrictlocalname": "दोडामार्ग" },
  { "districtcode": "496", "subdistrictcode": "4244", "subdistrictnameenglish": "Karmala", "subdistrictlocalname": "करमाळा" },
  { "districtcode": "496", "subdistrictcode": "4245", "subdistrictnameenglish": "Madha", "subdistrictlocalname": "माढा" },
  { "districtcode": "496", "subdistrictcode": "4246", "subdistrictnameenglish": "Barshi", "subdistrictlocalname": "बार्शी" },
  { "districtcode": "496", "subdistrictcode": "4247", "subdistrictnameenglish": "Solapur North", "subdistrictlocalname": "उत्तर सोलापूर" },
  { "districtcode": "496", "subdistrictcode": "4248", "subdistrictnameenglish": "Mohol", "subdistrictlocalname": "मोहोळ" },
  { "districtcode": "496", "subdistrictcode": "4249", "subdistrictnameenglish": "Pandharpur", "subdistrictlocalname": "पंढरपूर" },
  { "districtcode": "496", "subdistrictcode": "4250", "subdistrictnameenglish": "Malshiras", "subdistrictlocalname": "माळशिरस" },
  { "districtcode": "496", "subdistrictcode": "4251", "subdistrictnameenglish": "Sangole", "subdistrictlocalname": "सांगोले" },
  { "districtcode": "496", "subdistrictcode": "4252", "subdistrictnameenglish": "Mangalvedhe", "subdistrictlocalname": "मंगळवेढे" },
  { "districtcode": "496", "subdistrictcode": "4253", "subdistrictnameenglish": "Solapur South", "subdistrictlocalname": "दक्षिण सोलापूर" },
  { "districtcode": "496", "subdistrictcode": "4254", "subdistrictnameenglish": "Akkalkot", "subdistrictlocalname": "अक्कलकोट" },
  { "districtcode": "497", "subdistrictcode": "4165", "subdistrictnameenglish": "Thane", "subdistrictlocalname": "ठाणे" },
  { "districtcode": "497", "subdistrictcode": "4166", "subdistrictnameenglish": "Bhiwandi", "subdistrictlocalname": "भिवंडी" },
  { "districtcode": "497", "subdistrictcode": "4167", "subdistrictnameenglish": "Shahapur", "subdistrictlocalname": "शहापूर" },
  { "districtcode": "497", "subdistrictcode": "4168", "subdistrictnameenglish": "Kalyan", "subdistrictlocalname": "कल्याण" },
  { "districtcode": "497", "subdistrictcode": "4169", "subdistrictnameenglish": "Ulhasnagar", "subdistrictlocalname": "उल्हासनगर" },
  { "districtcode": "497", "subdistrictcode": "4170", "subdistrictnameenglish": "Ambarnath", "subdistrictlocalname": "अंबरनाथ" },
  { "districtcode": "497", "subdistrictcode": "4171", "subdistrictnameenglish": "Murbad", "subdistrictlocalname": "मुरबाड" },
  { "districtcode": "498", "subdistrictcode": "4015", "subdistrictnameenglish": "Ashti", "subdistrictlocalname": "आष्टी" },
  { "districtcode": "498", "subdistrictcode": "4016", "subdistrictnameenglish": "Karanja", "subdistrictlocalname": "कारंजा" },
  { "districtcode": "498", "subdistrictcode": "4017", "subdistrictnameenglish": "Arvi", "subdistrictlocalname": "आर्वी" },
  { "districtcode": "498", "subdistrictcode": "4018", "subdistrictnameenglish": "Seloo", "subdistrictlocalname": "सेलू" },
  { "districtcode": "498", "subdistrictcode": "4019", "subdistrictnameenglish": "Wardha", "subdistrictlocalname": "वर्धा" },
  { "districtcode": "498", "subdistrictcode": "4020", "subdistrictnameenglish": "Deoli", "subdistrictlocalname": "देवळी" },
  { "districtcode": "498", "subdistrictcode": "4021", "subdistrictnameenglish": "Hinganghat", "subdistrictlocalname": "हिंगणघाट" },
  { "districtcode": "498", "subdistrictcode": "4022", "subdistrictnameenglish": "Samudrapur", "subdistrictlocalname": "समुद्रपूर" },
  { "districtcode": "499", "subdistrictcode": "3995", "subdistrictnameenglish": "Malegaon", "subdistrictlocalname": "मालेगाव" },
  { "districtcode": "499", "subdistrictcode": "3996", "subdistrictnameenglish": "Mangrulpir", "subdistrictlocalname": "मंगरूळपीर" },
  { "districtcode": "499", "subdistrictcode": "3997", "subdistrictnameenglish": "Karanja", "subdistrictlocalname": "कारंजा" },
  { "districtcode": "499", "subdistrictcode": "3998", "subdistrictnameenglish": "Manora", "subdistrictlocalname": "मानोरा" },
  { "districtcode": "499", "subdistrictcode": "3999", "subdistrictnameenglish": "Washim", "subdistrictlocalname": "वाशिम" },
  { "districtcode": "499", "subdistrictcode": "4000", "subdistrictnameenglish": "Risod", "subdistrictlocalname": "रिसोड" },
  { "districtcode": "500", "subdistrictcode": "4079", "subdistrictnameenglish": "Ner", "subdistrictlocalname": "नेर" },
  { "districtcode": "500", "subdistrictcode": "4080", "subdistrictnameenglish": "Babulgaon", "subdistrictlocalname": "बाबूलगाव" },
  { "districtcode": "500", "subdistrictcode": "4081", "subdistrictnameenglish": "Kalamb", "subdistrictlocalname": "कळंब" },
  { "districtcode": "500", "subdistrictcode": "4082", "subdistrictnameenglish": "Yavatmal", "subdistrictlocalname": "यवतमाळ" },
  { "districtcode": "500", "subdistrictcode": "4083", "subdistrictnameenglish": "Darwha", "subdistrictlocalname": "धारवा" },
  { "districtcode": "500", "subdistrictcode": "4084", "subdistrictnameenglish": "Digras", "subdistrictlocalname": "दिग्रस" },
  { "districtcode": "500", "subdistrictcode": "4085", "subdistrictnameenglish": "Pusad", "subdistrictlocalname": "पूसद" },
  { "districtcode": "500", "subdistrictcode": "4086", "subdistrictnameenglish": "Umarkhed", "subdistrictlocalname": "उमरखेड" },
  { "districtcode": "500", "subdistrictcode": "4087", "subdistrictnameenglish": "Mahagaon", "subdistrictlocalname": "महागाव" },
  { "districtcode": "500", "subdistrictcode": "4088", "subdistrictnameenglish": "Arni", "subdistrictlocalname": "अर्नी" },
  { "districtcode": "500", "subdistrictcode": "4089", "subdistrictnameenglish": "Ghatanji", "subdistrictlocalname": "घाटंजी" },
  { "districtcode": "500", "subdistrictcode": "4090", "subdistrictnameenglish": "Kelapur", "subdistrictlocalname": "केलापूर" },
  { "districtcode": "500", "subdistrictcode": "4091", "subdistrictnameenglish": "Ralegaon", "subdistrictlocalname": "राळेगाव" },
  { "districtcode": "500", "subdistrictcode": "4092", "subdistrictnameenglish": "Maregaon", "subdistrictlocalname": "मारेगाव" },
  { "districtcode": "500", "subdistrictcode": "4093", "subdistrictnameenglish": "Zari-Jamani", "subdistrictlocalname": "जरी जामनी" },
  { "districtcode": "500", "subdistrictcode": "4094", "subdistrictnameenglish": "Wani", "subdistrictlocalname": "वनी" },
  { "districtcode": "665", "subdistrictcode": "4157", "subdistrictnameenglish": "Talasari", "subdistrictlocalname": "तलासरी" },
  { "districtcode": "665", "subdistrictcode": "4158", "subdistrictnameenglish": "Dahanu", "subdistrictlocalname": "डहाणू" },
  { "districtcode": "665", "subdistrictcode": "4159", "subdistrictnameenglish": "Vikramgad", "subdistrictlocalname": "विक्रमगड" },
  { "districtcode": "665", "subdistrictcode": "4160", "subdistrictnameenglish": "Jawhar", "subdistrictlocalname": "जव्हार" },
  { "districtcode": "665", "subdistrictcode": "4161", "subdistrictnameenglish": "Mokhada", "subdistrictlocalname": "मोखाडा" },
  { "districtcode": "665", "subdistrictcode": "4162", "subdistrictnameenglish": "Wada", "subdistrictlocalname": "वाडा" },
  { "districtcode": "665", "subdistrictcode": "4163", "subdistrictnameenglish": "Palghar", "subdistrictlocalname": "पालघर" },
  { "districtcode": "665", "subdistrictcode": "4164", "subdistrictnameenglish": "Vasai", "subdistrictlocalname": "वसई" }
];

async function createAndSeedDistrictsAndTalukas() {
  console.log('🚀 Setting up "districts" and "talukas" tables...');

  try {
    // 1. Create districts table
    await query(`
      CREATE TABLE IF NOT EXISTS public.districts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        district_code VARCHAR(20) UNIQUE NOT NULL,
        name_english VARCHAR(150) NOT NULL,
        name_marathi VARCHAR(150),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_districts_code ON public.districts(district_code);
      CREATE INDEX IF NOT EXISTS idx_districts_name_en ON public.districts(name_english);
    `);
    console.log('✅ Table "public.districts" created / verified.');

    // 2. Create talukas table connected via district_code (FK)
    await query(`
      CREATE TABLE IF NOT EXISTS public.talukas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        district_code VARCHAR(20) NOT NULL REFERENCES public.districts(district_code) ON DELETE CASCADE ON UPDATE CASCADE,
        district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL,
        subdistrict_code VARCHAR(20) UNIQUE NOT NULL,
        name_english VARCHAR(150) NOT NULL,
        name_marathi VARCHAR(150),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Add columns if existing table had different structure
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS district_code VARCHAR(20) REFERENCES public.districts(district_code) ON DELETE CASCADE ON UPDATE CASCADE;
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL;
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS subdistrict_code VARCHAR(20);
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS name_english VARCHAR(150);
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS name_marathi VARCHAR(150);
      ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

      CREATE INDEX IF NOT EXISTS idx_talukas_district_code ON public.talukas(district_code);
      CREATE INDEX IF NOT EXISTS idx_talukas_subdistrict_code ON public.talukas(subdistrict_code);
      CREATE INDEX IF NOT EXISTS idx_talukas_name_en ON public.talukas(name_english);

      -- Create compatibility views for singular names "district" and "taluka"
      CREATE OR REPLACE VIEW public.district AS SELECT * FROM public.districts;
      CREATE OR REPLACE VIEW public.taluka AS SELECT * FROM public.talukas;
    `);
    console.log('✅ Table "public.talukas" and compatibility views "district", "taluka" created / verified.');

    // 3. Upsert Districts
    console.log(`\n🌱 Seeding ${DISTRICTS_DATA.length} districts...`);
    const districtIdMap = {};

    for (const d of DISTRICTS_DATA) {
      const res = await query(`
        INSERT INTO public.districts (district_code, name_english, name_marathi, is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (district_code) 
        DO UPDATE SET 
          name_english = EXCLUDED.name_english,
          name_marathi = EXCLUDED.name_marathi,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, district_code;
      `, [d.district_code, d.name_english, d.name_marathi, d.is_active]);

      districtIdMap[res.rows[0].district_code] = res.rows[0].id;
    }
    console.log(`✅ All ${DISTRICTS_DATA.length} districts seeded successfully!`);

    // 4. Upsert Talukas
    console.log(`\n🌱 Seeding ${TALUKAS_DATA.length} talukas connected via district_code...`);
    let seededTalukasCount = 0;

    for (const t of TALUKAS_DATA) {
      const dId = districtIdMap[t.districtcode] || null;

      await query(`
        INSERT INTO public.talukas (district_code, district_id, subdistrict_code, name_english, name_marathi, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (subdistrict_code)
        DO UPDATE SET
          district_code = EXCLUDED.district_code,
          district_id = EXCLUDED.district_id,
          name_english = EXCLUDED.name_english,
          name_marathi = EXCLUDED.name_marathi,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP;
      `, [t.districtcode, dId, t.subdistrictcode, t.subdistrictnameenglish, t.subdistrictlocalname]);

      seededTalukasCount++;
    }
    console.log(`✅ All ${seededTalukasCount} talukas seeded successfully!`);

    // 5. Verification & Summary Report
    console.log('\n========================================================================');
    console.log('📊 DISTRICTS & TALUKAS VERIFICATION SUMMARY');
    console.log('========================================================================');

    const districtCount = await query('SELECT count(*)::int AS count FROM public.districts;');
    const talukaCount = await query('SELECT count(*)::int AS count FROM public.talukas;');

    console.log(`Total Districts: ${districtCount.rows[0].count}`);
    console.log(`Total Talukas:   ${talukaCount.rows[0].count}`);

    // Test a relational join to prove connection via district_code
    const sampleJoin = await query(`
      SELECT 
        d.district_code,
        d.name_english AS district_name_en,
        d.name_marathi AS district_name_mr,
        COUNT(t.id)::int AS total_talukas,
        STRING_AGG(t.name_english, ', ' ORDER BY t.name_english) FILTER (WHERE t.name_english IS NOT NULL) AS sample_talukas
      FROM public.districts d
      JOIN public.talukas t ON d.district_code = t.district_code
      GROUP BY d.district_code, d.name_english, d.name_marathi
      ORDER BY d.district_code
      LIMIT 10;
    `);

    console.log('\n📋 Sample Relational Join Verification (First 10 Districts):');
    console.table(sampleJoin.rows.map(r => ({
      'District Code': r.district_code,
      'District (EN)': r.district_name_en,
      'District (MR)': r.district_name_mr,
      'Taluka Count': r.total_talukas,
      'Sample Talukas': r.sample_talukas ? r.sample_talukas.slice(0, 50) + '...' : ''
    })));

    console.log('🎉 Districts and Talukas tables successfully created, connected and populated!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating/seeding districts and talukas:', err);
    if (pool) await pool.end();
    process.exit(1);
  }
}

createAndSeedDistrictsAndTalukas();
