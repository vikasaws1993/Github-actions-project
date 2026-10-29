import { query, pool } from '../config/db.js';
import { hashPassword } from '../utils/password.util.js';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';

const DEFAULT_ADMIN = {
  full_name: 'System Administrator',
  email: 'admin@arogyamitra.gov.in',
  mobile: '9999999999',
  password: 'Admin@123456',
  role: USER_ROLES.ADMIN,
  status: USER_STATUS.ACTIVE,
  department: 'HEALTH_ADMINISTRATION',
  designation: 'SUPER_ADMINISTRATOR',
};

async function seedDefaultAdmin() {
  try {
    console.log('🔄 Connecting to PostgreSQL / Supabase to seed Default Admin...');

    // 1. Hash the default admin password
    const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
    console.log('🔑 Generated secure scrypt password hash.');

    // 2. Check if admin user already exists by email or mobile
    const existingUserRes = await query(
      'SELECT * FROM public.users WHERE LOWER(email) = LOWER($1) OR mobile = $2 LIMIT 1',
      [DEFAULT_ADMIN.email, DEFAULT_ADMIN.mobile]
    );

    let userId;

    if (existingUserRes.rows.length > 0) {
      const existingUser = existingUserRes.rows[0];
      userId = existingUser.id;
      console.log(`ℹ️ User already exists with ID: ${userId}. Updating credentials & role...`);

      // Update password_hash, full_name, role, status
      await query(
        `UPDATE public.users 
         SET full_name = $1, email = $2, password_hash = $3, role = $4, status = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          DEFAULT_ADMIN.full_name,
          DEFAULT_ADMIN.email,
          passwordHash,
          DEFAULT_ADMIN.role,
          DEFAULT_ADMIN.status,
          userId,
        ]
      );
      console.log('✅ Updated existing user record.');
    } else {
      console.log('Creating new user in public.users...');
      const insertUserRes = await query(
        `INSERT INTO public.users (
          full_name, mobile, email, password_hash, role, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, full_name, mobile, email, role, status`,
        [
          DEFAULT_ADMIN.full_name,
          DEFAULT_ADMIN.mobile,
          DEFAULT_ADMIN.email,
          passwordHash,
          DEFAULT_ADMIN.role,
          DEFAULT_ADMIN.status,
        ]
      );
      userId = insertUserRes.rows[0].id;
      console.log(`✅ Created default admin in public.users [ID: ${userId}]`);
    }

    // 3. Ensure admins profile exists in public.admins
    const existingAdminRes = await query(
      'SELECT * FROM public.admins WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (existingAdminRes.rows.length > 0) {
      console.log('Admin profile already exists in public.admins. Updating department & designation...');
      await query(
        `UPDATE public.admins
         SET department = $1, designation = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [DEFAULT_ADMIN.department, DEFAULT_ADMIN.designation, userId]
      );
      console.log('✅ Updated admin profile in public.admins.');
    } else {
      console.log('Creating admin profile in public.admins...');
      await query(
        `INSERT INTO public.admins (
          user_id, department, designation, created_at, updated_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, DEFAULT_ADMIN.department, DEFAULT_ADMIN.designation]
      );
      console.log('✅ Created admin profile in public.admins.');
    }

    // 4. Verify the complete Admin record
    const verifyRes = await query(
      `SELECT 
        u.id AS user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.role,
        u.status,
        a.id AS admin_id,
        a.department,
        a.designation
      FROM public.users u
      LEFT JOIN public.admins a ON u.id = a.user_id
      WHERE u.id = $1`,
      [userId]
    );

    console.log('\n======================================================');
    console.log('🎉 DEFAULT ADMIN SUCCESSFULLY CONFIGURED IN DATABASE');
    console.log('======================================================');
    console.table(verifyRes.rows);
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log(`   Mobile:   ${DEFAULT_ADMIN.mobile}`);
    console.log(`   Role:     ${DEFAULT_ADMIN.role}`);
    console.log('======================================================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding default admin:', error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

seedDefaultAdmin();
