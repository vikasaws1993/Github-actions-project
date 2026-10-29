# ArogyaMitra API Documentation

**Base URL:** `/api`

---

## API Summary

| # | API | Method | Endpoint | Auth |
|:---:|---|:---:|---|---|
| **Health** |
| 1 | Health Check | `GET` | `/api/health` | No |
| **Authentication** |
| 2 | Initiate Auth (Role & Password Check) | `POST` | `/api/auth/initiate` | No |
| 3 | Verify OTP | `POST` | `/api/auth/verify-otp` | No |
| 4 | Set First-Time Password | `POST` | `/api/auth/set-password` | No (OTP Verified) |
| 5 | Send / Resend OTP | `POST` | `/api/auth/send-otp` | No |
| 6 | User Login | `POST` | `/api/auth/login` | No |
| **Users** |
| 7 | Create User | `POST` | `/api/users` | No |
| 8 | Get User by Mobile | `GET` | `/api/users/mobile/:mobile` | No |
| 9 | Get User by ID | `GET` | `/api/users/:id` | No |
| **Citizens** |
| 10 | Create Citizen Profile | `POST` | `/api/citizens` | No |
| 11 | Get Citizen by User ID | `GET` | `/api/citizens/user/:userId` | No |
| 12 | Get Citizen by Profile ID | `GET` | `/api/citizens/:id` | No |
| **Arogya Sevaks** |
| 13 | Create Arogya Sevak | `POST` | `/api/arogya-sevaks` | Required — ADMIN |
| 14 | Get Sevak by User ID | `GET` | `/api/arogya-sevaks/user/:userId` | Required — ADMIN, SEVAK |
| 15 | Get Sevak by Employee Code | `GET` | `/api/arogya-sevaks/code/:code` | Required — ADMIN, SEVAK |
| 16 | Get Sevak by ID | `GET` | `/api/arogya-sevaks/:id` | Required — ADMIN, SEVAK |
| **Admins** |
| 17 | Create Admin Account | `POST` | `/api/admins` | Required — ADMIN |
| 18 | List All Admins | `GET` | `/api/admins` | Required — ADMIN |
| 19 | Get My Profile | `GET` | `/api/admins/me` | Required — ADMIN |
| 20 | Add Arogya Sevak | `POST` | `/api/admins/arogya-sevaks` | Required — ADMIN |
| 21 | List All Arogya Sevaks | `GET` | `/api/admins/arogya-sevaks` | Required — ADMIN |
| 22 | Assign Sevak to Hospitals | `POST` | `/api/admins/arogya-sevaks/assign-hospitals` | Required — ADMIN |
| 23 | Assign Hospitals by URL ID | `POST` | `/api/admins/arogya-sevaks/:id/assign-hospitals` | Required — ADMIN |
| 24 | Get Sevak Assigned Hospitals | `GET` | `/api/admins/arogya-sevaks/:id/hospitals` | Required — ADMIN |
| 25 | Assign Sevak to Hospital (Legacy) | `POST` | `/api/admins/arogya-sevaks/assign-hospital` | Required — ADMIN |
| 26 | Unassign Sevak from Hospital | `POST` | `/api/admins/arogya-sevaks/:id/unassign` | Required — ADMIN |
| 27 | Get Sevak Details by ID | `GET` | `/api/admins/arogya-sevaks/:id` | Required — ADMIN |
| 28 | Admin: Create Hospital | `POST` | `/api/admins/hospitals` | Required — ADMIN |
| 29 | Admin: List All Hospitals | `GET` | `/api/admins/hospitals` | Required — ADMIN |
| 30 | Admin: Get Hospital by ID | `GET` | `/api/admins/hospitals/:id` | Required — ADMIN |
| 31 | Admin: Update Hospital | `PUT` | `/api/admins/hospitals/:id` | Required — ADMIN |
| 32 | Admin: Delete Hospital | `DELETE` | `/api/admins/hospitals/:id` | Required — ADMIN |
| 33 | Assign Sevaks to Hospital | `POST` | `/api/admins/hospitals/:id/assign-sevaks` | Required — ADMIN |
| 34 | Get Admin by User ID | `GET` | `/api/admins/user/:userId` | Required — ADMIN |
| 35 | Get Admin by Profile ID | `GET` | `/api/admins/:id` | Required — ADMIN |
| **Facilities (Hospitals)** |
| 36 | Create Hospital | `POST` | `/api/hospitals` | Required — ADMIN |
| 37 | List All Hospitals | `GET` | `/api/hospitals` | Required — Authenticated |
| 38 | Get Hospital by Code | `GET` | `/api/hospitals/code/:code` | Required — Authenticated |
| 39 | Get Assigned Sevaks for Hospital | `GET` | `/api/hospitals/:hospitalId/sevaks` | Required — Authenticated |
| 40 | Get Hospital by ID | `GET` | `/api/hospitals/:id` | Required — Authenticated |
| 41 | Update Hospital | `PUT` | `/api/hospitals/:id` | Required — ADMIN |
| 42 | Delete Hospital | `DELETE` | `/api/hospitals/:id` | Required — ADMIN |
| **Cloudinary** |
| 43 | Upload Image | `POST` | `/api/cloudinary/upload` | Required — Authenticated |
| 44 | Delete Asset | `DELETE` | `/api/cloudinary` | Required — Authenticated |
| **Admin Healthcare Schemes** |
| 45 | Scheme High-Level Stats | `GET` | `/api/admins/schemes/stats` | Required — ADMIN |
| 46 | List Schemes (Filtered / Paginated) | `GET` | `/api/admins/schemes` | Required — ADMIN |
| 47 | Get Scheme Details | `GET` | `/api/admins/schemes/:id` | Required — ADMIN |
| 48 | Register New Scheme | `POST` | `/api/admins/schemes` | Required — ADMIN |
| 49 | Update Scheme Details | `PUT` | `/api/admins/schemes/:id` | Required — ADMIN |
| 50 | Toggle Scheme Status | `PATCH` | `/api/admins/schemes/:id/status` | Required — ADMIN |
| 51 | Delete Scheme | `DELETE` | `/api/admins/schemes/:id` | Required — ADMIN |
| 52 | List Empanelled Hospitals | `GET` | `/api/admins/schemes/:id/hospitals` | Required — ADMIN |
| 53 | Empanel Hospital(s) | `POST` | `/api/admins/schemes/:id/hospitals` | Required — ADMIN |
| 54 | De-empanel Hospital | `DELETE` | `/api/admins/schemes/:id/hospitals/:hospitalId` | Required — ADMIN |
| 55 | List Scheme Claims | `GET` | `/api/admins/schemes/:id/claims` | Required — ADMIN |
| **Citizen Applications** |
| 56 | Submit Scheme Application | `POST` | `/api/applications` | Required — CITIZEN |
| 57 | List My Applications | `GET` | `/api/applications/my` | Required — CITIZEN |
| 58 | Get Application Details | `GET` | `/api/applications/:id` | Required — CITIZEN |
| 59 | Resubmit Requested Document | `POST` | `/api/applications/:id/resubmit-doc` | Required — CITIZEN |
| **Admin Application Case Management** |
| 60 | Application Dashboard Stats | `GET` | `/api/admins/applications/stats` | Required — ADMIN |
| 61 | List All Applications (Queue/Filter) | `GET` | `/api/admins/applications` | Required — ADMIN |
| 62 | Get Application Dossier | `GET` | `/api/admins/applications/:id` | Required — ADMIN |
| 63 | Update Status / Assign Scheme | `PATCH` | `/api/admins/applications/:id/status` | Required — ADMIN |
| 64 | Request Document / Revert Case | `POST` | `/api/admins/applications/:id/request-doc` | Required — ADMIN |
| 65 | Verify / Reject Document | `PATCH` | `/api/admins/applications/:id/documents/:docId/verify` | Required — ADMIN |
| 66 | Assign Hospital / Sevak | `POST` | `/api/admins/applications/:id/assign` | Required — ADMIN |
| 67 | Add Internal Case Remark | `POST` | `/api/admins/applications/:id/remarks` | Required — ADMIN |

