# Flashfold component specifications

## Button

- Variants: primary, secondary, quiet, destructive, icon-only.
- Sizes: compact 34px, standard 40px, touch 48px.
- States: hover, active, focus-visible (2px focus token with offset), disabled, loading; loading keeps its accessible name.
- Tokens: accent/on-accent, surface/text, danger, `radius-md`, `text-sm`.
- Accessibility: native `button`, explicit labels for icon-only actions, disabled semantics, no color-only status.
- Used on: all screens.

## Navigation

- Variants: desktop sidebar, compact mobile bottom bar, mobile drawer for secondary destinations.
- States: current route, hover, keyboard focus, collapsed, expanded.
- Accessibility: `nav` with a label, `aria-current="page"`, keyboard reachable, visible focus.
- Used on: S01, S06, S08, S10.

## Form field

- Variants: text, date, select, checkbox, color, textarea.
- States: idle, hover, focus, invalid, disabled, helper/error message.
- Tokens: `surface`, `text`, `text-muted`, `border-input`, `focus`, `radius-sm`.
- Accessibility: persistent visible label, described-by helper/error, native input semantics, errors announced.
- Used on: S02, S05, S09, S10.

## Experience selector

- Variants: photo, GIF, video, 360; only implemented modes are enabled.
- States: default, selected, unavailable with reason, focus-visible.
- Accessibility: radio group for one experience; checkbox group for allowed combinations.
- Used on: S02, S03.

## Camera stage

- Variants: permission prompt, live preview, captured still, unavailable fallback.
- States: requesting, ready, capture countdown, captured, camera error, permission denied.
- Accessibility: status updates use a polite live region; camera switch has a label; shutter reachable by keyboard; video preview is muted and decorative.
- Used on: S03-S05.

## Media tile

- Variants: photo, video placeholder, selected.
- States: default, hover, focus, selected, unavailable.
- Accessibility: item name and date available to assistive technology; selection uses a real checkbox; image alt is contextual.
- Used on: S06.

## Print layout editor

- Variants: 4x6 sheet, 2x6 strip, single photo, double frame, three-photo strip.
- States: default, selected slot, dragging, resizing, image background preview, invalid/oversized background, max slot count, one-slot minimum.
- Tokens: surface, muted surface, border, secondary, focus, `radius-md`, `space-*`.
- Accessibility: each photo slot is keyboard reachable; arrow keys move it and Shift+arrow resizes it; add/remove controls have names.
- Used on: S09 and gallery print output.

## Dialog and toast

- Dialog states: closed, open, submitting, error; focus is trapped and restored.
- Toast variants: success, warning, error, informational; auto-dismiss does not hide critical errors.
- Accessibility: native dialog where supported, `role="status"` for non-critical updates, `role="alert"` for errors.
- Used on: S01-S10.

## Layout rules

- App navigation is stable on desktop and becomes a compact bottom navigation on narrow screens.
- Content sections remain unframed; only repeated event/media items and true dialogs use surface containers.
- No component uses a raw color; all color, radius, spacing, and typography values come from `tokens.css`.