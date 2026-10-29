import { LanguageCode } from '../context/LanguageContext';

// Treatment Status Translations
const TREATMENT_STATUS_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'Admitted': { mr: 'रुग्णालयात दाखल', hi: 'अस्पताल में भर्ती', en: 'Admitted' },
  'Diagnostic Stage': { mr: 'तपासणी व निदान टप्पा', hi: 'जांच व निदान चरण', en: 'Diagnostic Stage' },
  'Under Treatment': { mr: 'उपचाराधीन', hi: 'उपचाराधीन', en: 'Under Treatment' },
  'Surgery Scheduled': { mr: 'शस्त्रक्रिया नियोजित', hi: 'सर्जरी निर्धारित', en: 'Surgery Scheduled' },
  'Post-Op Recovery': { mr: 'शस्त्रक्रियेनंतरची देखभाल', hi: 'सर्जरी बाद सुधार', en: 'Post-Op Recovery' },
  'On Hold': { mr: 'प्रलंबित (प्रशासकीय पुनरावलोकन)', hi: 'प्रलंबित (प्रशासकीय समीक्षा)', en: 'On Hold (Admin Review)' },
  'Discharged': { mr: 'डिस्चार्ज (उपचार पूर्ण)', hi: 'डिस्चार्ज', en: 'Discharged' },
  'Completed': { mr: 'उपचार पूर्ण', hi: 'उपचार पूर्ण', en: 'Completed' },
};

// Gender Translations
const GENDER_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'Male': { mr: 'पुरुष', hi: 'पुरुष', en: 'Male' },
  'Female': { mr: 'महिला', hi: 'महिला', en: 'Female' },
  'Other': { mr: 'इतर', hi: 'अन्य', en: 'Other' },
};

// Priority Level Translations
const PRIORITY_LEVEL_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'CRITICAL': { mr: 'अति-तातडीचे', hi: 'अत्यंत गंभीर', en: 'Critical' },
  'URGENT': { mr: 'तातडीचे', hi: 'जरूरी', en: 'Urgent' },
  'HIGH': { mr: 'उच्च प्राधान्य', hi: 'उच्च प्राथमिकता', en: 'High Priority' },
  'ROUTINE': { mr: 'नियमित', hi: 'सामान्य', en: 'Routine' },
};

// OPD Visit Type Translations
const OPD_VISIT_TYPE_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'NEW': { mr: 'नवीन भेट', hi: 'नई विज़िट', en: 'New Visit' },
  'FOLLOW_UP': { mr: 'फॉलो-अप', hi: 'फॉलो-अप', en: 'Follow-up' },
  'EMERGENCY': { mr: 'तातडीची भेट', hi: 'आपातकालीन', en: 'Emergency' },
  'REFERRAL': { mr: 'रेफरल भेट', hi: 'रेफरल विज़िट', en: 'Referral' },
};

// Common Clinical Diagnoses Translations (MJPJAY / PM-JAY packages)
const DIAGNOSIS_MAP: Record<string, { mr: string; hi: string }> = {
  'Severe Coronary Artery Disease (Triple Vessel Disease)': {
    mr: 'हृदयरोग - तिन्ही रक्तवाहिन्यांत अडथळा (CAD - Triple Vessel)',
    hi: 'हृदय रोग - तीनों धमनियों में रुकावट (CAD - Triple Vessel)',
  },
  'Full Term Pregnancy with Oligohydramnios (Emergency LSCS)': {
    mr: 'पूर्ण मुदतीची गर्भधारणा - कमी पाणी (तातडीची सिझेरियन)',
    hi: 'पूर्ण अवधि गर्भावस्था - कम पानी (आपातकालीन सिजेरियन)',
  },
  'Fracture Neck of Femur (Left Hip) - Hemiarthroplasty': {
    mr: 'मांडीच्या हाडाचे फ्रॅक्चर (डावा खुबा - हेमीआर्थ्रोप्लास्टी)',
    hi: 'जांघ की हड्डी का फ्रैक्चर (बायां कूल्हा - हेमीआर्थ्रोप्लास्टी)',
  },
  'Severe Acute Bronchopneumonia with Respiratory Distress': {
    mr: 'तीव्र फुप्फुसदाह / न्यूमोनिया व श्वास घेण्यास त्रास',
    hi: 'गंभीर ब्रोंकोन्यूमोनिया व सांस लेने में कठिनाई',
  },
  'Acute Appendicitis with Localized Peritonitis': {
    mr: 'अपेंडिक्सचा तीव्र संसर्ग (Appendicitis)',
    hi: 'अपेंडिक्स का गंभीर संक्रमण (Appendicitis)',
  },
  'Cataract with Vision Impairment (Left Eye)': {
    mr: 'मोतीबिंदू शस्त्रक्रिया (डावा डोळा)',
    hi: 'मोतियाबिंद सर्जरी (बायां नेत्र)',
  },
};