---

# 1. Health

## 1. Health Check

**Method:** `GET`  
**Endpoint:** `/api/health`  
**Purpose:** Check server status, uptime, and memory.  
**Auth:** Not Required  

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "environment": "development",
    "uptimeSeconds": 1200
  }
}
```

---

# 2. Authentication

## 2. Initiate Auth (Role & Password Check)

**Method:** `POST`  
**Endpoint:** `/api/auth/initiate`  
**Purpose:** Verifies whether staff mobile is registered. If password exists, returns `PASSWORD_REQUIRED`. If first-time user, sends OTP and returns `FIRST_TIME_OTP`.  
**Auth:** Not Required  

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response (Returning Staff):**
```json
{
  "success": true,
  "data": {
    "status": "PASSWORD_REQUIRED",
    "role": "ADMIN",
    "name": "Dr. Suresh Sharma",
    "mobileNumber": "9876543210"
  }
}
```

**Response (First-Time Staff):**
```json
{
  "success": true,
  "data": {
    "status": "FIRST_TIME_OTP",
    "role": "AROGYA_SEVAK",
    "name": "Pooja Deshmukh",
    "mobileNumber": "9876543210"
  }
}
```

**Errors:** `400` Invalid mobile number | `404` Not registered as Admin or Sevak | `403` Account blocked

---

## 3. Verify OTP

**Method:** `POST`  
**Endpoint:** `/api/auth/verify-otp`  
**Purpose:** Verify the 4-digit OTP sent to the user's mobile.  
**Auth:** Not Required  

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "verified": true,
    "mobileNumber": "9876543210",
    "isExistingUser": true,
    "hasPassword": false
  }
}
```

