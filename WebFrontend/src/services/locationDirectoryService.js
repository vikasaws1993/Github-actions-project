import directoryData from '../data/maharashtraDirectory.json' with { type: 'json' };

const normalizeLocationStr = (val) => {
  return (val || '').trim().replace(/\s+/g, ' ');
};

export const locationDirectoryService = {
  /**
   * Returns list of supported states (default: Maharashtra)
   */
  getStates() {
    return [directoryData.state];
  },

  /**
   * Get all districts or filter by prefix query (e.g. 'P' -> ['Palghar', 'Parbhani', 'Pune'])
   * Case-insensitive prefix search.
   */
  getDistricts(prefixQuery = '') {
    const cleanPrefix = normalizeLocationStr(prefixQuery).toLowerCase();
    const allDistricts = directoryData.districts.map((d) => d.name);

    if (!cleanPrefix) {
      return [...allDistricts].sort((a, b) => a.localeCompare(b));
    }

    return allDistricts
      .filter((name) => name.toLowerCase().startsWith(cleanPrefix))
      .sort((a, b) => a.localeCompare(b));
  },

  /**
   * Get talukas for a specific district, optionally filtered by prefix query
   */
  getTalukas(districtName, prefixQuery = '') {
    const cleanDist = normalizeLocationStr(districtName).toLowerCase();
    if (!cleanDist) return [];

    const foundDistrict = directoryData.districts.find(
      (d) => d.name.toLowerCase() === cleanDist
    );

    if (!foundDistrict) return [];

    const cleanPrefix = normalizeLocationStr(prefixQuery).toLowerCase();

    if (!cleanPrefix) {
      return [...foundDistrict.talukas].sort((a, b) => a.localeCompare(b));
    }

    return foundDistrict.talukas
      .filter((taluka) => taluka.toLowerCase().startsWith(cleanPrefix))
      .sort((a, b) => a.localeCompare(b));
  },

  /**
   * Verify whether a district name exists in the Maharashtra directory
   */
  isValidDistrict(districtName) {
    const clean = normalizeLocationStr(districtName).toLowerCase();
    return directoryData.districts.some((d) => d.name.toLowerCase() === clean);
  },

  /**
   * Verify whether a taluka belongs to a given district
   */
  isValidTaluka(districtName, talukaName) {
    const cleanDist = normalizeLocationStr(districtName).toLowerCase();
    const cleanTal = normalizeLocationStr(talukaName).toLowerCase();

    const foundDistrict = directoryData.districts.find(
      (d) => d.name.toLowerCase() === cleanDist
    );
    if (!foundDistrict) return false;

    return foundDistrict.talukas.some((t) => t.toLowerCase() === cleanTal);
  },

  /**
   * Get canonical spelling for a district
   */
  getCanonicalDistrict(districtName) {
    const clean = normalizeLocationStr(districtName).toLowerCase();
    const found = directoryData.districts.find((d) => d.name.toLowerCase() === clean);
    return found ? found.name : null;
  },

  /**
   * Get canonical spelling for a taluka
   */
  getCanonicalTaluka(districtName, talukaName) {
    const cleanDist = normalizeLocationStr(districtName).toLowerCase();
    const cleanTal = normalizeLocationStr(talukaName).toLowerCase();

    const foundDistrict = directoryData.districts.find(
      (d) => d.name.toLowerCase() === cleanDist
    );
    if (!foundDistrict) return null;

    const foundTaluka = foundDistrict.talukas.find(
      (t) => t.toLowerCase() === cleanTal
    );
    return foundTaluka || null;
  },
};

export default locationDirectoryService;
