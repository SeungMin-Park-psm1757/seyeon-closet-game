# V8 Fit Engine Audit — findings and handoff

Date: 2026-10-02

## Evidence reviewed

- Current implementation on `codex/v7-unified-character-art`.
- Seven user screenshots from the deployed mobile UI.
- Existing V7/V6 design notes and browser tests.
- Strong-alpha (alpha >= 32) visible-pixel bounds for the registered character/hair/hat/top/dress/skirt/pants/shoes PNG masters.

## What was actually wrong

1. V7 put newly generated tops and hats behind hand-tuned `itemTransforms` with independent `sx` and `sy`. This can make one screenshot look acceptable but distorts the artwork and is not a stable shared-rig contract.
2. Hat type was assigned with a repeating four-value modulo rule. As a result, later hats could receive the wrong geometry. In particular `hat_10` (“리본 모자”) was treated like a generic brimmed hat.
3. The full character PNG is still the base body. Its white T-shirt / pink shorts are baked into the image. No transform algorithm can guarantee that every neckline/sleeve/hem completely hides those pixels.
4. Hair + hat has only one semantic hair layer for most custom hair. A hat drawn above it can still leave crown hair visible where real hair would be compressed under the hat.
5. File/canvas validation was healthy, but it did not measure visible-pixel fit. Several ImageGen PNGs also contain faint alpha noise outside the meaningful art, so `alpha > 0` is not a reliable fit boundary.
6. The old browser-smoke suite contained V6-era assumptions (custom art hidden from non-girl01 characters) while V7 intentionally moved all four characters to the shared `preschool-v1` rig.
7. A V8 exploratory browser failure initially looked like a rig failure, but the immediate assertion was also stale: it expected exactly five image nodes even though the selected V7 outfit now legitimately contained body + hair + top + pants + shoes + hat. Structural test assumptions must be versioned with the renderer.

## V8 changes already made

- New `fit-engine.js`.
- Tops and hats now use measured visible bounds and semantic slots.
- Slot fitting uses one uniform scale only; it never applies `scale(x,y)` to squash/stretch art.
- Strong-alpha audit uses threshold 32 to ignore faint transparent noise.
- `top_01..05` and `hat_01..06` have measured `fitBounds` in `assetRegistry.js`.
- Legacy anisotropic transforms were removed for tops/hats. Only `hair_06/07` remain legacy for now.
- Explicit semantic hat mapping replaces the modulo rule; `hat_10` is now `ribbon`.
- Fallback `ribbon` art is a headband/bow rather than a generic brimmed cap.
- Hair under cap/sunhat/beanie can use a limited crown occlusion mask.
- `dressableCharacters` hook exists for future modest garment-free base bodies.
- Service-worker cache was bumped and `fit-engine.js` is cached.
- Unit tests now reject anisotropic top/hat fitting.
- Browser QA was updated from obsolete V6 compatibility assumptions to V7+ shared-rig behavior and captures the user-reported hair/hat/top combinations.

## Important remaining art limitation

The current full-body character PNGs contain default clothes. The correct long-term solution is NOT to keep moving every shirt until it hides every white pixel.

Create a **dressable base** for each character on the exact 1086×1448 preschool-v1 canvas:

- same face, hair-independent head, pose, hands, legs and identity;
- modest neutral underlayer suitable for a preschool game;
- no outer T-shirt, shorts, dress or shoes that can leak outside replacement clothing;
- transparent background;
- exact same body anchors as the approved character.

Register approved files under `ASSETS.dressableCharacters`. The V8 renderer already switches to a dressable body while `top/dress/skirt/pants` is selected.

Rabbit full-body hair composites are another special case: if a composite contains baked default clothing, Luna must create dressable equivalents or replace the full-body composite approach with front/back hair pieces. Do not hide this with arbitrary masks.

## Visual acceptance, not just CI

A final pass must visually inspect at least:

- all 8 hair styles without hats;
- all 10 hats with representative short/long/curly hair;
- top_01..05 on all four characters;
- 12 dresses on at least girl01 plus representative checks on the other three;
- skirts/pants waist contact;
- all shoes at ankles/floor;
- editor, finish and album for the same outfit;
- 390×844 actual mobile or equivalent browser viewport.

A green CI means structural invariants passed. It does not mean every garment looks natural.
