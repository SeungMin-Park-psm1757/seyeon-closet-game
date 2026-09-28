# Art Asset Specification

This document is the current source-of-truth for custom art on `codex/art-direction-v3`.

## 1. Wearable master canvas

- Source canvas: **1086 × 1448 px**
- Aspect ratio: **3:4**
- Format while authoring: transparent PNG master
- Runtime format: lossless WebP generated from the PNG master
- Character body, hair, dresses, tops, bottoms, shoes, hats, accessories, bags, and props must use the exact same full-body canvas.
- Do not crop each item to its visible pixels. Empty transparent margins are part of the alignment contract.
- Do not move the shoulder, waist, hand, or foot anchors independently between files.

The repository audit has verified that the custom character and all 34 custom wearable item files use 1086 × 1448 and contain alpha transparency. This includes `girl01`, `hair_01`–`hair_04`, `dress_01`–`dress_12`, `top_01`–`top_03`, `skirt_01`–`skirt_03`, `pants_02`, `shoes_01`–`shoes_04`, three head accessories, two bags, and two props.

## 2. Background art

Backgrounds do not share the wearable canvas and are rendered with cover behavior. `room.png` is 1402 × 1122; `garden.png`, `castle.png`, `beach.png`, `birthday.png`, `park.png`, and `playground.png` are 1086 × 1448 portrait scenes, all opaque.

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

Current custom art is **22.84 MiB across 42 registered PNG masters** and **16.55 MiB across 42 lossless WebP runtime files** (27.5% smaller, with pixel-exact RGBA round-trips). The set contains 34 wearable items, one custom character, and seven custom backgrounds. Keep PNG masters as editable source.

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

The V3–V4 vertical slice now covers multiple hairstyles, dresses, tops, bottoms, shoes, head accessories, bags, props, and seven custom backgrounds. All five story themes have custom scenery and a custom representative outfit. Do not mass-produce the remaining catalog until this slice has been tried with a child.
