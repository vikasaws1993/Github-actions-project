import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import arogyaSevakRoutes from './arogyaSevak.routes.js';
import adminRoutes from './admin.routes.js';
import citizenRoutes from './citizen.routes.js';
import hospitalRoutes from './hospital.routes.js';
import s3Routes from './s3.routes.js';
import opdVisitRoutes from './opdVisit.routes.js';
import ipdRoutes from './ipd.routes.js';
import schemeRoutes from './scheme.routes.js';
import referralRoutes from './referral.routes.js';
import mobileRoutes from './mobile.routes.js';
import applicationRoutes from './application.routes.js';
import leadershipRoutes from './leadership.routes.js';
import hospitalFacilityRoutes from './hospitalFacility.routes.js';
import dailyUpdateRoutes from './dailyUpdate.routes.js';
import doctorRoutes from './doctor.routes.js';
import districtRoutes from './district.routes.js';
import talukaRoutes from './taluka.routes.js';
import patientRoutes from './patient.routes.js';
import escalationRoutes from './escalation.routes.js';
import packageMasterRoutes from './packageMaster.routes.js';

const router = Router();

/**
 * API Route Registry
 * Mount feature-specific sub-routers here.
 */
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/citizens', citizenRoutes);
router.use('/mob', mobileRoutes);
router.use('/arogya-sevaks', arogyaSevakRoutes);
router.use('/sevak', arogyaSevakRoutes);
router.use('/sevaks', arogyaSevakRoutes);
router.use('/admins', adminRoutes);
router.use('/districts', districtRoutes);
router.use('/talukas', talukaRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/hospital-facilities', hospitalFacilityRoutes);
router.use('/daily-updates', dailyUpdateRoutes);
router.use('/doctors', doctorRoutes);
router.use('/arogya-sevaks/doctors', doctorRoutes);
router.use('/schemes', schemeRoutes);
router.use('/packages', packageMasterRoutes);
router.use('/package-master', packageMasterRoutes);
router.use('/applications', applicationRoutes);
router.use('/s3', s3Routes);
router.use('/opd-visits', opdVisitRoutes);
router.use('/arogya-sevaks/opd-visits', opdVisitRoutes);
router.use('/sevak/opd-visits', opdVisitRoutes);
router.use('/ipd', ipdRoutes);
router.use('/referrals', referralRoutes);
router.use('/leadership', leadershipRoutes);
router.use('/admins/leadership', leadershipRoutes);
router.use('/patients', patientRoutes);
router.use('/arogya-sevaks/patients', patientRoutes);
router.use('/arogya-sevaks/assigned-patients', patientRoutes);
router.use('/escalations', escalationRoutes);
router.use('/arogya-sevaks/urgent-requests', escalationRoutes);
router.use('/arogya-sevaks/escalations', escalationRoutes);

export default router;
