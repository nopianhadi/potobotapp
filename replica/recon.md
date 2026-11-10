# Recon map: LumaBooth Android Photobooth (web reconstruction)

Scope: Original-branded browser app for event setup, photo capture, session review, and event gallery. Product-level modes and integrations are inventoried, but Android package-version parity is unverified.
For: Photobooth operators and event organizers using a phone, tablet, or desktop browser.
Date: 2026-11-07

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Google Play listing | https://play.google.com/store/apps/details?id=co.lumasoft.lumabooth | Public listing currently describes photo, GIF, video, 360/slow motion, event setup, sharing, printing, gallery, and multiple events. Two promotional screenshots were viewed for guest flow only: mode selection on welcome screen, then camera preview/countdown. No screenshot was saved or shipped. Listing is newer than the supplied 1.1.2 package; not evidence that every feature existed in that APK. |
| 2 | Android getting started | https://support.lumasoft.co/en/articles/16151646-getting-started-with-lumabooth-for-android | Documents sign-in, event design in the Dashboard, sync, booth launch, QR sharing, and printing. Current article, version applicability to APK 1.1.2 unknown. |
| 3 | Android hardware requirements | https://support.lumasoft.co/en/articles/16151452-getting-started-lumabooth-for-android-hardware-system-requirements | Android 8+, 4 GB RAM minimum, built-in cameras, Wi-Fi requirements; DSLR/mirrorless cameras are explicitly unsupported by Android app. |
| 4 | Android printing | https://support.lumasoft.co/en/articles/16151628-printing-with-lumabooth-for-android | IPP/IPPS network printing; same Wi-Fi and mDNS discovery; direct USB dye-sub printing requires a separate print server/device. |
| 5 | Android 360/slow motion | https://support.lumasoft.co/en/articles/16151631-360-and-slow-motion-booth-features-on-android | 120/240 fps depends on camera hardware; optional motion trigger and video overlays/audio are described. |
| 6 | Create an event | https://support.lumasoft.co/en/articles/14206123-lumabooth-dashboard-create-a-new-event | Public Dashboard workflow: choose experience, event details, layouts, countdown, capture modes, welcome screen, survey/disclaimer, sharing, and gallery. |
| 7 | Dashboard overview | https://support.lumasoft.co/en/articles/14262483-what-is-the-lumabooth-dashboard | Browser-based event management, templates/assets and sync; notes supported companion app versions and online requirement. |
| 8 | Online gallery settings | https://support.lumasoft.co/en/articles/16528045-online-gallery-settings-in-the-dashboard | Gallery stats, share-link/privacy settings, download/upload, embed, slideshow, analytics, shares, and event deletion. Current product docs. |

## Evidence boundary

The supplied XAPK is not unpacked, decompiled, or used to inspect DEX, private endpoints, or proprietary assets. Existing `_recon/` outputs were produced from binary extraction and are intentionally excluded as evidence. Therefore package-specific screen states, exact version 1.1.2 features, visual measurements, permissions, and backend protocol cannot be confirmed here. Public sources describe the current product and may postdate that package. Two public promotional screenshots were inspected for broad guest-flow cues only; no reference screenshot or asset is bundled. All interface copy/assets in this reconstruction are original.

## Core loop

An operator prepares an event and its booth options in a browser, launches a guest-facing capture flow, saves a photo session, then reviews and shares or prints the result.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Workspace overview | `/` after opening the app | Find recent events and begin setup or booth operations | Sidebar, event list, activity summary, create event | seeded, empty, search, mobile |
| S02 | Event setup | Create event or open an event | Choose experience and configure event identity and capture options | Event form, mode toggles, layout preview, consent settings | new, editing, validation error, saved |
| S03 | Booth welcome | Launch event | Present a branded guest start point | Event title, mode selection, camera readiness, start action | camera unavailable, ready, permission denied; public promotion shows mode choice |
| S04 | Capture | Start a session from S03 | Capture guest photo using device camera | Live preview, countdown, shutter, camera switch, retake | requesting permission, live preview with countdown and capture sequence shown in public promotion, capture error |
| S05 | Session review | After capture | Confirm, retake, save, and choose a sharing action | Image preview, guest details/consent if enabled, save/share/download | draft, saved, invalid form |
| S06 | Event gallery | Select event / Gallery nav | Browse and manage event media | Search/filter, image grid, select, download, delete | empty, populated, selected, mobile |
| S07 | Media detail | Select a gallery item | Inspect an item and perform local actions | Large preview, metadata, download, print dialog, delete | photo, video-capable item, unavailable media |
| S08 | Event insights | Event dashboard | Review session/media/share counters | Summary metrics and activity list | no activity, populated |
| S09 | Layout and branding | Event setup | Configure an original welcome look and photo frame | Color, title, layout choices, preview | defaults, customized |
| S10 | Preferences | Workspace settings | Configure local camera, consent defaults, and workspace | Settings form, permission status | default, permission missing |

