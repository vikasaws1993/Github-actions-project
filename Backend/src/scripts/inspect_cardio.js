import { query } from '../config/db.js';

async function main() {
  const res = await query(
    "SELECT id, specialty, specialty_code, package_code, package_name, procedure_code, procedure_name FROM public.package_master WHERE specialty = 'Cardiology' LIMIT 15;"
  );
  console.log('Cardiology rows count:', res.rows.length);
  res.rows.forEach((r, i) => {
    console.log(`${i + 1}. [spec=${r.specialty}] [pkg_code=${r.package_code}] [pkg_name=${r.package_name}] [proc_code=${r.procedure_code}] [proc_name=${r.procedure_name}]`);
  });

  const nullPkgNames = await query(
    "SELECT count(*) as count FROM public.package_master WHERE package_name IS NULL OR package_name = '';"
  );
  console.log('\nRows with NULL/empty package_name in DB:', nullPkgNames.rows[0].count);

  const nullProcNames = await query(
    "SELECT count(*) as count FROM public.package_master WHERE procedure_name IS NULL OR procedure_name = '';"
  );
  console.log('Rows with NULL/empty procedure_name in DB:', nullProcNames.rows[0].count);

  process.exit(0);
}

main().catch(console.error);
