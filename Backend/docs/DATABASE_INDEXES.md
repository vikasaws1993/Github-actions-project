# ArogyaMitra Database Indexes & Performance Registry

This document serves as the official tracking registry for all database indexes, performance optimizations, and query benchmarks in the ArogyaMitra backend.

---

## 🛠️ Management Commands

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Apply / Verify Indexes** | `npm run db:optimize-indexes` | Runs the idempotent migration script creating all 25 performance indexes with `CREATE INDEX IF NOT EXISTS`. Safe to run in Dev, Test, UAT, and Production. |
| **Benchmark Query Plans** | `npm run test:indexes` | Executes `EXPLAIN ANALYZE` on core dashboard queries and verifies that all indexes exist in `pg_indexes`. |
| **Full Schema Setup** | `npm run db:setup-all-tables` | Builds all 26 schema tables and automatically applies all performance indexes. |

---

## 📋 Comprehensive Index Registry (25 Performance Indexes)

### Group 1: Applications & Cases (High-Traffic Status & Sorting)
Optimizes the main operator/admin dashboard queues, citizen tracking, and patient medical history lookups.

| Index Name | Table | Indexed Columns | Type | Target Query / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| `idx_applications_status_updated_at` | `applications` | `(current_status, updated_at DESC)` | B-Tree Composite | `WHERE current_status = ? ORDER BY updated_at DESC`<br>Eliminates in-memory quicksort node for dashboard status queues. |
| `idx_applications_status_submitted_at` | `applications` | `(current_status, submitted_at DESC)` | B-Tree Composite | `WHERE current_status = ? ORDER BY submitted_at DESC`<br>Eliminates in-memory quicksort for intake queues. |
| `idx_applications_updated_at` | `applications` | `(updated_at DESC)` | B-Tree | Global dashboard application sorting across all statuses. |
| `idx_applications_submitted_at` | `applications` | `(submitted_at DESC)` | B-Tree | Global chronological intake queue sorting. |
| `idx_applications_citizen_submitted` | `applications` | `(submitted_by_citizen_id, submitted_at DESC)` | B-Tree Composite | Citizen portal query fetching their applications in reverse chronological order. |
| `idx_applications_patient_submitted` | `applications` | `(patient_id, submitted_at DESC)` | B-Tree Composite | Patient medical history lookup across multiple scheme applications. |

---

### Group 2: Assignments & Arogya Sevak Operations
Optimizes field coordinator mobile app assignments, status tracking, and hospital alignments.

| Index Name | Table | Indexed Columns | Type | Target Query / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| `idx_app_assignments_hospital` | `application_assignments` | `(hospital_id)` | B-Tree (FK) | Hospital assignment joins and hospital-wise assignment counts. |
| `idx_app_assignments_assigned_by` | `application_assignments` | `(assigned_by_admin_id)` | B-Tree (FK) | Administrative assignment audit queries. |
| `idx_app_assignments_sevak_status` | `application_assignments` | `(arogya_sevak_id, assignment_status)` | B-Tree Composite | Arogya Sevak mobile dashboard filtering active vs completed assignments. |
| `idx_app_assignments_sevak_assigned` | `application_assignments` | `(arogya_sevak_id, assigned_at DESC)` | B-Tree Composite | Reverse chronological assignment retrieval for field coordinators. |
| `idx_arogya_sevaks_hospital` | `arogya_sevaks` | `(hospital_id)` | B-Tree (FK) | Querying Sevaks empanelled at a specific hospital. |

---

### Group 3: Scheme Assessments & Claims
Optimizes government health insurance disbursement tracking, claim approvals, and medical officer audits.

| Index Name | Table | Indexed Columns | Type | Target Query / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| `idx_scheme_claims_hospital` | `scheme_claims` | `(hospital_id)` | B-Tree (FK) | Hospital claim settlement reconciliation. |
| `idx_scheme_claims_scheme` | `scheme_claims` | `(scheme_id)` | B-Tree (FK) | Scheme-wise financial reporting (PM-JAY, MJPJAY, etc.). |
| `idx_scheme_claims_sevak` | `scheme_claims` | `(arogya_sevak_id)` | B-Tree (FK) | Claims originated by a specific field coordinator. |
| `idx_scheme_claims_status` | `scheme_claims` | `(status)` | B-Tree | Filtering claims by status (`APPROVED`, `UNDER_REVIEW`, `PENDING`). |
| `idx_scheme_assessments_scheme` | `scheme_assessments` | `(scheme_id)` | B-Tree (FK) | Scheme eligibility joins. |
| `idx_scheme_assessments_admin` | `scheme_assessments` | `(assessed_by_admin_id)` | B-Tree (FK) | Medical Officer sanction audits. |