**Errors:** `400` Invalid or expired OTP

---

## 4. Set First-Time Password

**Method:** `POST`  
**Endpoint:** `/api/auth/set-password`  
**Purpose:** Sets a permanent password after OTP verification and logs the user in.  
**Auth:** Not Required (Requires verified OTP session)  

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "password": "Password@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password set successfully. Logged in.",
  "data": {
    "user": {
      "id": "c1f7a08b-2d4e-4f3b-87cf-45d629a9b012",
      "name": "Pooja Deshmukh",
      "mobile": "9876543210",
      "role": "AROGYA_SEVAK"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

**Errors:** `400` Password must be at least 6 characters | `403` OTP not verified

---

## 5. Send / Resend OTP

**Method:** `POST`  
**Endpoint:** `/api/auth/send-otp`  
**Purpose:** Generates and sends a 4-digit OTP to mobile number.  
**Auth:** Not Required  

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "mobileNumber": "9876543210",
    "isExistingUser": true
  }
}
```

**Errors:** `400` Invalid 10-digit Indian mobile number  
*Note: In development, OTP is logged to server console.*

---

## 6. User Login

**Method:** `POST`  
**Endpoint:** `/api/auth/login`  
**Purpose:** Authenticate an existing user with mobile/email and password.  
**Auth:** Not Required (Rate Limited)  

**Request Body:**
```json
{
  "identifier": "9876543210",
  "password": "Password@123"
}
```
*(Accepts `identifier`, `mobileNumber`, `mobile`, or `email`)*

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "id": "c1f7a08b-2d4e-4f3b-87cf-45d629a9b012",
      "name": "Dr. Suresh Sharma",
      "email": "dr.suresh.admin@arogyamitra.gov.in",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

**Errors:** `401` Invalid credentials | `403` Account blocked | `429` Too many failed attempts

---

# 3. Users

## 7. Create User

**Method:** `POST`  
**Endpoint:** `/api/users`  
**Purpose:** Directly create a new user account.  
**Auth:** Not Required  

**Request Body:**
```json
{
  "full_name": "Ramesh Patil",
  "mobile": "9822334455",
  "email": "ramesh.patil@example.com",
  "password": "Password@123",
  "role": "CITIZEN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "b2f8a112-3c4d-4e5f-89a0-123456789abc",
    "full_name": "Ramesh Patil",
    "mobile": "9822334455",
    "role": "CITIZEN",
    "status": "ACTIVE"
  }
}
```

**Errors:** `400` Invalid fields | `409` Mobile number already exists

---

## 8. Get User by Mobile

**Method:** `GET`  
**Endpoint:** `/api/users/mobile/:mobile`  
**Purpose:** Retrieve a user profile by 10-digit mobile number.  
**Auth:** Not Required  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "b2f8a112-3c4d-4e5f-89a0-123456789abc",
    "full_name": "Ramesh Patil",
    "mobile": "9822334455",
    "role": "CITIZEN"
  }
}
```

**Errors:** `404` User not found

---

## 9. Get User by ID

**Method:** `GET`  
**Endpoint:** `/api/users/:id`  
**Purpose:** Retrieve a user profile by UUID.  
**Auth:** Not Required  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "b2f8a112-3c4d-4e5f-89a0-123456789abc",
    "full_name": "Ramesh Patil",
    "mobile": "9822334455"
  }
}
```

**Errors:** `404` User not found

---

# 4. Citizens

## 10. Create Citizen Profile

**Method:** `POST`  
**Endpoint:** `/api/citizens`  
**Purpose:** Add extended citizen address/location details linked to a user.  
**Auth:** Not Required  

**Request Body:**
```json
{
  "user_id": "b2f8a112-3c4d-4e5f-89a0-123456789abc",
  "address": "Plot 45, Shivaji Nagar, Wardha",
  "pincode": "442001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-012345abcdef",
    "user_id": "b2f8a112-3c4d-4e5f-89a0-123456789abc",
    "address": "Plot 45, Shivaji Nagar, Wardha",
    "pincode": "442001"
  }
}
```

**Errors:** `400` Invalid user_id or pincode

---

## 11. Get Citizen by User ID

**Method:** `GET`  
**Endpoint:** `/api/citizens/user/:userId`  
**Purpose:** Fetch citizen profile joined with user account by `user_id`.  
**Auth:** Not Required  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-012345abcdef",
    "full_name": "Ramesh Patil",
    "mobile": "9822334455",
    "address": "Plot 45, Shivaji Nagar, Wardha"
  }
}
```

