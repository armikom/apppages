# AppPages — Architecture Guide

> Canonical reference for agents and developers working on this codebase.
> Cursor agents: see also `.cursor/rules/apppages.mdc` for IDE-specific context.

---

## 1. Overview

AppPages is a multi-tenant web application that lets mobile app publishers generate and host the public pages required by Google Play Console and App Store Connect:

- Privacy Policy
- Terms of Use / EULA
- Support Page (FAQ + contact form)
- Account Deletion Page (Google Play Data Safety requirement)
- Data Deletion Page (optional)
- Marketing / Landing Page (with store badges)

Users sign in, register their apps through a wizard, fill in structured details (publisher info, data practices questionnaire, support info, deletion steps), and get stable, hosted public URLs for each page. Pages are server-rendered HTML — no JavaScript required, mobile-friendly, fast, accessible.

### Live Deployment

| Resource | Value |
|----------|-------|
| Dashboard URL | https://armikom-app-pages.web.app |
| Firebase Project | `armikom-app-pages` |
| GitHub Repository | https://github.com/armikom/apppages |
| Firestore Region | `eur3` (Europe) |
| Functions Region | `us-central1` |

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Monorepo | pnpm workspace | 3 packages: `packages/shared`, `functions`, `apps/dashboard` |
| Dashboard | React 19 + Vite 6 + Tailwind CSS 3 | SPA deployed to Firebase Hosting |
| Routing | React Router 7 | Client-side routing, catch-all to `index.html` |
| Forms | React Hook Form + Zod | Shared Zod schemas between client and server |
| Icons | Lucide React | Tree-shakeable icon library |
| Public Pages | Cloud Functions v2 (Node 22) | Server-rendered HTML, inlined CSS, no JS |
| Auth | Firebase Auth | Google sign-in (Apple prepared but disabled) |
| Database | Cloud Firestore | Native mode, `eur3` region |
| Storage | Cloud Storage | App icons/screenshots (public read) |
| Shared Package | `@apppages/shared` | Types, Zod schemas, i18n strings, HTML templates |
| Testing | Vitest + @firebase/rules-unit-testing | Schema tests + Firestore rules tests |
| CI/CD | GitHub Actions | Build → test → deploy on push to `main` |

---

## 3. Project Structure

```
apppages/
│
├── apps/dashboard/                 # React SPA (Firebase Hosting)
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.tsx # Sidebar + outlet layout
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx         # Auth context (Google sign-in, user profile)
│   │   │   ├── useApps.ts          # CRUD for apps (real-time Firestore listener)
│   │   │   └── useRequests.ts      # Manage deletion/support requests
│   │   ├── lib/
│   │   │   └── firebase.ts         # Firebase init + emulator connection
│   │   └── pages/
│   │       ├── LoginPage.tsx       # Google sign-in
│   │       ├── AppListPage.tsx     # App list + quick copy links
│   │       ├── CreateAppPage.tsx   # 7-step wizard (basics, platforms, publisher, data, support, deletion, review)
│   │       ├── AppDetailPage.tsx   # Store links panel, public pages, data safety summary
│   │       ├── InboxPage.tsx       # Manage requests, export CSV
│   │       └── SettingsPage.tsx    # Profile, delete account
│   ├── index.html
│   ├── vite.config.ts              # Dev proxy to emulator functions
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── functions/                      # Cloud Functions
│   ├── src/
│   │   ├── index.ts                # Entry point — initializeApp() + re-exports
│   │   ├── publicPages.ts          # HTTP function: server-render public pages
│   │   ├── api.ts                  # HTTP function: form submission + rate limiting
│   │   └── triggers/
│   │       ├── onUserCreated.ts    # Auth trigger: create user profile + personal account
│   │       └── onAppWrite.ts       # Firestore trigger: slug management + version snapshots
│   ├── esbuild.config.js           # Bundles into single file, inlines @apppages/shared
│   ├── package.json                # main: ./dist/bundle.js
│   └── tsconfig.json
│
├── packages/shared/                # Shared library (used by dashboard + functions)
│   └── src/
│       ├── types/index.ts          # All TypeScript interfaces
│       ├── schemas/index.ts        # Zod schemas (appDataSchema, publicRequestSchema, slugSchema)
│       ├── schemas/schemas.test.ts # Schema validation tests
│       ├── i18n/
│       │   ├── en.ts               # English translations
│       │   ├── tr.ts               # Turkish translations
│       │   └── index.ts            # getTranslations(), isValidLanguage()
│       └── templates/
│           ├── layout.ts           # Base HTML layout (meta, OG, styles, header, footer)
│           ├── privacy.ts          # Privacy policy renderer
│           ├── terms.ts            # Terms of use renderer
│           ├── support.ts          # Support page renderer
│           ├── deletion.ts         # Account/data deletion page renderer
│           └── landing.ts          # Landing page renderer
│
├── tests/rules/                    # Firestore security rules tests
│   ├── firestore.test.ts           # 15+ test cases (CRUD, cross-tenant, admin)
│   └── vitest.config.ts
│
├── scripts/seed.ts                 # Emulator seed (2 apps, 1 request)
│
├── firebase.json                   # Hosting rewrites, function config, emulators
├── firestore.rules                 # Security rules
├── storage.rules                   # Storage security rules
├── firestore.indexes.json          # Composite indexes
├── .firebaserc                     # Project: armikom-app-pages
├── .github/workflows/ci.yml        # CI/CD pipeline
├── DECISIONS.md                    # Architecture decision records
└── docs/ARCHITECTURE.md            # This file
```

