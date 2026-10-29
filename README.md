# 🏥 ArogyaMitra (आरोग्यमित्र)
### *Next-Generation Healthcare Scheme Assistance, Hospital Bed Coordination & Field Operations Ecosystem*

<p align="center">
  <img src="./arogyamitra_app_icon_concept_1789554173610.jpg" alt="ArogyaMitra Logo" width="130" style="border-radius: 24px;" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Mobile-React%20Native%200.78-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Web-React%2019%20%2B%20Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite React" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Cloud-Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary" />
  <img src="https://img.shields.io/badge/Language-TypeScript%20%7C%20JavaScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

---

## 📌 Table of Contents
- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Modules & Feature Matrix](#-key-modules--feature-matrix)
  - [1. Mobile Citizen Application](#1-mobile-citizen-application)
  - [2. Mobile Arogya Sevak Application](#2-mobile-arogya-sevak-application)
  - [3. Web Arogya Sevak Portal](#3-web-arogya-sevak-portal)
  - [4. Web Administration Portal](#4-web-administration-portal)
- [Supported Healthcare Schemes](#-supported-healthcare-schemes)
- [Project Structure](#-project-structure)
- [Prerequisites & Tech Stack](#-prerequisites--tech-stack)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Environment Configuration](#-environment-configuration)
- [API Documentation Overview](#-api-documentation-overview)
- [Offline Resilience & Data Model](#-offline-resilience--data-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**ArogyaMitra (आरोग्यमित्र)** is an enterprise-grade digital healthcare coordination ecosystem developed to eliminate administrative friction in government healthcare scheme delivery across Maharashtra and India. 

The platform bridges the critical gap between:
1. **Citizens (Beneficiaries)** requiring financial healthcare support under flagship government schemes like **Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)** and **Ayushman Bharat PM-JAY**.
2. **Arogya Sevaks (Hospital Field Coordinators)** working inside government, municipal, and empaneled private hospitals to manage patient bed allocations, treatment milestones, OPD/IPD visits, and document clearances.
3. **Hospital Administrators & Medical Staff** providing real-time ICU/General bed availability, ventilator rosters, and duty doctor registers.
4. **State & District Health Officials (Admins)** reviewing applications, sanctioning treatment package pre-authorizations, assigning field coordinators, and broadcasting critical public health updates.

---

## 📐 System Architecture

```
                                 ┌─────────────────────────────────────────┐
                                 │       Cloud Infrastructure Layer        │
                                 │   PostgreSQL DB  •  Cloudinary Storage  │
                                 └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                                 ┌─────────────────────────────────────────┐
                                 │     ArogyaMitra Express REST API        │
                                 │  JWT Auth (RBAC) • Rate Limiter • Cron  │
                                 └───────▲─────────────────▲───────────────┘
                                         │                 │
                ┌────────────────────────┴──────┐   ┌──────┴────────────────────────┐
                ▼                               │   │                               ▼
┌─────────────────────────────────┐             │   │             ┌──────────────────────────────────┐
│   Mobile Application (RN/TS)    │             │   │             │   Web Application (React/Vite)   │
│ ─────────────────────────────── │             │   │             │ ──────────────────────────────── │
│ • Citizen App (Apply, Track)    │─────────────┘   └─────────────│ • Admin Portal (Review, Sanction)│
│ • Arogya Sevak (Offline Cache)  │                               │ • Web Sevak Portal (Wards, OPD)  │
└─────────────────────────────────┘                               └──────────────────────────────────┘
```

---

## 🚀 Key Modules & Feature Matrix

### 1. Mobile Citizen Application
* **OTP Authentication**: 6-digit SMS OTP login with instant ABHA and demographic verification.
* **Citizen Registration**: Multi-lingual onboarding with Marathi (`मराठी`) and English localization.
* **5-Step Scheme Application Wizard**:
  - Step 1: Patient Identity & Relation (Self, Spouse, Parent, Child).
  - Step 2: Empaneled Hospital & District Selection.
  - Step 3: Government Scheme Selection with automatic coverage caps.
  - Step 4: Medical Condition & Clinical Notes.
  - Step 5: Document Uploads with in-app camera capture and Cloudinary media processing.
* **Live SLA & Stage Tracking**: Visual stepper tracking application review (*Submitted → Under Review → Pre-Auth Approved → Under Treatment → Discharged / Completed*).
* **Live Hospital & Bed Finder**: Real-time district-wise directory showing General and ICU bed counts.
* **Smart Notifications**: Push and in-app alerts on status updates, SLA reminders, and document re-upload requests.

### 2. Mobile Arogya Sevak Application
* **Role-Based Sevak Workspace**: Auto-configured dashboard linked to the Sevak's assigned hospital and ward.
* **Allocated Cases Pipeline**: Active vs. Discharged patient filtering, priority badges (`CRITICAL`, `URGENT`, `HIGH`), and medical condition notes.
* **Patient Case Details & Vitals**: Complete case profile with scheme pre-auth indicators and clinical condition updates.
* **Document Records & High-Clarity Preview**: View applicant-submitted documents (PDFs and images) with direct 1-tap browser/system viewer.
* **Daily Shift Bed & Critical Resource Handover**: Submit Morning & Evening bed reports (ICU, General, Oxygen beds, Ventilators, Operation Theatres, Dialysis units) syncing with hospital counters.
* **Doctor On-Duty Directory**: Real-time roster with 1-click availability toggles (*Available, In Surgery, On Leave*).
* **OPD & IPD Ward Logging**: Log outpatient consultations and inpatient surgical timelines.
* **District Admin Escalation**: 1-tap urgent escalation modal for hospital bill ceiling overrun or emergency specialty transfers.
* **Offline-First Resilience**: Full `AsyncStorage` caching fallback for uninterrupted operation in low-network hospital wards.

### 3. Web Arogya Sevak Portal
* **Hospital Dashboard**: Live overview of assigned patients, critical alerts, and department occupancy.
* **Case Management**: Complete clinical stage management and remark logging.
* **Document Verification Hub**: Inspect uploaded medical reports, ration cards, and photo IDs.
* **Resource Reporting**: Real-time bed and equipment capacity broadcasting.

### 4. Web Administration Portal
* **Application Queue**: Multi-status filtering pipeline (*Submitted, Under Review, Docs Required, Approved, Closed*).
* **Pre-Authorization Workflow**: Verify eligibility criteria, check family income, and sanction scheme packages.
* **Arogya Sevak & Ward Allocation**: Assign field coordinators to specific hospital wards.
* **Hospital Empanelment**: Manage empaneled hospital registry with CSV bulk import.
* **Broadcast Push Notifications**: Send targeted health alerts and scheme notifications by district/ward.
* **Automated Audit & Archival**: Compliance ledger with automated 180-day data archival cron jobs.

---

## 💳 Supported Healthcare Schemes

| Scheme Name | Code | Max Coverage | Target Beneficiaries |
|---|---|---|---|
| **Mahatma Jyotirao Phule Jan Arogya Yojana** | `MJPJAY` | **₹5,00,000 / Year** | Families holding Yellow/Orange Ration Cards, Annapurna Cardholders in Maharashtra |
| **Ayushman Bharat - PM Jan Arogya Yojana** | `PM-JAY` | **₹5,00,000 / Family** | Deprived rural and urban occupational criteria under SECC 2011 |
| **Rashtriya Swasthya Bima Yojana** | `RSBY` | **₹30,000 - ₹1,50,000** | Below Poverty Line (BPL) workers in unorganized sectors |
| **Employees' State Insurance Scheme** | `ESIC` | **Full Medical Cover** | Insured formal workers and dependent family members |

---

## 📂 Project Structure

```bash
ArogyaMitra/
├── Application/                 # 📱 React Native Mobile App (Citizen + Arogya Sevak)
│   ├── android/                 # Native Android Gradle configuration & Keystores
│   ├── ios/                     # iOS workspace & Podfile
│   ├── src/
│   │   ├── api/                 # Core HTTP client with JWT interceptor (client.ts, authApi.ts)
│   │   ├── arogya-sevak/        # Arogya Sevak screens, services, types & navigation
│   │   │   ├── components/      # Case escalation modals, upload sheets
│   │   │   ├── screens/         # Dashboard, Allocated Patients, Docs, OPD, IPD, Profile
│   │   │   ├── services/        # sevakHospitalService, sevakDailyUpdateService, sevakDoctorService
│   │   │   └── types/           # TypeScript data contracts & enums
│   │   ├── citizen/             # Citizen screens, stores, types & navigation
│   │   │   ├── screens/         # Home, New Application (5 steps), Tracking, Hospital Finder
│   │   │   └── services/        # applicationStore, alertsStore, citizenApi
│   │   └── shared/              # Shared theme, i18n context (Marathi/English), hooks, components
│   ├── package.json
│   └── tsconfig.json
│
├── Backend/                     # ⚙️ Node.js + Express REST API Server
│   ├── src/
│   │   ├── config/              # PostgreSQL Pool, Cloudinary & App configuration
│   │   ├── constants/           # HTTP status codes, Scheme codes, Roles
│   │   ├── controllers/         # ArogyaSevak, Admin, Application, Hospital, Doctor, DailyUpdate
│   │   ├── middlewares/         # verifyJWT, authorizeRoles, rateLimiter, errorHandler
│   │   ├── models/              # Data Access Objects (DAO) with parameterized SQL queries
│   │   ├── routes/              # Express API Route definitions
│   │   ├── scripts/             # Database initialization, index setup, seeders, PDF generator
│   │   ├── services/            # Business logic layers (application, hospital, admin, archival)
│   │   └── validations/         # Zod payload validation schemas
│   ├── package.json
│   └── .env.example
│
├── WebFrontend/                 # 💻 Web Applications (Admin Portal & Web Sevak Portal)
│   ├── src/
│   │   ├── assets/              # Logos, branding graphics
│   │   ├── components/          # Reusable UI widgets, Modals, Navbar, Sidebar
│   │   ├── context/             # AuthContext, NotificationContext
│   │   ├── pages/
│   │   │   ├── admin/           # Admin Dashboard, Queue, Review, Hospitals, Sevaks, Schemes
│   │   │   └── sevak/           # Sevak Dashboard, Patients, Documents, Daily Updates, Doctors
│   │   ├── services/            # patientService, hospitalService, dailyUpdateService, api
│   │   └── styles/              # Design system tokens and styles
│   ├── package.json
│   └── vite.config.js
│
└── README.md                    # Project Documentation
```

---

## 🛠️ Prerequisites & Tech Stack

### Technology Stack
- **Mobile Frontend**: React Native `0.78+`, TypeScript, React Navigation, Safe Area Context, Vector Icons.
- **Web Frontend**: React `19`, Vite `6`, React Router DOM `7`, Lucide Icons.
- **Backend API**: Node.js `v18+` / `v20+`, Express `4.21`, PostgreSQL (`pg`), Cloudinary SDK, Zod, JWT (`jsonwebtoken`), PDFKit, Node-Cron.
- **Mobile Build Tools**: Android Studio, JDK 17, Android SDK Platform 34/35.

---

## ⚡ Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YourOrganization/ArogyaMitra.git
cd ArogyaMitra
```

---

### 2. Backend Engine Setup
```bash
cd Backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL database URL and Cloudinary credentials

# Run database setup scripts
npm run db:setup-all-tables
npm run db:optimize-indexes
npm run seed:admin

# Start backend server in development mode
npm run dev
# Server starts on http://localhost:5000
```

---

### 3. Web Frontend Setup
```bash
cd ../WebFrontend
npm install

# Start Vite dev server
npm run dev
# Web application starts on http://localhost:5173
```

---

### 4. Mobile Application Setup
```bash
cd ../Application
npm install

# Start React Native Metro Bundler
npx react-native start

# In a separate terminal, launch on connected Android device/emulator:
npx react-native run-android
```

---

## 🔑 Environment Configuration

Create a `.env` file in the `Backend/` directory with the following variables:

```env
# Application Server Config
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL Database Connection
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/arogyamitra_db
DB_SSL=false

# JSON Web Token (JWT) Secrets
JWT_SECRET=your_super_secret_jwt_access_key_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_here
REFRESH_TOKEN_EXPIRES_IN=30d

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

---

## 📡 API Documentation Overview

### Core REST Endpoints

| Method | Endpoint | Description | Role / Access |
|---|---|---|---|
| `POST` | `/api/mob/send-otp` | Send 6-digit login OTP to Citizen | Public |
| `POST` | `/api/mob/verify-otp` | Verify OTP & return JWT Auth Token | Public |
| `POST` | `/api/arogya-sevaks/auth/send-otp` | Arogya Sevak authentication initiation | Public |
| `POST` | `/api/arogya-sevaks/auth/verify-otp` | Arogya Sevak 6-digit OTP verification | Public |
| `GET` | `/api/arogya-sevaks/me` | Retrieve authenticated Sevak profile | `AROGYA_SEVAK` |
| `GET` | `/api/arogya-sevaks/assigned-hospital/details` | Live bed availability & hospital facilities | `AROGYA_SEVAK`, `ADMIN` |
| `GET` | `/api/applications/sevak/assigned` | List cases assigned to Arogya Sevak | `AROGYA_SEVAK` |
| `GET` | `/api/applications/track/:id` | Real-time stage tracking of an application | `CITIZEN`, `SEVAK`, `ADMIN` |
| `GET` | `/api/applications/:id/documents` | Retrieve all documents from `application_documents` | Authenticated |
| `POST` | `/api/applications/:id/escalate` | Urgent escalation to District Admin | `AROGYA_SEVAK` |
| `GET` | `/api/daily-updates` | Shift bed counts & critical resource history | `AROGYA_SEVAK`, `ADMIN` |
| `POST` | `/api/daily-updates` | Submit Morning / Evening bed shift report | `AROGYA_SEVAK` |
| `GET` | `/api/doctors` | List hospital doctor duty roster | Authenticated |
| `POST` | `/api/doctors` | Add new doctor to duty roster | `AROGYA_SEVAK`, `ADMIN` |
| `PATCH` | `/api/doctors/:id/availability` | 1-click update of doctor availability | `AROGYA_SEVAK`, `ADMIN` |
| `GET` | `/api/admins/applications` | Master queue for Admin review | `ADMIN` |
| `PATCH` | `/api/admins/applications/:id/status` | Sanction/Approve/Reject scheme application | `ADMIN` |
| `POST` | `/api/admins/notifications/send` | Broadcast SMS/Push notification alerts | `ADMIN` |
| `POST` | `/api/cloudinary/upload` | Upload medical document or photo | Authenticated |

---

## 🔒 Offline Resilience & Data Model

The mobile application is engineered with an **offline-first local caching architecture** using `@react-native-async-storage/async-storage`:
* When field coordinators or citizens lose connectivity inside hospital basement wards or remote talukas, cached data is instantly served from local storage (`@arogyamitra_sevak_allocated_cases`, `@arogyamitra_sevak_hospital_profile`, `@arogyamitra_sevak_daily_updates`).
* Form inputs and document attachments are auto-saved to persistent draft storage so progress is never lost during sudden network drops.
* All backend data queries feature fallback error handling and optimistic local state updates.

---

## 👥 Contributing

We welcome contributions from the community to improve public healthcare access!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "feat: Add hospital bed live filter"`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<p align="center">
  <b>Built with ❤️ for Public Healthcare Empowerment</b><br>
  <i>ArogyaMitra — Empowering Citizens, Supporting Sevaks, Connecting Hospitals.</i>
</p>