// Hospital Ward Translations
const WARD_MAP: Record<string, { mr: string; hi: string }> = {
  'Cardiac ICU - Unit B': {
    mr: 'हृदयरोग आयसीयू (Cardiac ICU) - युनिट बी',
    hi: 'कार्डियक आईसीयू (Cardiac ICU) - यूनिट बी',
  },
  'Maternity Ward - 3rd Floor': {
    mr: 'प्रसूती वॉर्ड (Maternity Ward) - ३रा मजला',
    hi: 'प्रसूति वार्ड (Maternity Ward) - तीसरी मंजिल',
  },
  'Orthopedic Male Ward - Bed 14': {
    mr: 'अस्थिरोग पुरुष वॉर्ड - बेड १४',
    hi: 'अस्थिरोग पुरुष वार्ड - बेड १४',
  },
  'Pediatric High Dependency Unit (HDU)': {
    mr: 'बालरोग अतिदक्षता विभाग (HDU)',
    hi: 'बाल रोग अति-देखभाल इकाई (HDU)',
  },
  'General Medicine Ward': {
    mr: 'सामान्य औषधोपचार वॉर्ड',
    hi: 'सामान्य चिकित्सा वार्ड',
  },
};

// Admin Note Text Translations
const ADMIN_NOTE_MAP: Record<string, { mr: string; hi: string }> = {
  'URGENT: Patient requires expedited MJPJAY pre-authorization for coronary CABG surgery scheduled tomorrow 9:00 AM. Stent supply verified. Please upload surgeon signed pre-op clearance immediately.': {
    mr: 'तातडीची सूचना: उद्या सकाळी ९:०० वाजता होणाऱ्या कोरोनरी CABG शस्त्रक्रियेसाठी MJPJAY पूर्व-परवानगी जलद गतीने मिळवणे आवश्यक आहे. स्टेंट पुरवठा पडताळला आहे. कृपया मुख्य सर्जन यांची स्वाक्षरी असलेले फिटनेस प्रमाणपत्र त्वरित अपलोड करा.',
    hi: 'जरूरी सूचना: कल सुबह ९:०० बजे होने वाली कोरोनरी CABG सर्जरी के लिए MJPJAY पूर्व-अनुमति तुरंत प्राप्त करना आवश्यक है। स्टेंट आपूर्ति सत्यापित है। कृपया सर्जन द्वारा हस्ताक्षरित फिटनेस प्रमाणपत्र तुरंत अपलोड करें।',
  },
  'Admin Alert: PM-JAY package allocated for high-risk obstetric delivery. Ensure mother & newborn identification forms are linked to ABHA upon delivery.': {
    mr: 'प्रशासकीय सूचना: उच्च जोखीम प्रसूतीसाठी PM-JAY पॅकेज मंजूर केले आहे. प्रसूतीनंतर माता व नवजात बालकाचे फॉर्म त्वरित ABHA शी लिंक करा.',
    hi: 'प्रशासन चेतावनी: उच्च जोखिम प्रसव के लिए PM-JAY पैकेज स्वीकृत किया गया है। प्रसव के तुरंत बाद माता और नवजात शिशु के फॉर्म को ABHA से लिंक करें।',
  },
  'MJPJAY Approval Notice: Hip replacement implant code approved. Please attach post-op pelvic X-ray and surgical OT notes before discharge authorization.': {
    mr: 'MJPJAY मान्यता सूचना: हिप रिप्लेसमेंट इम्प्लांट कोड मंजूर झाला आहे. डिस्चार्जपूर्व पडताळणीसाठी शस्त्रक्रियेनंतरचा पेल्विक एक्स-रे आणि ओटी नोट्स संलग्न करा.',
    hi: 'MJPJAY स्वीकृति नोटिस: हिप रिप्लेसमेंट इम्प्लांट कोड स्वीकृत हो गया है। डिस्चार्ज से पहले सर्जरी बाद का पेल्विक एक्स-रे और ओटी नोट्स संलग्न करें।',
  },
  'Critical Pediatric Care Guidance: Monitor oxygen saturation (SpO2) every 2 hours. Upload pediatrician daily progress sheet and ABG report for district review.': {
    mr: 'तातडीचे बालरोग मार्गदर्शन: ऑक्सिजन संपृक्तता (SpO2) दर २ तासांनी तपासा. जिल्हा स्तरावरील तपासणीसाठी बालरोगतज्ज्ञांचे दैनिक प्रगती पत्रक आणि ABG अहवाल अपलोड करा.',
    hi: 'महत्वपूर्ण बाल चिकित्सा मार्गदर्शन: हर २ घंटे में ऑक्सीजन स्तर (SpO2) जांचें। जिला समीक्षा के लिए बाल रोग विशेषज्ञ की दैनिक रिपोर्ट और ABG रक्त रिपोर्ट अपलोड करें।',
  },
};

