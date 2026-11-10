# Bug report

## Fixed

### BUG-001: Save button remained disabled after event creation

- Severity: S3
- Flow / case: F01-H1
- Screen: S02
- Build: working tree; browser click-through on Chromium, 2026-11-07

Steps
1. Create a new event and save it.
2. Observe the editor after navigation to the saved event.

Expected: The saved event editor is usable and its save action is enabled.
Actual: Before the fix, the button remained in “Menyimpan…” state after successful navigation.
Evidence: Reproduced in browser, then fixed by clearing the saving state before navigation; covered by F01-H1.
Status: fixed in working tree.

## Open reproduced bugs

None at the time of this report. Camera hardware was unavailable, which is a test limitation rather than a reproduced product bug.

## To check

- Successful photo/GIF/video capture on a physical Android and desktop browser, including camera switching and microphone-denied states.
- Browser quota exhaustion and recovery for larger video files.
- Native file share and operating-system print dialog behavior on supported mobile devices.
- Supabase RLS isolation with a second user after backend activation.
- Exact feature parity for supplied Android package 1.1.2; its binary was deliberately not decompiled or inspected.