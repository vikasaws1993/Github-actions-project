import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { TalukaModel } from '../models/taluka.model.js';
import { DistrictModel } from '../models/district.model.js';

/**
 * GET /api/talukas
 * Fetch all talukas with optional filters:
 * - ?districtCode=490 or ?district=Pune
 * - ?search=Haveli
 * - ?limit=500&offset=0
 */
export const getTalukas = asyncHandler(async (req, res) => {
  let { districtCode, district_code, district, search, limit = 500, offset = 0 } = req.query;

  let effectiveDistrictCode = districtCode || district_code;

  if (!effectiveDistrictCode && district) {
    const matched = await DistrictModel.findAll({ search: district, limit: 1 });
    if (matched.length > 0) {
      effectiveDistrictCode = matched[0].district_code;
    }
  }

  const talukas = await TalukaModel.findAll({
    district_code: effectiveDistrictCode,
    search,
    limit: parseInt(limit, 10) || 500,
    offset: parseInt(offset, 10) || 0,
  });

  const formattedTalukas = talukas.map((t) => {
    const namesObj = t.names && typeof t.names === 'object' && Object.keys(t.names).length > 0
      ? t.names
      : { en: t.name_english, mr: t.name_marathi || t.name_english, hi: t.name_english };

    const districtNames = t.district_names && typeof t.district_names === 'object' && Object.keys(t.district_names).length > 0
      ? t.district_names
      : { en: t.district_name_en, mr: t.district_name_mr || t.district_name_en, hi: t.district_name_en };

    const localizedName = res.localize ? res.localize(namesObj, t.name_english) : (namesObj.en || t.name_english);
    const localizedDistrictName = res.localize ? res.localize(districtNames, t.district_name_en || '') : (t.district_name_en || '');

    return {
      id: t.id,
      code: t.code || (t.district_canonical_code ? `${t.district_canonical_code}-${t.name_english.slice(0, 3).toUpperCase()}` : t.subdistrict_code),
      subdistrictCode: t.subdistrict_code,
      districtCode: t.district_code,
      districtId: t.district_id,
      districtName: localizedDistrictName,
      districtNameEnglish: t.district_name_en,
      districtNameMarathi: t.district_name_mr,
      name: localizedName,
      names: namesObj,
      nameEnglish: t.name_english,
      nameMarathi: t.name_marathi,
      isActive: t.is_active,
    };
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        talukas: formattedTalukas,
        total: formattedTalukas.length,
      },
      'Talukas fetched successfully'
    )
  );
});

export default {
  getTalukas,
};
