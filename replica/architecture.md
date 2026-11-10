# Architecture: Snapframe

## Stack

- Web: React + TypeScript + Vite. The requested product is a browser app; Vite keeps the guest booth fast and avoids coupling camera access to server rendering.
- Routing: React Router. Event setup, booth, gallery, insights, and settings are direct-linkable client routes.
- Styling: CSS custom properties plus CSS modules. A small token system keeps the dashboard and guest-facing capture surface coherent without a large component framework.
- Database/auth/storage: Supabase Postgres, Auth, and private Storage. One managed platform provides the production SaaS tenancy boundary and media storage.
- ORM/data layer: Supabase JS client with typed repositories and server-side authorization; no second database/ORM.
- Payments/email/jobs: Stripe Billing, Resend, and Supabase Edge Functions/cron only after the user provisions accounts and keys. These are architecture targets, not active integrations in this workspace.
- Hosting: Vercel for the web client; Supabase for managed data/functions. No secrets are put in the client bundle.
- Repository boundary: IndexedDB is the default when Supabase env vars are absent; when configured, Supabase Auth/Postgres/Storage is selected through the same repository interface. The live cloud path still needs a provisioned project and RLS integration testing.
- Auth boundary: email signup/sign-in/reset is implemented using Supabase JS PKCE. The SPA currently persists its Supabase session in browser storage; use a trusted SSR/server boundary with HTTP-only secure cookies before production.
- Auth boundary: email signup/sign-in/reset is implemented using Supabase JS PKCE. The SPA currently persists its Supabase session in browser storage; use a trusted SSR/server boundary with HTTP-only secure cookies before production.

## Schema

See `schema.sql`. Tables: `workspaces`, `workspace_members`, `events`, `sessions`, `media_items`, `share_events`, and `print_jobs` (7). User-owned records carry `workspace_id`; all reads/writes are tenant-scoped by RLS. Media lives in a private bucket and is served through short-lived signed URLs. The SQL uses UTC `timestamptz` for instants, `date` for event calendar dates, checks for constrained states, and indexes for foreign keys and common list ordering.

## Routes and data operations

| method / route | what it does | who can call it | input / output | flow |
| --- | --- | --- | --- | --- |
| `GET /` | List workspace events and activity | signed-in member | filters -> event summaries | F01 |
| `POST /events` | Create event and default settings | owner/admin/editor | title, date, experience -> event | F01 |
| `PATCH /events/:id` | Update settings and branding | owner/admin/editor | validated event fields -> event | F01 |
| `POST /events/:id/duplicate` | Copy event configuration without media | owner/admin/editor | source event -> new event | F01 |
| `POST /events/:id/sessions` | Start a guest capture session | event booth token or signed-in member | mode/consent -> session | F02, F05 |
| `POST /media/upload-url` | Create a short-lived upload URL | valid event booth token | event/session/type -> signed URL | F02 |
| `POST /sessions/:id/complete` | Commit metadata and survey answers | matching booth token | answers/media metadata -> session | F02, F05 |
| `GET /events/:id/media` | List gallery media | workspace member or permitted guest link | page/filter -> media list | F03 |
| `DELETE /media/:id` | Delete media and storage object | owner/admin/editor | media id -> status | F03 |
| `POST /shares` | Record a share action | workspace member or booth token | media/channel/status -> share event | F03 |
| `POST /print-jobs` | Queue a print request for a configured integration | workspace member or booth token | media/print options -> job | F04 |
| `GET /events/:id/insights` | Aggregate session/media/share counters | owner/admin/editor | date range -> metrics | F03 |
| `POST /webhooks/stripe` | Apply subscription events idempotently | verified Stripe only | signed event -> 2xx | SaaS billing |
| `POST /webhooks/resend` | Process provider delivery events if enabled | verified provider only | signed event -> 2xx | notifications |

In production, the client uses Supabase Auth and RLS for direct CRUD where safe; Edge Functions own signed uploads, guest-link access, external sends, and webhooks. Every function validates input and rechecks membership. The local adapter implements only browser-local CRUD and camera/media operations; it does not pretend to be a cloud API.

## Risks and controls

- Camera permissions and device differences: request only on explicit booth launch; explain denial and keep a non-camera preview state. `getUserMedia` requires HTTPS except localhost.
- Storage: keep binary media in IndexedDB locally; enforce type/size limits, show storage errors, and never place image data in URLs. Production uses private object storage and signed URLs.
- Multi-tenancy: workspace membership is checked on every data query. RLS tests must prove a second workspace cannot read or mutate records.
- Guest access: use random, revocable, event-scoped booth tokens and rate limits; do not make media buckets public by default.
- Time: store event/session instants in UTC `timestamptz`, retain IANA event timezone for display and event local date separately.
- Idempotency: unique provider event IDs for webhook receipts; upload and session completion endpoints accept idempotency keys.
- Printer integration: browsers cannot reproduce Android's IPP/mDNS discovery reliably; a separate trusted local print bridge is required for real printer queues.
- Messaging: email/SMS/WhatsApp need provider accounts, opt-in and deliverability controls; current workspace does not send messages.
- Privacy: consent text/version and answers are stored with the session; implement export and deletion workflows and disclose all processors in a real privacy policy.
- Billing: subscription state comes only from verified Stripe webhooks; no client-supplied plan flags.
- Offline: local mode works on this browser only; cloud sync/conflict resolution is not implemented.

## Build order

1. Vertical slice (F01 + F02): create/edit an event, request camera, capture/review/save a photo, and find it in that event's gallery. Tables `events`, `sessions`, `media_items`; routes `/`, `/events/new`, `/events/:id/setup`, `/events/:id/booth`, `/events/:id/gallery`.
2. Media actions (F03/F04): download, share through browser capability when available, and print through the system dialog. Add `share_events` and `print_jobs`; no direct messaging or IPP claim.
3. Guest experience (F05): event disclaimer and optional survey; persist consent/answers against a session.
4. SaaS activation: configure Supabase project, migrations, auth, RLS tests, private storage, and signed guest access.
5. External integrations: Stripe test mode, transactional email, then assess official WhatsApp/SMS providers and a print bridge.
6. Hardening: accessibility, browser/device matrix, backup/restore, deletion/export, rate limits, monitoring, and security review.

## SaaS credentials not yet provisioned

Required future variables are listed in `.env.example`. Do not add real values to this repository. Supabase project, Stripe, Resend, verified domain, legal policy, and provider approval are user-owned prerequisites.