---

## 4. Data Model

### Collections

```
users/{uid}
  ├── uid: string
  ├── displayName: string
  ├── email: string
  ├── photoURL?: string
  ├── role: "user" | "admin"
  ├── plan: "free" | "pro" | "enterprise"
  ├── defaultAccountId: string        ← points to accounts/{accountId}
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

accounts/{accountId}
  ├── id: string
  ├── name: string
  ├── ownerId: string
  ├── plan: "free" | "pro" | "enterprise"
  ├── createdAt: Timestamp
  ├── updatedAt: Timestamp
  │
  ├── /members/{uid}                  ← who can access this account
  │     ├── uid: string
  │     ├── role: "owner" | "editor"
  │     ├── email: string
  │     ├── displayName: string
  │     └── joinedAt: Timestamp
  │
  ├── /apps/{appId}                   ← the main entity
  │     ├── name, slug, icon, shortDescription, primaryColor
  │     ├── status: "draft" | "published" | "disabled"
  │     ├── platforms: { ios?: {...}, android?: {...} }
  │     ├── publisher: { legalEntityName, type, country, contactEmail, supportEmail, ... }
  │     ├── defaultLanguage: "en" | "tr"
  │     ├── additionalLanguages: Language[]
  │     ├── dataPractices: { dataTypesCollected[], thirdPartySdks[], accountCreation, childrenTarget, adsEnabled, inAppPurchases, gdprEnabled, kvkkEnabled, ccpaEnabled }
  │     ├── supportInfo: { faqItems[], contactEmail, supportFormEnabled }
  │     ├── deletionInfo: { stepsToDelete[], dataDeleted[], dataRetained[], webFormEnabled }
  │     ├── dataDeletionEnabled: boolean
  │     ├── dataDeletionInfo?: DeletionInfo
  │     ├── useAppleStandardEula: boolean
  │     ├── customSections: CustomSection[]
  │     ├── publishedVersion?: number
  │     ├── publishedAt?: Timestamp
  │     ├── createdAt: Timestamp
  │     └── updatedAt: Timestamp
  │     │
  │     ├── /versions/{version}       ← immutable publish snapshots
  │     │     ├── version: number
  │     │     ├── snapshot: AppData   ← full copy at publish time
  │     │     ├── publishedAt: Timestamp
  │     │     └── publishedBy: string
  │     │
  │     └── /requests/{requestId}     ← deletion/support form submissions
  │           ├── type: "deletion" | "data_deletion" | "support"
  │           ├── status: "pending_confirmation" | "new" | "in_progress" | "done" | "rejected"
  │           ├── email, username?, reason?, message?
  │           ├── confirmationToken?: string
  │           ├── confirmedAt?: Timestamp
  │           ├── notes?: string
  │           ├── createdAt, updatedAt, resolvedAt?
  │           ├── appId, accountId
  │           └── (PII auto-purge after configurable period — not yet implemented)
  │
  └── /publisherProfiles/{profileId}  ← reusable across apps (future)

slugs/{slug}                          ← global uniqueness enforcement
  ├── accountId: string
  ├── appId: string
  └── createdAt: Timestamp

abuseReports/{reportId}               ← admin-only (future)
```

### Key relationships

