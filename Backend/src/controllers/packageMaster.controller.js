import { PackageMasterModel } from '../models/packageMaster.model.js';

/**
 * Robust CSV Line Parser supporting embedded commas inside quotes
 */
const parseCSVLine = (text) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ''));
  return result;
};

export const packageMasterController = {
  /**
   * GET /api/packages/by-specialty
   * Returns Key-Value dictionary: { "Cardiology": { specialty, specialty_code, count, procedures: [...] } }
   */
  async getBySpecialtyMap(req, res) {
    try {
      const { search, specialty } = req.query;
      const data = await PackageMasterModel.getBySpecialtyMap({ search, specialty });
      const specialtyKeys = Object.keys(data);
      const totalProcedures = Object.values(data).reduce((acc, curr) => acc + (curr.procedures?.length || 0), 0);

      return res.status(200).json({
        success: true,
        message: 'Specialties and packages key-value dictionary retrieved successfully',
        specialtiesCount: specialtyKeys.length,
        totalProcedures,
        data
      });
    } catch (err) {
      console.error('[packageMasterController.getBySpecialtyMap] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve specialties map',
        error: err.message
      });
    }
  },

  /**
   * GET /api/packages/specialties
   * Returns array of all distinct specialties with package/procedure counts
   */
  async getSpecialtiesList(req, res) {
    try {
      const list = await PackageMasterModel.getSpecialtiesList();
      return res.status(200).json({
        success: true,
        message: 'Distinct specialties list retrieved successfully',
        count: list.length,
        data: list
      });
    } catch (err) {
      console.error('[packageMasterController.getSpecialtiesList] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve specialties list',
        error: err.message
      });
    }
  },

  /**
   * GET /api/packages
   * Fetch all individual packages/procedures with optional search and filtering
   */
  async getAllPackages(req, res) {
    try {
      const { search, specialty, status, limit, offset } = req.query;
      const packages = await PackageMasterModel.findAll({
        search,
        specialty,
        status,
        limit: limit ? parseInt(limit, 10) : 10000,
        offset: offset ? parseInt(offset, 10) : 0
      });

      return res.status(200).json({
        success: true,
        message: 'Packages retrieved successfully',
        count: packages.length,
        data: packages
      });
    } catch (err) {
      console.error('[packageMasterController.getAllPackages] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve packages',
        error: err.message
      });
    }
  },

  /**
   * POST /api/packages
   * Manually create / add a package
   */
  async createPackage(req, res) {
    try {
      const {
        specialty,
        specialty_code,
        package_code,
        package_name,
        procedure_code,
        procedure_name,
        category,
        estimated_cost,
        preauth_required,
        status
      } = req.body;

      const pkgName = package_name || procedure_name;

      if (!specialty || !pkgName) {
        return res.status(400).json({
          success: false,
          message: 'specialty and package_name (or procedure_name) are required fields.'
        });
      }

      const item = await PackageMasterModel.create({
        specialty,
        specialty_code,
        package_code,
        package_name: pkgName,
        procedure_code,
        procedure_name: pkgName,
        category,
        estimated_cost,
        preauth_required,
        status
      });

      return res.status(201).json({
        success: true,
        message: 'Package created successfully',
        data: item
      });
    } catch (err) {
      console.error('[packageMasterController.createPackage] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to create package',
        error: err.message
      });
    }
  },

  /**
   * POST /api/packages/upload-csv
   * Upload CSV with columns: Specialty, Specialty Code, Package Code, Package Name, Procedure Code
   */
  async uploadCsv(req, res) {
    try {
      const csvText = typeof req.body === 'string' ? req.body : req.body.csvData || req.body.csv || '';

      if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide csvData as string in JSON body { "csvData": "..." } or raw string.'
        });
      }

      const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'CSV must contain at least a header row and one data row.'
        });
      }

      const headerCols = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
      const parsedRecords = [];

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (vals.length === 0 || !vals.some((v) => v.length > 0)) continue;

        const row = {};
        headerCols.forEach((h, idx) => {
          row[h] = vals[idx] || '';
        });

        // Specialty, Specialty Code, Package Code, Package Name, Procedure Code
        const specialty = row.specialty || row.speciality || vals[0] || '';
        const specialty_code = row.specialtycode || vals[1] || '';
        const package_code = row.packagecode || vals[2] || '';
        const package_name = row.packagename || row.procedurename || vals[3] || '';
        const procedure_code = row.procedurecode || vals[4] || package_code || '';

        if (specialty && (package_name || procedure_code)) {
          parsedRecords.push({
            specialty: specialty.trim(),
            specialty_code: specialty_code.trim(),
            package_code: package_code.trim(),
            package_name: (package_name || procedure_code).trim(),
            procedure_code: procedure_code.trim()
          });
        }
      }

      if (parsedRecords.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Could not parse any valid rows with Specialty and Package Name from CSV.'
        });
      }

      const result = await PackageMasterModel.bulkCreate(parsedRecords);

      // Return refreshed Key-Value Map
      const specialtyMap = await PackageMasterModel.getBySpecialtyMap();

      return res.status(201).json({
        success: true,
        message: `Successfully imported ${result.inserted} packages across ${Object.keys(specialtyMap).length} specialties.`,
        insertedCount: result.inserted,
        failedCount: result.failed,
        specialtiesCount: Object.keys(specialtyMap).length,
        data: specialtyMap
      });
    } catch (err) {
      console.error('[packageMasterController.uploadCsv] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'CSV upload and processing failed',
        error: err.message
      });
    }
  },

  /**
   * PUT /api/packages/:id
   */
  async updatePackage(req, res) {
    try {
      const { id } = req.params;
      const updated = await PackageMasterModel.update(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Package updated successfully',
        data: updated
      });
    } catch (err) {
      console.error('[packageMasterController.updatePackage] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update package',
        error: err.message
      });
    }
  },

  /**
   * DELETE /api/packages/:id
   */
  async deletePackage(req, res) {
    try {
      const { id } = req.params;
      await PackageMasterModel.delete(id);
      return res.status(200).json({
        success: true,
        message: `Package ${id} deleted successfully`
      });
    } catch (err) {
      console.error('[packageMasterController.deletePackage] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete package',
        error: err.message
      });
    }
  }
};

export default packageMasterController;
