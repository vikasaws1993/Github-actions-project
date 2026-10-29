import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const CREATE_LEADERSHIP_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.leadership_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Hon. Ravindra Dattatray Chavan',
    name_mr VARCHAR(255) DEFAULT 'मा. ना. श्री. रवींद्र चव्हाण',
    name_hi VARCHAR(255) DEFAULT 'मा. ना. श्री. रवींद्र चव्हाण',
    designation VARCHAR(255) NOT NULL DEFAULT 'Member of Legislative Assembly (MLA)',
    constituency VARCHAR(255) DEFAULT 'Dombivli Assembly, Thane District',
    party_title VARCHAR(255) DEFAULT 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
    party_title_mr VARCHAR(255) DEFAULT 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
    party_title_hi VARCHAR(255) DEFAULT 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
    patron_title VARCHAR(255) DEFAULT 'ArogyaMitra Welfare Patron',
    tagline VARCHAR(255) DEFAULT 'Dedicated to your health, we are committed.',
    tagline_mr VARCHAR(255) DEFAULT 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
    tagline_hi VARCHAR(255) DEFAULT 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
    initiative_title VARCHAR(255) DEFAULT 'Special Initiative',
    initiative_title_mr VARCHAR(255) DEFAULT 'विशेष पुढाकार',
    initiative_title_hi VARCHAR(255) DEFAULT 'विशेष पहल',
    assembly_terms VARCHAR(255) DEFAULT '14th Maharashtra Legislative Assembly',
    public_portfolio VARCHAR(255) DEFAULT 'Public Welfare & Health Infrastructure',
    photo_url TEXT DEFAULT '/ravindra_chavan.png',
    vision_quote TEXT DEFAULT 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care. Through the ArogyaMitra digital platform, we ensure seamless coordination between empanelled hospitals, dedicated field ArogyaSevaks, and PM-JAY / MJPJAY scheme beneficiaries.',
    office_address TEXT DEFAULT 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
    office_contact VARCHAR(255) DEFAULT '0251-2800000 / +91 98220 00000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS name_mr VARCHAR(255) DEFAULT 'मा. ना. श्री. रवींद्र चव्हाण';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS name_hi VARCHAR(255) DEFAULT 'मा. ना. श्री. रवींद्र चव्हाण';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS party_title_mr VARCHAR(255) DEFAULT 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS party_title_hi VARCHAR(255) DEFAULT 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) DEFAULT 'Dedicated to your health, we are committed.';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS tagline_mr VARCHAR(255) DEFAULT 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS tagline_hi VARCHAR(255) DEFAULT 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS initiative_title VARCHAR(255) DEFAULT 'Special Initiative';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS initiative_title_mr VARCHAR(255) DEFAULT 'विशेष पुढाकार';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS initiative_title_hi VARCHAR(255) DEFAULT 'विशेष पहल';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS assembly_terms VARCHAR(255) DEFAULT '14th Maharashtra Legislative Assembly';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS public_portfolio VARCHAR(255) DEFAULT 'Public Welfare & Health Infrastructure';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT 'MLA Public Office, Dombivli East, Thane District, Maharashtra';
  ALTER TABLE public.leadership_profiles ADD COLUMN IF NOT EXISTS office_contact VARCHAR(255) DEFAULT '0251-2800000 / +91 98220 00000';

  CREATE INDEX IF NOT EXISTS idx_leadership_slug ON public.leadership_profiles(slug);