- A user's personal account has `accountId === uid`
- Access control is checked via `accounts/{accountId}/members/{uid}` existence
- Slug → app lookup uses the `slugs/{slug}` collection (Admin SDK only, not client-readable for writes)
- Publishing creates a new `versions/{n}` doc with a full snapshot of the app data

### Indexes (firestore.indexes.json)

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `apps` | status ASC, updatedAt DESC | Dashboard app list |
| `requests` | type ASC, status ASC, createdAt DESC | Filtered inbox |
| `requests` | status ASC, createdAt DESC | Status-filtered inbox |

---

## 5. URL Routing

### Firebase Hosting Rewrites (firebase.json)

```
/api/**          →  Cloud Function: api
/p/**            →  Cloud Function: publicPages
**               →  /index.html (SPA catch-all)
```

### Dashboard Routes (React Router)

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | Public |
| `/` | AppListPage | Protected |
| `/apps/new` | CreateAppPage | Protected |
| `/apps/:appId` | AppDetailPage | Protected |
| `/apps/:appId/inbox` | InboxPage | Protected |
| `/settings` | SettingsPage | Protected |

### Public Page Routes (Cloud Function: publicPages)

| Route | Content |
|-------|---------|
| `/p/{slug}` | Landing page with store badges |
| `/p/{slug}/privacy` | Generated privacy policy |
| `/p/{slug}/terms` | Terms of use (optional Apple EULA link) |
| `/p/{slug}/support` | FAQ + contact form |
| `/p/{slug}/delete-account` | Account deletion steps + web form |
| `/p/{slug}/delete-data` | Data deletion (if enabled) |
| `/p/{slug}/privacy/history` | Version history list |
| `/p/{slug}/{lang}/privacy` | Language-specific (e.g., `/tr/privacy`) |
| `?lang=tr` | Query param language override |

**Response behavior:**
- `status: "published"` → 200 with rendered HTML
- `status: "draft"` or slug not found → 404
- `status: "disabled"` → 410

**Cache headers:** `Cache-Control: public, max-age=300, s-maxage=3600`

### API Routes (Cloud Function: api)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/request/{slug}` | Submit deletion/support request |

**Security:** Rate limiting (5/min per IP+slug), honeypot field, Zod validation, email confirmation required before request becomes "new".

---

## 6. Cloud Functions

### publicPages (v2, HTTP)
- Parses `/p/{slug}/{lang?}/{page}` routes
- Looks up app via `slugs/{slug}` → `accounts/{accountId}/apps/{appId}`
- Renders HTML using templates from `@apppages/shared`
- Returns proper status codes (200/404/410) and cache headers
- Supports language switching via path segment or `?lang=` query param

### api (v2, HTTP)
- Handles `POST /api/request/{slug}` for public form submissions
- Validates input with `publicRequestSchema` (Zod)
- Rate limits by IP + slug (5 req/min per function instance)
- Rejects non-empty honeypot field
- Creates request doc with `status: "pending_confirmation"`
- Generates confirmation token (TODO: send confirmation email)
- Supports both JSON and URL-encoded form bodies
- Redirects form posts back to the public page with `?success=true`

### onUserCreated (v1, Auth trigger)
- Fires when a new Firebase Auth user is created
- Creates `users/{uid}` profile doc
- Creates `accounts/{uid}` personal account
- Adds `accounts/{uid}/members/{uid}` with `role: "owner"`

### onAppWrite (v2, Firestore trigger)
- Fires on any write to `accounts/{accountId}/apps/{appId}`
- **On delete:** removes `slugs/{slug}` doc
- **On slug change:** removes old slug, reserves new slug
- **On publish (status → "published"):** creates immutable `versions/{n}` snapshot, updates `publishedVersion` and `publishedAt`

---

## 7. Security Model

### Firestore Rules (firestore.rules)

**Principle:** Users can only access data belonging to their account. Public data is never read directly by clients.

| Collection | Read | Write | Notes |
|-----------|------|-------|-------|
| `users/{uid}` | Own user or admin | Own user or admin | Created by onUserCreated |
| `slugs/{slug}` | Any authenticated | Denied (functions only) | Transaction-based uniqueness |
| `accounts/{accountId}` | Members or admin | Owner or admin (no client create/delete) | Created by onUserCreated |
| `accounts/.../members` | Members or admin | Owner or admin | |
| `accounts/.../apps` | Members or admin | Members (create/update), owner/admin (delete) | |
| `accounts/.../versions` | Members or admin | Denied (functions only) | Immutable snapshots |
| `accounts/.../requests` | Members or admin | Members (update only) | Created by api function |
| `abuseReports` | Admin only | Admin only | |

