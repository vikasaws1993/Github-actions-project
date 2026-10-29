import app from '../app.js';
import { generateAccessToken } from '../utils/jwt.util.js';
import { query } from '../config/db.js';
import { s3Client, s3BucketName } from '../config/s3.config.js';
import { HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ApplicationModel } from '../models/application.model.js';

const TEST_PORT = 5057;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function runEscalationS3Test() {
  console.log('[PHASE 6 TEST] Starting Arogya Sevak Escalation S3 Upload & Creation Test...');

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => {
      console.log(`[PHASE 6 TEST] Ephemeral server running on ${BASE_URL}`);
      resolve(s);
    });
  });

  const createdS3Keys = [];
  let createdEscalationId = null;

  try {
    // 1. Fetch real application and arogya sevak
    const appList = await ApplicationModel.findAll({ limit: 1 });
    const realApp = appList.applications?.[0];
    if (!realApp) throw new Error('No applications found in DB');

    const sevakDb = await query('SELECT id, user_id FROM public.arogya_sevaks LIMIT 1;');
    const sevakRow = sevakDb.rows[0];
    const sevakUserId = sevakRow ? sevakRow.user_id : '824e146d-4052-4e7a-83f7-e14f1f7bf4ea';
    const sevakId = sevakRow ? sevakRow.id : 'sevak-test-id';

    const sevakUser = {
      id: sevakUserId,
      role: 'AROGYA_SEVAK',
      email: 'sevak_escalation@arogyamitra.gov.in',
      sevakId: sevakId,
    };
    const sevakToken = generateAccessToken(sevakUser);

    console.log(`[PHASE 6 TEST] Testing with App ID: ${realApp.id}, Sevak User ID: ${sevakUserId}`);

    // 2. Step 1: Request S3 Presigned URL for escalation attachment
    console.log('[PHASE 6 TEST] Step 1: Requesting S3 presigned upload URL...');
    const presignRes = await fetch(`${BASE_URL}/s3/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sevakToken}`,
      },
      body: JSON.stringify({
        fileName: 'hospital_exceeded_bill_estimate.pdf',
        fileType: 'application/pdf',
        fileSize: 1024 * 50,
        category: 'escalation_attachments',
        module: 'applications',
        applicationId: realApp.id,
      }),
    });

    const presignJson = await presignRes.json();
    if (!presignRes.ok || !presignJson.success) {
      throw new Error(`Presign failed: ${JSON.stringify(presignJson)}`);
    }

    const { uploadUrl, fileUrl, key } = presignJson.data;
    createdS3Keys.push(key);
    console.log(`[PHASE 6 TEST] ✅ Presigned URL received. Key: ${key}`);
    console.log(`[PHASE 6 TEST] Target S3 URL: ${fileUrl}`);

    // 3. Step 2: Upload file directly to AWS S3 using HTTP PUT
    console.log('[PHASE 6 TEST] Step 2: Uploading file directly to AWS S3 bucket...');
    const testPdfBuffer = Buffer.from('%PDF-1.4 Mock Escalation Supportive Document content for hospital ceiling exceeded');
    const s3PutRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: testPdfBuffer,
    });

    if (!s3PutRes.ok) {
      throw new Error(`Direct S3 PUT failed with HTTP status ${s3PutRes.status}`);
    }
    console.log('[PHASE 6 TEST] ✅ File directly uploaded to S3 bucket via Presigned PUT.');

    // 4. Step 3: Confirm Upload (Backend HeadObject Verification)
    console.log('[PHASE 6 TEST] Step 3: Calling /api/s3/confirm-upload (Backend HeadObject)...');
    const confirmRes = await fetch(`${BASE_URL}/s3/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sevakToken}`,
      },
      body: JSON.stringify({
        key,
        fileName: 'hospital_exceeded_bill_estimate.pdf',
        fileType: 'application/pdf',
        category: 'escalation_attachments',
        applicationId: realApp.id,
        note: 'Hospital exceeded estimate verified by Arogya Sevak',
      }),
    });

    const confirmJson = await confirmRes.json();
    if (!confirmRes.ok || !confirmJson.success) {
      throw new Error(`Confirm upload failed: ${JSON.stringify(confirmJson)}`);
    }
    console.log('[PHASE 6 TEST] ✅ S3 upload confirmed by Backend HeadObject.');

    // Direct S3 HeadObject verification from test runner
    const headObj = await s3Client.send(new HeadObjectCommand({ Bucket: s3BucketName, Key: key }));
    console.log(`[PHASE 6 TEST] ✅ S3 HeadObject verified: Size=${headObj.ContentLength} bytes, Type=${headObj.ContentType}`);

    // 5. Step 4: Create Escalation in Database with the S3 attachmentUrl
    console.log('[PHASE 6 TEST] Step 4: Creating Escalation via /api/escalations with S3 URL...');
    const escRes = await fetch(`${BASE_URL}/escalations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sevakToken}`,
      },
      body: JSON.stringify({
        applicationId: realApp.id,
        caseId: realApp.application_number || realApp.id,
        reasonType: 'bill_exceeded',
        escalationReason: 'Hospital Bill Exceeded Ceiling (₹2,50,000)',
        estimatedBill: '250000',
        remarks: 'Patient required extra ICU days; supportive hospital bill uploaded to S3.',
        description: 'Patient required extra ICU days; supportive hospital bill uploaded to S3.',
        attachmentName: 'hospital_exceeded_bill_estimate.pdf',
        attachmentUrl: fileUrl,
        putOnHold: true,
        sevakId: sevakId,
      }),
    });

    const escJson = await escRes.json();
    if (!escRes.ok || !escJson.success) {
      throw new Error(`Create escalation failed: ${JSON.stringify(escJson)}`);
    }

    createdEscalationId = escJson.data?.id || escJson.data?.uuid;
    console.log(`[PHASE 6 TEST] ✅ Escalation created successfully in DB: ID=${createdEscalationId}`);
    console.log(`[PHASE 6 TEST] Escalation Attachment URL: ${escJson.data?.attachmentUrl || escJson.data?.attachment_url}`);

    // 6. Step 5: Verify Escalation in Database
    const dbCheck = await query(
      `SELECT id, application_id, escalation_reason, reason_type, attachment_url, status
       FROM public.case_escalations
       WHERE attachment_url = $1 LIMIT 1;`,
      [fileUrl]
    );

    if (dbCheck.rows.length === 0) {
      throw new Error('Escalation record with S3 attachment_url not found in database.');
    }

    const row = dbCheck.rows[0];
    console.log('[PHASE 6 TEST] ✅ DB Record Found:');
    console.log(`  - Escalation ID: ${row.id}`);
    console.log(`  - Status: ${row.status}`);
    console.log(`  - Reason Type: ${row.reason_type}`);
    console.log(`  - Attachment URL (S3): ${row.attachment_url}`);

    console.log('\n======================================================');
    console.log('🎉 PHASE 6 ESCALATION S3 MIGRATION TEST: 100% PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('[PHASE 6 TEST] ❌ Test Failed:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup created S3 objects and test DB record
    for (const key of createdS3Keys) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: s3BucketName, Key: key }));
        console.log(`[PHASE 6 CLEANUP] Removed test S3 object: ${key}`);
      } catch (_) {}
    }
    if (createdEscalationId) {
      try {
        await query('DELETE FROM public.case_escalations WHERE id = $1 OR uuid::text = $1;', [createdEscalationId]);
        console.log(`[PHASE 6 CLEANUP] Removed test escalation DB record: ${createdEscalationId}`);
      } catch (_) {}
    }
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runEscalationS3Test();
