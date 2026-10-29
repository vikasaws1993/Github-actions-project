import { query } from '../config/db.js';

async function main() {
  try {
    const res = await query(`
      UPDATE public.case_escalations
      SET status = 'RESOLVED',
          resolution = 'Specialty transfer completed: Reassigned to MGM Hospital (Hariom sevak)',
          resolved_at = CURRENT_TIMESTAMP
      WHERE (
        application_id IN (
          SELECT id FROM public.applications WHERE application_number ILIKE '%AA-2026-00021%'
        )
        OR escalation_reason ILIKE '%Shubhra%'
      )
      AND (status != 'RESOLVED' OR status IS NULL)
      RETURNING id, application_id, status;
    `);
    console.log('✅ Resolved rows:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resolving:', err);
    process.exit(1);
  }
}

main();
