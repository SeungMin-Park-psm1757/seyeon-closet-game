# V9 Fit / Art Completion Log

## Scope and branch

- Base: `codex/v8-fit-engine-audit` at `fca182b3de73fe8b764efa9761dcb53c36960efc`
- Work branch: `codex/v9-luna-fit-art-completion`
- Main, V5–V8 branches, merge, and Pages deployment were not part of this change.
- Goal: preserve V8 semantic uniform fitting, remove remaining hair distortion, prevent baked-in clothes from showing through, finish the missing hair/hat art, and verify rendered combinations in Chromium.

## Implementation

- Kept V8 alpha >= 32 bounds, semantic item slots, and one uniform scale for tops and hats.
- Re-exported `hair_06` and `hair_07` from their original art into full-canvas masters. Removed their remaining legacy transforms; `itemTransforms` is no longer needed for them.
- Added neutral dressable bases for all four characters. Added dressable variants for the rabbit's three full-body hair composites. While clothes are worn, the renderer uses the matching composite and restores only its clipped head/face layer above the clothes. Editor, finish, and album use the same avatar renderer.
- Added original `hat_07`–`hat_10` illustrations and `hair_08`; replaced the ribbon fallback with a headband/bow illustration. The hair_08 alpha window was adjusted after browser review so both eyes remain visible.
- Kept explicit semantic hat types; cache version is `seyeon-closet-v37`.
- Extended data/art audits, uniform-fit checks, Chromium visual captures, and the CI branch filter for V9.

## Visual QA

All browser captures used 390×844 unless stated otherwise. I visually inspected the contact sheets and representative full-size captures.

- Hair × hat: all 80 combinations captured and reviewed; both eyes remain visible in each combination. [Contact sheet](../qa/v9-browser-smoke/v9-hair-hat-contact-sheet.png)
- Top 01–05: reviewed. [Contact sheet](../qa/v9-browser-smoke/v9-top-contact-sheet.png)
- Dress 01–12: reviewed. [Contact sheet](../qa/v9-browser-smoke/v9-dress-contact-sheet.png)
- Skirt 01–03 and shoes 01–04: reviewed. [Skirts](../qa/v9-browser-smoke/v9-skirt-contact-sheet.png) · [Shoes](../qa/v9-browser-smoke/v9-shoes-contact-sheet.png)
- Girl01, girl02, bear01, and rabbit01: reviewed top + pants and dress05. [Character sheet](../qa/v9-browser-smoke/v9-four-character-contact-sheet.png)
- Three representative hair/hat pairs per character: reviewed. [Character hair/hat sheet](../qa/v9-browser-smoke/v9-character-hat-contact-sheet.png)
- Rabbit dressable hair composite: checked in editor, finish, and album. Its face remains above the blouse and the underlying pink shorts/tee are not reused.
- Top02 now overlays the dressable base; visible white collar details belong to the blouse art. The old base shirt/shorts no longer appear through the overlay.

Representative individual captures, including hair06/07, hair08, all hats, tops, dresses, pants, and shoes, are in `qa/v9-browser-smoke/` and are uploaded by CI as the `v9-browser-smoke` artifact.

## Automated verification

Passed locally:

- JavaScript syntax checks for game, data, fit engine, outfit rules, service worker, registry, and browser smoke.
- `node check-data.js`
- `node scripts/test-outfit-rules.js`
- `node scripts/test-fit-engine.js`
- `node scripts/test-character-compatibility.js`
- `node audit-assets.js`
- `node scripts/audit-story-mode.js --strict`
- `python scripts/audit-alpha-bounds.py`
- `python scripts/verify-runtime-assets.py`
- `node scripts/browser-smoke.mjs`: 390×844 outfit/finish/album flows, 390×640 scrolling, 412×915 overflow, offline reopen, four-character compatibility, 80 hair/hat captures, and all five story themes.

PNG masters were converted and compared losslessly against runtime WebP. The registered art set is 71 runtime images; PNG source total is about 42.5 MB and WebP runtime total about 29.4 MB (30.8% smaller).

## Quality gates and remaining scope

- 80% gate: PASS — data, fit, layer, touch viewport, offline, story, and character compatibility checks pass.
- 90% gate: PASS — requested combinations were captured in-browser and visually reviewed; editor/finish/album share the same avatar render.
- Remaining: several catalog items outside this task still use the existing lightweight fallback artwork. `hair_08` is now a custom rounded bob, but it remains a fuller, shoulder-length shape than the initial chin-length art direction; it is kept because it is distinct from the former blue SVG and passes the eye-visibility check.
- GitHub Actions result is recorded after the V9 branch push; no Pages deployment is performed here.
