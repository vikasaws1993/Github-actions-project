import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target output path in repository root
const outputPath = path.resolve(__dirname, '../../../ArogyaMitra_Production_Security_Audit_Report.pdf');

console.log('Generating ArogyaMitra Production Security Audit Report PDF...');
console.log(`Target: ${outputPath}`);

const doc = new PDFDocument({
  size: 'A4',
  margin: 36,
  bufferPages: true,
  info: {
    Title: 'ArogyaMitra Healthcare Platform - Production-Readiness Security Audit Report',
    Author: 'Senior Application Security Engineering Team',
    Subject: 'Comprehensive Codebase Security Posture, Vulnerability Audit & Hardening Roadmap',
    Keywords: 'Security Audit, Healthcare, HIPAA, DISHA, OWASP, Node.js, Express, PostgreSQL',
  },
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Palette
const colors = {
  navyDark: '#0f172a',
  navyCard: '#1e293b',
  border: '#334155',
  lightBorder: '#cbd5e1',
  textLight: '#94a3b8',
  textDark: '#0f172a',
  textMuted: '#64748b',
  white: '#ffffff',
  redDark: '#991b1b',
  redLight: '#fef2f2',
  redBorder: '#f87171',
  amberDark: '#92400e',
  amberLight: '#fffbeb',
  amberBorder: '#fcd34d',
  greenDark: '#166534',
  greenLight: '#f0fdf4',
  greenBorder: '#86efac',
  blueDark: '#1e40af',
  blueLight: '#eff6ff',
  blueBorder: '#93c5fd',
  cyanText: '#38bdf8',
  pageBg: '#f8fafc',
};

// Helper: Header on pages
function drawHeader(title, subtitle) {
  doc.rect(36, 25, 523, 44).fill(colors.navyDark);
  doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(12).text(title, 48, 33);
  doc.fillColor(colors.cyanText).font('Helvetica').fontSize(8).text(subtitle, 48, 49);
}

// Helper: Section title
function drawSectionHeading(title, y, icon = '') {
  doc.rect(36, y, 523, 24).fill(colors.navyDark);
  doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(11).text(`${icon} ${title}`.trim(), 46, y + 6);
  return y + 30;
}

// ========================================================
// PAGE 1: EXECUTIVE SUMMARY & AUDIT DASHBOARD
// ========================================================

// Main Banner
doc.rect(36, 36, 523, 85).fill(colors.navyDark);
doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(17).text('AROGYAMITRA HEALTHCARE PLATFORM', 50, 48);
doc.fillColor(colors.cyanText).font('Helvetica-Bold').fontSize(10).text('Comprehensive Production-Readiness Security Audit Report', 50, 70);
doc.fillColor(colors.textLight).font('Helvetica').fontSize(8).text(
  'Target: Backend (Express/Node.js, PostgreSQL, S3) | WebFrontend (React 19) | Application (React Native) | CI/CD Workflows',
  50,
  87
);
doc.text(`Audit Date: September 2026 | Standard: OWASP Top 10 (2021) & OWASP API Top 10 (2023) | Scope: Static Code & Config Audit`, 50, 99);

// Overall Scorecard & Verdict Box
const scoreY = 132;
doc.rect(36, scoreY, 256, 110).fillAndStroke(colors.redLight, colors.redBorder);
doc.fillColor(colors.redDark).font('Helvetica-Bold').fontSize(12).text('SECURITY READINESS SCORE', 48, scoreY + 12);
doc.fontSize(38).text('23%', 48, scoreY + 28);
doc.fontSize(10).text('VERDICT: NOT READY', 48, scoreY + 74);
doc.font('Helvetica').fontSize(7.5).fillColor(colors.textDark).text('Critical security hardening required before handling patient data.', 48, scoreY + 90);

doc.rect(302, scoreY, 257, 110).fillAndStroke('#f8fafc', colors.lightBorder);
doc.fillColor(colors.navyDark).font('Helvetica-Bold').fontSize(11).text('AUDIT CONTROL METRICS', 314, scoreY + 12);

const metrics = [
  { label: 'Total Security Categories Evaluated', val: '44 Controls', color: colors.navyDark },
  { label: 'Fully Implemented Controls (100%)', val: '1 (2.3%)', color: colors.greenDark },
  { label: 'Partially Implemented Controls (50%)', val: '18 (40.9%)', color: colors.amberDark },
  { label: 'Missing / Not Implemented Controls (0%)', val: '8 (18.2%)', color: '#64748b' },
  { label: 'Risky / Incorrect Implementations (0%)', val: '17 (38.6%)', color: colors.redDark },
  { label: 'Unverifiable / Excluded Controls', val: '1 (NoSQL N/A)', color: '#64748b' },
];

let mY = scoreY + 28;
metrics.forEach((m) => {
  doc.font('Helvetica').fontSize(7.5).fillColor(colors.textDark).text(m.label, 314, mY);
  doc.font('Helvetica-Bold').fillColor(m.color).text(m.val, 490, mY, { align: 'right', width: 60 });
  mY += 13;
});

// Executive Summary Text
const execY = 252;
doc.rect(36, execY, 523, 110).fillAndStroke('#f1f5f9', colors.lightBorder);
doc.fillColor(colors.navyDark).font('Helvetica-Bold').fontSize(11).text('EXECUTIVE SECURITY POSTURE SUMMARY', 48, execY + 10);
doc.font('Helvetica').fontSize(8.5).fillColor(colors.textDark).text(
  'A rigorous, zero-assumption source-code security audit of the entire ArogyaMitra repository reveals critical vulnerabilities that prevent production deployment in its current state. While core software engineering practices are present—such as parameterized PostgreSQL queries, scrypt password hashing, and clean MVC layered architecture—the application exhibits severe authorization and authentication defects:\n\n' +
  '1. OTP Bypass in All Logins: The API returns plain-text OTPs in JSON HTTP responses for Citizen, Sevak, and Admin logins, allowing instant account takeover without an SMS gateway.\n' +
  '2. Public Privilege Escalation: POST /api/users is unauthenticated and accepts arbitrary role parameters, allowing anyone to register as an Administrator.\n' +
  '3. Mass Protected Health Information (PHI) Exposure: Patient cases, clinical records, and direct S3 files are exposed through unauthenticated or optionalJWT-guarded routes.\n' +
  '4. Cryptographic & In-Transit Flaws: PostgreSQL TLS certificate validation is disabled (rejectUnauthorized: false), backend runs cleartext HTTP, and Android allows cleartext traffic.',
  48,
  execY + 26,
  { width: 499, lineGap: 1.5 }
);

// Top 5 Critical Vulnerabilities Summary Table on Page 1
let critY = 372;
doc.rect(36, critY, 523, 22).fill(colors.redDark);
doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10).text('CRITICAL SECURITY VULNERABILITIES REQUIRING IMMEDIATE REMEDIATION', 46, critY + 6);
critY += 25;

const topCrits = [
  {
    title: '1. Complete Authentication Bypass & Account Takeover (Leaked OTP)',
    file: 'Backend/src/services/auth.service.js, citizen.service.js, arogyaSevak.service.js',
    impact: 'Plaintext OTP returned in HTTP JSON response. Any account (Admin, Sevak, Citizen) can be hijacked immediately.',
  },
  {
    title: '2. Unauthenticated Admin Creation & Privilege Escalation',
    file: 'Backend/src/routes/user.routes.js, Backend/src/validations/user.validation.js',
    impact: 'POST /api/users is public and accepts role: "ADMIN". Anyone can create a super administrator account.',
  },
  {
    title: '3. Mass Broken Object-Level Authorization (BOLA/IDOR) & Patient Data Exposure',
    file: 'Backend/src/routes/patient.routes.js, application.routes.js, opdVisit.controller.js',
    impact: 'Patient records, diagnoses, and medical records are returned to unauthenticated requests via optionalJWT.',
  },
  {
    title: '4. Public Notification Broadcast & Phishing Injection',
    file: 'Backend/src/routes/mobile.routes.js, Backend/src/controllers/notification.controller.js',
    impact: 'POST /api/mob/notifications/broadcast lacks authentication; arbitrary callers can broadcast system-wide alerts.',
  },
  {
    title: '5. Man-In-The-Middle (MITM) on Cloud Database via Disabled TLS Validation',
    file: 'Backend/src/config/db.js (ssl: { rejectUnauthorized: false })',
    impact: 'Disables SSL certificate verification for remote PostgreSQL. Intercepting proxies can harvest credentials and PHI.',
  },
];

topCrits.forEach((c) => {
  doc.rect(36, critY, 523, 62).fillAndStroke('#fff5f5', colors.redBorder);
  doc.fillColor(colors.redDark).font('Helvetica-Bold').fontSize(8.5).text(c.title, 44, critY + 6);
  doc.fillColor(colors.textMuted).font('Helvetica-Bold').fontSize(7.5).text(`Location: ${c.file}`, 44, critY + 19);
  doc.fillColor(colors.textDark).font('Helvetica').fontSize(8).text(c.impact, 44, critY + 31, { width: 505 });
  critY += 66;
});

doc.fillColor(colors.textMuted).font('Helvetica-Oblique').fontSize(7).text(
  'ArogyaMitra Production Security Audit Report | Page 1 of 5 | Generated autonomously via Static Code Analysis',
  36,
  790,
  { align: 'center', width: 523 }
);

// ========================================================
// PAGE 2: FULL PRODUCTION SECURITY FRAMEWORK EVALUATION
// ========================================================
doc.addPage();
drawHeader('AROGYAMITRA HEALTHCARE PLATFORM', 'Production Security Framework - 44 Evaluated Security Controls');

let tableY = 78;

// Table Header
doc.rect(36, tableY, 523, 18).fill(colors.navyDark);
doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(7);
doc.text('#', 40, tableY + 5, { width: 14 });
doc.text('Security Area', 56, tableY + 5, { width: 95 });
doc.text('Status', 153, tableY + 5, { width: 45 });
doc.text('Score', 200, tableY + 5, { width: 26 });
doc.text('Key Evidence & Implementation Finding', 228, tableY + 5, { width: 185 });
doc.text('Risk', 415, tableY + 5, { width: 34 });
doc.text('Required Fix', 451, tableY + 5, { width: 104 });
tableY += 18;

const controls = [
  { id: '1', area: 'HTTPS / TLS', status: 'RISK', score: '0%', ev: 'server.js binds HTTP; Android usesCleartextTraffic=true', risk: 'CRIT', fix: 'Terminate TLS on ALB; enforce strict HTTPS' },
  { id: '2', area: 'Authentication', status: 'RISK', score: '0%', ev: 'auth.service.js & citizen.service.js return OTP in API JSON', risk: 'CRIT', fix: 'Strip OTP from response; integrate carrier SMS' },
  { id: '3', area: 'Password Security', status: 'PARTIAL', score: '50%', ev: 'scrypt used; weak policy (len>=6); seedDefaultAdmin hardcoded', risk: 'HIGH', fix: 'Enforce 12+ chars, upper/lower/num/sym; remove seed pwd' },
  { id: '4', area: 'JWT Security', status: 'PARTIAL', score: '50%', ev: 'No HS256 algorithm pinning; 1d long lifespan; fallback secrets', risk: 'HIGH', fix: 'Pin algorithms: ["HS256"]; 15m expiry; enforce secrets' },
  { id: '5', area: 'Refresh Tokens', status: 'PARTIAL', score: '50%', ev: 'Stored in DB; unhashed; no token rotation (RTR) on renew', risk: 'HIGH', fix: 'Implement refresh token rotation; hash in DB' },
  { id: '6', area: 'Session Security', status: 'RISK', score: '0%', ev: 'Tokens saved in browser localStorage and React Native AsyncStorage', risk: 'HIGH', fix: 'Migrate to HttpOnly, Secure, SameSite=Strict cookies' },
  { id: '7', area: 'Authorization / RBAC', status: 'RISK', score: '0%', ev: 'POST /api/users is public and accepts role: "ADMIN"', risk: 'CRIT', fix: 'Lock user creation to Admin; forbid role in public signups' },
  { id: '8', area: 'Object-Level Auth (BOLA)', status: 'RISK', score: '0%', ev: 'optionalJWT on /api/patients; anyone reads any patient PHI', risk: 'CRIT', fix: 'Enforce strict record ownership checks in controllers' },
  { id: '9', area: 'Input Validation', status: 'PARTIAL', score: '50%', ev: 'Zod schemas present on select routes; missing on patient updates', risk: 'MED', fix: 'Enforce Zod schemas across 100% of mutation routes' },
  { id: '10', area: 'SQL Injection Defense', status: 'PASS', score: '100%', ev: 'Parameterized queries via pg.Pool with $1, $2 placeholders', risk: 'LOW', fix: 'Maintain parameterization standards across all queries' },
  { id: '11', area: 'XSS Protection', status: 'RISK', score: '0%', ev: 'Reports.jsx document.write unescaped HTML; SVG upload enabled', risk: 'HIGH', fix: 'Sanitize via DOMPurify; forbid SVG or sanitize XML' },
  { id: '12', area: 'CSRF Protection', status: 'MISSING', score: '0%', ev: 'No CSRF tokens; credentials:true with wildcard origins', risk: 'MED', fix: 'Add csrf-csrf middleware for browser-facing sessions' },
  { id: '13', area: 'CORS Configuration', status: 'RISK', score: '0%', ev: 'Regex allows any *.vercel.app domain with credentials:true', risk: 'HIGH', fix: 'Whitelist exact production FQDNs only' },
  { id: '14', area: 'Security Headers', status: 'PARTIAL', score: '50%', ev: 'helmet() on backend; no CSP or HSTS headers on WebFrontend', risk: 'MED', fix: 'Configure strict CSP and HSTS on CloudFront/Vercel' },
  { id: '15', area: 'Rate Limiting', status: 'PARTIAL', score: '50%', ev: 'express-rate-limit in-memory; only active if NODE_ENV=prod', risk: 'MED', fix: 'Move counters to Redis; attach to dev and prod' },
  { id: '16', area: 'Brute-Force Protection', status: 'PARTIAL', score: '50%', ev: 'loginRateLimiter tracks mobile; missing on /send-otp routes', risk: 'HIGH', fix: 'Apply rate limiting to all OTP generation endpoints' },
  { id: '17', area: 'Account Lockout', status: 'PARTIAL', score: '50%', ev: '15-min in-memory lockout; resets on PM2 restart/cluster', risk: 'MED', fix: 'Store lockout state in Redis or database table' },
  { id: '18', area: 'API Security Architecture', status: 'RISK', score: '0%', ev: 'Unauthenticated broadcast alerts; 50MB JSON parser body limit', risk: 'CRIT', fix: 'Lock administrative routes; reduce JSON limit to 2MB' },
  { id: '19', area: 'File-Upload Security', status: 'PARTIAL', score: '50%', ev: 'Presigned S3 keys generated server-side; optionalJWT allows bypass', risk: 'HIGH', fix: 'Require verified JWT before presigned URL generation' },
  { id: '20', area: 'Malware / File Validation', status: 'RISK', score: '0%', ev: 'Checks MIME via client header; no magic byte signature check', risk: 'HIGH', fix: 'Implement file-type buffer check; add GuardDuty scanning' },
  { id: '21', area: 'Database Security', status: 'RISK', score: '0%', ev: 'ssl: { rejectUnauthorized: false } allows MITM on remote DB', risk: 'CRIT', fix: 'Enforce rejectUnauthorized:true with CA root bundle' },
  { id: '22', area: 'Database Least Privilege', status: 'MISSING', score: '0%', ev: 'Connects as superuser/owner; runs DDL migrations on startup', risk: 'HIGH', fix: 'Split roles: DDL migration role vs DML runtime user' },
  { id: '23', area: 'Secrets Management', status: 'MISSING', score: '0%', ev: 'Plain .env on EC2; default fallback secrets in source code', risk: 'HIGH', fix: 'Use AWS Secrets Manager or Systems Manager Parameter Store' },
  { id: '24', area: 'Env Variable Security', status: 'PARTIAL', score: '50%', ev: 'Object.freeze() in config; silent dangerous fallback defaults', risk: 'MED', fix: 'Fail startup immediately if critical secrets are unset' },
  { id: '25', area: 'AWS IAM Security', status: 'PARTIAL', score: '50%', ev: 'OIDC used in frontend CI; backend uses static access keys', risk: 'MED', fix: 'Attach IAM Instance Profile to EC2; remove static keys' },
  { id: '26', area: 'S3 Storage Security', status: 'RISK', score: '0%', ev: 'Direct public S3 URLs constructed for confidential medical PHI', risk: 'CRIT', fix: 'Block All Public Access; stream via presigned GET URLs' },
  { id: '27', area: 'Redis Security', status: 'MISSING', score: '0%', ev: 'No Redis deployed; application uses single-process volatile Maps', risk: 'MED', fix: 'Deploy AWS ElastiCache Redis with TLS and AUTH' },
  { id: '28', area: 'Encryption at Rest', status: 'PARTIAL', score: '50%', ev: 'Relies on cloud disk encryption; no field-level encryption for PHI', risk: 'HIGH', fix: 'Apply AES-256-GCM field encryption for Aadhaar & diagnosis' },
  { id: '29', area: 'Encryption in Transit', status: 'RISK', score: '0%', ev: 'Database TLS unverified; mobile allows HTTP; EC2 port 5000 HTTP', risk: 'CRIT', fix: 'Enforce TLS 1.3 across all network links and clients' },
  { id: '30', area: 'Application Logging', status: 'RISK', score: '0%', ev: 'console.log outputs plaintext OTPs and phone numbers to logs', risk: 'HIGH', fix: 'Sanitize loggers via Winston/Pino; mask sensitive PII' },
  { id: '31', area: 'Audit Logging', status: 'PARTIAL', score: '50%', ev: 'AuditLogModel has PII sanitizer; only used by archival job', risk: 'HIGH', fix: 'Log all authentication, role changes, and PHI access' },
  { id: '32', area: 'Error Handling', status: 'PARTIAL', score: '50%', ev: 'ApiError handler; leaks raw DB messages and dev stack traces', risk: 'MED', fix: 'Mask internal database error messages; suppress stack traces' },
  { id: '33', area: 'Dependency Security', status: 'PARTIAL', score: '50%', ev: 'Vulnerabilities in qs, body-parser, and mobile image-size', risk: 'HIGH', fix: 'Update npm dependencies to remediate active CVEs' },
  { id: '34', area: 'npm / Package Security', status: 'PARTIAL', score: '50%', ev: 'package-lock.json used; no automated vulnerability gate in CI', risk: 'LOW', fix: 'Add npm audit --audit-level=high step in GitHub Actions' },
  { id: '35', area: 'Git Secret Protection', status: 'RISK', score: '0%', ev: '.env files were previously committed in git history', risk: 'HIGH', fix: 'Scrub git history with git-filter-repo; rotate secrets' },
  { id: '36', area: 'Docker / Containers', status: 'MISSING', score: '0%', ev: 'No Dockerfiles; deployed directly via PM2 on host OS', risk: 'LOW', fix: 'Build non-root, minimal distroless container images' },
  { id: '37', area: 'CI/CD Pipeline Security', status: 'PARTIAL', score: '50%', ev: 'OIDC debugging dumps tokens; SSH pull without code signing', risk: 'MED', fix: 'Remove token claim dump; enforce signed commit builds' },
  { id: '38', area: 'Server / EC2 Security', status: 'RISK', score: '0%', ev: 'Node runs directly on host; no reverse proxy (Nginx) configured', risk: 'HIGH', fix: 'Deploy hardened Nginx reverse proxy; place EC2 in private VPC' },
  { id: '39', area: 'AWS WAF / DDoS Defense', status: 'MISSING', score: '0%', ev: 'No WAF rules, Shield, or CloudFront rate limiting configured', risk: 'HIGH', fix: 'Deploy AWS WAF with Core Rule Set ahead of the API' },
  { id: '40', area: 'Backup & Recovery', status: 'MISSING', score: '0%', ev: 'No automated database backup scripts or disaster recovery plan', risk: 'HIGH', fix: 'Configure PostgreSQL automated daily snapshots and PITR' },
  { id: '41', area: 'Monitoring & Alerting', status: 'MISSING', score: '0%', ev: 'Only basic health check; no APM (Sentry/CloudWatch Alarms)', risk: 'MED', fix: 'Integrate Sentry for error tracking and CloudWatch metrics' },
  { id: '42', area: 'Security Testing', status: 'PARTIAL', score: '50%', ev: 'Regression scripts present; no automated SAST/DAST in CI', risk: 'MED', fix: 'Integrate Semgrep SAST and TruffleHog secret scanning' },
  { id: '43', area: 'OWASP Top 10 (2021)', status: 'RISK', score: '0%', ev: 'Active failures across A01, A02, A03, A04, A05, A07, A09', risk: 'CRIT', fix: 'Execute remediation roadmap phases 1 through 4' },
  { id: '44', area: 'OWASP API Top 10 (2023)', status: 'RISK', score: '0%', ev: 'Active failures across API1, API2, API3, API4, API5', risk: 'CRIT', fix: 'Implement object authorization, rate limiting, and RBAC' },
];

controls.forEach((c, idx) => {
  const isEven = idx % 2 === 0;
  doc.rect(36, tableY, 523, 14.5).fill(isEven ? '#ffffff' : '#f8fafc');

  let statusBg = colors.greenLight;
  let statusColor = colors.greenDark;
  let statusText = 'PASS';
  if (c.status === 'PARTIAL') { statusBg = colors.amberLight; statusColor = colors.amberDark; statusText = 'PARTIAL'; }
  else if (c.status === 'RISK') { statusBg = colors.redLight; statusColor = colors.redDark; statusText = 'RISK'; }
  else if (c.status === 'MISSING') { statusBg = '#f1f5f9'; statusColor = colors.textMuted; statusText = 'MISSING'; }

  let riskColor = colors.greenDark;
  if (c.risk === 'CRIT') riskColor = colors.redDark;
  else if (c.risk === 'HIGH') riskColor = '#ea580c';
  else if (c.risk === 'MED') riskColor = colors.amberDark;

  doc.font('Helvetica').fontSize(6.5).fillColor(colors.textDark);
  doc.text(c.id, 40, tableY + 3.5, { width: 14 });
  doc.font('Helvetica-Bold').text(c.area, 56, tableY + 3.5, { width: 95 });

  doc.rect(153, tableY + 2, 42, 10.5).fillAndStroke(statusBg, statusColor);
  doc.font('Helvetica-Bold').fontSize(6).fillColor(statusColor).text(statusText, 153, tableY + 3.8, { width: 42, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(colors.textDark).text(c.score, 200, tableY + 3.5, { width: 26 });
  doc.font('Helvetica').fontSize(6).fillColor(colors.textDark).text(c.ev, 228, tableY + 3.5, { width: 185 });

  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(riskColor).text(c.risk, 415, tableY + 3.5, { width: 34 });
  doc.font('Helvetica').fontSize(5.8).fillColor(colors.textDark).text(c.fix, 451, tableY + 3.5, { width: 104 });

  tableY += 14.5;
});

doc.fillColor(colors.textMuted).font('Helvetica-Oblique').fontSize(7).text(
  'ArogyaMitra Production Security Audit Report | Page 2 of 5 | Full Framework Evaluation Table',
  36,
  790,
  { align: 'center', width: 523 }
);

// ========================================================
// PAGE 3: DEEP DIVE ON CRITICAL VULNERABILITIES
// ========================================================
doc.addPage();
drawHeader('AROGYAMITRA HEALTHCARE PLATFORM', 'Critical Vulnerability Deep Dive & Conceptual Exploit Analysis');

let cY = 78;

const criticalIssues = [
  {
    num: '1',
    title: 'Complete Authentication Bypass & Account Takeover (Leaked OTP)',
    severity: 'CRITICAL (CVSS 9.8) - CWE-287 / CWE-312',
    file: 'Backend/src/services/auth.service.js (lines 107-108, 186); citizen.service.js (line 313); arogyaSevak.service.js (line 144)',
    mechanics: 'The application implements OTP verification for login, first-time password setup, and password resets. However, the server includes the generated OTP directly in the JSON response body under data.otp. Furthermore, generated OTPs are logged in plaintext to stdout using console.log and logger.info.',
    scenario: '1. Attacker calls POST /api/v1/auth/send-otp with the mobile number of System Admin (9999999999).\n2. API returns HTTP 200 with {"message": "OTP sent successfully", "otp": "5831"}.\n3. Attacker submits the leaked OTP to /api/v1/auth/verify-otp, obtaining a valid session and bypassing 2FA.\n4. Attacker calls /set-password or /register-password to overwrite the password and permanently seize control.',
    remediation: 'Immediately remove the otp field from all controller return objects. Integrate an official carrier SMS gateway (AWS SNS / Twilio). Increase OTP length to 6 digits, hash stored OTPs, and purge all logging statements.',
  },
  {
    num: '2',
    title: 'Unrestricted Public Privilege Escalation to System Administrator',
    severity: 'CRITICAL (CVSS 9.8) - CWE-269 / CWE-284',
    file: 'Backend/src/routes/user.routes.js (line 11); Backend/src/validations/user.validation.js (lines 54-59)',
    mechanics: 'The route POST /api/users is mounted publicly without verifyJWT middleware. The input validation schema accepts a client-provided role parameter (ADMIN, CITIZEN, SEVAK) and directly writes it into public.users.',
    scenario: '1. An unauthenticated adversary sends a POST request to /api/v1/users.\n2. Body payload contains {"full_name": "Rogue Admin", "mobile": "9876500000", "password": "SecretPassword123!", "role": "ADMIN"}.\n3. The backend executes an INSERT into public.users with role = "ADMIN".\n4. Adversary logs into the Web Admin Portal, receiving full administrative authority over all hospital and patient records.',
    remediation: 'Attach verifyJWT and authorizeRoles("ADMIN") to user.routes.js. Enforce role assignment exclusively via private administrative channels; never trust client-supplied role values during public onboarding.',
  },
  {
    num: '3',
    title: 'Mass Protected Health Information (PHI) Exposure (BOLA / IDOR)',
    severity: 'CRITICAL (CVSS 9.3) - CWE-639 / CWE-200',
    file: 'Backend/src/routes/patient.routes.js (lines 12-25); Backend/src/controllers/patient.controller.js (lines 26-31)',
    mechanics: 'The route GET /api/patients/assigned is guarded only with optionalJWT. When called without an Authorization header, req.user is null, triggering a fallback branch that executes ApplicationModel.findAll({ limit: 50 }). Complete patient medical records are returned without verifying the caller.',
    scenario: '1. Any unauthenticated crawler makes a GET request to /api/v1/patients/assigned.\n2. Server responds with 50 patient records, exposing patient names, ages, phone numbers, attending hospitals, diagnoses, and medical condition notes.\n3. Similarly, /api/v1/applications/:id/documents allows unauthenticated retrieval of uploaded Aadhaar cards and clinical scans.',
    remediation: 'Enforce mandatory verifyJWT authentication across all /api/patients and /api/applications routes. Implement row-level access control: Citizens can only query records where citizen_user_id === req.user.id.',
  },
  {
    num: '4',
    title: 'Unauthenticated Public Broadcast of System-Wide Alerts',
    severity: 'CRITICAL (CVSS 8.6) - CWE-306 / CWE-285',
    file: 'Backend/src/routes/mobile.routes.js (line 56); Backend/src/controllers/notification.controller.js (lines 42-62)',
    mechanics: 'The mobile notification broadcast endpoint POST /api/mob/notifications/broadcast is guarded only by optionalAuth. If unauthenticated, req.user?.id resolves to undefined, but execution continues and writes an active broadcast notice to public.notifications.',
    scenario: '1. Remote attacker submits POST /api/mob/notifications/broadcast with title "Emergency Alert" and message containing a malicious phishing URL.\n2. The system publishes the notice to all citizens and Sevaks across web and mobile clients.',
    remediation: 'Require verifyJWT and authorizeRoles("ADMIN") on all notification dispatch routes.',
  },
];

criticalIssues.forEach((ci) => {
  doc.rect(36, cY, 523, 168).fillAndStroke('#ffffff', colors.redBorder);
  doc.rect(36, cY, 523, 22).fill(colors.redDark);
  doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9).text(`ISSUE ${ci.num}: ${ci.title}`, 44, cY + 6);
  doc.fillColor(colors.redDark).font('Helvetica-Bold').fontSize(7.5).text(`Severity: ${ci.severity}`, 44, cY + 27);
  doc.fillColor(colors.textMuted).font('Helvetica').fontSize(7).text(`Location: ${ci.file}`, 44, cY + 38);

  doc.fillColor(colors.navyDark).font('Helvetica-Bold').fontSize(7.5).text('Root Cause & Mechanics:', 44, cY + 50);
  doc.fillColor(colors.textDark).font('Helvetica').fontSize(7).text(ci.mechanics, 44, cY + 60, { width: 505 });

  doc.fillColor(colors.navyDark).font('Helvetica-Bold').fontSize(7.5).text('Conceptual Attack Scenario:', 44, cY + 84);
  doc.fillColor(colors.textDark).font('Helvetica').fontSize(7).text(ci.scenario, 44, cY + 94, { width: 505 });

  doc.fillColor(colors.greenDark).font('Helvetica-Bold').fontSize(7.5).text('Required Remediation:', 44, cY + 132);
  doc.fillColor(colors.textDark).font('Helvetica').fontSize(7).text(ci.remediation, 44, cY + 142, { width: 505 });

  cY += 176;
});

doc.fillColor(colors.textMuted).font('Helvetica-Oblique').fontSize(7).text(
  'ArogyaMitra Production Security Audit Report | Page 3 of 5 | Critical Vulnerability Analysis',
  36,
  790,
  { align: 'center', width: 523 }
);

// ========================================================
// PAGE 4: HIGH/MEDIUM RISKS & COMMON MISTAKES
// ========================================================
doc.addPage();
drawHeader('AROGYAMITRA HEALTHCARE PLATFORM', 'High & Medium Risks / Common Security Anti-Patterns Checklist');

let p4Y = 78;
p4Y = drawSectionHeading('HIGH & MEDIUM SECURITY RISKS REQUIRING ATTENTION', p4Y, '⚠️');

const otherRisks = [
  {
    title: 'Insecure CORS Permitting Arbitrary Vercel Deployments (HIGH)',
    loc: 'Backend/src/app.js (line 62)',
    desc: 'CORS origin check uses regex /^https:\\/\\/([a-zA-Z0-9_-]+\\.)*vercel\\.app$/ with credentials:true. Any attacker hosting an app on Vercel can make credentialed cross-origin calls to steal user sessions.',
    fix: 'Remove regex; whitelist exact approved production origins.',
  },
  {
    title: 'Stored DOM Cross-Site Scripting (XSS) in Report Printing (HIGH)',
    loc: 'WebFrontend/src/pages/admin/Reports/Reports.jsx (lines 747-759)',
    desc: 'Hospital names (${h.name}) are interpolated into raw HTML strings and written to a popup window via document.write(). Allows malicious hospital names to execute arbitrary script.',
    fix: 'Sanitize strings using DOMPurify before document.write; set Content Security Policy.',
  },
  {
    title: 'Cleartext Transmission of PHI on Android Mobile App (HIGH)',
    loc: 'Application/android/app/src/main/AndroidManifest.xml (line 17)',
    desc: 'android:usesCleartextTraffic="true" is configured. Mobile app transmits medical records and tokens over unencrypted HTTP, allowing interception on local hospital Wi-Fi networks.',
    fix: 'Set usesCleartextTraffic="false"; configure network_security_config.xml.',
  },
  {
    title: 'Direct Public URLs for Sensitive S3 Documents (HIGH)',
    loc: 'Backend/src/services/s3.service.js (lines 34, 118)',
    desc: 'Constructs public S3 URLs for identity documents, income certificates, and clinical records. Exposes records publicly if bucket permissions are misconfigured.',
    fix: 'Block All Public Access; stream documents exclusively via time-limited presigned GET URLs.',
  },
  {
    title: 'Sensitive Plaintext Credentials & OTPs Stored in Server Logs (HIGH)',
    loc: 'Backend/src/services/auth.service.js (lines 98, 176); citizen.service.js',
    desc: 'console.log and logger.info print active OTPs and phone numbers to server logs on every login request. Anyone with log access can hijack user sessions.',
    fix: 'Remove all credential logging; implement automated PII masking in Winston/Pino.',
  },
  {
    title: 'In-Memory State Breaking PM2 Cluster Mode & Scalability (MEDIUM)',
    loc: 'Backend/src/middlewares/rateLimiter.middleware.js; Backend/src/services/auth.service.js',
    desc: 'Rate limiting and OTP storage use in-memory Maps. Multi-core PM2 instances cannot share state, and server restarts completely wipe rate limit quotas and lockout states.',
    fix: 'Deploy Redis (AWS ElastiCache) with rate-limit-redis to centralize session state.',
  },
  {
    title: '50MB Request Body Limit Enabling Denial-of-Service (MEDIUM)',
    loc: 'Backend/src/app.js (lines 98-99)',
    desc: 'Express JSON parser allows 50MB bodies. Attackers can flood the API with large JSON objects, exhausting V8 heap memory and starving the Event Loop.',
    fix: 'Lower body limit to 2MB; handle document uploads via direct presigned S3 PUTs.',
  },
];

otherRisks.forEach((r) => {
  doc.rect(36, p4Y, 523, 46).fillAndStroke('#f8fafc', colors.lightBorder);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.navyDark).text(r.title, 44, p4Y + 5);
  doc.font('Helvetica').fontSize(6.5).fillColor(colors.textMuted).text(`File: ${r.loc}`, 44, p4Y + 16);
  doc.font('Helvetica').fontSize(7).fillColor(colors.textDark).text(r.desc, 44, p4Y + 25, { width: 505 });
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(colors.greenDark).text(`Fix: ${r.fix}`, 44, p4Y + 36);
  p4Y += 50;
});

// Common Mistakes Checklist Table
p4Y += 6;
p4Y = drawSectionHeading('COMMON SECURITY ANTI-PATTERNS CHECKLIST', p4Y, '🔍');

const checklist = [
  { item: 'Hardcoded Passwords', found: 'YES', detail: 'seedDefaultAdmin.js contains plaintext admin password' },
  { item: 'Hardcoded JWT Secret', found: 'YES', detail: 'environment.js has default fallback secret' },
  { item: 'Hardcoded DB Credentials', found: 'YES', detail: 'db.js falls back to postgres:postgres' },
  { item: 'Committed .env Files', found: 'YES', detail: 'Git history shows committed Application/.env and WebFrontend/.env' },
  { item: 'CORS Wildcard (*)', found: 'YES', detail: 'app.js defaults to wildcard * if env var unset' },
  { item: 'Raw SQL Injection', found: 'NO', detail: 'pg.Pool parameterized queries ($1, $2) used systematically' },
  { item: 'Weak Password Hashing', found: 'NO', detail: 'crypto.scrypt with 16-byte random salt used' },
  { item: 'JWT Expiration > 1 Hour', found: 'YES', detail: 'Default access token expiration is 1 day (1d)' },
  { item: 'Refresh Tokens Rotated', found: 'NO', detail: 'Same refresh token reused across sessions' },
  { item: 'IDOR / BOLA Checks', found: 'FAIL', detail: 'Missing on /api/patients and /api/applications/:id' },
  { item: 'Credentials in Logs', found: 'FAIL', detail: 'Plaintext OTPs logged via console.log and logger.info' },
  { item: 'Unrestricted Uploads', found: 'FAIL', detail: 'SVG allowed; MIME check relies on client headers' },
];

let clY = p4Y;
checklist.forEach((item, idx) => {
  const isLeft = idx % 2 === 0;
  const colX = isLeft ? 36 : 300;
  const curY = isLeft ? clY : clY;

  const isBad = item.found === 'YES' || item.found === 'FAIL';
  const tagBg = isBad ? colors.redLight : colors.greenLight;
  const tagColor = isBad ? colors.redDark : colors.greenDark;

  doc.rect(colX, curY, 259, 21).fillAndStroke('#ffffff', colors.lightBorder);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.navyDark).text(item.item, colX + 6, curY + 4);
  doc.rect(colX + 215, curY + 4, 38, 12).fillAndStroke(tagBg, tagColor);
  doc.font('Helvetica-Bold').fontSize(6).fillColor(tagColor).text(item.found, colX + 215, curY + 6.5, { width: 38, align: 'center' });
  doc.font('Helvetica').fontSize(6).fillColor(colors.textMuted).text(item.detail, colX + 6, curY + 13, { width: 205 });

  if (!isLeft) clY += 23;
});

