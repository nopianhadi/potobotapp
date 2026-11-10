# Test plan: Flashfold

Build: working tree, 2026-11-07. Environment: local Vite, Chromium, IndexedDB; camera hardware unavailable.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | prepare event | happy | Create event, enable GIF/consent/survey, save, reload | Settings persist; event remains editable | Playwright + axe | pass |
| F01-E1 | prepare event | empty input | Submit without event title | Required field prevents save; no event created | manual | not run |
| F01-E2 | prepare event | duplicate/delete | Duplicate event, confirm settings copied, delete only the copy | Original remains; duplicate has no copied sessions/media | Playwright + repository test | pass |
| F01-E3 | prepare event | long input | Enter 100 characters and attempt 101st | Input is capped at 100; page remains usable | manual | not run |
| F02-H1 | guest captures | happy | Start booth with generated camera stream, wait for preview dimensions, capture, save, open gallery | Preview attaches before shutter enables; one saved photo appears in gallery | Playwright synthetic stream | pass; physical camera remains a manual check |
| F02-N1 | guest captures | permission denied | Deny camera and start booth | Permission-specific message, retry and return actions appear; no session saved | Playwright mocked permission denial | pass |
| F02-N2 | guest captures | camera not found | Simulate `NotFoundError` from camera API | “Kamera tidak ditemukan” guidance and retry action appear | Playwright mocked missing device | pass |
| F02-E1 | guest captures | double submit | Double-click Save result under slow storage | A single media/session pair is created | unit guard + manual | guard implemented; manual not run |
| F02-E2 | guest captures | storage failure | Fill browser quota and save | Error remains visible; pending capture is recoverable | manual | not run |
| F03-H1 | browse/share | happy | Seed media, open gallery item, use browser share/download | Preview and download are available; unsupported share is explained | Playwright seeded media | pass |
| F03-E1 | browse/share | empty/filter | Open empty gallery, filter media types, search | Empty/filter states are understandable | Playwright + manual | pass for empty state |
| F03-E2 | browse/share | delete | Confirm deletion of selected media | Item disappears and cannot be reopened | repository test | pass at data layer; UI confirmation not automated |
| F04-H1 | print | happy | Open item and select Print | Print-ready browser page opens | Playwright | pass; OS printer dialog not automated |
| F04-E1 | print | blocked popup | Block popups and select Print | Clear popup permission notice appears | manual | not run |
| F05-H1 | consent/survey | happy | Try to start without consent, accept, then complete a capture and answer survey | Consent is required; answer is stored with saved session | Playwright consent gate + repository test | partial; successful capture requires camera |
| A11Y-01 | accessibility | automated | Axe scan dashboard, event setup, gallery | No axe violations | Playwright + axe-core | pass |
| MOB-01 | responsive | mobile | Open event editor at 390x844 | Bottom navigation visible; no horizontal overflow | Playwright | pass |
| AUTH-H1 | SaaS auth | signup/reset | Configure Supabase, confirm signup email, reset password, sign out | User can authenticate and first workspace is created | manual integration | blocked: no Supabase project credentials |
| RLS-N1 | SaaS isolation | negative | Sign in as user A and attempt to read/update user B workspace and storage | No cross-workspace rows or objects are visible; only owner manages memberships | integration test | blocked: no Supabase project credentials |

Coverage notes: Playwright fails on console errors, uncaught page errors, and 5xx responses. Media integration tests use a generated local test blob. Physical camera capture, actual OS print dialogs, native file sharing, and screen-reader testing require a real device/manual pass.