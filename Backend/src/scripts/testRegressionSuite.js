import { config } from '../config/environment.js';
import { query, pool } from '../config/db.js';
import { generateAccessToken, verifyAccessToken } from '../utils/jwt.util.js';
import { S3Client, HeadObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

const BASE_URL = 'http://127.0.0.1:5000/api';

const results = {
  healthCheck: false,
  databaseConnected: false,
  jwtAuth: false,
  rbac: false,
  applicationApis: false,
  leadershipApis: false,
  escalationApis: false,
  opdApis: false,
  s3UploadConfirm: false,
  legacyCloudinaryCompat: false,
};

function log(msg) {
  console.log(`[REGRESSION SUITE] ${msg}`);
}

async function run() {
  log('===========================================================');
  log('Starting ArogyaMitra Phase 10 Complete Regression Test Suite');
  log('===========================================================');

  try {
    // 1. Health Check
    log('\n--- 1. Health Check Verification ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    log(`Health Check: status=${healthRes.status}, body=${JSON.stringify(healthData.data)}`);
    if (healthRes.status === 200 && healthData.success && healthData.data?.status === 'UP') {
      results.healthCheck = true;
      log('✅ Backend Health Check: PASSED');
    }

    // 2. Database Connectivity
    log('\n--- 2. Database Connectivity (RDS PostgreSQL) ---');
    const dbRes = await query('SELECT NOW() as current_time, current_database() as db_name, version() as db_version;');
    log(`Connected to DB: ${dbRes.rows[0]?.db_name}, Time: ${dbRes.rows[0]?.current_time}`);
    if (dbRes.rows?.length > 0) {
      results.databaseConnected = true;
      log('✅ Database Connectivity: PASSED');
    }

    // 3. JWT & Authentication
    log('\n--- 3. JWT Authentication & Token Lifecycle ---');
    const testUser = {
      id: '3a959469-c5f3-4b38-8926-8fb5352c701c',
      role: 'ADMIN',
      email: 'admin@arogyamitra.gov.in',
    };
    const token = generateAccessToken(testUser);
    const decoded = verifyAccessToken(token);
    log(`Generated & Verified JWT for user ID: ${decoded.id}, Role: ${decoded.role}`);
    if (decoded.id === testUser.id && decoded.role === testUser.role) {
      results.jwtAuth = true;
      log('✅ JWT Authentication: PASSED');
    }

    // Setup Test Tokens for RBAC
    const adminToken = generateAccessToken({ id: '3a959469-c5f3-4b38-8926-8fb5352c701c', role: 'ADMIN' });
    const sevakToken = generateAccessToken({ id: '824e146d-4052-4e7a-83f7-e14f1f7bf4ea', role: 'AROGYA_SEVAK' });
    const citizenToken = generateAccessToken({ id: '00000000-0000-4000-8000-000000000001', role: 'CITIZEN' });

    // 4. RBAC Verification
    log('\n--- 4. Role-Based Access Control (RBAC) ---');
    // Admin route access with citizen token should be rejected (403)
    const rbacRejectRes = await fetch(`${BASE_URL}/admins/applications`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    // Admin route access with admin token should succeed or return valid response
    const rbacAllowRes = await fetch(`${BASE_URL}/admins/applications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    log(`Citizen accessing Admin endpoint: status=${rbacRejectRes.status} (Expected 403)`);
    log(`Admin accessing Admin endpoint: status=${rbacAllowRes.status} (Expected 200/OK)`);
    if (rbacRejectRes.status === 403 && (rbacAllowRes.status === 200 || rbacAllowRes.status === 304)) {
      results.rbac = true;
      log('✅ RBAC Restrictions: PASSED');
    }

    // 5. Application & Document APIs
    log('\n--- 5. Application & Document APIs ---');
    const appsRes = await fetch(`${BASE_URL}/admins/applications?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const appsData = await appsRes.json();
    log(`Applications API: status=${appsRes.status}, count=${appsData.data?.applications?.length || appsData.data?.length || 0}`);
    if (appsRes.status === 200 && appsData.success) {
      results.applicationApis = true;
      log('✅ Application APIs: PASSED');
    }

    // 6. Leadership / MLA APIs
    log('\n--- 6. Leadership & MLA APIs ---');
    const leadRes = await fetch(`${BASE_URL}/leadership`);
    const leadData = await leadRes.json();
    log(`Leadership API: status=${leadRes.status}, success=${leadData.success}, records=${leadData.data?.length || (leadData.data ? 1 : 0)}`);
    if (leadRes.status === 200 && leadData.success) {
      results.leadershipApis = true;
      log('✅ Leadership APIs: PASSED');
    }

    // 7. Escalation APIs
    log('\n--- 7. Escalation APIs ---');
    const escRes = await fetch(`${BASE_URL}/escalations?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const escData = await escRes.json();
    log(`Escalations API: status=${escRes.status}, count=${escData.data?.escalations?.length || escData.data?.length || 0}`);
    if (escRes.status === 200 && escData.success) {
      results.escalationApis = true;
      log('✅ Escalation APIs: PASSED');
    }

    // 8. OPD Visits APIs
    log('\n--- 8. OPD Visits APIs ---');
    const opdRes = await fetch(`${BASE_URL}/opd-visits?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const opdData = await opdRes.json();
    log(`OPD Visits API: status=${opdRes.status}, success=${opdData.success}`);
    if (opdRes.status === 200 && opdData.success) {
      results.opdApis = true;
      log('✅ OPD Visits APIs: PASSED');
    }

    // 9. S3 Upload, Presign & Confirm Flow
    log('\n--- 9. S3 Presigned Upload + Confirm Flow ---');
    const presignRes = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fileName: 'Regression_Test_Document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'clinical_records',
        module: 'applications',
        applicationId: appsData.data?.applications?.[0]?.id || '1c234bf3-c682-4546-ac1f-8c0276a47d8c',
      }),
    });
    const presignData = await presignRes.json();
    log(`S3 Presign API: status=${presignRes.status}, success=${presignData.success}`);

    if (presignData.success && presignData.data?.uploadUrl) {
      const s3Key = presignData.data.key;
      const uploadUrl = presignData.data.uploadUrl;
      const testContent = Buffer.from('%PDF-1.4 Mock PDF for regression test\n%%EOF');

      // Direct S3 PUT
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: testContent,
      });
      log(`Direct S3 PUT status: ${putRes.status}`);

      // Backend Confirmation
      const confirmRes = await fetch(`${BASE_URL}/s3/confirm-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          key: s3Key,
          fileName: 'Regression_Test_Document.pdf',
          fileType: 'application/pdf',
          fileSize: testContent.length,
          docTitle: 'Regression Test Document',
          category: 'clinical_records',
          applicationId: appsData.data?.applications?.[0]?.id || '1c234bf3-c682-4546-ac1f-8c0276a47d8c',
        }),
      });
      const confirmData = await confirmRes.json();
      log(`S3 Confirm API: status=${confirmRes.status}, verified=${confirmData.data?.verified}`);

      if (confirmRes.status === 201 && confirmData.data?.verified) {
        results.s3UploadConfirm = true;
        log('✅ S3 Upload + Confirm Flow: PASSED');
      }

      // Cleanup test file from S3
      await s3Client.send(new DeleteObjectCommand({
        Bucket: config.s3.bucketName,
        Key: s3Key,
      }));
      log(`Cleaned up ephemeral test key: ${s3Key}`);
    }

    // 10. Legacy Cloudinary URL Database Verification
    log('\n--- 10. Legacy Cloudinary Compatibility Check ---');
    const legacyDocs = await query(
      `SELECT id, file_url FROM public.application_documents WHERE file_url LIKE '%cloudinary%' LIMIT 5;`
    );
    const legacyCount = await query(
      `SELECT COUNT(*) as cnt FROM public.application_documents WHERE file_url LIKE '%cloudinary%';`
    );
    const count = parseInt(legacyCount.rows[0]?.cnt || '0', 10);
    log(`Historical Cloudinary database records count: ${count}`);
    if (legacyDocs.rows.length > 0) {
      log(`Sample legacy URL preserved: ${legacyDocs.rows[0].file_url}`);
    }
    if (count > 0 && legacyDocs.rows.length > 0) {
      results.legacyCloudinaryCompat = true;
      log('✅ Legacy Cloudinary Database & URL Compatibility: PASSED');
    }

  } catch (err) {
    log(`❌ Error in regression test: ${err.message}`);
    console.error(err);
  } finally {
    console.log('\n===========================================================');
    console.log('PHASE 10 BACKEND REGRESSION TEST MATRIX:');
    console.log('===========================================================');
    console.log(`1. GET /api/health → 200:             ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`2. RDS PostgreSQL Connection:         ${results.databaseConnected ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`3. JWT Authentication & Lifecycle:    ${results.jwtAuth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`4. Role-Based Access Control (RBAC):  ${results.rbac ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`5. Application & Document APIs:       ${results.applicationApis ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`6. Leadership / MLA APIs:             ${results.leadershipApis ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`7. Escalation APIs:                   ${results.escalationApis ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`8. OPD Visits APIs:                   ${results.opdApis ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`9. S3 Upload & Confirm Flow:          ${results.s3UploadConfirm ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`10. Legacy Cloudinary Compatibility:   ${results.legacyCloudinaryCompat ? '✅ PASS' : '❌ FAIL'}`);
    console.log('===========================================================\n');
    try {
      await pool.end();
    } catch {}
  }
}

run();