doc.fillColor(colors.textMuted).font('Helvetica-Oblique').fontSize(7).text(
  'ArogyaMitra Production Security Audit Report | Page 4 of 5 | Risk Analysis & Anti-Patterns Checklist',
  36,
  790,
  { align: 'center', width: 523 }
);

// ========================================================
// PAGE 5: ARCHITECTURE REVIEW & ACTION ROADMAP
// ========================================================
doc.addPage();
drawHeader('AROGYAMITRA HEALTHCARE PLATFORM', 'Production Architecture Review & 5-Phase Hardening Roadmap');

let aY = 78;
aY = drawSectionHeading('ARCHITECTURE PRODUCTION-READINESS REVIEW', aY, '🏗️');

doc.rect(36, aY, 523, 108).fillAndStroke('#f8fafc', colors.lightBorder);
doc.font('Helvetica-Bold').fontSize(8.5).fillColor(colors.navyDark).text('Target Production Architecture Topology:', 46, aY + 8);
doc.font('Helvetica').fontSize(7.5).fillColor(colors.textDark).text(
  'Frontend (React / Mobile App)  -->  CDN (CloudFront)  -->  AWS WAF  -->  Application Load Balancer (TLS 1.3)  -->  Node.js API (EC2 Private VPC)  -->  Redis Cluster  -->  PostgreSQL (Supabase/RDS) & S3 (Private)',
  46,
  aY + 22,
  { width: 503 }
);

doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.redDark).text('Identified Missing Critical Architectural Layers:', 46, aY + 44);
const archGaps = [
  '1. Missing AWS WAF: No web application firewall inspecting traffic for SQLi, XSS, and rate flooding.',
  '2. Missing In-Transit TLS on Server: Node runs cleartext HTTP on port 5000 without an ALB/Nginx reverse proxy.',
  '3. Missing Distributed Cache (Redis): State is kept in single-process memory, breaking clustering and autoscaling.',
  '4. Missing Private S3 Architecture: PHI documents use public URLs instead of short-lived presigned GET URLs.',
  '5. Missing Network Isolation: EC2 and database are not isolated in private subnets behind a NAT gateway.',
];

let gapY = aY + 57;
archGaps.forEach((g) => {
  doc.font('Helvetica').fontSize(7).fillColor(colors.textDark).text(g, 46, gapY);
  gapY += 10;
});

aY += 118;
aY = drawSectionHeading('TOP 10 MANDATORY PRE-PRODUCTION FIXES (PRIORITIZED BY IMPACT)', aY, '🎯');

const top10 = [
  { n: '1', title: 'Remove OTP from API Responses', desc: 'Eliminate data.otp across all authentication endpoints; integrate real SMS gateway.' },
  { n: '2', title: 'Lock Down POST /api/users', desc: 'Require Admin authentication; strip client-supplied role parameters in public routes.' },
  { n: '3', title: 'Remediate Mass BOLA / IDOR', desc: 'Remove optionalJWT from /api/patients; enforce record ownership (citizen_user_id === user.id).' },
  { n: '4', title: 'Enforce Database TLS (rejectUnauthorized: true)', desc: 'Supply Root CA bundle to PostgreSQL pool; enable certificate chain verification.' },
  { n: '5', title: 'Protect Notification Broadcasting', desc: 'Require verifyJWT and authorizeRoles("ADMIN") on /api/mob/notifications/broadcast.' },
  { n: '6', title: 'Enforce 100% Private S3 Storage', desc: 'Block public bucket access; stream medical documents exclusively via presigned GET URLs.' },
  { n: '7', title: 'Tighten CORS Whitelist', desc: 'Remove *.vercel.app regex; allow only exact company-owned production FQDNs.' },
  { n: '8', title: 'Disable Cleartext Traffic on Android', desc: 'Set android:usesCleartextTraffic="false" in AndroidManifest.xml; mandate HTTPS.' },
  { n: '9', title: 'Purge Plaintext Credentials from Logs', desc: 'Remove console.log/logger.info calls printing OTPs, passwords, and user tokens.' },
  { n: '10', title: 'Sanitize HTML in Report Printing (XSS)', desc: 'Sanitize hospital names in Reports.jsx using DOMPurify before document.write.' },
];

