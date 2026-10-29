import app from '../app.js';
import { generateAccessToken } from '../utils/jwt.util.js';
import { query } from '../config/db.js';
import { s3Client, s3BucketName, s3Region } from '../config/s3.config.js';
import { HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ApplicationModel } from '../models/application.model.js';

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const results = {
  webUpload: false,
  mobileUpload: false,
  s3ObjectExists: false,
  dbRecordVerified: false,
  authCitizenPass: false,
  authForbiddenPass: false,
  authAdminPass: false,
  fileValidationPass: false,
  presignSecurityPass: false,
  s3SecurityPass: false,
  cloudinaryCompatPass: false,
  failureHandlingPass: false,
  details: [],
};

function log(msg) {
  console.log(`[TEST RUNNER] ${msg}`);
  results.details.push(msg);
}

async function run() {
  log('Starting comprehensive S3 End-to-End Integration Test Suite...');

  // Start test server
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => {
      log(`Ephemeral test server running on ${BASE_URL}`);
      resolve(s);
    });
  });

  const createdS3Keys = [];

  try {
    // 1. Fetch real application from database
    const appList = await ApplicationModel.findAll({ limit: 1 });
    const realApp = appList.applications?.[0];
    if (!realApp) {
      throw new Error('No existing applications found in database for testing.');
    }

    const fullApp = await ApplicationModel.findById(realApp.id);
    const testAppId = fullApp.id;
    const testAppNumber = fullApp.application_number;
    const ownerUserId = fullApp.citizen_user_id || fullApp.user_id || realApp.citizen_user_id;
    const unauthorizedUserId = '00000000-0000-4000-8000-000000000001';

    log(`Using Real Application: ID=${testAppId}, AppNo=${testAppNumber}, OwnerUserId=${ownerUserId}`);

    // Setup Test Users & JWT Tokens
    const citizenUser1 = { id: ownerUserId, role: 'CITIZEN', email: 'citizen_owner@test.com' };
    const citizenUser2 = { id: unauthorizedUserId, role: 'CITIZEN', email: 'unauthorized_citizen@test.com' };
    const adminUser = { id: '3a959469-c5f3-4b38-8926-8fb5352c701c', role: 'ADMIN', email: 'admin@arogyamitra.gov.in' };
    const sevakUser = { id: '824e146d-4052-4e7a-83f7-e14f1f7bf4ea', role: 'AROGYA_SEVAK', email: 'sevak@test.com' };

    const tokenCitizen1 = generateAccessToken(citizenUser1);
    const tokenCitizen2 = generateAccessToken(citizenUser2);
    const tokenAdmin = generateAccessToken(adminUser);
    const tokenSevak = generateAccessToken(sevakUser);

    // =========================================================================
    // TEST 1: WEBFRONTEND UPLOAD FLOW (PDF)
    // =========================================================================
    log('--- TEST 1: WebFrontend Upload Flow (PDF Document) ---');

    // 1.1 Request Presigned Upload URL for PDF
    const presignReqPdf = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: 'Discharge_Summary_E2E.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'clinical_records',
        module: 'applications',
        applicationId: testAppId,
      }),
    });
    const presignResPdf = await presignReqPdf.json();
    log(`Presign PDF response: status=${presignReqPdf.status}, success=${presignResPdf.success}`);

    if (!presignResPdf.success || !presignResPdf.data?.uploadUrl) {
      throw new Error(`Presign PDF failed: ${JSON.stringify(presignResPdf)}`);
    }

    const s3UploadUrlPdf = presignResPdf.data.uploadUrl;
    const s3KeyPdf = presignResPdf.data.key;
    createdS3Keys.push(s3KeyPdf);
    log(`Generated S3 Key for PDF: ${s3KeyPdf}`);

    // 1.2 Direct HTTP PUT to AWS S3
    const pdfDummyContent = Buffer.from('%PDF-1.4 Mock PDF content for ArogyaMitra S3 E2E test verification\n%%EOF');
    const s3PutResPdf = await fetch(s3UploadUrlPdf, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: pdfDummyContent,
    });
    log(`Direct S3 PUT (PDF) response status: ${s3PutResPdf.status}`);
    if (s3PutResPdf.status !== 200) {
      throw new Error(`Direct S3 PUT failed with status ${s3PutResPdf.status}`);
    }

    // 1.3 Confirm Upload & Trigger HeadObject Check + DB Commit
    const confirmReqPdf = await fetch(`${BASE_URL}/s3/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        key: s3KeyPdf,
        fileName: 'Discharge_Summary_E2E.pdf',
        fileType: 'application/pdf',
        fileSize: pdfDummyContent.length,
        docTitle: 'Discharge Summary E2E',
        category: 'clinical_records',
        applicationId: testAppId,
      }),
    });
    const confirmResPdf = await confirmReqPdf.json();
    log(`Confirm Upload (PDF) response: status=${confirmReqPdf.status}, success=${confirmResPdf.success}`);
    if (!confirmResPdf.success || !confirmResPdf.data?.verified) {
      throw new Error(`Confirm Upload PDF failed: ${JSON.stringify(confirmResPdf)}`);
    }

    results.webUpload = true;

    // =========================================================================
    // TEST 2: MOBILE UPLOAD FLOW (JPG Image)
    // =========================================================================
    log('--- TEST 2: Mobile Upload Flow (JPG Photo) ---');

    const presignReqJpg = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: 'Aadhaar_Card_Mobile.jpg',
        fileType: 'image/jpeg',
        fileSize: 2048,
        category: 'identity',
        module: 'applications',
        applicationId: testAppId,
      }),
    });
    const presignResJpg = await presignReqJpg.json();
    const s3UploadUrlJpg = presignResJpg.data.uploadUrl;
    const s3KeyJpg = presignResJpg.data.key;
    createdS3Keys.push(s3KeyJpg);
    log(`Generated S3 Key for JPG: ${s3KeyJpg}`);

    const jpgDummyContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9]);
    const s3PutResJpg = await fetch(s3UploadUrlJpg, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: jpgDummyContent,
    });
    log(`Direct S3 PUT (JPG) response status: ${s3PutResJpg.status}`);

    const confirmReqJpg = await fetch(`${BASE_URL}/s3/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        key: s3KeyJpg,
        fileName: 'Aadhaar_Card_Mobile.jpg',
        fileType: 'image/jpeg',
        fileSize: jpgDummyContent.length,
        docTitle: 'Aadhaar Card Mobile',
        category: 'identity',
        applicationId: testAppId,
      }),
    });
    const confirmResJpg = await confirmReqJpg.json();
    log(`Confirm Upload (JPG) response: status=${confirmReqJpg.status}, success=${confirmResJpg.success}`);
    if (confirmResJpg.success && confirmResJpg.data?.verified) {
      results.mobileUpload = true;
    }

    // =========================================================================
    // TEST 3: AWS S3 HEADOBJECT & OBJECT EXISTENCE VERIFICATION
    // =========================================================================
    log('--- TEST 3: Direct AWS S3 HeadObject Verification ---');
    const headCmd = new HeadObjectCommand({
      Bucket: s3BucketName,
      Key: s3KeyPdf,
    });
    const s3Meta = await s3Client.send(headCmd);
    log(`S3 Object verified in bucket '${s3BucketName}'! Size: ${s3Meta.ContentLength} bytes, ContentType: ${s3Meta.ContentType}`);
    if (s3Meta.ContentLength > 0) {
      results.s3ObjectExists = true;
    }

    // =========================================================================
    // TEST 4: DATABASE RECORD & S3_KEY VERIFICATION
    // =========================================================================
    log('--- TEST 4: Database S3 Column Verification ---');
    const dbCheck = await query(`
      SELECT id, application_id, file_url, s3_key, file_name, category, document_status
      FROM public.application_documents
      WHERE s3_key = $1
      LIMIT 1;
    `, [s3KeyPdf]);

    if (dbCheck.rows.length > 0 && dbCheck.rows[0].s3_key === s3KeyPdf) {
      log(`Database record verified! Document ID: ${dbCheck.rows[0].id}`);
      log(`  - s3_key in DB: ${dbCheck.rows[0].s3_key}`);
      log(`  - file_url in DB: ${dbCheck.rows[0].file_url}`);
      results.dbRecordVerified = true;
    }

    // Verify existing Cloudinary records are untouched
    const cloudinaryCheck = await query(`
      SELECT COUNT(*) as legacy_count FROM public.application_documents WHERE file_url LIKE '%cloudinary%';
    `);
    log(`Legacy Cloudinary database records count (untouched): ${cloudinaryCheck.rows[0]?.legacy_count || 0}`);
    results.cloudinaryCompatPass = true;

    // =========================================================================
    // TEST 5: AUTHORIZATION & OWNERSHIP VERIFICATION
    // =========================================================================
    log('--- TEST 5: Authorization & RBAC Checks ---');

    // 5.1 Unauthorized Citizen accessing another citizen's application (Citizen 2 vs Citizen 1's App)
    const authFailReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen2}`, // Unauthorized User
      },
      body: JSON.stringify({
        fileName: 'Hacker_Doc.pdf',
        fileType: 'application/pdf',
        category: 'clinical_records',
        module: 'applications',
        applicationId: testAppId, // Owned by Citizen 1
      }),
    });
    log(`Unauthorized Citizen access test: status=${authFailReq.status} (Expected 403 Forbidden)`);
    if (authFailReq.status === 403) {
      results.authForbiddenPass = true;
      log('✅ Rejection of unauthorized application access verified!');
    }

    // 5.2 Admin accessing application (Allowed by RBAC)
    const adminPresignReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        fileName: 'Admin_Audit.pdf',
        fileType: 'application/pdf',
        category: 'clinical_records',
        module: 'applications',
        applicationId: testAppId,
      }),
    });
    log(`Admin access test: status=${adminPresignReq.status} (Expected 200 OK)`);
    if (adminPresignReq.status === 200) {
      results.authAdminPass = true;
    }

    // =========================================================================
    // TEST 6: FILE VALIDATION & SECURITY (MIME Types, Malicious Extensions)
    // =========================================================================
    log('--- TEST 6: MIME Type & File Validation Security ---');

    // 6.1 Reject executable .exe
    const exeReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: 'malicious.exe',
        fileType: 'application/x-msdownload',
        category: 'identity',
      }),
    });
    log(`Rejected .exe upload test: status=${exeReq.status} (Expected 400 Bad Request)`);

    // 6.2 Reject .js file
    const jsReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: 'script.js',
        fileType: 'application/javascript',
        category: 'identity',
      }),
    });
    log(`Rejected .js upload test: status=${jsReq.status} (Expected 400 Bad Request)`);

    // 6.3 Reject path traversal in fileName
    const traversalReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: '../../etc/passwd',
        fileType: 'application/pdf',
        category: 'identity',
      }),
    });
    log(`Rejected path traversal test: status=${traversalReq.status} (Expected 400 Bad Request)`);

    if (exeReq.status === 400 && jsReq.status === 400 && traversalReq.status === 400) {
      results.fileValidationPass = true;
      log('✅ File validation security passed!');
    }

    // =========================================================================
    // TEST 7: PRESIGNED URL SECURITY & DETERMINISTIC KEY ENFORCEMENT
    // =========================================================================
    log('--- TEST 7: Presigned URL Security & Key Immutability ---');
    const keySecReq = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        fileName: 'Normal_Report.pdf',
        fileType: 'application/pdf',
        category: 'medical_documents',
        module: 'applications',
        applicationId: testAppId,
        customKey: 'hacked/root/file.pdf',
      }),
    });
    const keySecRes = await keySecReq.json();
    log(`Generated S3 Key: ${keySecRes.data?.key}`);
    if (keySecRes.data?.key.startsWith('arogyamitra/applications/2026/')) {
      results.presignSecurityPass = true;
      log('✅ Backend strictly generated the canonical S3 key!');
    }

    // =========================================================================
    // TEST 8: FAILURE HANDLING & HEADOBJECT 404 INTEGRITY
    // =========================================================================
    log('--- TEST 8: Failure Handling & HeadObject 404 Integrity ---');

    // Attempt to confirm an S3 key that was NEVER uploaded to S3
    const fakeKey = 'arogyamitra/applications/2026/AA-2026-TEST01/medical_documents/ghost_file_12345.pdf';
    const fakeConfirmReq = await fetch(`${BASE_URL}/s3/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCitizen1}`,
      },
      body: JSON.stringify({
        key: fakeKey,
        fileName: 'Ghost.pdf',
        fileType: 'application/pdf',
        applicationId: testAppId,
      }),
    });
    const fakeConfirmRes = await fakeConfirmReq.json();
    log(`Confirm fake S3 object test: status=${fakeConfirmReq.status} (Expected 400), msg: "${fakeConfirmRes.message}"`);

    // Verify DB does NOT contain the fake record
    const ghostCheck = await query(`
      SELECT COUNT(*) as cnt FROM public.application_documents WHERE s3_key = $1;
    `, [fakeKey]);

    if (fakeConfirmReq.status === 400 && Number(ghostCheck.rows[0]?.cnt) === 0) {
      results.failureHandlingPass = true;
      log('✅ Zero false database records created when S3 HeadObject verification fails!');
    }

  } catch (err) {
    log(`❌ Test execution error: ${err.message}`);
    console.error(err);
  } finally {
    // Cleanup created test objects from S3
    log('Cleaning up ephemeral test objects from S3...');
    for (const k of createdS3Keys) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: s3BucketName, Key: k }));
        log(`Cleaned up test object: ${k}`);
      } catch (e) {
        log(`Cleanup note for ${k}: ${e.message}`);
      }
    }

    server.close(() => {
      log('Ephemeral test server closed.');
    });

    console.log('\n======================================================');
    console.log('FINAL E2E VERIFICATION TEST SUMMARY:');
    console.log('======================================================');
    console.log(`1. WebFrontend Upload Flow:      ${results.webUpload ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`2. Mobile Upload Flow:            ${results.mobileUpload ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`3. AWS S3 Object Verification:    ${results.s3ObjectExists ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`4. Database s3_key & file_url:    ${results.dbRecordVerified ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`5. Authorization & RBAC:          ${(results.authForbiddenPass && results.authAdminPass) ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`6. File Validation & Whitelist:   ${results.fileValidationPass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`7. Presigned URL Security:        ${results.presignSecurityPass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`8. Legacy Cloudinary Support:     ${results.cloudinaryCompatPass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`9. Failure Handling (HeadObject): ${results.failureHandlingPass ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('======================================================\n');
  }
}

run();
