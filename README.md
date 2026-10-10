# AppPages

Multi-tenant web app for mobile publishers to generate and host public pages required by Google Play Console and App Store Connect: privacy policies, terms of use, support pages, account/data deletion pages, and marketing landing pages.

## Features

- **Multi-tenant:** Each user gets a personal account; team accounts can be added later.
- **Wizard-based app creation:** Step-by-step form to fill in app details, publisher info, data practices, support, and deletion info.
- **Generated public pages:** Privacy policy, terms, support, deletion (account + data), and landing page — all server-rendered, fast, mobile-friendly, accessible, and JS-free.
- **Store links panel:** Shows exactly which URL to paste into which field in App Store Connect and Google Play Console.
- **Data safety summary:** Draft answers for Play Data Safety and Apple App Privacy labels.
- **Version history:** Publishing creates immutable snapshots; previous policy versions are viewable.
- **Inbox:** Manage deletion and support requests from end users.
- **i18n:** English and Turkish; extensible.
- **Security:** Firestore rules enforce tenant isolation; public forms go through Cloud Functions with rate limiting and honeypot.

## Tech Stack

- **Monorepo:** pnpm workspace with `packages/shared`, `functions`, `apps/dashboard`
- **Dashboard:** React 19 + Vite + Tailwind CSS + React Router + React Hook Form + Zod
- **Public pages:** Cloud Functions (2nd gen, Node 20) → server-rendered HTML
- **Auth:** Firebase Auth (Google + Apple sign-in)
- **Database:** Cloud Firestore
- **Storage:** Cloud Storage for app icons
- **Testing:** Vitest + @firebase/rules-unit-testing

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Blaze plan (for Cloud Functions)

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd apppages
pnpm install
```

### 2. Configure Firebase project

```bash
cp .firebaserc.example .firebaserc
# Edit .firebaserc and replace YOUR_FIREBASE_PROJECT_ID
```

### 3. Environment variables

```bash
cp .env.example apps/dashboard/.env.local
# Fill in your Firebase config values
# Set VITE_USE_EMULATORS=true for local dev
```

### 4. Build shared package

```bash
pnpm build:shared
```

### 5. Start emulators + dashboard

```bash
pnpm dev
```

This starts:
- Firebase Emulators (Auth, Firestore, Storage, Functions, Hosting) on their default ports
- Vite dev server for the dashboard on http://localhost:3000

### 6. Seed sample data

With emulators running:

```bash
pnpm seed
```

Creates 2 sample apps (Weather Pro: published, Görev Yöneticisi: draft) with full data.

### 7. View public pages

After seeding, visit:
- http://localhost:5000/p/weather-pro (landing)
- http://localhost:5000/p/weather-pro/privacy (privacy policy)
- http://localhost:5000/p/weather-pro/terms (terms of use)
- http://localhost:5000/p/weather-pro/support (support)
- http://localhost:5000/p/weather-pro/delete-account (account deletion)

## Firebase Console Setup (Manual Steps)

### Authentication

1. Go to **Firebase Console → Authentication → Sign-in method**
2. Enable **Google** provider
3. Enable **Apple** provider:
   - Create an Apple Services ID at [Apple Developer Portal](https://developer.apple.com/)
   - Configure the Services ID with:
     - **Return URL:** `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`
     - **Domains:** Your Firebase Hosting domain
   - Enter the Apple Team ID, Key ID, and private key in Firebase Console
4. Add your custom domain to **Authorized domains**

### App Check (Recommended for Production)

1. Go to **Firebase Console → App Check**
2. Register your web app with **reCAPTCHA Enterprise**
3. Enforce App Check on Firestore, Storage, and Cloud Functions

### Trigger Email Extension (Optional)

1. Install the **Trigger Email** extension from Firebase Extensions
2. Configure with your SMTP credentials (or use a service like SendGrid, Mailgun)
3. The extension watches a `mail` collection; update the API function to write email docs there

### Firestore Indexes

Indexes are defined in `firestore.indexes.json` and deployed automatically. To deploy manually:

```bash
firebase deploy --only firestore:indexes
```

## Testing

```bash
# All tests (requires emulators for rules tests)
pnpm test

# Schema tests only (no emulators needed)
pnpm test:shared

# Firestore rules tests (start emulators first, or use exec)
firebase emulators:exec --only firestore "pnpm test:rules" --project demo-apppages-test
```

## Deployment

### Manual

```bash
pnpm build
firebase deploy
```

### CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` workflow runs on push to `main`:

1. Lint + typecheck
2. Run tests
3. Build
4. Deploy to Firebase Hosting

**Required GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT` — Service account JSON for Firebase CLI
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc. — For the dashboard build

## Custom Domain

1. Go to **Firebase Console → Hosting → Custom domain**
2. Add your domain and verify ownership
3. Update the `VITE_*` env vars if needed
4. For per-app custom domains (future feature), use Firebase Hosting multi-site

## Project Structure

```
apppages/
├── apps/
│   └── dashboard/          # React SPA (Vite + Tailwind)
│       └── src/
│           ├── components/  # Layout, shared components
│           ├── hooks/       # useAuth, useApps, useRequests
│           ├── lib/         # Firebase init
│           └── pages/       # Login, AppList, AppDetail, CreateApp, Inbox, Settings
├── functions/              # Cloud Functions (2nd gen)
│   └── src/
│       ├── index.ts        # Entry point
│       ├── publicPages.ts  # Server-rendered public pages
│       ├── api.ts          # Form submission API
│       └── triggers/       # Auth + Firestore triggers
├── packages/
│   └── shared/             # Shared across dashboard + functions
│       └── src/
│           ├── types/       # TypeScript types
│           ├── schemas/     # Zod validation schemas
│           ├── i18n/        # Translations (EN, TR)
│           └── templates/   # HTML template renderers
├── tests/
│   └── rules/              # Firestore security rules tests
├── scripts/
│   └── seed.ts             # Emulator seed data
├── firebase.json           # Firebase config + hosting rewrites
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
├── firestore.indexes.json  # Firestore composite indexes
├── DECISIONS.md            # Architecture decisions log
└── README.md
```

## Data Model

```
users/{uid}                           # User profile
accounts/{accountId}                  # Account (tenant)
  /members/{uid}                      # Account members
  /apps/{appId}                       # Apps
    /versions/{version}               # Immutable publish snapshots
    /requests/{requestId}             # Deletion/support requests
  /publisherProfiles/{profileId}      # Reusable publisher profiles
slugs/{slug}                          # Global slug → app mapping
abuseReports/{reportId}               # Admin abuse reports
```

## License

Private — not for redistribution.