top10.forEach((t) => {
  doc.rect(36, aY, 523, 21).fillAndStroke('#ffffff', colors.lightBorder);
  doc.rect(36, aY, 18, 21).fill(colors.navyDark);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.white).text(t.n, 36, aY + 5.5, { width: 18, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.navyDark).text(t.title, 60, aY + 4);
  doc.font('Helvetica').fontSize(6.5).fillColor(colors.textMuted).text(t.desc, 60, aY + 12);
  aY += 23;
});

aY += 6;
aY = drawSectionHeading('RECOMMENDED 5-PHASE IMPLEMENTATION ROADMAP', aY, '🗓️');

const phases = [
  { p: 'Phase 1: Critical (Days 1–3)', desc: 'Strip leaked OTPs; lock POST /api/users; enforce BOLA ownership on /patients; secure broadcast alerts.' },
  { p: 'Phase 2: High (Days 4–7)', desc: 'Enforce DB TLS; disable Android cleartext; tighten CORS; privatize S3; sanitize HTML in Reports.jsx.' },
  { p: 'Phase 3: Medium (Days 8–14)', desc: 'Deploy Redis cluster; integrate rate-limit-redis; implement file-type magic byte check; lower body limits to 2MB.' },
  { p: 'Phase 4: Hardening (Days 15–21)', desc: 'Migrate to HttpOnly cookies; implement refresh token rotation; expand AuditLogModel to all PHI access.' },
  { p: 'Phase 5: Cloud Infra (Days 22–30)', desc: 'Deploy AWS WAF; terminate TLS on ALB; use IAM instance profiles; add Sentry and CloudWatch alarms.' },
];

