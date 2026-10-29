# ArogyaMitra (आरोग्य मित्र) - Pure React Native CLI Application

> **National Community Health & Citizen Wellness Mobile Application**  
> Built with **Pure React Native Community CLI (`@react-native-community/cli`)**, TypeScript, React Navigation, and Native Android/iOS project scaffolding.

---

## 🏛 Architecture & Persona Isolation

ArogyaMitra serves two distinct user personas with separate operational workflows, UI experiences, and access levels:

1. **Citizen (`src/citizen/`)**:
   - For individuals and families.
   - Access ABHA digital health records, lab test reports, digital prescriptions.
   - Book OPD appointments and e-Sanjeevani teleconsultations.
   - Access Govt health schemes (PM-JAY, Ayushman Bharat).
   - Emergency 108 Ambulance and 104 Health Helpline triggers.

2. **Arogya Sevak (`src/arogya-sevak/`)**:
   - For ASHA, ANM, and Community Health Workers (CHWs).
   - Household census and beneficiary registration with risk categorization (High Risk / Normal).
   - Maternal (ANC/PNC) and infant immunization schedule tracking.
   - Field visit scheduler with GPS/offline support.
   - Medicine kit inventory stock management and indent requests.
   - Offline-first data capture and sync engine with PHC servers.

### 🛡 Boundary & Anti-Leak Rules
To ensure the files and logic for both interfaces **never get mixed**:
- **Physical Segregation**: Files for Citizen live strictly under `src/citizen/`. Files for Sevak live strictly under `src/arogya-sevak/`.
- **Compile-Time Linter**: `.eslintrc.js` enforces `no-restricted-imports` blocking any cross-domain imports between `@citizen/*` and `@sevak/*`.
- **Shared Foundation**: All reusable design system components, themes, storage, and auth utilities reside in `src/shared/`.
- **Navigation Branching**: `RootNavigator.tsx` mounts only the authorized navigation stack based on active role in `AuthContext`.

---

## 📁 Project Folder Structure

```text
Application/
├── android/                      # Native Android project (Gradle, Kotlin/Java, Manifests)
│   ├── app/
│   │   ├── src/main/java/com/arogyamitra/  # MainActivity.kt, MainApplication.kt
│   │   └── build.gradle                    # Configured with react-native-vector-icons
│   └── local.properties                    # Configured with Android SDK path
├── ios/                          # Native iOS project (Xcode, Podfile, AppDelegate)
├── index.js                      # React Native CLI root entry point
├── App.tsx                       # Root container re-export
├── metro.config.js               # Metro bundler configuration
├── babel.config.js               # Babel preset configuration
│
├── src/
│   ├── app/                      # App root initialization & routing
│   │   ├── App.tsx               # Root container with context providers
│   │   └── RootNavigator.tsx     # Role-based navigator switch
│   │
│   ├── auth/                     # Authentication & onboarding
│   │   ├── navigation/           # Auth stack navigator
│   │   ├── screens/              # Role selection & login screens
│   │   └── types/                # Auth navigation param lists
│   │
│   ├── citizen/                  # ========================================
│   │   │                         # CITIZEN DOMAIN (Strictly Isolated)
│   │   │                         # ========================================
│   │   ├── components/           # HealthSummaryCard, EmergencySosButton, AppointmentCard
│   │   ├── hooks/                # useCitizenHealthRecords, useAppointments
│   │   ├── navigation/           # CitizenNavigator & CitizenTabNavigator (5 Tabs)
│   │   ├── screens/
│   │   │   ├── home/             # CitizenHomeScreen (Vitals, SOS, Quick Services)
│   │   │   ├── records/          # HealthRecordsScreen (ABHA, Lab Reports)
│   │   │   ├── appointments/     # AppointmentsScreen (e-Sanjeevani bookings)
│   │   │   ├── schemes/          # SchemesScreen (PM-JAY, Ayushman Bharat)
│   │   │   └── profile/          # CitizenProfileScreen (Family & ABHA profile)
│   │   ├── services/             # citizenApi.ts
│   │   └── types/                # citizen.types.ts
│   │
│   ├── arogya-sevak/             # ========================================
│   │   │                         # AROGYA SEVAK DOMAIN (Strictly Isolated)
│   │   │                         # ========================================
│   │   ├── components/           # BeneficiaryCard, FieldTargetGauge, SyncStatusBar, VaccineScheduleCard
│   │   ├── hooks/                # useBeneficiaryRegistry, useOfflineQueue
│   │   ├── navigation/           # SevakNavigator & SevakTabNavigator (5 Tabs)
│   │   ├── screens/
│   │   │   ├── dashboard/        # SevakDashboardScreen (Field targets, high-risk flags)
│   │   │   ├── beneficiaries/    # BeneficiaryListScreen (Household survey & search)
│   │   │   ├── immunization/     # ImmunizationScreen (ANC & child vaccine tracker)
│   │   │   ├── visits/           # HomeVisitsScreen (Daily field itinerary)
│   │   │   ├── inventory/        # MedicineStockScreen (Kit inventory & stock refill)
│   │   │   └── sync/             # OfflineSyncScreen (Local queue & PHC sync)
│   │   ├── services/             # sevakApi.ts & offlineSyncService.ts
│   │   └── types/                # sevak.types.ts
│   │
│   └── shared/                   # ========================================
│       │                         # SHARED FOUNDATION (Role-Agnostic)
│       │                         # ========================================
│       ├── components/           # AppButton, AppCard, AppHeader, AppBadge
│       ├── constants/            # roles.ts (CITIZEN, AROGYA_SEVAK), config.ts
│       ├── context/              # AuthContext (Role & session management)
│       ├── hooks/                # useAuth
│       ├── services/             # storage/storage.ts (AsyncStorage abstraction)
│       ├── theme/                # colors.ts (Citizen teal vs Sevak emerald), typography, spacing
│       └── types/                # common.types.ts (UserProfile, ApiResponse)
│
├── .eslintrc.js                  # Cross-persona import isolation boundary rules
├── tsconfig.json                 # Path aliases (@citizen/*, @sevak/*, @shared/*)
└── package.json                  # React Native CLI dependencies & scripts
```

---

## 🚀 Running the Pure React Native CLI App

### 1. Start Metro Bundler
```bash
npm start
# or
npx react-native start
```

### 2. Run on Android Emulator or Device
```bash
npm run android
# or
npx react-native run-android
```

### 3. Run on iOS (macOS only)
```bash
npm run ios
# or
npx react-native run-ios
```

---

## ⚙️ Android Development Setup Note
Your machine already has Android SDK 35 installed at:
`C:\Users\KKSPL_04\AppData\Local\Android\Sdk`

If needed, ensure the following environment variables are active in your Windows system settings:
- **`ANDROID_HOME`**: `C:\Users\KKSPL_04\AppData\Local\Android\Sdk`
- **`JAVA_HOME`**: `C:\Program Files\Android\Android Studio\jbr` (or your preferred JDK 17+ path)
- Add `%JAVA_HOME%\bin` and `%ANDROID_HOME%\platform-tools` to your system `PATH`.

---

## 🔄 Instant Role Switching in Development
A convenient **Role Switcher** is built into the top navigation header (`AppHeader`):
- Click **"Citizen"** or **"Sevak"** in the top-right corner to instantly toggle between personas and inspect screens and workflows without re-logging.
