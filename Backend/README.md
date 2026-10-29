# WardArogya Backend

A production-ready, scalable, and secure REST API backend built with **Node.js**, **Express**, and modern **ES Modules**.

---

## 🏛️ Architecture Overview

This project follows an industry-standard **3-Tier Layered Architecture (Separation of Concerns)**:

```
[ Client / Frontend ]
          │
          ▼
    [ app.js ]  ──► (Helmet, CORS, Morgan, Body Parser)
          │
          ▼
    [ routes/ ]  ──► (Endpoints definition & middleware attachment)
          │
          ▼
 [ validate.middleware ] ──► (Zod schema validation)
          │
          ▼
  [ controllers/ ]  ──► (HTTP req/res orchestration, status codes)
          │
          ▼
   [ services/ ]  ──► (Pure Business Logic, calculations, isolation)
          │
          ▼
    [ models/ ]  ──► (Database schemas & queries: Mongoose/Prisma)
          │
          ▼
    [ Database ]
```

### Why this architecture?
1. **Decoupled HTTP & Business Logic**: `controllers/` only handle HTTP inputs/responses. `services/` contain pure business rules and can be reused or unit-tested independently without mocking Express.
2. **Predictable Responses**: All API responses conform to the standard `ApiResponse` format:
   ```json
   {
     "success": true,
     "statusCode": 200,
     "message": "User registered successfully",
     "data": { ... }
   }
   ```
3. **Centralized Error Handling**: Errors thrown using `new ApiError(statusCode, message)` anywhere in services or controllers are intercepted by `error.middleware.js` and formatted into a uniform JSON response:
   ```json
   {
     "success": false,
     "statusCode": 400,
     "message": "Validation failed",
     "errors": [
       { "field": "email", "message": "Please provide a valid email address" }
     ]
   }
   ```
4. **No Try/Catch Boilerplate**: The `asyncHandler` wrapper catches promise rejections automatically and forwards them to the global error middleware.

---

## 📁 Directory Structure

```text
WardArogya_backend/
├── src/
│   ├── config/                  # Configuration modules
│   │   ├── db.js                # Database connection lifecycle
│   │   └── environment.js       # Validated environment variables (dotenv)
│   │
│   ├── constants/               # Global constants & enums
│   │   └── index.js             # HTTP status codes, user roles, environments
│   │
│   ├── controllers/             # Request & Response orchestrators
│   │   ├── auth.controller.js   # Auth endpoints handler
│   │   └── health.controller.js # Health check handler
│   │
│   ├── middlewares/             # Express middlewares
│   │   ├── auth.middleware.js   # JWT authentication & role-based access control (RBAC)
│   │   ├── error.middleware.js  # 404 handler & centralized error handler
│   │   ├── rateLimiter.middleware.js # DoS & brute-force rate limiter
│   │   └── validate.middleware.js # Zod request validation runner
│   │
│   ├── models/                  # Database models & schemas
│   │   └── user.model.js        # User model definition
│   │
│   ├── routes/                  # Express route routers
│   │   ├── index.js             # Main API v1 router registry
│   │   ├── auth.routes.js       # Auth routes (/api/v1/auth)
│   │   └── health.routes.js     # Health check route (/api/v1/health)
│   │
│   ├── services/                # Pure Business Logic Layer
│   │   └── auth.service.js      # Auth business logic (registration, password hashing)
│   │
│   ├── utils/                   # Shared utility classes and helpers
│   │   ├── ApiError.js          # Standard error class
│   │   ├── ApiResponse.js        # Standard response class
│   │   ├── asyncHandler.js      # Async handler wrapper (eliminates try/catch)
│   │   └── logger.js            # Structured, colorized console logger
│   │
│   ├── validations/             # Input validation schemas (Zod)
│   │   └── auth.validation.js   # Zod schemas for register and login
│   │
│   ├── app.js                   # Express application setup & middleware pipeline
│   └── server.js                # Server entry point, DB bootstrap & graceful shutdown
│
├── .env                         # Local environment variables (git-ignored)
├── .env.example                 # Example environment template
├── .gitignore                   # Files and directories ignored by Git
├── package.json                 # Project dependencies and npm scripts
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18.x (tested on v24.x)
- **npm** >= 9.x

### 2. Installation
```bash
# Navigate to backend directory
cd WardArogya_backend

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure the port and database connection strings match your local or cloud setup.

