# Flashfold brand brief

## Name

**Flashfold** is a provisional original name for an event photo booth workspace. It combines quick capture with the way event moments fold into a keepsake. It is not cleared for commercial use.

Twenty candidates considered: Event Frame, Booth Studio, Party Capture, Event Portraits, Flashfold, Snapfolio, FrameSpring, CaptureNest, PartyFrame, PopMoment, ShutterBloom, Vellune, Orilo, Festivo, Vanta, Keepsake, Lantern, StoryArc, Gather, and Spark.

Shortlist: Flashfold, FrameSpring, CaptureNest, PopMoment, and ShutterBloom. Flashfold is the working choice because it is pronounceable, suggests the event-photo category, and does not imitate the reference name. This is a screening judgment only.

## Name checks

All checks below are **to run** as of 2026-11-07. No domain, trademark, app-store, handle, or legal availability is claimed. Run the same checks for each shortlisted candidate before investing in the name.

| check | Flashfold | FrameSpring | CaptureNest | PopMoment | ShutterBloom |
| --- | --- | --- | --- | --- | --- |
| US trademark, classes 9 and 42 | to run | to run | to run | to run | to run |
| EU trademark / TMview | to run | to run | to run | to run | to run |
| Canada trademark | to run | to run | to run | to run | to run |
| WIPO Global Brand Database | to run | to run | to run | to run | to run |
| Domain registrar / WHOIS | to run | to run | to run | to run | to run |
| Apple App Store and Google Play | to run | to run | to run | to run | to run |
| X, Instagram, TikTok, GitHub handles | to run | to run | to run | to run | to run |
| Web search with photobooth category | to run | to run | to run | to run | to run |

These are not legal clearance. A trademark lawyer should search the selected name before launch.

## Palette

The working palette is already applied to `design/tokens.json` and `design/tokens.css`: tomato `#B33D2F`, evergreen `#246A5A`, ink `#1A2420`, and pale botanical surfaces. The public listing screenshots visibly use pink/purple promotional art, but no exact original brand hex values were measured; therefore `brand.json` has no fabricated exclusion colors. Token contrast check: 15 pairs, 0 AA failures.

## Logo brief

Create a wordmark with a compact folded-frame symbol suggesting a photo print turning into a keepsake. It must remain distinct from the original's camera/mode icons and promotional styling. Deliver a simple vector wordmark, 16px favicon, 1024px app icon with opaque background, favicon set, and 1200x630 social image. Avoid camera-lens clichés, magenta/purple, and lookalike letterforms.

## Voice

Three words: **welcoming, capable, composed**. Welcoming, not cutesy. Capable, not technical. Composed, not cold.

| do | don't |
| --- | --- |
| Use direct action labels | Use hype or exclamation marks |
| Explain permission needs briefly | Blame guests for a device problem |
| Name the event context | Use generic sales language |
| Confirm what was saved | Promise cloud delivery in local mode |
| Offer a clear recovery action | Hide errors behind vague success messages |

Fresh interface strings: “Your events”, “Create event”, “Open booth”, “View gallery”, “Save event”, “No captures yet”, “Camera access is needed to start a session”, “This session was saved on this browser”, “Try capture again”, and “Print photo”.

## Sweep

Run the rebrand sweep against shipped app source (not the existing binary-analysis folder):

```powershell
python .agents/skills/replica-brand/sweep.py src --config replica/brand.json
```

Original names and known official domains are listed in `brand.json`. Exact reference colors remain unknown and are not represented as measured hex values. This sweep does not replace a visual/legal review.