**Errors:** `404` Profile not found

---

## 12. Get Citizen by Profile ID

**Method:** `GET`  
**Endpoint:** `/api/citizens/:id`  
**Purpose:** Fetch citizen profile by citizen UUID.  
**Auth:** Not Required  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-012345abcdef",
    "full_name": "Ramesh Patil",
    "address": "Plot 45, Shivaji Nagar, Wardha"
  }
}
```

**Errors:** `404` Profile not found

---

# 5. Arogya Sevaks

## 13. Create Arogya Sevak

**Method:** `POST`  
**Endpoint:** `/api/arogya-sevaks`  
**Purpose:** Create an Arogya Sevak profile linked to an existing user.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "user_id": "c1f7a08b-2d4e-4f3b-87cf-45d629a9b012",
  "employee_code": "AS-WRD-004",
  "phone": "9876543210",
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
    "employee_code": "AS-WRD-004",
    "status": "ACTIVE"
  }
}
```

**Errors:** `400` Validation error | `401` Unauthorized | `403` Forbidden

---

## 14. Get Sevak by User ID

**Method:** `GET`  
**Endpoint:** `/api/arogya-sevaks/user/:userId`  
**Purpose:** Retrieve Sevak profile by User UUID.  
**Auth:** Required — `ADMIN`, `AROGYA_SEVAK`, `SEVAK`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
    "employee_code": "AS-WRD-001",
    "full_name": "Pooja Deshmukh",
    "mobile": "9876543210"
  }
}
```

**Errors:** `404` Sevak not found

---

## 15. Get Sevak by Employee Code

**Method:** `GET`  
**Endpoint:** `/api/arogya-sevaks/code/:code`  
**Purpose:** Look up Sevak profile by official employee code.  
**Auth:** Required — `ADMIN`, `AROGYA_SEVAK`, `SEVAK`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
    "employee_code": "AS-WRD-001",
    "full_name": "Pooja Deshmukh"
  }
}
```

**Errors:** `404` Sevak not found

---

## 16. Get Sevak by ID

**Method:** `GET`  
**Endpoint:** `/api/arogya-sevaks/:id`  
**Purpose:** Retrieve Sevak profile by UUID.  
**Auth:** Required — `ADMIN`, `AROGYA_SEVAK`, `SEVAK`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
    "employee_code": "AS-WRD-001",
    "full_name": "Pooja Deshmukh"
  }
}
```

**Errors:** `404` Sevak not found

---

# 6. Admins

## 17. Create Admin Account

**Method:** `POST`  
**Endpoint:** `/api/admins` *(alias: `/new`)*  
**Purpose:** Admin provisions a new Administrator. Creates both User and Admin profile.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "full_name": "Dr. Anjali Patil",
  "mobile": "9811223344",
  "email": "anjali.patil@arogyamitra.gov.in",
  "password": "AdminPassword@123",
  "department": "HEALTH_ADMINISTRATION",
  "designation": "DEPUTY_DIRECTOR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "a2f9b002-2c3d-4e4f-91bc-23d4e5f6a7b8",
      "designation": "DEPUTY_DIRECTOR"
    },
    "user": {
      "full_name": "Dr. Anjali Patil",
      "mobile": "9811223344",
      "role": "ADMIN"
    }
  }
}
```

**Errors:** `400` Validation error | `409` Mobile/email already registered

---

## 18. List All Admins

**Method:** `GET`  
**Endpoint:** `/api/admins?limit=50&offset=0&search=Suresh`  
**Purpose:** Retrieve list of all administrators.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "a1e8a001-1b2c-4d3e-90ab-12c3d4e5f6a7",
        "full_name": "Dr. Suresh Sharma",
        "designation": "CHIEF_MEDICAL_OFFICER"
      }
    ],
    "pagination": { "total": 12, "limit": 50, "offset": 0 }
  }
}
```

---

## 19. Get My Profile

**Method:** `GET`  
**Endpoint:** `/api/admins/me`  
**Purpose:** Get profile of the currently logged-in Admin.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1e8a001-1b2c-4d3e-90ab-12c3d4e5f6a7",
    "full_name": "Dr. Suresh Sharma",
    "department": "HEALTH_ADMINISTRATION"
  }
}
```

