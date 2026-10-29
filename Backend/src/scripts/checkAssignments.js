import { query } from '../config/db.js';

async function main() {
  try {
    const res = await query(`
      SELECT a.id, a.application_number, a.hospital_id, a.hospital_name, 
             aa.arogya_sevak_id, aa.sevak_name, aa.hospital_id as aa_hosp_id, aa.hospital_name as aa_hosp_name, aa.assigned_at
      FROM public.applications a
      LEFT JOIN public.application_assignments aa ON a.id = aa.application_id
      WHERE a.application_number ILIKE '%AA-2026-00021%'
      ORDER BY aa.assigned_at DESC;
    `);
    console.log('Assignments for Shubhra:', JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
