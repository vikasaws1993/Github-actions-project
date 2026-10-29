/**
 * Historical Location Data Multilingual Audit Script (DRY-RUN ONLY)
 * 
 * Inspects legacy district and taluka strings across citizens, patients, and hospitals.
 * Evaluates mapping against canonical codes and PostgreSQL UUID primary keys.
 * 
 * STRICT SAFETY RULE:
 * This script is 100% READ-ONLY.
 * It NEVER modifies, updates, deletes, or inserts any database records.
 */

import { query, pool } from '../config/db.js';
import { resolveDistrict, resolveTaluka, normalizeLocationStr } from '../utils/locationResolver.util.js';

// Classification Categories
export const AUDIT_STATUS = {
  MATCHED: 'MATCHED',                     // Canonical English match (e.g. 'Pune' -> 'MH-PUN')
  LOCALIZED_MATCH: 'LOCALIZED_MATCH',     // Devanagari / Marathi / Hindi match (e.g. 'पुणे' -> 'MH-PUN')
  AMBIGUOUS: 'AMBIGUOUS',                 // Multiple possible taluka/district associations
  UNMATCHED: 'UNMATCHED',                 // Unresolvable legacy string requiring manual review
};

/**
 * Runs historical location data audit (DRY-RUN)
 */
export async function runHistoricalLocationAudit() {
  console.log('================================================================================');
  console.log('🔍 ArogyaMitra Historical Location Audit (DRY-RUN ONLY)');
  console.log('   Timestamp: ' + new Date().toISOString());
  console.log('   Mode: READ-ONLY (No database writes will be performed)');
  console.log('================================================================================\n');

  const report = {
    districts: {
      totalDistinct: 0,
      matched: 0,
      localizedMatch: 0,
      ambiguous: 0,
      unmatched: 0,
      items: [],
    },
    talukas: {
      totalDistinct: 0,
      matched: 0,
      localizedMatch: 0,
      ambiguous: 0,
      unmatched: 0,
      items: [],
    },
    summary: {
      totalAudited: 0,
      confidenceRate: '0%',
      unresolvedRecords: [],
    },
  };

  // Sample known legacy strings if DB is empty or offline
  const fallbackDistricts = ['Pune', 'Thane', 'पुणे', 'ठाणे', 'Nagpur', 'नाशिक', 'Ahilyanagar', 'UnknownDist'];
  const fallbackTalukas = [
    { taluka: 'Haveli', district: 'Pune' },
    { taluka: 'हवेली', district: 'Pune' },
    { taluka: 'Kalyan', district: 'Thane' },
    { taluka: 'कल्याण', district: 'Thane' },
    { taluka: 'Pune City', district: 'Pune' },
    { taluka: 'पुणे शहर', district: 'Pune' },
    { taluka: 'Karjat', district: 'Raigad' },
    { taluka: 'NonExistentTaluka', district: 'Pune' },
  ];

  let distinctDistricts = [];
  let distinctTalukas = [];

  const auditQueries = [
    { table: 'citizens', distField: 'district', talField: 'taluka', query: 'SELECT id, district, taluka FROM public.citizens WHERE (district IS NOT NULL AND district != \'\') OR (taluka IS NOT NULL AND taluka != \'\')' },
    { table: 'patients', distField: 'district', talField: 'taluka', query: 'SELECT id, district, taluka FROM public.patients WHERE (district IS NOT NULL AND district != \'\') OR (taluka IS NOT NULL AND taluka != \'\')' },
    { table: 'hospitals', distField: 'district', talField: 'taluka', query: 'SELECT id, district, taluka FROM public.hospitals WHERE (district IS NOT NULL AND district != \'\') OR (taluka IS NOT NULL AND taluka != \'\')' },
  ];

  const aggregatedAudit = [];

  for (const aq of auditQueries) {
    try {
      const rows = await query(aq.query);
      // Group by legacy value pair
      const grouped = {};
      for (const row of rows.rows) {
        const dVal = (row.district || '').trim();
        const tVal = (row.taluka || '').trim();
        const key = `${aq.table}|${dVal}|${tVal}`;
        if (!grouped[key]) {
          grouped[key] = { table: aq.table, distField: aq.distField, talField: aq.talField, district: dVal, taluka: tVal, count: 0, ids: [] };
        }
        grouped[key].count++;
        grouped[key].ids.push(row.id);
      }

      for (const item of Object.values(grouped)) {
        report.summary.totalAudited += item.count;
        const resDist = item.district ? await resolveDistrict(item.district) : { matchType: 'UNMATCHED', id: null, code: null };
        const resTal = item.taluka ? await resolveTaluka(item.taluka, resDist.id || resDist.district_code || resDist.code) : { matchType: 'UNMATCHED', id: null, code: null };

        let status = AUDIT_STATUS.UNMATCHED;
        if ((item.district && resDist.matchType === 'UNMATCHED') || (item.taluka && resTal.matchType === 'UNMATCHED')) {
          status = AUDIT_STATUS.UNMATCHED;
          report.summary.unresolvedRecords.push(item);
        } else if (resDist.matchType === 'LOCALIZED_NAME' || resTal.matchType === 'LOCALIZED_NAME') {
          status = AUDIT_STATUS.LOCALIZED_MATCH;
        } else {
          status = AUDIT_STATUS.MATCHED;
        }

        // Check for ambiguous talukas without clear district context
        const ambiguousTalukaNames = ['khed', 'karjat', 'shirur', 'nandgaon', 'selu'];
        if (item.taluka && ambiguousTalukaNames.includes(item.taluka.toLowerCase()) && (!item.district || resDist.matchType === 'UNMATCHED')) {
          status = AUDIT_STATUS.AMBIGUOUS;
        }

        aggregatedAudit.push({
          table: item.table,
          field: `${item.distField} / ${item.talField}`,
          legacyValue: `${item.district || '—'} / ${item.taluka || '—'}`,
          recordCount: item.count,
          status,
          canonicalCode: `${resDist.code || '—'} / ${resTal.code || '—'}`,
          resolvedUuid: `${resDist.id || '—'} / ${resTal.id || '—'}`,
        });
      }
    } catch (err) {
      console.warn(`Audit query error for ${aq.table}:`, err.message);
    }
  }

  // Render Table in exact requested format
  console.log('TABLE'.padEnd(14) + ' | ' + 'FIELD'.padEnd(20) + ' | ' + 'LEGACY VALUE'.padEnd(30) + ' | ' + 'COUNT'.padEnd(6) + ' | ' + 'STATUS'.padEnd(16) + ' | ' + 'CANONICAL CODE'.padEnd(25) + ' | ' + 'RESOLVED UUID');
  console.log('-'.repeat(150));

  let matchedCount = 0;
  let localizedCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;

  for (const row of aggregatedAudit) {
    if (row.status === AUDIT_STATUS.MATCHED) matchedCount += row.recordCount;
    else if (row.status === AUDIT_STATUS.LOCALIZED_MATCH) localizedCount += row.recordCount;
    else if (row.status === AUDIT_STATUS.AMBIGUOUS) ambiguousCount += row.recordCount;
    else unmatchedCount += row.recordCount;

    console.log(
      row.table.padEnd(14) + ' | ' +
      row.field.padEnd(20) + ' | ' +
      row.legacyValue.padEnd(30) + ' | ' +
      row.recordCount.toString().padEnd(6) + ' | ' +
      row.status.padEnd(16) + ' | ' +
      row.canonicalCode.padEnd(25) + ' | ' +
      row.resolvedUuid
    );
  }

  const confidencePercent = report.summary.totalAudited > 0
    ? (((matchedCount + localizedCount) / report.summary.totalAudited) * 100).toFixed(1) + '%'
    : '100%';

  console.log('\n================================================================================');
  console.log('📊 HISTORICAL AUDIT SUMMARY TOTALS');
  console.log('================================================================================');
  console.log(`Total Records Scanned        : ${report.summary.totalAudited}`);
  console.log(`Deterministic MATCHED        : ${matchedCount}`);
  console.log(`LOCALIZED_MATCH              : ${localizedCount}`);
  console.log(`AMBIGUOUS                    : ${ambiguousCount}`);
  console.log(`UNMATCHED                    : ${unmatchedCount}`);
  console.log(`Overall Resolution Confidence: ${confidencePercent}`);
  console.log(`Safety Confirmation          : 0 rows modified (DRY-RUN ONLY).\n`);

  return { aggregatedAudit, totals: { total: report.summary.totalAudited, matched: matchedCount, localized: localizedCount, ambiguous: ambiguousCount, unmatched: unmatchedCount, confidence: confidencePercent } };
}

// Allow direct execution from CLI
if (process.argv[1] && process.argv[1].includes('auditHistoricalLocationData.js')) {
  runHistoricalLocationAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Audit failed:', err);
      process.exit(1);
    });
}

export default runHistoricalLocationAudit;
