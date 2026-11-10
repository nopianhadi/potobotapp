# Parity report: Flashfold

Date: 2026-11-07. Reference boundary: current public product docs, not verified against the supplied Android package version 1.1.2.

## Feature score

**88.5 / 100** across 21 scored features. Must-haves: **7 of 8 done**. Email authentication and a workspace-scoped cloud repository are now implemented behind optional Supabase configuration, but live RLS isolation has not been tested with a provisioned project and production-grade HTTP-only sessions are not in place. The Replica diff skill still classifies this as **not shippable** for SaaS; the local browser mode remains fully usable.

Weakest areas: 360/slow-motion mode (50%), sharing (50%), analytics (50%), SaaS account controls (50%), gallery (83.3%). Event setup, capture, and compliance score 100% within the matrix definitions.

## Visual comparison

No layout score is reported. Two public Play Store promotional images were inspected for broad guest-flow cues, but were not saved as reference screenshots; the supplied XAPK was not decompiled. The screens therefore cannot be compared at identical viewport/state without exceeding the evidence available. The app's original branding and responsive layouts were visually checked at desktop and 390x844, but that is not a pixel/layout parity measurement.

## Behavior differences

| flow | current public product description | Flashfold | decision |
| --- | --- | --- | --- |
| F01 Event setup | Account-based dashboard with synced events and richer layout/template options | Local event CRUD, mode toggles, consent/survey, welcome preview, duplicate/delete | Keep local-first for this prototype; connect Auth/DB before SaaS use |
| F02 Guest capture | Native Android camera and capture modes; device-specific recording behavior | Browser camera photo, GIF, and standard video; true high-frame-rate/360 hardware behavior unavailable | Keep; document native limitations and validate on real hardware |
| F03 Gallery/share | Cloud event gallery and provider integrations may be available by plan | IndexedDB gallery, download, Web Share when supported | Keep local storage for demo; implement signed public gallery and provider APIs next |
| F04 Printing | Android IPP/IPPS discovery and printer workflows | Print-ready browser page/system print route | Keep; direct printing needs a separate reviewed bridge |
| F05 Consent/survey | Current dashboard docs include consent and configurable questions | Consent gate and one optional text answer saved with session | Keep; add schema/versioning and privacy retention when cloud-backed |

## Top five next steps

1. Provision Supabase, verify Auth onboarding/workspace provisioning, and add two-user RLS integration tests.
2. Verify private Storage policies, signed downloads, two-user RLS isolation, and workspace deletion in a provisioned Supabase project.
3. Add retry/offline behavior, account export/deletion, and a production HTTP-only session boundary.
4. Add revocable event guest links with privacy/password controls and a public gallery.
5. Add provider-backed sharing, a reviewed print bridge, and physical high-frame-rate testing only after consent, security, and user-owned services are configured.

## Not included in score by design

QR guest sharing, direct email/SMS/WhatsApp delivery, IPP/mDNS printer discovery, cross-device sync, third-party licensed templates, proprietary AI processing, and native Android kiosk pinning are documented skips, not implied support.