import { query, pool } from '../config/db.js';

/**
 * Setup Database Indexes & Query Performance Optimization
 * 
 * Creates non-redundant, high-traffic B-Tree indexes for:
 * 1. Application status filtering & date sorting (composite indexes)
 * 2. Assignment lookups & Sevak assignment tracking
 * 3. High-traffic Foreign Key joins (eliminating nested loop & table scan bottlenecks)
 * 4. User role filtering & claim status tracking
 */
export async function setupDatabaseIndexes() {
  console.log('🚀 Starting Database Indexing & Performance Optimization Migration...');
  const startTime = Date.now();

  const indexesToCreate = [
    // -------------------------------------------------------------
    // Group 1: Applications / Cases High-Traffic Query Indexes
    // -------------------------------------------------------------
    {
      name: 'idx_applications_status_updated_at',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_status_updated_at 
            ON public.applications (current_status, updated_at DESC);`,
      purpose: 'Optimizes dashboard queries filtering by status and ordering by recently updated'
    },
    {
      name: 'idx_applications_status_submitted_at',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_status_submitted_at 
            ON public.applications (current_status, submitted_at DESC);`,
      purpose: 'Optimizes dashboard queries filtering by status and ordering by submission date'
    },
    {
      name: 'idx_applications_updated_at',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_updated_at 
            ON public.applications (updated_at DESC);`,
      purpose: 'Optimizes general dashboard sorting by recent updates without status filter'
    },
    {
      name: 'idx_applications_submitted_at',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_submitted_at 
            ON public.applications (submitted_at DESC);`,
      purpose: 'Optimizes global chronologically ordered application intake queries'
    },
    {
      name: 'idx_applications_citizen_submitted',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_citizen_submitted 
            ON public.applications (submitted_by_citizen_id, submitted_at DESC);`,
      purpose: 'Accelerates citizen profile dashboard listing their applications in descending order'
    },
    {
      name: 'idx_applications_patient_submitted',
      table: 'applications',
      sql: `CREATE INDEX IF NOT EXISTS idx_applications_patient_submitted 
            ON public.applications (patient_id, submitted_at DESC);`,
      purpose: 'Accelerates patient medical history lookup across multiple applications'
    },

    // -------------------------------------------------------------
    // Group 2: Application Assignments & Arogya Sevak Operations
    // -------------------------------------------------------------
    {
      name: 'idx_app_assignments_hospital',
      table: 'application_assignments',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_assignments_hospital 
            ON public.application_assignments (hospital_id);`,
      purpose: 'Optimizes assignment lookups and joins by hospital'
    },
    {
      name: 'idx_app_assignments_assigned_by',
      table: 'application_assignments',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_assignments_assigned_by 
            ON public.application_assignments (assigned_by_admin_id);`,
      purpose: 'Foreign key index for admin assignment audits'
    },
    {
      name: 'idx_app_assignments_sevak_status',
      table: 'application_assignments',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_assignments_sevak_status 
            ON public.application_assignments (arogya_sevak_id, assignment_status);`,
      purpose: 'Accelerates Arogya Sevak mobile dashboard filtering active vs completed assignments'
    },
    {
      name: 'idx_app_assignments_sevak_assigned',
      table: 'application_assignments',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_assignments_sevak_assigned 
            ON public.application_assignments (arogya_sevak_id, assigned_at DESC);`,
      purpose: 'Accelerates chronological assignment list for Arogya Sevak app'
    },
    {
      name: 'idx_arogya_sevaks_hospital',
      table: 'arogya_sevaks',
      sql: `CREATE INDEX IF NOT EXISTS idx_arogya_sevaks_hospital 
            ON public.arogya_sevaks (hospital_id);`,
      purpose: 'Foreign key index for querying sevaks empanelled at a specific hospital'
    },

    // -------------------------------------------------------------
    // Group 3: Scheme Assessments & Scheme Claims
    // -------------------------------------------------------------
    {
      name: 'idx_scheme_claims_hospital',
      table: 'scheme_claims',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_claims_hospital 
            ON public.scheme_claims (hospital_id);`,
      purpose: 'Optimizes hospital claim settlement and billing reconciliation joins'
    },
    {
      name: 'idx_scheme_claims_scheme',
      table: 'scheme_claims',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_claims_scheme 
            ON public.scheme_claims (scheme_id);`,
      purpose: 'Optimizes scheme-wise financial reporting and claim aggregation'
    },
    {
      name: 'idx_scheme_claims_sevak',
      table: 'scheme_claims',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_claims_sevak 
            ON public.scheme_claims (arogya_sevak_id);`,
      purpose: 'Accelerates claim lookups originated by a specific field coordinator'
    },
    {
      name: 'idx_scheme_claims_status',
      table: 'scheme_claims',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_claims_status 
            ON public.scheme_claims (status);`,
      purpose: 'Optimizes dashboard filtering by claim settlement status (PENDING, APPROVED, etc.)'
    },
    {
      name: 'idx_scheme_assessments_scheme',
      table: 'scheme_assessments',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_assessments_scheme 
            ON public.scheme_assessments (scheme_id);`,
      purpose: 'Optimizes scheme eligibility assessment joins by scheme'
    },
    {
      name: 'idx_scheme_assessments_admin',
      table: 'scheme_assessments',
      sql: `CREATE INDEX IF NOT EXISTS idx_scheme_assessments_admin 
            ON public.scheme_assessments (assessed_by_admin_id);`,
      purpose: 'Audit tracking for medical officer scheme sanction assessments'
    },

    // -------------------------------------------------------------
    // Group 4: Escalations, Documents, Bills, & User Role Lookups
    // -------------------------------------------------------------
    {
      name: 'idx_case_escalations_sevak',
      table: 'case_escalations',
      sql: `CREATE INDEX IF NOT EXISTS idx_case_escalations_sevak 
            ON public.case_escalations (raised_by_arogya_sevak_id);`,
      purpose: 'Foreign key index for escalations raised by an Arogya Sevak'
    },
    {
      name: 'idx_case_escalations_admin',
      table: 'case_escalations',
      sql: `CREATE INDEX IF NOT EXISTS idx_case_escalations_admin 
            ON public.case_escalations (escalated_to_admin_id);`,
      purpose: 'Foreign key index for admin grievance redressal inbox'
    },
    {
      name: 'idx_case_escalations_status',
      table: 'case_escalations',
      sql: `CREATE INDEX IF NOT EXISTS idx_case_escalations_status 
            ON public.case_escalations (status);`,
      purpose: 'Optimizes admin dashboard filtering OPEN vs RESOLVED grievance escalations'
    },
    {
      name: 'idx_app_docs_type',
      table: 'application_documents',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_docs_type 
            ON public.application_documents (document_type_id);`,
      purpose: 'Foreign key index for document verification checks by document type'
    },
    {
      name: 'idx_app_docs_uploaded_by',
      table: 'application_documents',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_docs_uploaded_by 
            ON public.application_documents (uploaded_by_user_id);`,
      purpose: 'Foreign key index for user document uploads'
    },
    {
      name: 'idx_patient_bills_hospital',
      table: 'patient_bills',
      sql: `CREATE INDEX IF NOT EXISTS idx_patient_bills_hospital 
            ON public.patient_bills (hospital_id);`,
      purpose: 'Foreign key index for hospital billing summary aggregations'
    },
    {
      name: 'idx_hospitals_created_by',
      table: 'hospitals',
      sql: `CREATE INDEX IF NOT EXISTS idx_hospitals_created_by 
            ON public.hospitals (created_by_admin_id);`,
      purpose: 'Foreign key index for empanelled hospital administrative ownership'
    },
    {
      name: 'idx_users_role',
      table: 'users',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_role 
            ON public.users (role);`,
      purpose: 'Optimizes high-traffic user role-based lookups (ADMIN, SEVAK, CITIZEN)'
    }
  ];

  try {
    let createdCount = 0;
    for (const item of indexesToCreate) {
      process.stdout.write(`  Creating index "${item.name}" on ${item.table}... `);
      await query(item.sql);
      createdCount++;
      console.log('✓');
    }

    const duration = Date.now() - startTime;
    console.log(`\n🎉 Successfully verified/created ${createdCount} performance indexes in ${duration}ms!`);
    return { success: true, count: createdCount, durationMs: duration };
  } catch (err) {
    console.error('❌ Error creating database indexes:', err);
    throw err;
  }
}

// Allow standalone execution
if (process.argv[1]?.endsWith('setupDatabaseIndexes.js')) {
  setupDatabaseIndexes()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
