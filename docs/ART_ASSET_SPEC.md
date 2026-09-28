# Art Asset Specification

This document is the current source-of-truth for custom art on `codex/art-direction-v1`.

## 1. Wearable master canvas

- Source canvas: **1086 × 1448 px**
- Aspect ratio: **3:4**
- Format while authoring: transparent PNG
- Character body, hair, dresses, tops, bottoms, shoes, hats, accessories, bags, and props must use the exact same full-body canvas.
- Do not crop each item to its visible pixels. Empty transparent margins are part of the alignment contract.
- Do not move the shoulder, waist, hand, or foot anchors independently between files.

The repository audit has verified that the current `girl01`, `hair_01`, `dress_01`–`dress_12`, and `shoes_01` files all use 1086 × 1448 and contain alpha transparency.

## 2. Background art

Backgrounds do not share the wearable canvas. They are rendered as scene art with cover behavior. The current `room.png` is 1402 × 1122 and is opaque.

Keep important visual subjects away from the extreme edges because phone aspect ratios vary.

## 3. Runtime mapping issue to resolve before mass production

The legacy game SVG uses a logical 360 × 500 canvas while the verified art master is 3:4. Custom PNGs are currently inserted with `preserveAspectRatio="none"`.

That maps 1086 × 1448 (0.75) into 360 × 500 (0.72), causing about **4% horizontal compression**. All current wearable files remain mutually aligned because they share the same source canvas, but their proportions are slightly distorted at runtime.

Before producing the rest of the catalog, the runtime should be normalized to the 3:4 master without breaking placeholder fallback art, previews, finish view, or album rendering.

## 4. File and registry rules

- Character: `assets/custom/characters/<id>.png`
- Wearable/item: `assets/custom/clothes/<id>.png`
- Background: `assets/custom/backgrounds/<id>.png`
- Register every custom file in `assets/assetRegistry.js`.
- Registry IDs must already exist in `data.js`.
- The toddler build intentionally has no outfit locks.

## 5. Validation

Run:

```bash
node --check game.js
node --check data.js
node --check sw.js
node --check assets/assetRegistry.js
node check-data.js
node audit-assets.js
```

GitHub Actions runs the same checks on the active development branches.

`audit-assets.js` verifies:
- registered PNG files exist;
- wearable canvases match the reference character canvas;
- wearable PNGs contain transparency;
- current registered art size is reported for capacity planning.

## 6. Performance policy

Current registered custom art is about **10 MiB for 16 PNG files**. Do not scale directly to the entire catalog at this average file size without an optimization step.

Recommended pipeline for later implementation:

1. Keep the 1086 × 1448 transparent PNG as the editable/source master.
2. Produce optimized runtime assets (prefer lossless/high-quality alpha-capable WebP after visual comparison).
3. Keep source art and runtime art clearly separated if both are retained.
4. Measure actual load time and memory on the target Android phone before converting the full catalog.

## 7. Art expansion gate

Do not mass-produce all 104 item arts yet. First complete one polished vertical slice for `girl01`:
- multiple hairstyles;
- dresses;
- representative top + bottom combinations;
- multiple shoes;
- head accessory;
- bag;
- prop;
- at least three polished backgrounds.

After the 3:4 runtime normalization and mobile visual QA are accepted, expand the catalog.