---

## 20. Add Arogya Sevak

**Method:** `POST`  
**Endpoint:** `/api/admins/arogya-sevaks` *(alias: `/sevaks`)*  
**Purpose:** Create new Sevak and optionally assign initial hospitals.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "full_name": "Vikas Shinde",
  "mobile": "9833445566",
  "employee_code": "AS-WRD-005",
  "hospital_ids": ["d1c5a200-3b4c-4e00-81d0-77e5b8012345"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sevak": {
      "id": "e3a7c402-5d6e-4f22-93f2-99a7d8345678",
      "employee_code": "AS-WRD-005"
    },
    "assignedHospitals": [
      { "hospitalName": "District Hospital Wardha" }
    ]
  }
}
```

**Errors:** `400` Validation error | `409` Mobile/code already exists

---

## 21. List All Arogya Sevaks

**Method:** `GET`  
**Endpoint:** `/api/admins/arogya-sevaks?limit=50&search=Pooja` *(alias: `/sevaks`)*  
**Purpose:** List Sevaks with assigned hospitals.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "sevaks": [
      {
        "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
        "full_name": "Pooja Deshmukh",
        "assignedHospitals": ["District Hospital Wardha"]
      }
    ],
    "pagination": { "total": 24, "limit": 50 }
  }
}
```

---

## 22. Assign Sevak to Hospitals

**Method:** `POST`  
**Endpoint:** `/api/admins/arogya-sevaks/assign-hospitals` *(alias: `/sevaks/assign-hospitals`)*  
**Purpose:** Assign a Sevak to multiple hospitals.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "sevak_id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
  "hospital_ids": [
    "d1c5a200-3b4c-4e00-81d0-77e5b8012345",
    "d2c6a301-4b5c-4e11-82d1-88e6b9123456"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignedCount": 2
  }
}
```

**Errors:** `400` Missing sevak_id or hospital_ids

---

## 23. Assign Hospitals by URL ID

**Method:** `POST`  
**Endpoint:** `/api/admins/arogya-sevaks/:id/assign-hospitals` *(alias: `/sevaks/:id/assign-hospitals`)*  
**Purpose:** Assign hospitals where Sevak ID is passed in URL.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "hospital_ids": ["d1c5a200-3b4c-4e00-81d0-77e5b8012345"]
}
```

**Response:**
```json
{
  "success": true,
  "data": { "assignedCount": 1 }
}
```

---

## 24. Get Sevak Assigned Hospitals

**Method:** `GET`  
**Endpoint:** `/api/admins/arogya-sevaks/:id/hospitals` *(alias: `/sevaks/:id/hospitals`)*  
**Purpose:** List all hospitals assigned to a Sevak.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "assignedHospitals": [
      {
        "hospitalId": "d1c5a200-3b4c-4e00-81d0-77e5b8012345",
        "hospitalName": "District Hospital Wardha"
      }
    ]
  }
}
```

---

## 25. Assign Sevak to Single Hospital (Legacy)

**Method:** `POST`  
**Endpoint:** `/api/admins/arogya-sevaks/assign-hospital` *(alias: `/sevaks/assign-hospital`)*  
**Purpose:** Legacy single-hospital assignment.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "sevak_id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
  "hospital_id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Arogya Sevak assigned to Hospital successfully"
}
```

---

## 26. Unassign Sevak from Hospital

**Method:** `POST`  
**Endpoint:** `/api/admins/arogya-sevaks/:id/unassign` *(alias: `/sevaks/:id/unassign`)*  
**Purpose:** Unassign Sevak from specific hospital (if `hospital_id` in body) or all.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "hospital_id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "unassignedCount": 1 }
}
```

---

## 27. Get Sevak Details by ID

**Method:** `GET`  
**Endpoint:** `/api/admins/arogya-sevaks/:id` *(alias: `/sevaks/:id`)*  
**Purpose:** Admin fetches Sevak profile with assigned hospitals.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
    "full_name": "Pooja Deshmukh"
  }
}
```

---

## 28. Admin: Create Hospital