`;

const DEFAULT_MLA_PROFILE = {
  slug: 'hon-mla',
  name: 'Hon. Ravindra Dattatray Chavan',
  name_mr: 'मा. ना. श्री. रवींद्र चव्हाण',
  name_hi: 'मा. ना. श्री. रवींद्र चव्हाण',
  designation: 'Member of Legislative Assembly (MLA)',
  constituency: 'Dombivli Assembly, Thane District',
  party_title: 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
  party_title_mr: 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
  party_title_hi: 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
  patron_title: 'ArogyaMitra Welfare Patron',
  tagline: 'Dedicated to your health, we are committed.',
  tagline_mr: 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
  tagline_hi: 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
  initiative_title: 'Special Initiative',
  initiative_title_mr: 'विशेष पुढाकार',
  initiative_title_hi: 'विशेष पहल',
  assembly_terms: '14th Maharashtra Legislative Assembly',
  public_portfolio: 'Public Welfare & Health Infrastructure',
  photo_url: '/ravindra_chavan.png',
  vision_quote: 'Every citizen of Maharashtra deserves dignified, immediate, and 100% cashless medical care. Through the ArogyaMitra digital platform, we ensure seamless coordination between empanelled hospitals, dedicated field ArogyaSevaks, and PM-JAY / MJPJAY scheme beneficiaries.',
  office_address: 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
  office_contact: '0251-2800000 / +91 98220 00000',
};

// In-memory fallback
let inMemoryProfile = { ...DEFAULT_MLA_PROFILE };

export const LeadershipModel = {
  /**
   * Create leadership table and ensure default record exists
   */
  async createTable() {
    try {
      await query(CREATE_LEADERSHIP_TABLE_SQL);
      // Ensure seed record exists
      await query(`
        INSERT INTO public.leadership_profiles (
          slug, name, name_mr, name_hi, designation, constituency,
          party_title, party_title_mr, party_title_hi, patron_title,
          tagline, tagline_mr, tagline_hi, initiative_title, initiative_title_mr, initiative_title_hi,
          assembly_terms, public_portfolio, photo_url, vision_quote, office_address, office_contact
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (slug) DO NOTHING;
      `, [
        DEFAULT_MLA_PROFILE.slug,
        DEFAULT_MLA_PROFILE.name,
        DEFAULT_MLA_PROFILE.name_mr,
        DEFAULT_MLA_PROFILE.name_hi,
        DEFAULT_MLA_PROFILE.designation,
        DEFAULT_MLA_PROFILE.constituency,
        DEFAULT_MLA_PROFILE.party_title,
        DEFAULT_MLA_PROFILE.party_title_mr,
        DEFAULT_MLA_PROFILE.party_title_hi,
        DEFAULT_MLA_PROFILE.patron_title,
        DEFAULT_MLA_PROFILE.tagline,
        DEFAULT_MLA_PROFILE.tagline_mr,
        DEFAULT_MLA_PROFILE.tagline_hi,
        DEFAULT_MLA_PROFILE.initiative_title,
        DEFAULT_MLA_PROFILE.initiative_title_mr,
        DEFAULT_MLA_PROFILE.initiative_title_hi,
        DEFAULT_MLA_PROFILE.assembly_terms,
        DEFAULT_MLA_PROFILE.public_portfolio,
        DEFAULT_MLA_PROFILE.photo_url,
        DEFAULT_MLA_PROFILE.vision_quote,
        DEFAULT_MLA_PROFILE.office_address,
        DEFAULT_MLA_PROFILE.office_contact,
      ]);
    } catch (err) {
      logger.warn('[LeadershipModel] Table initialization fallback:', err.message);
    }
  },

  /**
   * Get leadership profile by slug (default: 'hon-mla')
   */
  async getBySlug(slug = 'hon-mla') {
    try {
      const res = await query(
        `SELECT * FROM public.leadership_profiles WHERE slug = $1 LIMIT 1;`,
        [slug]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
      return inMemoryProfile;
    } catch (err) {
      logger.warn('[LeadershipModel.getBySlug] Falling back to memory:', err.message);
      return inMemoryProfile;
    }
  },

  /**
   * Update photo URL for MLA profile
   */
  async updatePhoto(slug = 'hon-mla', photoUrl) {
    try {
      const res = await query(
        `INSERT INTO public.leadership_profiles (slug, photo_url, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (slug) DO UPDATE
         SET photo_url = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING *;`,
        [slug, photoUrl]
      );
      if (res.rows && res.rows.length > 0) {
        inMemoryProfile = { ...inMemoryProfile, ...res.rows[0] };
        return res.rows[0];
      }
    } catch (err) {
      logger.warn('[LeadershipModel.updatePhoto] DB error, using in-memory state:', err.message);
    }
    inMemoryProfile.photo_url = photoUrl;
    return inMemoryProfile;
  },

  /**
   * Update full profile details
   */
  async updateProfile(slug = 'hon-mla', data = {}) {
    const {
      name,
      name_mr,
      name_hi,
      designation,
      constituency,
      party_title,
      party_title_mr,
      party_title_hi,
      patron_title,
      tagline,
      tagline_mr,
      tagline_hi,
      initiative_title,
      initiative_title_mr,
      initiative_title_hi,
      vision_quote,
      photo_url,
      assembly_terms,
      public_portfolio,
      office_address,
      office_contact,
    } = data;
    try {
      const res = await query(
        `UPDATE public.leadership_profiles
         SET name = COALESCE($2, name),
             name_mr = COALESCE($3, name_mr),
             name_hi = COALESCE($4, name_hi),
             designation = COALESCE($5, designation),
             constituency = COALESCE($6, constituency),
             party_title = COALESCE($7, party_title),
             party_title_mr = COALESCE($8, party_title_mr),
             party_title_hi = COALESCE($9, party_title_hi),
             patron_title = COALESCE($10, patron_title),
             tagline = COALESCE($11, tagline),
             tagline_mr = COALESCE($12, tagline_mr),
             tagline_hi = COALESCE($13, tagline_hi),
             initiative_title = COALESCE($14, initiative_title),
             initiative_title_mr = COALESCE($15, initiative_title_mr),
             initiative_title_hi = COALESCE($16, initiative_title_hi),
             vision_quote = COALESCE($17, vision_quote),
             photo_url = COALESCE($18, photo_url),
             assembly_terms = COALESCE($19, assembly_terms),
             public_portfolio = COALESCE($20, public_portfolio),
             office_address = COALESCE($21, office_address),
             office_contact = COALESCE($22, office_contact),
             updated_at = CURRENT_TIMESTAMP
         WHERE slug = $1
         RETURNING *;`,
        [
          slug,
          name,
          name_mr,
          name_hi,
          designation,
          constituency,
          party_title,
          party_title_mr,
          party_title_hi,
          patron_title,
          tagline,
          tagline_mr,
          tagline_hi,
          initiative_title,
          initiative_title_mr,
          initiative_title_hi,
          vision_quote,
          photo_url,
          assembly_terms,
          public_portfolio,
          office_address,
          office_contact,
        ]
      );
      if (res.rows && res.rows.length > 0) {
        inMemoryProfile = { ...inMemoryProfile, ...res.rows[0] };
        return res.rows[0];
      }
    } catch (err) {
      logger.warn('[LeadershipModel.updateProfile] DB error, using in-memory state:', err.message);
    }
    inMemoryProfile = { ...inMemoryProfile, ...data };
    return inMemoryProfile;
  },

  /**
   * Compute real-time Telemetry & Ward Coverage Metrics:
   * 1. Active Hospitalized Patients
   * 2. Empanelled Hospitals Network
   * 3. Assigned Field ArogyaSevaks
   */
  async getTelemetryCounts() {
    let activeHospitalizedPatients = 0;
    let empanelledHospitals = 0;
    let assignedFieldArogyaSevaks = 0;

    try {
      // 1. Active Hospitalized Patients (IPD admissions currently in ward / ICU / surgery / treatment)
      const ipdRes = await query(`
        SELECT COUNT(*)::int AS count 
        FROM public.ipd_admissions 
        WHERE current_status != 'DISCHARGED';
      `).catch(() => null);

      if (ipdRes && ipdRes.rows && ipdRes.rows.length > 0) {
        activeHospitalizedPatients = ipdRes.rows[0].count;
      } else {
        // Alternative check on applications if ipd_admissions is empty
        const appRes = await query(`
          SELECT COUNT(*)::int AS count 
          FROM public.applications 
          WHERE status IN ('APPROVED', 'TREATMENT_STARTED', 'COORDINATED', 'IPD_ADMITTED', 'ACTIVE');
        `).catch(() => null);
        if (appRes?.rows?.[0]?.count) {
          activeHospitalizedPatients = appRes.rows[0].count;
        }
      }
    } catch (err) {
      logger.warn('[LeadershipModel.getTelemetryCounts] IPD query note:', err.message);
    }

    try {
      // 2. Empanelled Hospitals Network (Count of active hospitals)
      const hospRes = await query(`
        SELECT COUNT(*)::int AS count 
        FROM public.hospitals 
        WHERE status = 'ACTIVE';
      `).catch(() => null);

      if (hospRes && hospRes.rows && hospRes.rows.length > 0) {
        empanelledHospitals = hospRes.rows[0].count;
      }
    } catch (err) {
      logger.warn('[LeadershipModel.getTelemetryCounts] Hospital query note:', err.message);
    }

    try {
      // 3. Assigned Field ArogyaSevaks (Count of distinct sevaks assigned to hospital desks)
      const sevakRes = await query(`
        SELECT COUNT(DISTINCT sevak_id)::int AS count 
        FROM public.hospital_sevak_assignments 
        WHERE is_active = TRUE;
      `).catch(() => null);

      if (sevakRes && sevakRes.rows && sevakRes.rows.length > 0 && sevakRes.rows[0].count > 0) {
        assignedFieldArogyaSevaks = sevakRes.rows[0].count;
      } else {
        // Fallback to all active arogya_sevaks
        const fallbackSevakRes = await query(`
          SELECT COUNT(*)::int AS count 
          FROM public.arogya_sevaks 
          WHERE status = 'ACTIVE';
        `).catch(() => null);
        if (fallbackSevakRes?.rows?.[0]?.count) {
          assignedFieldArogyaSevaks = fallbackSevakRes.rows[0].count;
        }
      }
    } catch (err) {
      logger.warn('[LeadershipModel.getTelemetryCounts] Sevak query note:', err.message);
    }

    return {
      activeHospitalizedPatients: activeHospitalizedPatients || 0,
      empanelledHospitals: empanelledHospitals || 0,
      assignedFieldArogyaSevaks: assignedFieldArogyaSevaks || 0,
    };
  },
};

export default LeadershipModel;