---

### Group 4: Escalations, Documents, Bills, & User Role Lookups
Optimizes grievance redressal, document verification, hospital billing, and admin/operator dashboard filters.

| Index Name | Table | Indexed Columns | Type | Target Query / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| `idx_case_escalations_sevak` | `case_escalations` | `(raised_by_arogya_sevak_id)` | B-Tree (FK) | Escalations logged by a Sevak. |
| `idx_case_escalations_admin` | `case_escalations` | `(escalated_to_admin_id)` | B-Tree (FK) | Admin grievance redressal inbox queries. |
| `idx_case_escalations_status` | `case_escalations` | `(status)` | B-Tree | Filtering OPEN vs RESOLVED grievance escalations. |
| `idx_app_docs_type` | `application_documents` | `(document_type_id)` | B-Tree (FK) | Document verification checks by document type. |
| `idx_app_docs_uploaded_by` | `application_documents` | `(uploaded_by_user_id)` | B-Tree (FK) | User document upload tracking. |
| `idx_patient_bills_hospital` | `patient_bills` | `(hospital_id)` | B-Tree (FK) | Hospital billing and audit queries. |
| `idx_hospitals_created_by` | `hospitals` | `(created_by_admin_id)` | B-Tree (FK) | Hospital empanelment ownership. |
| `idx_users_role` | `users` | `(role)` | B-Tree | High-traffic user list queries by role (`ADMIN`, `SEVAK`, `CITIZEN`). |

---

### Group 5: Citizen Referrals & Growth Attribution
Optimizes first-time citizen referral code attribution, user referral stats, and top-referrer leaderboards.

| Index Name | Table | Indexed Columns | Type | Target Query / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| `idx_users_referral_code` | `users` | `(referral_code)` | B-Tree (Unique) | Looking up referrer by shareable code during registration. |
| `idx_referrals_referrer` | `referrals` | `(referrer_user_id)` | B-Tree (FK) | Aggregating referrals and listing citizens referred by a specific user. |
| `idx_referrals_referred` | `referrals` | `(referred_user_id)` | B-Tree (Unique FK) | Fast check enforcing strictly 1 referral per registered citizen. |
| `idx_referrals_code` | `referrals` | `(referral_code)` | B-Tree | Filtering referral records by specific redemption code. |
| `idx_referrals_created` | `referrals` | `(created_at DESC)` | B-Tree | Sorting recent referrals and calculating 7-day / 30-day growth trends. |

---

## ⚡ Query Plan Benchmarks (`EXPLAIN ANALYZE`)

### 1. Dashboard Application List by Status & updated_at DESC
```sql
EXPLAIN ANALYZE
SELECT a.id, a.application_number, a.current_status, a.updated_at
FROM public.applications a
WHERE a.current_status = 'APPROVED'
ORDER BY a.current_status, a.updated_at DESC;
```
* **Execution Plan**: Direct `Index Scan using idx_applications_status_updated_at`.
* **Execution Time**: `0.716 ms` (Sub-millisecond).
* **Benefit**: In-memory quicksort node completely bypassed.

### 2. Arogya Sevak Assignment Status Lookup
```sql
EXPLAIN ANALYZE
SELECT aa.id, aa.assignment_status, aa.assigned_at
FROM public.application_assignments aa
WHERE aa.arogya_sevak_id = '...' AND aa.assignment_status = 'ASSIGNED'
ORDER BY aa.assigned_at DESC;
```
* **Execution Plan**: `Index Scan using idx_app_assignments_sevak_assigned`.
* **Execution Time**: `0.588 ms`.

---

## 🔄 Rules for Adding New Indexes in the Future

When adding new tables or columns:
1. **Primary & Unique Keys**: Automatically indexed by PostgreSQL upon table creation.
2. **Foreign Keys**: Always add `CREATE INDEX IF NOT EXISTS idx_<table_name>_<column>` for foreign keys used in joins.
3. **Filter + Sort Combinations**: Add composite index `(filter_column, sort_column DESC)`.
4. **Register**: Add the new index definition to [`src/scripts/setupDatabaseIndexes.js`](file:///c:/ArogyaMitra/Backend/src/scripts/setupDatabaseIndexes.js) and document it in this file.