**Method:** `POST`  
**Endpoint:** `/api/admins/hospitals`  
**Purpose:** Create a new hospital facility.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "name": "Sub-District Hospital Hinganghat",
  "hospital_code": "SDH-HGT-001",
  "address": "NH 44, Hinganghat",
  "pincode": "442301",
  "contact_number": "9822114455"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d3c7a402-5b6c-4e22-83d2-99e7b0234567",
    "name": "Sub-District Hospital Hinganghat"
  }
}
```

**Errors:** `400` Validation error

---

## 29. Admin: List All Hospitals

**Method:** `GET`  
**Endpoint:** `/api/admins/hospitals?limit=50&search=Wardha`  
**Purpose:** List hospitals with filters and pagination.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "hospitals": [
      { "id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345", "name": "District Hospital Wardha" }
    ],
    "pagination": { "total": 14 }
  }
}
```

---

## 30. Admin: Get Hospital by ID

**Method:** `GET`  
**Endpoint:** `/api/admins/hospitals/:id`  
**Purpose:** Get hospital profile with assigned Sevaks.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345",
    "name": "District Hospital Wardha",
    "assignedSevaks": [{ "full_name": "Pooja Deshmukh" }]
  }
}
```

---

## 31. Admin: Update Hospital

**Method:** `PUT`  
**Endpoint:** `/api/admins/hospitals/:id`  
**Purpose:** Update hospital information.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "name": "Updated Hospital Name",
  "contact_number": "9822998877"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hospital updated successfully"
}
```

---

## 32. Admin: Delete Hospital

**Method:** `DELETE`  
**Endpoint:** `/api/admins/hospitals/:id`  
**Purpose:** Soft-delete or deactivate a hospital.  
**Auth:** Required — `ADMIN`  

**Response:**
```json
{
  "success": true,
  "message": "Hospital deleted successfully"
}
```

---

## 33. Assign Sevaks to Hospital

**Method:** `POST`  
**Endpoint:** `/api/admins/hospitals/:id/assign-sevaks`  
**Purpose:** Assign multiple Sevaks to a hospital.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "sevak_ids": [
    "e2a6b301-4c5d-4f11-92e1-88f6c9123456"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": { "assignedCount": 1 }
}
```

---

## 34. Get Admin by User ID

**Method:** `GET`  
**Endpoint:** `/api/admins/user/:userId`  
**Purpose:** Get admin profile by User UUID.  
**Auth:** Required — `ADMIN`  

---

## 35. Get Admin by Profile ID

**Method:** `GET`  
**Endpoint:** `/api/admins/:id`  
**Purpose:** Get admin profile by Admin UUID.  
**Auth:** Required — `ADMIN`  

---

# 7. Facilities (Hospitals)

## 36. Create Hospital

**Method:** `POST`  
**Endpoint:** `/api/hospitals`  
**Purpose:** Register a hospital facility.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "name": "District Hospital Wardha",
  "hospital_code": "DH-WRD-001",
  "address": "Civil Lines, Wardha",
  "contact_number": "9822112233"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345",
    "name": "District Hospital Wardha"
  }
}
```

---

## 37. List All Hospitals

**Method:** `GET`  
**Endpoint:** `/api/hospitals?district_id=...&search=Wardha`  
**Purpose:** List active hospitals. Supports filters by `district_id`, `taluka_id`, `status`, `search`.  
**Auth:** Required — Authenticated User  

**Response:**
```json
{
  "success": true,
  "data": {
    "hospitals": [
      {
        "id": "d1c5a200-3b4c-4e00-81d0-77e5b8012345",
        "name": "District Hospital Wardha",
        "hospital_code": "DH-WRD-001"
      }
    ],
    "pagination": { "total": 14 }
  }
}
```

---

## 38. Get Hospital by Code

**Method:** `GET`  
**Endpoint:** `/api/hospitals/code/:code`  
**Purpose:** Fetch hospital by unique code (e.g. `DH-WRD-001`).  
**Auth:** Required — Authenticated User  

---

## 39. Get Assigned Sevaks for Hospital

