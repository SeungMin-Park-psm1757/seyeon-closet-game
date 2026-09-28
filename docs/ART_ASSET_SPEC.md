# Art Asset Specification

This document is the current source-of-truth for custom art on `codex/art-direction-v2`.

## 1. Wearable master canvas

- Source canvas: **1086 × 1448 px**
- Aspect ratio: **3:4**
- Format while authoring: transparent PNG master
- Runtime format: lossless WebP generated from the PNG master
- Character body, hair, dresses, tops, bottoms, shoes, hats, accessories, bags, and props must use the exact same full-body canvas.
- Do not crop each item to its visible pixels. Empty transparent margins are part of the alignment contract.
- Do not move the shoulder, waist, hand, or foot anchors independently between files.

The repository audit has verified that the current `girl01`, `hair_01`, `dress_01`–`dress_12`, and `shoes_01` files all use 1086 × 1448 and contain alpha transparency.

## 2. Background art

Backgrounds do not share the wearable canvas and are rendered with cover behavior. `room.png` is 1402 × 1122; the new `garden.png`, `castle.png`, and `beach.png` are 1086 × 1448 portrait scenes, all opaque.

Keep important visual subjects away from the extreme edges because phone aspect ratios vary.

## 3. Runtime mapping

The avatar now uses a **360 × 480** logical canvas, exactly 3:4. Custom art uses the full canvas with `preserveAspectRatio="xMidYMid meet"`; no crop or stretch is applied.

Placeholder SVG paths retain their existing coordinates. Their lowest point remains inside the 480-unit viewBox, preserving the current anchors. The shared avatar renderer supplies custom and placeholder art in the editor, completion screen, home preview, item thumbnails, and album cards.

Item thumbnails keep the full-canvas source and use category-specific viewBoxes to make the garment or accessory larger while retaining its complete silhouette.

## 4. File and registry rules

- Character: `assets/custom/characters/<id>.png`
- Wearable/item: `assets/custom/clothes/<id>.png`
- Background: `assets/custom/backgrounds/<id>.png`
- Register each PNG master in `assets/assetRegistry.js`.
- `game.js` maps registered `assets/custom/*.png` files to generated `assets/runtime/*.webp` files.
- Regenerate runtime files with `python scripts/convert-assets.py`. It requires Pillow with WebP support, verifies pixel-exact RGBA round-trips, writes files atomically, and regenerates/overwrites existing runtime copies from their PNG masters.
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
python scripts/verify-runtime-assets.py
```

GitHub Actions runs the same checks on the active development branches.

`check-data.js` and `audit-assets.js` verify:
- duplicate IDs within registry sections;
- registered PNG files exist;
- every registered source has a valid runtime WebP;
- wearable canvases match the reference character canvas;
- wearable PNGs contain transparency;
- source PNG and runtime WebP sizes are reported for capacity planning.

`scripts/verify-runtime-assets.py` additionally opens every registered PNG master and its committed runtime WebP with Pillow and verifies that their RGBA pixels and dimensions are identical. GitHub Actions runs this check so stale or lossy runtime files cannot pass CI.

## 6. Performance policy

Current custom art is **14.72 MiB across 19 PNG masters** and **10.61 MiB across 19 lossless WebP runtime files** (27.9% smaller, with pixel-exact RGBA round-trips). Keep PNG masters as editable source.

The current pipeline:

1. Keep the 1086 × 1448 transparent PNG as the editable/source master.
2. Regenerate its lossless WebP copy under `assets/runtime/`.
3. Keep source art and runtime art in separate folders.
4. Measure load time and memory on the target Android phone before scaling this pipeline to the full catalog.

## 7. Art expansion gate

Do not mass-produce all 104 item arts yet. First complete one polished vertical slice for `girl01`:
- multiple hairstyles;
- dresses;
- representative top + bottom combinations;
- multiple shoes;
- head accessory;
- bag;
- prop;
- additional backgrounds beyond the completed room, garden, castle, and beach scenes.

After the 3:4 runtime normalization and mobile visual QA are accepted, expand the catalog.
