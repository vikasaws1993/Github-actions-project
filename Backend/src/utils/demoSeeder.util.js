import { UserModel } from '../models/user.model.js';
import { CitizenModel } from '../models/citizen.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';
import { logger } from './logger.js';

/**
 * Ensures initial demo users exist in the system for mobile testing:
 * 1. Citizen (1111111111) -> Ramesh Patil
 * 2. Arogya Sevak (2222222222) -> Sunita Deshmukh
 * 3. Admin (9999999999) -> System Admin
 */
export async function seedDemoAccounts() {
  try {
    // 1. Citizen Demo (1111111111)
    let citizenUser = await UserModel.findByMobile('1111111111');
    if (!citizenUser) {
      citizenUser = await UserModel.create({
        full_name: 'Ramesh Patil (रमेश पाटील)',
        mobile: '1111111111',
        email: 'ramesh.patil@example.com',
        role: USER_ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      });

      await CitizenModel.create({
        user_id: citizenUser.id,
        dob: '1985-05-15',
        gender: 'MALE',
        address: 'Flat 402, Shiv Shrushti CHS, Shivaji Chowk',
        state: 'Maharashtra',
        district: 'Thane',
        taluka: 'Kalyan',
        pincode: '421301',
        email: 'ramesh.patil@example.com',
      });
      logger.info('Seeded Citizen demo account: 1111111111');
    }

    // 2. Arogya Sevak Demo (2222222222)
    let sevakUser = await UserModel.findByMobile('2222222222');
    if (!sevakUser) {
      sevakUser = await UserModel.create({
        full_name: 'Sunita Deshmukh (सुनिता देशमुख)',
        mobile: '2222222222',
        email: 'sunita.sevak@example.com',
        role: USER_ROLES.AROGYA_SEVAK,
        status: USER_STATUS.ACTIVE,
      });

      try {
        await ArogyaSevakModel.create({
          user_id: sevakUser.id,
          employee_code: 'AS-MH-2024-884',
          assigned_ward: 'Ward 14 - Shivajinagar PHC',
          phc_name: 'Shivajinagar PHC',
          taluka: 'Kalyan',
          district: 'Thane',
        });
      } catch (_) {
        // Table or columns might be optional in lightweight mode
      }
      logger.info('Seeded Arogya Sevak demo account: 2222222222');
    }

    // 3. Admin Demo (9999999999)
    let adminUser = await UserModel.findByMobile('9999999999');
    if (!adminUser) {
      await UserModel.create({
        full_name: 'System Admin (सिस्टम अॅडमिन)',
        mobile: '9999999999',
        email: 'admin@arogyamitra.gov.in',
        role: USER_ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      });
      logger.info('Seeded Admin demo account: 9999999999');
    }
  } catch (err) {
    logger.warn(`Demo account seeding completed with notice: ${err.message}`);
  }
}
