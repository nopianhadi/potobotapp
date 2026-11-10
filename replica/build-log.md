# Build log

Date: 2026-11-07. Build target: browser-first local vertical slice, original Flashfold identity.

| ID | status | implemented | remaining |
| --- | --- | --- | --- |
| S01 Workspace overview | done | Event list, local counters, create entry, empty state | Cloud account/workspaces |
| S02 Event setup | done | Event identity/date, experience modes, consent/survey, welcome text, accent and layout settings, duplicate/delete | Rich template editor and remote sync |
| S03 Booth welcome | done | Guest-facing mode choice, event welcome, consent gate, print-template image background fallback | Native kiosk lock and QR handoff |
| S04 Capture | partial | Browser photo, 3-second countdown, GIF frame encoding, five-second video, camera-device switch, facing-mode preference fallback, video-only fallback when microphone is missing, actionable camera errors and retry | Physical-device verification; true 360/high-speed/motion-trigger capture |
| S05 Session review | done | Retake, optional response, consent metadata, print-template photo-slot preview, guarded save, success state; synthetic camera stream tested through gallery | Capture on a physical camera not verified in this environment |
| S06 Event gallery | done | IndexedDB media grid, filters, time search, original/template view, download original, delete, share fallback | Guest/public access and cloud upload |
| S07 Media detail | done | Original/template toggle, Web Share when available, original download, print-ready page, delete | Direct IPP printer integration |
| S08 Event insights | done | Local session/media counts and seven-day activity | Share analytics and remote aggregation |
| S09 Layout and branding | partial | Original welcome preview, color choices, editable 4x6/2x6 print layouts, keyboard slot controls, image backgrounds, Markdown import, layout-aware browser printing | Physical printer calibration and licensed template catalog remain out of scope |
| S10 Preferences | done | Camera permission check, local-data notice, clear-all action | User/account/team settings |

Vertical slice: event setup to booth, capture implementation, local persistence, and gallery. Browser camera end-to-end is partial because the test machine exposes no camera. No original source, API, copy, templates, or media assets are included.