// Document Title Translations
const DOCUMENT_TITLE_MAP: Record<string, { mr: string; hi: string }> = {
  'Surgeon Signed Pre-Op Clearance Form': {
    mr: 'शस्त्रक्रिया पूर्व डॉक्टरांची संमती प्रत',
    hi: 'सर्जरी पूर्व डॉक्टर की सहमति प्रति',
  },
  'Valid Yellow/Orange Ration Card Copy': {
    mr: 'पिवळे / केशरी रेशन कार्ड प्रत',
    hi: 'पीला / नारंगी राशन कार्ड प्रति',
  },
  'Delivery & Newborn Admission Sheet': {
    mr: 'प्रसूती व नवजात बालक नोंद पत्रक',
    hi: 'प्रसव एवं नवजात शिशु दाखिला पत्रक',
  },
  'Maternal Sonography / USG Scan Report': {
    mr: 'सोनोग्राफी (USG) तपासणी अहवाल',
    hi: 'सोनोग्राफी (USG) जांच रिपोर्ट',
  },
  'Pre-Op Pelvic X-Ray Film & Radiologist Report': {
    mr: 'पेल्विक एक्स-रे व रेडिओलॉजिस्ट अहवाल',
    hi: 'पेल्विक एक्स-रे व रेडियोलॉजिस्ट रिपोर्ट',
  },
  'Senior Citizen / Income Certificate (Tahsildar Issued)': {
    mr: 'तहसीलदार दाखला (उत्पन्न / ज्येष्ठ नागरिक)',
    hi: 'तहसीलदार प्रमाणपत्र (आय / वरिष्ठ नागरिक)',
  },
  'Chest X-Ray (AP View) & ABG Blood Gas Report': {
    mr: 'छातीचा एक्स-रे व रक्त तपासणी (ABG) अहवाल',
    hi: 'छाती का एक्स-रे एवं रक्त जांच (ABG) रिपोर्ट',
  },
  'Ayushman Bharat PM-JAY Verification Form': {
    mr: 'आयुष्मान भारत (PM-JAY) पडताळणी अर्ज',
    hi: 'आयुष्मान भारत (PM-JAY) सत्यापन फॉर्म',
  },
  'Pre-admission Coronary Angiography CD Report': {
    mr: 'दाखलपूर्व कोरोनरी अँजिओग्राफी अहवाल',
    hi: 'भर्ती पूर्व कोरोनरी एंजियोग्राफी रिपोर्ट',
  },
};

// OPD Department Translations
const OPD_DEPT_MAP: Record<string, { mr: string; hi: string }> = {
  'General Medicine': { mr: 'सामान्य औषधोपचार', hi: 'सामान्य चिकित्सा' },
  'Cardiology': { mr: 'हृदयरोग विभाग', hi: 'हृदय रोग विभाग' },
  'Orthopedics': { mr: 'अस्थिरोग विभाग', hi: 'अस्थिरोग विभाग' },
  'Pediatrics': { mr: 'बालरोग विभाग', hi: 'बाल रोग विभाग' },
  'Obstetrics & Gynecology': { mr: 'स्त्रीरोग व प्रसूती', hi: 'स्त्री रोग एवं प्रसूति' },
  'General Surgery': { mr: 'सामान्य शस्त्रक्रिया', hi: 'सामान्य सर्जरी' },
  'ENT': { mr: 'कान-नाक-घसा (ENT)', hi: 'कान-नाक-गला (ENT)' },
  'Ophthalmology': { mr: 'नेत्ररोग विभाग', hi: 'नेत्र रोग विभाग' },
  'Emergency & Trauma': { mr: 'आपत्कालीन व ट्रॉमा', hi: 'आपातकालीन एवं ट्रॉमा' },
};