### 4. Running the Server
```bash
# Development mode (with live reload via nodemon)
npm run dev

# Production mode
npm start
```

---

## 🛣️ Built-in API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root API welcome endpoint | No |
| `GET` | `/api/v1/health` | System health, uptime & memory status | No |
| `POST` | `/api/v1/auth/register` | Register new user with Zod validation | No |
| `POST` | `/api/v1/auth/login` | Login user & issue JWT | No |

---

## 🛠️ Step-by-Step: Adding a New Feature (e.g., `Patient`)

Follow these 5 steps to add any new feature cleanly:

### Step 1: Create Validation Schema (`src/validations/patient.validation.js`)
```javascript
import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    age: z.number().int().positive(),
    wardNumber: z.number().int(),
    bloodGroup: z.string().optional(),
  }),
});
```

### Step 2: Create Business Service (`src/services/patient.service.js`)
```javascript
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

class PatientService {
  async createPatient(data) {
    // Database query logic here
    return { id: 'pt_1', ...data };
  }
}

export const patientService = new PatientService();
```

### Step 3: Create Controller (`src/controllers/patient.controller.js`)
```javascript
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { patientService } from '../services/patient.service.js';

export const createPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, patient, 'Patient profile created')
  );
});
```

### Step 4: Create Route (`src/routes/patient.routes.js`)
```javascript
import { Router } from 'express';
import { createPatient } from '../controllers/patient.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createPatientSchema } from '../validations/patient.validation.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyJWT, authorizeRoles('DOCTOR', 'WARD_ADMIN'), validate(createPatientSchema), createPatient);

export default router;
```

### Step 5: Mount in API Gateway (`src/routes/index.js`)
```javascript
import patientRoutes from './patient.routes.js';

router.use('/patients', patientRoutes);
```

---

## 🔒 Security Best Practices Implemented
- **Helmet**: Sets secure HTTP response headers (XSS filter, anti-clickjacking, CSP).
- **CORS**: Whitelists authorized frontend client origins.
- **Rate Limiting**: Defends against brute-force and DDoS attempts.
- **Request Size Limiting**: `16kb` limit on JSON and URL-encoded bodies protects against denial-of-service through memory exhaustion.
- **Graceful Shutdown**: Catches `SIGTERM`/`SIGINT` signals to finish pending requests and close connections safely.

---

## ⚡ Database Indexing & Query Performance

The ArogyaMitra backend includes a comprehensive set of 25 performance B-Tree indexes designed to keep operator/admin dashboards, mobile field assignments, and reporting queues running with sub-millisecond execution times.

### Quick Commands

```bash
# Apply / verify all 25 performance indexes across any environment (Dev, Test, UAT, Prod)
npm run db:optimize-indexes

# Run EXPLAIN ANALYZE benchmark verification on all 8 core dashboard query paths
npm run test:indexes
```

### Official Index Tracking Registry
For the full index breakdown (table names, column sets, rationale, query plans, and guidelines for adding future indexes), refer to:
👉 **[`docs/DATABASE_INDEXES.md`](docs/DATABASE_INDEXES.md)**

---

## 👥 Citizen Referrals & Growth Tracking

Tracks how many people have referred the ArogyaMitra application. 
**Note:** Referral attribution is **strictly tracked on first-time citizen registration** (when a citizen signs up using another user's referral code). It is intentionally excluded from scheme application submissions.

### Referral API Endpoints

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/referrals/validate/:code` | Public | Validates a referral code during citizen onboarding before submission. |
| `GET` | `/api/referrals/leaderboard` | Public | Ranked leaderboard of top community referrers by citizen count. |
| `GET` | `/api/referrals/my-code` | Authenticated | Retrieves current user's unique referral code (`AM-XXXXXX`) and share text. |
| `GET` | `/api/referrals/my-stats` | Authenticated | Detailed referral statistics (total count, registered count, referred citizens list). |
| `GET` | `/api/referrals/admin/overview` | Admin | System-wide referral growth metrics (total referrals, distinct referrers, trends). |

### Test & Migration Commands

```bash
# Run the referrals table migration
npm run db:referrals

# Run the comprehensive referral acceptance test suite
npm run test:referrals
```