**Method:** `GET`  
**Endpoint:** `/api/hospitals/:hospitalId/sevaks`  
**Purpose:** List active Arogya Sevaks stationed at a hospital.  
**Auth:** Required — Authenticated User  

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sevak_id": "e2a6b301-4c5d-4f11-92e1-88f6c9123456",
      "full_name": "Pooja Deshmukh",
      "mobile": "9876543210"
    }
  ]
}
```

---

## 40. Get Hospital by ID

**Method:** `GET`  
**Endpoint:** `/api/hospitals/:id`  
**Purpose:** Fetch hospital by UUID.  
**Auth:** Required — Authenticated User  

---

## 41. Update Hospital

**Method:** `PUT`  
**Endpoint:** `/api/hospitals/:id`  
**Purpose:** Update hospital fields.  
**Auth:** Required — `ADMIN`  

**Request Body:**
```json
{
  "name": "Updated Name",
  "contact_number": "9822112233"
}
```

---

## 42. Delete Hospital

**Method:** `DELETE`  
**Endpoint:** `/api/hospitals/:id`  
**Purpose:** Soft-delete hospital.  
**Auth:** Required — `ADMIN`  

---

# 8. Cloudinary

## 43. Upload Document / Image

**Method:** `POST`  
**Endpoint:** `/api/cloudinary/upload`  
**Purpose:** Upload a document or image file directly into structured Cloudinary storage with automatic systematic folder routing.  
**Auth:** Required — Authenticated User  
**Content-Type:** `multipart/form-data`  

**Form Data:**
- `file`: File binary *(Required, max 10MB, PDF/JPEG/PNG/WEBP/SVG)*
- `module`: String *(Optional, default: `applications`. Options: `applications`, `profiles`, `hospitals`, `schemes`, `general`)*
- `category`: String *(Optional, e.g. `aadhaar`, `ration_card`, `income_certificate`, `hospital_estimate`, `discharge_summary`, `medical_report`, `other`)*
- `applicationNumber` / `caseId`: String *(Optional, e.g. `AA-2026-00001` or `AM-2026-000101`)*
- `userType`: String *(Optional, e.g. `citizen`, `sevak`, `admin` for profile uploads)*
- `folder`: String *(Optional custom subfolder under `arogyamitra/`)*

**Automatic Systematic Storage Hierarchy:**
- Case Document: `arogyamitra/applications/{year}/{caseId}/{category}/`
- Pre-submission Doc: `arogyamitra/applications/documents/{category}/`
- User Profile: `arogyamitra/profiles/{role}/`
- Hospital: `arogyamitra/hospitals/facilities/`

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully to Cloudinary storage",
  "data": {
    "publicId": "arogyamitra/applications/2026/AA-2026-00001/aadhaar/aadhaar_front_1725960000123_4567",
    "secureUrl": "https://res.cloudinary.com/ntukfy4w/image/upload/v1725960000/arogyamitra/applications/2026/AA-2026-00001/aadhaar/aadhaar_front_1725960000123_4567.pdf",
    "format": "pdf",
    "bytes": 542100,
    "width": null,
    "height": null,
    "folder": "arogyamitra/applications/2026/AA-2026-00001/aadhaar",
    "category": "aadhaar",
    "module": "applications",
    "applicationNumber": "AA-2026-00001"
  }
}
```

**Errors:** `400` File missing, invalid MIME type, or exceeds 10MB

---

## 44. Delete Asset

**Method:** `DELETE`  
**Endpoint:** `/api/cloudinary`  
**Purpose:** Delete an image asset from Cloudinary using `publicId`.  
**Auth:** Required — Authenticated User  

**Request Body:**
```json
{
  "publicId": "arogyamitra/uploads/p0f9a2b1c8d7e6"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully from Cloudinary",
  "data": {
    "publicId": "arogyamitra/uploads/p0f9a2b1c8d7e6",
    "result": "ok"
  }
}
```

**Errors:** `400` Missing or invalid publicId

---

# 7. Admin Healthcare Schemes

## 45. Scheme High-Level Stats

