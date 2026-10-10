# Architecture Decisions

## D001: Personal account uses UID as account ID
**Decision:** When a user signs up, their personal account ID equals their Firebase Auth UID.
**Rationale:** Simplifies the personal account → user mapping without an extra lookup. When teams are added later, team accounts will have generated IDs and won't conflict with UIDs.

## D002: Public pages served via /p/ prefix
**Decision:** All public pages are under `/p/{slug}/...` rather than `/{slug}/...`.
**Rationale:** Avoids slug conflicts with dashboard routes (`/login`, `/settings`, `/apps/...`). The `/p/` prefix is short, stable, and makes Firebase Hosting rewrites unambiguous. A future custom-domain feature can serve pages at the root of a dedicated domain.

## D003: Slug uniqueness enforced via /slugs collection
**Decision:** A top-level `slugs/{slug}` collection stores the `accountId` and `appId` mapping. Slug reservation happens inside Firestore transactions (in the dashboard's `useApps.createApp` and the `onAppWrite` trigger as a safety net).
**Rationale:** Firestore doesn't support unique constraints, so a dedicated collection with transactional writes is the standard pattern.

## D004: Server-rendered public pages (no client-side framework)
**Decision:** Public pages are plain HTML rendered by a Cloud Function, with CSS inlined.
**Rationale:** Must work with JavaScript disabled (store reviewers and crawlers). Fast first paint, small payload, mobile-friendly. CDN caching makes repeated loads very fast.

## D005: Form submissions always go through Cloud Functions
**Decision:** Public-facing forms (deletion, support) POST to `/api/request/{slug}`, never write to Firestore directly.
**Rationale:** Enables rate limiting, honeypot validation, and email confirmation without exposing Firestore to unauthenticated writes.

## D006: Email confirmation before request becomes "new"
**Decision:** Deletion and support requests start in `pending_confirmation` status. They become `new` only after the requester clicks a confirmation link.
**Rationale:** Prevents abuse (someone else submitting deletion requests for another user's email).

## D007: Versions are immutable snapshots
**Decision:** Publishing creates an `apps/{appId}/versions/{n}` doc with a full copy of the app data at that point.
**Rationale:** Enables viewing historical policies, which is important for legal compliance.

## D008: i18n via static string maps, not a runtime library
**Decision:** Translations are plain TypeScript objects in `packages/shared/src/i18n/`.
**Rationale:** Zero runtime overhead, type-safe, easy to audit, and sufficient for 2 languages. If more languages are needed, the same structure scales or can be replaced with a library.

## D009: In-memory rate limiter in Cloud Functions
**Decision:** The API function uses a per-instance in-memory rate limiter rather than a distributed one.
**Rationale:** Simpler for v1. Effective for low-to-moderate traffic. For production scale, should be replaced with Redis or Firestore-backed rate limiting.

## D010: No App Check / reCAPTCHA in v1 seed
**Decision:** App Check and reCAPTCHA Enterprise are documented as setup steps but not wired in code yet.
**Rationale:** Requires Firebase Console configuration that can't be automated in code. The honeypot field and rate limiter provide basic bot protection for v1.

## Out of Scope for v1
- Payments / billing
- Custom domains per app
- Team invitations / multi-member accounts
- Languages beyond EN and TR
- App Check integration (documented, not implemented)
- Trigger Email extension integration (interface ready, needs SMTP config)
