import { SchemeModel } from '../models/scheme.model.js';
import { HospitalSchemeModel } from '../models/hospitalScheme.model.js';
import { SchemeClaimModel } from '../models/schemeClaim.model.js';
import { AdminModel } from '../models/admin.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Normalizes backend database row to uniform scheme structure with multilingual support
 */
export const formatSchemeResponse = (row, lang = 'en') => {
  if (!row) return null;

  let reqDocs = [];
  if (Array.isArray(row.required_documents)) {
    reqDocs = row.required_documents;
  } else if (Array.isArray(row.requiredDocuments)) {
    reqDocs = row.requiredDocuments;
  } else if (typeof row.required_documents === 'string') {
    reqDocs = row.required_documents.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
  }

  const maxVal = row.maximum_coverage_amount != null 
    ? Number(row.maximum_coverage_amount) 
    : (row.maxCoverageVal != null ? Number(row.maxCoverageVal) : 150000);

  const coverageText = row.coverage_amount_text || row.coverageAmount || `₹${maxVal.toLocaleString('en-IN')} / family / year`;
  const isActive = row.is_active !== undefined ? Boolean(row.is_active) : (row.status === 'Active');

  const claimsCount = row.claims_count != null ? Number(row.claims_count) : 0;
  const empanelledHospitalsCount = row.empanelled_hospitals_count != null ? Number(row.empanelled_hospitals_count) : 0;

  // Multilingual JSONB dictionaries
  const names = row.names && typeof row.names === 'object' && Object.keys(row.names).length > 0
    ? row.names
    : { en: row.name || 'Healthcare Scheme', mr: row.name || 'आरोग्य योजना', hi: row.name || 'स्वास्थ्य योजना' };

  const subtitles = row.subtitles && typeof row.subtitles === 'object' && Object.keys(row.subtitles).length > 0
    ? row.subtitles
    : { en: row.category || 'State Flagship Scheme', mr: 'महाराष्ट्र राज्य आरोग्य योजना', hi: 'राज्य स्वास्थ्य योजना' };

  const descriptions = row.descriptions && typeof row.descriptions === 'object' && Object.keys(row.descriptions).length > 0
    ? row.descriptions
    : { en: row.description || '', mr: row.description || '', hi: row.description || '' };

  const localizedName = names[lang] || names.en || names.mr || names.hi || row.name || 'Healthcare Scheme';
  const localizedSubtitle = subtitles[lang] || subtitles.en || subtitles.mr || subtitles.hi || row.category || 'State Flagship Scheme';
  const localizedDescription = descriptions[lang] || descriptions.en || descriptions.mr || descriptions.hi || row.description || 'Healthcare assistance scheme for eligible citizens.';

  return {
    id: row.id,
    code: row.scheme_code || row.code || 'SCHEME',
    scheme_code: row.scheme_code || row.code,
    name: localizedName,
    names,
    subtitle: localizedSubtitle,
    subtitles,
    category: row.category || 'State Flagship Scheme',
    coverageAmount: coverageText,
    coverage_amount_text: coverageText,
    maxCoverageVal: maxVal,
    maximum_coverage_amount: maxVal,
    description: localizedDescription,
    descriptions,
    eligibility: row.eligibility_description || row.eligibility || 'Eligible citizens with valid identification.',
    eligibility_description: row.eligibility_description || row.eligibility,
    hotline: row.hotline || '1800-111-222',
    beneficiariesEnrolled: row.beneficiaries_enrolled || (claimsCount > 0 ? String(claimsCount) : '0'),
    claimsCount,
    empanelledHospitalsCount,
    totalClaimedAmount: row.total_claimed_amount != null ? Number(row.total_claimed_amount) : 0,
    totalApprovedAmount: row.total_approved_amount != null ? Number(row.total_approved_amount) : 0,
    createdByAdminName: row.created_by_admin_name || null,
    createdByAdminId: row.created_by_admin_id || null,
    requiredDocuments: reqDocs.length > 0 ? reqDocs : ['Aadhaar Card', 'Ration Card (Orange / Yellow / Antyodaya)'],
    required_documents: reqDocs,
    status: isActive ? 'Active' : 'Inactive',
    is_active: isActive,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
};

/**
 * Scheme Service Layer
 */
export const schemeService = {
  /**
   * Get high-level aggregated scheme statistics
   */
  async getSchemeStats() {
    const stats = await SchemeModel.getStatistics();
    return {
      totalSchemes: Number(stats.total_schemes) || 0,
      activeSchemes: Number(stats.active_schemes) || 0,
      inactiveSchemes: Number(stats.inactive_schemes) || 0,
      totalCoverageCap: Number(stats.total_coverage_cap) || 0,
      totalEmpanelledHospitals: Number(stats.total_empanelled_hospitals) || 0,
      totalClaims: Number(stats.total_claims) || 0,
      totalClaimedAmount: Number(stats.total_claimed_amount) || 0,
      totalApprovedAmount: Number(stats.total_approved_amount) || 0,
      totalBeneficiariesEnrolled: Number(stats.total_beneficiaries_enrolled) || 0,
      categoriesBreakdown: stats.categories_breakdown || [],
    };
  },

  /**
   * Create and register a new healthcare scheme
   * @param {string|null} adminUserId
   * @param {Object} data
   */
  async createScheme(adminUserId, data) {
    const code = (data.code || data.scheme_code || '').trim().toUpperCase();

    // 1. Check for duplicate scheme code
    const existing = await SchemeModel.findByCode(code);
    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Scheme with code '${code}' already exists.`
      );
    }

    // 2. Resolve admin profile if userId provided
    let adminRecordId = null;
    if (adminUserId) {
      const admin = await AdminModel.findByUserId(adminUserId);
      adminRecordId = admin?.id || null;
    }

    // 3. Prepare payload
    const maxVal = data.maxCoverageVal != null 
      ? Number(data.maxCoverageVal) 
      : (data.maximum_coverage_amount != null ? Number(data.maximum_coverage_amount) : 150000);

    const coverageText = data.coverageAmount || data.coverage_amount_text || `₹${maxVal.toLocaleString('en-IN')} / family / year`;
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : (data.status ? String(data.status).toLowerCase() === 'active' : true);

    const created = await SchemeModel.create({
      name: data.name.trim(),
      scheme_code: code,
      code: code,
      category: data.category?.trim() || 'State Flagship Scheme',
      coverage_amount_text: coverageText,
      coverageAmount: coverageText,
      maximum_coverage_amount: maxVal,
      maxCoverageVal: maxVal,
      description: data.description?.trim() || 'Healthcare coverage scheme for eligible beneficiaries.',
      eligibility_description: data.eligibility?.trim() || data.eligibility_description?.trim() || 'Empanelled card holders and eligible citizens.',
      hotline: data.hotline?.trim() || '1800-111-222',
      required_documents: data.requiredDocuments || data.required_documents || [
        'Aadhaar Card',
        'Ration Card (Orange / Yellow / Antyodaya)',
      ],
      is_active: isActive,
      created_by_admin_id: adminRecordId,
    });

    return formatSchemeResponse(created);
  },

  /**
   * Get all schemes with search, category, status filters, and pagination
   */
  async getAllSchemes(filters = {}, lang = 'en') {
    const limit = parseInt(filters.limit, 10) || 50;
    const offset = parseInt(filters.offset, 10) || 0;
    const page = Math.floor(offset / limit) + 1;

    const { schemes, total } = await SchemeModel.findAll({
      search: filters.search,
      category: filters.category,
      is_active: filters.is_active,
      limit,
      offset,
    });

    return {
      schemes: schemes.map((s) => formatSchemeResponse(s, lang)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Get single scheme by ID or code with enriched counts
   */
  async getSchemeById(id, lang = 'en') {
    let scheme = await SchemeModel.findById(id);
    if (!scheme) {
      scheme = await SchemeModel.findByCode(id);
    }
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with identifier '${id}' not found.`);
    }
    return formatSchemeResponse(scheme, lang);
  },

  /**
   * Update scheme
   */
  async updateScheme(id, updateData) {
    const scheme = await SchemeModel.findById(id);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${id}' not found.`);
    }

    // Check code conflict if code is changing
    if (updateData.code || updateData.scheme_code) {
      const newCode = (updateData.scheme_code || updateData.code).trim().toUpperCase();
      if (newCode !== scheme.scheme_code?.toUpperCase()) {
        const existing = await SchemeModel.findByCode(newCode);
        if (existing && existing.id !== scheme.id) {
          throw new ApiError(HTTP_STATUS.CONFLICT, `Scheme code '${newCode}' is already used by another scheme.`);
        }
      }
    }

    const payload = {};
    if (updateData.name !== undefined) payload.name = updateData.name.trim();
    if (updateData.code !== undefined || updateData.scheme_code !== undefined) {
      payload.scheme_code = (updateData.scheme_code || updateData.code).trim().toUpperCase();
    }
    if (updateData.category !== undefined) payload.category = updateData.category.trim();
    if (updateData.description !== undefined) payload.description = updateData.description.trim();
    if (updateData.coverageAmount !== undefined || updateData.coverage_amount_text !== undefined) {
      payload.coverage_amount_text = updateData.coverage_amount_text || updateData.coverageAmount;
    }
    if (updateData.maxCoverageVal !== undefined || updateData.maximum_coverage_amount !== undefined) {
      payload.maximum_coverage_amount = Number(updateData.maximum_coverage_amount || updateData.maxCoverageVal);
    }
    if (updateData.eligibility !== undefined || updateData.eligibility_description !== undefined) {
      payload.eligibility_description = updateData.eligibility_description || updateData.eligibility;
    }
    if (updateData.hotline !== undefined) payload.hotline = updateData.hotline.trim();
    if (updateData.requiredDocuments !== undefined || updateData.required_documents !== undefined) {
      payload.required_documents = updateData.required_documents || updateData.requiredDocuments;
    }
    if (updateData.is_active !== undefined) payload.is_active = Boolean(updateData.is_active);
    if (updateData.status !== undefined) payload.is_active = String(updateData.status).toLowerCase() === 'active';

    const updated = await SchemeModel.update(scheme.id, payload);
    return formatSchemeResponse(updated);
  },

  /**
   * Toggle scheme active status
   */
  async toggleSchemeStatus(id) {
    const scheme = await SchemeModel.findById(id);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${id}' not found.`);
    }

    const nextStatus = !Boolean(scheme.is_active);
    const updated = await SchemeModel.setActiveStatus(scheme.id, nextStatus);
    return formatSchemeResponse(updated);
  },

  /**
   * Delete scheme
   */
  async deleteScheme(id) {
    const scheme = await SchemeModel.findById(id);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${id}' not found.`);
    }
    return SchemeModel.delete(scheme.id);
  },

  /**
   * Get all hospitals empanelled for a scheme
   */
  async getSchemeHospitals(schemeId, filters = {}) {
    const scheme = await SchemeModel.findById(schemeId);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${schemeId}' not found.`);
    }

    const limit = parseInt(filters.limit, 10) || 50;
    const offset = parseInt(filters.offset, 10) || 0;

    const { hospitals, total } = await HospitalSchemeModel.findHospitalsBySchemeId(scheme.id, {
      search: filters.search,
      alignment_status: filters.alignment_status || filters.status,
      limit,
      offset,
    });

    return {
      scheme: {
        id: scheme.id,
        name: scheme.name,
        code: scheme.scheme_code,
      },
      hospitals,
      total,
      limit,
      offset,
    };
  },

  /**
   * Empanel one or multiple hospitals to a scheme
   */
  async empanelHospitals(schemeId, data) {
    const scheme = await SchemeModel.findById(schemeId);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${schemeId}' not found.`);
    }

    const hospitalIds = data.hospital_ids || (data.hospital_id ? [data.hospital_id] : []);
    if (!hospitalIds || hospitalIds.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'At least one hospital_id is required.');
    }

    const alignments = await HospitalSchemeModel.batchEmpanelHospitals({
      scheme_id: scheme.id,
      hospital_ids: hospitalIds,
      alignment_status: data.alignment_status || 'EMPANELLED',
      alignment_start_date: data.alignment_start_date || new Date().toISOString().split('T')[0],
      alignment_end_date: data.alignment_end_date || null,
    });

    return {
      scheme_id: scheme.id,
      empanelledCount: alignments.length,
      alignments,
    };
  },

  /**
   * De-empanel or remove hospital from a scheme
   */
  async deEmpanelHospital(schemeId, hospitalId) {
    const scheme = await SchemeModel.findById(schemeId);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${schemeId}' not found.`);
    }

    const removed = await HospitalSchemeModel.deEmpanelHospital(scheme.id, hospitalId);
    if (!removed) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Empanelment record for hospital '${hospitalId}' in scheme '${schemeId}' not found.`);
    }

    return {
      message: `Hospital successfully de-empanelled from scheme '${scheme.name}'`,
      scheme_id: scheme.id,
      hospital_id: hospitalId,
    };
  },

  /**
   * Get all claims submitted under a specific scheme
   */
  async getSchemeClaims(schemeId, filters = {}) {
    const scheme = await SchemeModel.findById(schemeId);
    if (!scheme) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Scheme with ID '${schemeId}' not found.`);
    }

    const claims = await SchemeClaimModel.findAll({
      scheme_id: scheme.id,
      hospital_id: filters.hospital_id,
      status: filters.status,
      search: filters.search,
      limit: parseInt(filters.limit, 10) || 50,
      offset: parseInt(filters.offset, 10) || 0,
    });

    return {
      scheme: {
        id: scheme.id,
        name: scheme.name,
        code: scheme.scheme_code,
      },
      claims,
      total: claims.length,
    };
  },
};

export default schemeService;