**Admin detection:** `request.auth.token.role == 'admin'` (custom claim)

### Storage Rules (storage.rules)
- `accounts/{accountId}/apps/{appId}/**`: public read, authenticated write (member check, 5MB max, image/* only)

### Input Validation
- All writes validated with shared Zod schemas (`@apppages/shared`)
- Public form input: `publicRequestSchema` (email, type, honeypot)
- App data: `appDataSchema` (all fields validated, slug reserved-word check)
- HTML output: all user text escaped via `escapeHtml()` / `escapeAttr()`

---

## 8. Build Pipeline

### Dependency graph
```
packages/shared (build first)
    ↓                    ↓
functions             apps/dashboard
(tsc → esbuild)       (tsc → vite)
```

### Functions bundling (critical detail)
The `@apppages/shared` workspace package cannot be deployed to Firebase as a `workspace:*` dependency. The solution:

1. `tsc` compiles TypeScript → JavaScript in `functions/dist/`
2. `esbuild.config.js` bundles `dist/index.js` → `dist/bundle.js`
   - Inlines `@apppages/shared` via the `alias` option pointing to `../packages/shared/dist/index.js`
   - Externalizes `firebase-admin` and `firebase-functions` (provided at runtime)
3. `package.json` sets `"main": "./dist/bundle.js"`
4. `@apppages/shared` is a devDependency only — absent from production `dependencies`

### Lazy initialization pattern
Because esbuild produces a single file, all module-scope code runs together. Firestore must be initialized lazily:

```typescript
// ✅ CORRECT — lazy getter
let _db: Firestore;
function db() { return _db ??= getFirestore(); }

// ❌ WRONG — runs before initializeApp()
const db = getFirestore();
```

---

## 9. Internationalization (i18n)

Translations are static TypeScript objects in `packages/shared/src/i18n/`:

- `en.ts` — English strings
- `tr.ts` — Turkish strings
- `index.ts` — `getTranslations(lang)`, `isValidLanguage(lang)`

**Supported languages:** `"en"` | `"tr"` (type: `Language`)

Each app has a `defaultLanguage` and `additionalLanguages` array. Public pages:
- Show a language switcher when multiple languages are available
- Support both path-based (`/slug/tr/privacy`) and query-based (`?lang=tr`) switching
- Include `<link rel="alternate" hreflang="...">` tags

Template functions accept a `Language` parameter and use `getTranslations()` to resolve strings.

---

## 10. Development

### Prerequisites
- Node.js ≥ 20 (project uses 22+ in production)
- pnpm ≥ 9
- Java (for Firebase emulators)

### Commands
| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build:shared` | Build shared package (must run first) |
| `pnpm dev` | Start emulators + Vite dev server |
| `pnpm seed` | Seed emulator with sample data (emulators must be running) |
| `pnpm test` | Run all tests (shared schemas + firestore rules) |
| `pnpm test:shared` | Schema validation tests only |
| `pnpm test:rules` | Firestore rules tests (needs emulator) |
| `pnpm build` | Build everything |

### Emulator seed data (scripts/seed.ts)
Creates:
- 1 user (`dev@example.com`)
- 1 account
- 2 apps: "Weather Pro" (published, EN+TR) and "Görev Yöneticisi" (draft, TR+EN)
- 1 sample deletion request

### Environment variables
Dashboard reads from `apps/dashboard/.env.local`. For emulator development, set `VITE_USE_EMULATORS=true`.

---

## 11. CI/CD

### GitHub Actions (.github/workflows/ci.yml)

**On push to `main`:**
1. `build-test` job: install → build shared → typecheck → test schemas → build functions → build dashboard
2. `deploy` job (only on push, not PR): build all → authenticate with service account → `firebase deploy`

**Service account:** `github-actions@armikom-app-pages.iam.gserviceaccount.com`
Roles: `firebasehosting.admin`, `cloudfunctions.admin`, `firebase.admin`, `iam.serviceAccountUser`

**GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT` — JSON key for the service account
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` — Dashboard build env vars

### Manual deploy
```bash
npx firebase deploy --project armikom-app-pages
```
**Important:** Use `npx firebase` (v13 from devDeps). The global Firebase CLI v15 has a Node 26 incompatibility that causes SIGKILL 137 crashes.

---

## 12. MCP Server (`packages/mcp`)

An MCP (Model Context Protocol) server enables AI agents to programmatically manage AppPages via stdio transport.

### Tools

| Tool | Description |
|------|-------------|
| `list_apps` | List all apps in the account |
| `get_app` | Get full app details (publisher, platforms, data practices, etc.) |
| `create_app` | Create a new draft app with slug reservation (transactional) |
| `update_app` | Partial update of app fields |
| `publish_app` | Publish an app (triggers version snapshot via onAppWrite) |
| `delete_app` | Delete app and release slug |
| `list_requests` | List deletion/support requests (with optional status filter) |
| `update_request` | Update request status (new → in_progress → done/rejected) |
| `get_public_urls` | Get all public page URLs for an app |
| `get_store_links` | Get copy-paste URLs for App Store Connect / Google Play Console |
| `create_api_key` | Create an API key for programmatic access (returns key once) |
| `list_api_keys` | List API keys for the account (prefix + label, never full key) |
| `revoke_api_key` | Permanently revoke an API key |

### Authentication

The MCP server supports two auth modes:

#### 1. API Key (recommended for agents)

API keys are stored in Firestore (`apiKeys/{sha256Hash}`) and bound to an account. The agent only needs the key — no ADC, no account ID.

```json
{
  "apppages": {
    "type": "stdio",
    "command": "node",
    "args": ["/path/to/apppages/packages/mcp/dist/index.js"],
    "env": {
      "APPPAGES_API_KEY": "apk_a1b2c3d4..."
    }
  }
}
```

**Creating a key:** Use the `create_api_key` tool (requires ADC or an existing key first), or create one manually in Firestore.

**Key format:** `apk_` prefix + 48 hex chars (24 random bytes). Stored as SHA-256 hash in Firestore — the raw key is shown only once at creation time.

**Scoping:** Keys can optionally be scoped to specific tools (e.g., `["list_apps", "get_app", "get_public_urls"]`). An empty scopes array means all tools are allowed.

**Revoking:** Use `revoke_api_key` with the key hash from `list_api_keys`. Revocation is irreversible.

#### 2. ADC / Service Account (admin mode)

For initial setup or admin operations, authenticate via Firebase Admin SDK:

```json
{
  "apppages": {
    "type": "stdio",
    "command": "node",
    "args": ["/path/to/apppages/packages/mcp/dist/index.js"],
    "env": {
      "FIREBASE_PROJECT_ID": "armikom-app-pages",
      "APPPAGES_ACCOUNT_ID": "<account-id>"
    }
  }
}
```

Uses `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON) or Application Default Credentials (`gcloud auth application-default login`).

### API Key Data Model

```
apiKeys/{sha256Hash}
├── prefix: string        # "apk_a1b2c3d4..." (first 12 chars + "...")
├── accountId: string     # Account this key grants access to
├── uid: string           # User who created the key
├── label: string         # Human-readable label
├── active: boolean       # false = revoked
├── scopes: string[]      # Allowed tools (empty = all)
├── createdAt: Timestamp
├── lastUsedAt: Timestamp | null
└── revokedAt?: Timestamp # Set when revoked
```

**Security:**
- Raw keys are never stored — only SHA-256 hashes
- Firestore rules: account owners can read/create keys for their account; only admins can update/delete
- `lastUsedAt` is updated on each successful authentication

### Build

```bash
pnpm --filter @apppages/mcp build   # tsc → dist/index.js
```

---

## 13. Future Work (Out of Scope for v1)

| Feature | Status | Notes |
|---------|--------|-------|
| Payments / billing | Plan field exists | Add Stripe integration, enforce `PLAN_LIMITS` |
| Custom domains per app | URL structure supports it | Firebase Hosting multi-site |
| Team invitations | Account/member model ready | Add invite flow, accept/reject |
| Apple sign-in | Code removed (was working) | Needs Apple Services ID configuration |
| More languages | i18n structure extensible | Add new `{lang}.ts` files |
| App Check / reCAPTCHA | Documented, not wired | Needs Firebase Console setup |
| Email sending | Interface ready | Wire Trigger Email extension or SMTP |
| Playwright e2e tests | Directory exists | Write tests for auth flow, app creation, public pages |
| PII auto-purge | Field exists (`resolvedAt`) | Cloud Function to delete requester PII after configurable period |
| Firebase Storage init | Not done | Click "Get Started" in console, then deploy storage rules |
