import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage/storage';
import { APP_CONFIG } from '../constants/config';

const MLA_STORAGE_KEY = '@arogya_mla_profile_cache';

export interface MlaProfileData {
  id?: string;
  slug?: string;
  name: string;
  nameMr: string;
  nameHi?: string;
  designation: string;
  constituency: string;
  partyTitle: string;
  partyTitleMr: string;
  partyTitleHi?: string;
  patronTitle: string;
  tagline?: string;
  taglineMr?: string;
  taglineHi?: string;
  initiativeTitle?: string;
  initiativeTitleMr?: string;
  initiativeTitleHi?: string;
  photoUrl: string;
  visionQuote?: string;
  assemblyTerms?: string;
  publicPortfolio?: string;
  officeAddress?: string;
  officeContact?: string;
}

export const DEFAULT_MLA_DATA: MlaProfileData = {
  name: 'Hon. Ravindra Dattatray Chavan',
  nameMr: 'मा. ना. श्री. रवींद्र चव्हाण',
  nameHi: 'मा. ना. श्री. रवींद्र चव्हाण',
  designation: 'Member of Maharashtra Legislative Assembly (MLA)',
  constituency: 'Dombivli Assembly, Thane District',
  partyTitle: 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
  partyTitleMr: 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
  partyTitleHi: 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
  patronTitle: 'ArogyaMitra Welfare Patron',
  tagline: 'Dedicated to your health, we are committed.',
  taglineMr: 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
  taglineHi: 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
  initiativeTitle: 'Special Initiative',
  initiativeTitleMr: 'विशेष पुढाकार',
  initiativeTitleHi: 'विशेष पहल',
  photoUrl: '/ravindra_chavan.png',
  visionQuote: 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care.',
  officeAddress: 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
  officeContact: '0251-2800000 / +91 98220 00000',
};

export const useMlaProfile = () => {
  const [profile, setProfile] = useState<MlaProfileData>(DEFAULT_MLA_DATA);
  const [loading, setLoading] = useState<boolean>(false);

  // Load from local storage first for instant rendering
  useEffect(() => {
    storage.getItem<MlaProfileData>(MLA_STORAGE_KEY)
      .then((saved) => {
        if (saved && typeof saved === 'object') {
          setProfile((prev: MlaProfileData) => ({ ...prev, ...saved }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${APP_CONFIG.API_BASE_URL}/leadership/mla`);
      if (res.ok) {
        const json = await res.json();
        const serverProfile = json?.data?.profile;
        if (serverProfile) {
          const merged: MlaProfileData = {
            ...DEFAULT_MLA_DATA,
            ...serverProfile,
            name: serverProfile.name || DEFAULT_MLA_DATA.name,
            nameMr: serverProfile.nameMr || DEFAULT_MLA_DATA.nameMr,
            nameHi: serverProfile.nameHi || serverProfile.nameMr || DEFAULT_MLA_DATA.nameHi,
            partyTitle: serverProfile.partyTitle || DEFAULT_MLA_DATA.partyTitle,
            partyTitleMr: serverProfile.partyTitleMr || DEFAULT_MLA_DATA.partyTitleMr,
            partyTitleHi: serverProfile.partyTitleHi || serverProfile.partyTitleMr || DEFAULT_MLA_DATA.partyTitleHi,
            tagline: serverProfile.tagline || DEFAULT_MLA_DATA.tagline,
            taglineMr: serverProfile.taglineMr || DEFAULT_MLA_DATA.taglineMr,
            taglineHi: serverProfile.taglineHi || DEFAULT_MLA_DATA.taglineHi,
            initiativeTitle: serverProfile.initiativeTitle || DEFAULT_MLA_DATA.initiativeTitle,
            initiativeTitleMr: serverProfile.initiativeTitleMr || DEFAULT_MLA_DATA.initiativeTitleMr,
            initiativeTitleHi: serverProfile.initiativeTitleHi || DEFAULT_MLA_DATA.initiativeTitleHi,
            photoUrl: serverProfile.photoUrl || DEFAULT_MLA_DATA.photoUrl,
          };
          setProfile(merged);
          await storage.setItem(MLA_STORAGE_KEY, merged);
        }
      }
    } catch (err) {
      // Offline fallback: continue using cached / default profile
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    refetch: fetchProfile,
  };
};

export default useMlaProfile;
