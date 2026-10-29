import { Router } from 'express';
import { packageMasterController } from '../controllers/packageMaster.controller.js';

const router = Router();

/**
 * @route   GET /api/packages/by-specialty
 * @desc    Get Key-Value map where key = specialty and value = procedures array
 */
router.get('/by-specialty', packageMasterController.getBySpecialtyMap);

/**
 * @route   GET /api/packages/map
 * @desc    Alias for by-specialty
 */
router.get('/map', packageMasterController.getBySpecialtyMap);

/**
 * @route   GET /api/packages/specialties
 * @desc    Get distinct specialties list with counts
 */
router.get('/specialties', packageMasterController.getSpecialtiesList);

/**
 * @route   POST /api/packages/upload-csv
 * @desc    Upload CSV text/data with Specialty, Specialty Code, Procedure Code, Procedure Name
 */
router.post('/upload-csv', packageMasterController.uploadCsv);

/**
 * @route   GET /api/packages
 * @desc    Get all procedures with search and pagination
 */
router.get('/', packageMasterController.getAllPackages);

/**
 * @route   POST /api/packages
 * @desc    Create a single procedure
 */
router.post('/', packageMasterController.createPackage);

/**
 * @route   PUT /api/packages/:id
 * @desc    Update a single procedure
 */
router.put('/:id', packageMasterController.updatePackage);

/**
 * @route   DELETE /api/packages/:id
 * @desc    Delete a single procedure
 */
router.delete('/:id', packageMasterController.deletePackage);

export default router;
