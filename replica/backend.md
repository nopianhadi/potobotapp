# Backend readiness

## Current state

With no Supabase environment configured, the app uses an IndexedDB repository scoped to the current browser profile. When both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, email signup/sign-in/reset and the cloud repository are enabled. The cloud repository provisions the first workspace, scopes queries to the signed-in user's workspace, and stores media in a private bucket. The browser never receives a service-role key. No project credentials are configured in this workspace, so the cloud path has only been typechecked, not connected to a live Supabase project.

The current Vite SPA uses Supabase JS PKCE with its browser-persisted session. This is a development integration, not the preferred production session boundary: before public launch, move auth to a trusted server/SSR layer with HTTP-only secure cookies and add a strict CSP/XSS review. RLS remains mandatory even after that change.

Auth credentials and the Supabase session remain in the browser's auth storage in this SPA. The anon key is designed for public clients and access depends on RLS; never put the service-role key in any `VITE_*` variable. The live signup/reset flow and owner-only membership policies have not been exercised against a real project.

The SaaS target is documented in `architecture.md` and `schema.sql`: Supabase Auth/Postgres/Storage with workspace-scoped RLS; Edge Functions for guest tokens, signed uploads, external delivery, and verified webhooks. A Supabase project and all provider accounts/keys remain user-owned prerequisites.

## Activation checklist

- [ ] Create a Supabase project and apply `schema.sql` as a migration.
- [ ] Configure Auth email verification, redirect allowlist, SMTP sender, and secure session settings; test the implemented signup/reset flow against the project.
- [ ] Move browser-persisted Supabase JS sessions behind a trusted SSR/server boundary with HTTP-only secure cookies before production.
- [x] Add signup provisioning for a workspace and its owner membership on first authenticated data load.
- [ ] Add RLS integration tests using two users in separate workspaces; prove cross-tenant reads/writes return no records and only owners can manage members.
- [x] Define a private media bucket with workspace-path RLS, signed download URLs, MIME allowlist, and 50 MB limit in `schema.sql`.
- [x] Add a cloud repository behind the shared repository interface for events, sessions, media, and counts.
- [ ] Add retry/offline/conflict behavior before enabling cross-device sync.
- [ ] Create separate Edge Functions for event-scoped booth tokens, upload finalization, guest gallery access, and delete/export requests.
- [ ] Add server-side validation, authorization, idempotency keys, and rate limits to every function.
- [ ] Configure `.env.local` from `.env.example`; keep `SUPABASE_SERVICE_ROLE_KEY`, Stripe secret, and Resend secret server-only.
- [ ] Verify signup confirmation, password reset, two-user RLS isolation, private Storage upload/download/delete, and workspace deletion in a provisioned Supabase project.
- [ ] Add Stripe Checkout/Customer Portal in test mode and verified, idempotent subscription webhooks before adding plan gates.
- [ ] Add transactional email with verified sender domain, opt-in and unsubscribe rules; evaluate SMS/WhatsApp only through official APIs.
- [ ] Configure backups, retention, privacy policy, data export/deletion, monitoring, and incident response.
- [ ] Run dependency audit and security review before a public SaaS deployment.

## Payments and integrations

Not implemented. No real subscription status is represented in local mode, and no card details or provider keys are collected. Printer support is browser print only; IPP/mDNS discovery needs a separate trusted bridge and a documented local-network threat model.