**Method:** `GET`  
**Endpoint:** `/api/admins/schemes/stats`  
**Purpose:** Returns summary counts of total schemes, active/inactive counts, total coverage, and breakdown by category.  
**Auth:** Required — ADMIN  

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSchemes": 8,
    "activeSchemes": 7,
    "inactiveSchemes": 1,
    "categoriesBreakdown": [
      { "category": "STATE", "count": 4 },
      { "category": "CENTRAL", "count": 3 }
    ]
  }
}
```

---

## 46. List Schemes (Filtered & Paginated)

**Method:** `GET`  
**Endpoint:** `/api/admins/schemes`  
**Query Parameters:** `search`, `category`, `status`, `limit`, `offset`  
**Auth:** Required — ADMIN  

---

## 47. Register New Scheme

**Method:** `POST`  
**Endpoint:** `/api/admins/schemes`  
**Auth:** Required — ADMIN  
**Request Body:**
```json
{
  "code": "MJPJAY",
  "name": "Mahatma Jyotirao Phule Jan Arogya Yojana",
  "category": "STATE",
  "description": "Comprehensive health insurance scheme of Maharashtra government",
  "max_coverage_amount": 500000,
  "status": "Active"
}
```

---

## 48. Empanel Hospital(s) to Scheme

**Method:** `POST`  
**Endpoint:** `/api/admins/schemes/:id/hospitals`  
**Auth:** Required — ADMIN  
**Request Body:**
```json
{
  "hospital_ids": ["45ef74e3-fa2a-4ff3-a5d8-76155ff1f4d0"]
}
```

---

# 8. Citizen Scheme Applications

## 56. Submit Scheme Application

**Method:** `POST`  
**Endpoint:** `/api/applications`  
**Purpose:** Citizen raises scheme assistance application. Scheme selection is stored as a *suggestion*; official scheme is decided and assigned by Admin. Automatically generates sequential Case ID (`AA-<YYYY>-00001`).  
**Auth:** Required — CITIZEN  

**Request Body:**
```json
{
  "patientName": "Sanjay Tukaram More",
  "age": 52,
  "gender": "male",
  "contactMobile": "9823098765",
  "address": "Ganesh Krupa, Shivaji Nagar, Pune",
  "treatmentType": "ipd",
  "hospitalName": "District General Hospital",
  "suggested_scheme_id": "mjpjay",
  "priority": "high",
  "medicalCauseNote": "Cardiac emergency requiring coronary angiography.",
  "documents": [
    { "name": "Aadhaar.pdf", "size": "1.2 MB", "category": "aadhaar", "file_url": "https://example.com/aadhaar.pdf" }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "AA-2026-00001",
    "application_number": "AA-2026-00001",
    "status": "SUBMITTED",
    "suggestedScheme": {
      "id": "mjpjay",
      "name": "Mahatma Jyotirao Phule Jan Arogya Yojana"
    },
    "assignedScheme": null,
    "isSchemeAssignedByAdmin": false,
    "patient": {
      "name": "Sanjay Tukaram More",
      "age": 52,
      "gender": "Male"
    }
  }
}
```

---

## 57. List My Applications

**Method:** `GET`  
**Endpoint:** `/api/applications/my`  
**Auth:** Required — CITIZEN  

---

## 58. Resubmit Requested Document

**Method:** `POST`  
**Endpoint:** `/api/applications/:id/resubmit-doc`  
**Purpose:** Resubmit requested document when case is in `DOCS_REQUIRED` status. Moves case status back to `UNDER_REVIEW`.  
**Auth:** Required — CITIZEN  

---

# 9. Admin Application Case Management

## 60. Application Dashboard Stats

**Method:** `GET`  
**Endpoint:** `/api/admins/applications/stats`  
**Auth:** Required — ADMIN  

---

## 61. List Applications Queue

**Method:** `GET`  
**Endpoint:** `/api/admins/applications`  
**Query Parameters:** `status`, `priority`, `scheme_id`, `search`, `limit`, `offset`  
**Auth:** Required — ADMIN  

---

## 62. Update Status & Assign Official Scheme

**Method:** `PATCH`  
**Endpoint:** `/api/admins/applications/:id/status`  
**Purpose:** Transition case lifecycle status (`APPROVED`, `REJECTED`, etc.) and assign official approved scheme and sanctioned amount.  
**Auth:** Required — ADMIN  

**Request Body:**
```json
{
  "status": "APPROVED",
  "assigned_scheme_id": "45ef74e3-fa2a-4ff3-a5d8-76155ff1f4d0",
  "sanctioned_amount": 150000,
  "remarks": "Approved by medical review committee"
}
```

---

## 63. Request Additional Document / Revert Case

**Method:** `POST`  
**Endpoint:** `/api/admins/applications/:id/request-doc`  
**Purpose:** Moves application status to `DOCS_REQUIRED` and informs citizen of specific document requirement.  
**Auth:** Required — ADMIN  

**Request Body:**
```json
{
  "requestedDocName": "Orange Ration Card Front & Back",
  "requestedDocType": "ration",
  "reason": "Previous scan is blurry."
}
```

---

## 64. Verify / Reject Document

**Method:** `PATCH`  
**Endpoint:** `/api/admins/applications/:id/documents/:docId/verify`  
**Auth:** Required — ADMIN  
**Request Body:**
```json
{
  "status": "VERIFIED",
  "remark": "Verified against UIDAI database."
}
```

---

## 65. Assign Hospital & Arogya Sevak

**Method:** `POST`  
**Endpoint:** `/api/admins/applications/:id/assign`  
**Auth:** Required — ADMIN  
**Request Body:**
```json
{
  "hospital_id": "45ef74e3-fa2a-4ff3-a5d8-76155ff1f4d0",
  "arogya_sevak_id": null,
  "remark": "Assigned to Help Desk"
}
```

---

## 66. Add Internal Case Remark

**Method:** `POST`  
**Endpoint:** `/api/admins/applications/:id/remarks`  
**Auth:** Required — ADMIN  
```json
{
  "remark": "Applicant contacted via phone. Confirmed bed availability."
}
```