## Flows

```
F01 Operator prepares an event
    S01 -> S02 -> S09 -> S01
    happy path clicks: 4
    edge: blank/long name, invalid date, reload after save, duplicate event

F02 Guest takes and saves a photo
    S01 -> S03 -> S04 -> S05 -> S06
    happy path clicks: 4 plus capture countdown
    edge: permission denied, no camera, retake, refresh mid-session, storage failure

F03 Operator finds and shares a result
    S06 -> S07 -> S07
    happy path clicks: 2
    edge: empty gallery, deleted media, unsupported share target, mobile download

F04 Operator prints a result
    S06 -> S07 -> browser print dialog
    happy path clicks: 2 plus system print confirmation
    edge: printer unavailable, browser print limitations, non-photo media

F05 Guest gives consent and answers a survey
    S03 -> S04 -> S05 -> S06
    happy path clicks: 4
    edge: consent declined cancels the session, required answer omitted, long/emoji answer
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, quiet, destructive, icon | hover, focus, disabled, loading | all |
| Sidebar navigation | expanded, compact, mobile drawer | current, hover | S01, S06, S08, S10 |
| Event row/card | active, upcoming, past | selected, hover, empty | S01 |
| Mode selector | photo, GIF, video, 360 | enabled, disabled, selected | S02, S03 |
| Form field | text, date, checkbox, color, select | idle, focus, error, disabled | S02, S09, S10 |
| Camera preview | live, still, fallback | permission, loading, error | S03-S05 |
| Media tile | photo, video, selected | hover, selected, unavailable | S06 |
| Dialog | confirm, form, permission | open, submitting, error | S01-S10 |
| Toast/status | success, warning, error, info | transient | all |

## Inferred data model

```
Workspace  id, name, created_at
            evidence: Dashboard is an account-level browser workspace; exact tenancy fields are not public. confidence: medium
Event      id, workspace_id, title, event_date, experience, settings_json, created_at, updated_at
            evidence: S02, event creation guide, gallery docs. confidence: high for concepts, medium for field shape
Session    id, event_id, capture_mode, status, consent, answers_json, started_at, completed_at
            evidence: Play listing and Android getting started. confidence: high for concept, medium for fields
Media      id, session_id, event_id, media_type, blob_key, created_at, metadata_json
            evidence: listing and gallery docs. confidence: high for concept, medium for fields
ShareEvent id, event_id, media_id, channel, status, created_at
            evidence: gallery dashboard tracks email/SMS/WhatsApp shares. confidence: medium
PrintJob   id, event_id, media_id, printer_uri, status, created_at
            evidence: Android printing guide documents IPP jobs. confidence: medium
```

Relationships: Workspace 1-n Event; Event 1-n Session; Session 1-n Media; Event 1-n ShareEvent; Media 1-n ShareEvent; Event 1-n PrintJob.

## Feature matrix

See `features.csv`. Priorities are reconstruction priorities, not original plan entitlements. Publicly described capabilities are marked `original=yes` for the current product only; version 1.1.2 remains unverified.

## Out of scope (cannot or should not be cloned)

- Original source, DEX, private API endpoints, brand identity, copy, templates, and media assets.
- Original account system, subscription entitlements, cloud content, licensed template library, and proprietary AI processing.
- Native Android kiosk pinning, direct Android camera controls, 120/240 fps hardware capture, motion trigger, and native IPP/mDNS printer discovery in a browser.
- SMS/email/WhatsApp delivery and cloud gallery hosting without provider accounts, consent/compliance setup, and a production backend.
- Exact feature parity for supplied APK 1.1.2, because the binary was not analyzed and current official docs may describe newer behavior.

## Size

Screens 10, flows 5, entities 6. Hard parts: browser camera permission/device variance, reliable media storage, native printer/messaging integrations, and secure multi-tenant SaaS backend. Product-wide parity: XL. A useful browser vertical slice: M.