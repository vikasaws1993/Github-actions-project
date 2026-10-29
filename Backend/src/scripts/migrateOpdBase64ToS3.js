import { query } from '../config/db.js';
import { s3Service } from '../services/s3.service.js';

async function migrate() {
  try {
    const res = await query(
      `SELECT id, case_id, prescription_file_url, prescription_doc_data 
       FROM opd_visits 
       WHERE prescription_file_url LIKE 'data:%' OR (prescription_doc_data::text LIKE '%data:%');`
    );
    console.log('Found base64 records:', res.rows.length);
    for (const row of res.rows) {
      let rawUri = row.prescription_file_url;
      let docData = typeof row.prescription_doc_data === 'string' ? JSON.parse(row.prescription_doc_data) : row.prescription_doc_data;
      if (!rawUri && docData?.uri) rawUri = docData.uri;
      if (rawUri && rawUri.startsWith('data:')) {
        const matches = rawUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.includes('pdf') ? 'pdf' : 'jpg';
          const safeCaseId = (row.case_id || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = docData?.name || `rx_${Date.now()}.${ext}`;
          const s3Key = `arogyamitra/opd_prescriptions/${safeCaseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          
          const uploadRes = await s3Service.uploadBuffer(buffer, { key: s3Key, contentType: mimeType });
          if (uploadRes?.publicUrl) {
            const updatedDocData = { ...(docData || {}), uri: uploadRes.publicUrl, url: uploadRes.publicUrl, file_url: uploadRes.publicUrl };
            await query(
              'UPDATE opd_visits SET prescription_file_url = $1, prescription_doc_data = $2 WHERE id = $3',
              [uploadRes.publicUrl, JSON.stringify(updatedDocData), row.id]
            );
            console.log('✅ Migrated OPD visit', row.id, 'to S3:', uploadRes.publicUrl);
          }
        }
      }
    }
    console.log('Done migration!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
