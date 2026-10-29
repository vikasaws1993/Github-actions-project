import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { DistrictModel } from '../models/district.model.js';
import { TalukaModel } from '../models/taluka.model.js';

// In-memory cache for ultra-fast master data lookups
let districtsCache = null;
let districtsCacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * 1) GET /api/districts
 * Fetch all districts with optional search query (?search=Pune or ?search=490 or ?search=पुणे)
 */
export const getDistricts = asyncHandler(async (req, res) => {
  const { search, limit = 100, offset = 0 } = req.query;

  // Serve from cache if no custom search filter is applied
  const isDefaultQuery = !search && parseInt(offset, 10) === 0 && parseInt(limit, 10) >= 36;
  const now = Date.now();

  if (isDefaultQuery && districtsCache && now - districtsCacheTime < CACHE_TTL_MS) {
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        districtsCache,
        'Districts fetched successfully (cached)'
      )
    );
  }

  const districts = await DistrictModel.findAll({
    search,
    limit: parseInt(limit, 10) || 100,
    offset: parseInt(offset, 10) || 0,
  });

  const formattedDistricts = districts.map((d) => {
    const namesObj = d.names && typeof d.names === 'object' && Object.keys(d.names).length > 0
      ? d.names
      : { en: d.name_english, mr: d.name_marathi || d.name_english, hi: d.name_english };

    const localizedName = res.localize ? res.localize(namesObj, d.name_english) : (namesObj.en || d.name_english);

    return {
      id: d.id,
      code: d.code || (d.name_english ? `MH-${d.name_english.slice(0, 3).toUpperCase()}` : d.district_code),
      districtCode: d.district_code,
      name: localizedName,
      names: namesObj,
      nameEnglish: d.name_english,
      nameMarathi: d.name_marathi,
      isActive: d.is_active,
    };
  });

  const responsePayload = {
    districts: formattedDistricts,
    total: formattedDistricts.length,
  };

  if (isDefaultQuery) {
    districtsCache = responsePayload;
    districtsCacheTime = now;
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      responsePayload,
      'Districts fetched successfully'
    )
  );
});

/**
 * 2) GET /api/districts/:districtCode/talukas
 * Fetch all talukas under a specific district (supports canonical code 'MH-PUN', districtCode '490', UUID, or district name)
 */
export const getTalukasByDistrict = asyncHandler(async (req, res) => {
  const { districtCode } = req.params;

  if (!districtCode) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'districtCode is required');
  }

  // Resolve district by canonical code, LGD district_code, UUID, or name
  let targetDistrict = await DistrictModel.findByCode(districtCode);

  if (!targetDistrict && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(districtCode)) {
    targetDistrict = await DistrictModel.findById(districtCode);
  }

  if (!targetDistrict) {
    const searchMatch = await DistrictModel.findAll({ search: districtCode, limit: 1 });
    if (searchMatch.length > 0) {
      targetDistrict = searchMatch[0];
    }
  }

  const effectiveCode = targetDistrict ? targetDistrict.district_code : districtCode;
  const talukas = await TalukaModel.findByDistrictCode(effectiveCode);

  const districtNames = targetDistrict?.names && typeof targetDistrict.names === 'object' && Object.keys(targetDistrict.names).length > 0
    ? targetDistrict.names
    : { en: targetDistrict?.name_english, mr: targetDistrict?.name_marathi || targetDistrict?.name_english, hi: targetDistrict?.name_english };

  const localizedDistrictName = targetDistrict
    ? (res.localize ? res.localize(districtNames, targetDistrict.name_english) : targetDistrict.name_english)
    : districtCode;

  const formattedTalukas = talukas.map((t) => {
    const namesObj = t.names && typeof t.names === 'object' && Object.keys(t.names).length > 0
      ? t.names
      : { en: t.name_english, mr: t.name_marathi || t.name_english, hi: t.name_english };

    const localizedName = res.localize ? res.localize(namesObj, t.name_english) : (namesObj.en || t.name_english);

    return {
      id: t.id,
      code: t.code || (targetDistrict?.code ? `${targetDistrict.code}-${t.name_english.slice(0, 3).toUpperCase()}` : t.subdistrict_code),
      districtCode: t.district_code,
      districtId: t.district_id,
      districtName: localizedDistrictName,
      districtNameEnglish: targetDistrict?.name_english || null,
      districtNameMarathi: targetDistrict?.name_marathi || null,
      subdistrictCode: t.subdistrict_code,
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
        district: targetDistrict
          ? {
              id: targetDistrict.id,
              code: targetDistrict.code || (targetDistrict.name_english ? `MH-${targetDistrict.name_english.slice(0, 3).toUpperCase()}` : targetDistrict.district_code),
              districtCode: targetDistrict.district_code,
              name: localizedDistrictName,
              names: districtNames,
              nameEnglish: targetDistrict.name_english,
              nameMarathi: targetDistrict.name_marathi,
            }
          : { districtCode },
        talukas: formattedTalukas,
        total: formattedTalukas.length,
      },
      `Talukas for district "${effectiveCode}" fetched successfully`
    )
  );
});

export default {
  getDistricts,
  getTalukasByDistrict,
};
