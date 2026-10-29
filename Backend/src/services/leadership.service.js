import { LeadershipModel } from '../models/leadership.model.js';
import { s3Service } from './s3.service.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

class LeadershipService {
  /**
   * Fetch MLA leadership profile along with real-time operational telemetry counts
   */
  async getMlaProfileWithTelemetry(slug = 'hon-mla') {
    const [profile, telemetry] = await Promise.all([
      LeadershipModel.getBySlug(slug),
      LeadershipModel.getTelemetryCounts(),
    ]);

    return {
      profile: {
        id: profile.id,
        slug: profile.slug,
        name: profile.name || 'Hon. Ravindra Dattatray Chavan',
        nameMr: profile.name_mr || 'मा. ना. श्री. रवींद्र चव्हाण',
        nameHi: profile.name_hi || profile.name_mr || 'मा. ना. श्री. रवींद्र चव्हाण',
        designation: profile.designation,
        constituency: profile.constituency,
        partyTitle: profile.party_title || 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
        partyTitleMr: profile.party_title_mr || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
        partyTitleHi: profile.party_title_hi || profile.party_title_mr || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
        patronTitle: profile.patron_title,
        tagline: profile.tagline || 'Dedicated to your health, we are committed.',
        taglineMr: profile.tagline_mr || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
        taglineHi: profile.tagline_hi || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
        initiativeTitle: profile.initiative_title || 'Special Initiative',
        initiativeTitleMr: profile.initiative_title_mr || 'विशेष पुढाकार',
        initiativeTitleHi: profile.initiative_title_hi || 'विशेष पहल',
        assemblyTerms: profile.assembly_terms || '14th Maharashtra Legislative Assembly',
        publicPortfolio: profile.public_portfolio || 'Public Welfare & Health Infrastructure',
        photoUrl: profile.photo_url || '/ravindra_chavan.png',
        visionQuote: profile.vision_quote,
        officeAddress: profile.office_address || 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
        officeContact: profile.office_contact || '0251-2800000 / +91 98220 00000',
        updatedAt: profile.updated_at,
      },
      telemetry: {
        activeHospitalizedPatients: telemetry.activeHospitalizedPatients,
        empanelledHospitals: telemetry.empanelledHospitals,
        assignedFieldArogyaSevaks: telemetry.assignedFieldArogyaSevaks,
      },
    };
  }

  /**
   * Update MLA photo URL directly
   */
  async updateMlaPhoto(photoUrl, slug = 'hon-mla') {
    if (!photoUrl) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'photoUrl is required');
    }

    const updated = await LeadershipModel.updatePhoto(slug, photoUrl);
    logger.info(`[LeadershipService] Updated MLA Photo URL for slug '${slug}'`);
    return {
      photoUrl: updated.photo_url,
      slug: updated.slug,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Upload image file buffer directly to S3 and persist URL in database
   */
  async uploadMlaPhotoFile(file, slug = 'hon-mla') {
    if (!file || !file.buffer) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No image file provided for upload');
    }

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const s3Key = `arogyamitra/leadership/mla_profile_${Date.now()}.${ext}`;

    const uploadResult = await s3Service.uploadBuffer(file.buffer, {
      key: s3Key,
      contentType: file.mimetype || 'image/jpeg',
    });

    const publicUrl = uploadResult.publicUrl;
    const updated = await LeadershipModel.updatePhoto(slug, publicUrl);

    logger.info(`[LeadershipService] Uploaded new MLA Photo to S3: ${publicUrl}`);

    return {
      photoUrl: publicUrl,
      key: uploadResult.key,
      slug: updated.slug,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Update full leadership profile
   */
  async updateMlaProfile(data, slug = 'hon-mla') {
    const updated = await LeadershipModel.updateProfile(slug, {
      name: data.name,
      name_mr: data.nameMr,
      name_hi: data.nameHi,
      designation: data.designation,
      constituency: data.constituency,
      party_title: data.partyTitle,
      party_title_mr: data.partyTitleMr,
      party_title_hi: data.partyTitleHi,
      patron_title: data.patronTitle,
      tagline: data.tagline,
      tagline_mr: data.taglineMr,
      tagline_hi: data.taglineHi,
      initiative_title: data.initiativeTitle,
      initiative_title_mr: data.initiativeTitleMr,
      initiative_title_hi: data.initiativeTitleHi,
      vision_quote: data.visionQuote,
      photo_url: data.photoUrl,
      assembly_terms: data.assemblyTerms,
      public_portfolio: data.publicPortfolio,
      office_address: data.officeAddress,
      office_contact: data.officeContact,
    });

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      nameMr: updated.name_mr || 'मा. ना. श्री. रवींद्र चव्हाण',
      nameHi: updated.name_hi || updated.name_mr || 'मा. ना. श्री. रवींद्र चव्हाण',
      designation: updated.designation,
      constituency: updated.constituency,
      partyTitle: updated.party_title,
      partyTitleMr: updated.party_title_mr || 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
      partyTitleHi: updated.party_title_hi || updated.party_title_mr || 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
      patronTitle: updated.patron_title,
      tagline: updated.tagline || 'Dedicated to your health, we are committed.',
      taglineMr: updated.tagline_mr || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
      taglineHi: updated.tagline_hi || 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध हैं।',
      initiativeTitle: updated.initiative_title || 'Special Initiative',
      initiativeTitleMr: updated.initiative_title_mr || 'विशेष पुढाकार',
      initiativeTitleHi: updated.initiative_title_hi || 'विशेष पहल',
      assemblyTerms: updated.assembly_terms || '14th Maharashtra Legislative Assembly',
      publicPortfolio: updated.public_portfolio || 'Public Welfare & Health Infrastructure',
      photoUrl: updated.photo_url,
      visionQuote: updated.vision_quote,
      officeAddress: updated.office_address || 'MLA Public Office, Dombivli East, Thane District, Maharashtra',
      officeContact: updated.office_contact || '0251-2800000 / +91 98220 00000',
      updatedAt: updated.updated_at,
    };
  }
}

export const leadershipService = new LeadershipService();
export default leadershipService;
