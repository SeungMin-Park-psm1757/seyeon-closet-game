# V10 Haneul face identity QA

## Change

Haneul (`girl02`) now has an image-based facial identity in both the default and dressable character masters. The face art uses a subtly flatter brow line, longer eye shape, a small nose, faint freckles, and a smaller closed smile. The same face crop is pixel-identical in both masters.

The new face draft was generated with the project illustration as its reference. Only the face interior was transferred to the existing 1086×1448 masters. Pixels outside the face edit area are unchanged, preserving the shared body pose, outfit anchors, skin/neck connection, and transparent bounds. Runtime WebP copies were regenerated losslessly. The temporary SVG face overlay was removed so the raster artwork is not drawn twice.

## Visual evidence

- `qa/v10-browser-smoke/v10-girl01-vs-girl02-identity.png`: same hair and outfits, side-by-side.
- `qa/v10-browser-smoke/v10-requested-outfits-contact-sheet.jpg`: selected V10 outfit regressions reviewed from 390×844 Chromium captures.

The comparison was reviewed at full resolution. Haneul remains distinguishable through eye shape, nose, freckles, and smile with identical hair and clothing; the result is not based on skin tone alone. The body and outfit placement remain aligned.

## Preserved rules

- Rabbit hair remains limited to its supported composites (`hair_01`, `hair_03`, `hair_07`).
- Hat and head accessory remain mutually exclusive.
- Existing V10 uniform fit and semantic slots were not changed.

## Validation

Local checks: JavaScript syntax, data, outfit rules, fit engine, character compatibility, asset registry, strict story-mode art, alpha bounds, and PNG/WebP identity. Chromium smoke includes 390×844 and 412×915 layouts, finish/album flows, 80 hair/hat pairs, and the same-hair identity sheet.