// Escalation Type Translations
const ESCALATION_TYPE_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'BILL_EXCEEDED': {
    mr: 'बिल मर्यादा ओलांडली',
    hi: 'बिल सीमा पार',
    en: 'Bill Exceeded',
  },
  'SPECIALTY_UNAVAILABLE': {
    mr: 'स्पेशालिटी अनुपलब्ध',
    hi: 'स्पेशियलिटी अनुपलब्ध',
    en: 'Specialty Unavailable',
  },
};

const ESCALATION_STATUS_MAP: Record<string, { mr: string; hi: string; en: string }> = {
  'PENDING_ADMIN_REVIEW': {
    mr: 'प्रशासकीय पुनरावलोकन',
    hi: 'समीक्षाधीन',
    en: 'Under Review',
  },
  'ADMIN_RESOLVED': {
    mr: 'निर्णय प्राप्त',
    hi: 'निर्णय प्राप्त',
    en: 'Resolved',
  },
};

export const clinicalDataTranslator = {
  translateTreatmentStatus(status?: string, lang: LanguageCode = 'mr'): string {
    if (!status) return '';
    if (lang === 'en') return status;
    const entry = TREATMENT_STATUS_MAP[status];
    return entry ? entry[lang] || status : status;
  },

  translateGender(gender?: string, lang: LanguageCode = 'mr'): string {
    if (!gender) return '';
    if (lang === 'en') return gender;
    const entry = GENDER_MAP[gender];
    return entry ? entry[lang] || gender : gender;
  },

  formatAgeGender(age: number, gender: string, lang: LanguageCode = 'mr'): string {
    const gen = this.translateGender(gender, lang);
    if (lang === 'mr') {
      return `${age} वर्षे • ${gen}`;
    }
    if (lang === 'hi') {
      return `${age} वर्ष • ${gen}`;
    }
    return `${age} yrs • ${gender}`;
  },

  translatePriorityLevel(level?: string, lang: LanguageCode = 'mr'): string {
    if (!level) return '';
    if (lang === 'en') return level;
    const entry = PRIORITY_LEVEL_MAP[level];
    return entry ? entry[lang] || level : level;
  },

  translateDiagnosis(diagnosis?: string, lang: LanguageCode = 'mr'): string {
    if (!diagnosis) return '';
    if (lang === 'en') return diagnosis;
    const entry = DIAGNOSIS_MAP[diagnosis];
    return entry ? entry[lang] || diagnosis : diagnosis;
  },

  translateWard(ward?: string, lang: LanguageCode = 'mr'): string {
    if (!ward) return '';
    if (lang === 'en') return ward;
    const entry = WARD_MAP[ward];
    return entry ? entry[lang] || ward : ward;
  },

  translateAdminNote(noteText?: string, lang: LanguageCode = 'mr'): string {
    if (!noteText) return '';
    if (lang === 'en') return noteText;
    const entry = ADMIN_NOTE_MAP[noteText];
    return entry ? entry[lang] || noteText : noteText;
  },

  translateDocumentTitle(title?: string, lang: LanguageCode = 'mr'): string {
    if (!title) return '';
    if (lang === 'en') return title;
    const entry = DOCUMENT_TITLE_MAP[title];
    return entry ? entry[lang] || title : title;
  },

  translateOpdDept(dept?: string, lang: LanguageCode = 'mr'): string {
    if (!dept) return '';
    if (lang === 'en') return dept;
    const entry = OPD_DEPT_MAP[dept];
    return entry ? entry[lang] || dept : dept;
  },

  translateVisitType(visitType?: string, lang: LanguageCode = 'mr'): string {
    if (!visitType) return '';
    if (lang === 'en') return visitType;
    const entry = OPD_VISIT_TYPE_MAP ? (OPD_VISIT_TYPE_MAP as any)[visitType] : undefined;
    return entry ? entry[lang] || visitType : visitType;
  },

  translateEscalationType(type?: string, lang: LanguageCode = 'mr'): string {
    if (!type) return '';
    const entry = ESCALATION_TYPE_MAP[type];
    return entry ? entry[lang] || type : type;
  },

  translateEscalationStatus(status?: string, lang: LanguageCode = 'mr'): string {
    if (!status) return '';
    const entry = ESCALATION_STATUS_MAP[status];
    return entry ? entry[lang] || status : status;
  },
};