phases.forEach((ph) => {
  doc.rect(36, aY, 523, 20).fillAndStroke('#f8fafc', colors.border);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.navyDark).text(ph.p, 44, aY + 5);
  doc.font('Helvetica').fontSize(6.5).fillColor(colors.textDark).text(ph.desc, 180, aY + 5, { width: 370 });
  aY += 22;
});

// Final Legal & Testing Disclaimer Box
aY += 6;
doc.rect(36, aY, 523, 34).fillAndStroke('#fffbeb', colors.amberBorder);
doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.amberDark).text('FORMAL SECURITY AUDIT CONCLUSION & COMPLIANCE DISCLAIMER', 44, aY + 5);
doc.font('Helvetica').fontSize(6.5).fillColor(colors.textDark).text(
  'Your current codebase is approximately 23% security-ready based on the inspected controls. This static source-code audit evaluated code and configuration integrity. Prior to processing live citizen protected health information (PHI) in production, dynamic application security testing (DAST), third-party penetration testing, and cloud infrastructure compliance audits are strictly required.',
  44,
  aY + 15,
  { width: 505 }
);

doc.fillColor(colors.textMuted).font('Helvetica-Oblique').fontSize(7).text(
  'ArogyaMitra Production Security Audit Report | Page 5 of 5 | Architecture Review & Roadmap',
  36,
  790,
  { align: 'center', width: 523 }
);

doc.end();

writeStream.on('finish', () => {
  console.log(`✅ Security Audit Report PDF generated successfully: ${outputPath}`);
  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
});
