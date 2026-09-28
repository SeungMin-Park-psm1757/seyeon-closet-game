#!/usr/bin/env python3
"""Build lossless WebP runtime copies from PNG masters in the asset registry."""

import re
import sys
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageChops, features
except ImportError as exc:
    raise SystemExit('Install the image-tooling dependency with: python -m pip install Pillow') from exc


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'assets' / 'assetRegistry.js'


def main():
    if not features.check('webp'):
        raise SystemExit('This Pillow build has no WebP encoder.')

    paths = sorted(set(re.findall(r'["\'](assets/custom/[^"\']+\.png)["\']', REGISTRY.read_text(encoding='utf-8'))))
    if not paths:
        raise SystemExit('No custom PNG sources found in assets/assetRegistry.js.')

    source_total = runtime_total = 0
    for relative in paths:
        source = ROOT / relative
        if not source.is_file():
            raise SystemExit(f'Missing PNG source: {relative}')
        runtime = ROOT / (relative.replace('assets/custom/', 'assets/runtime/', 1).removesuffix('.png') + '.webp')
        runtime.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as opened:
            master = opened.convert('RGBA')
            encoded = BytesIO()
            master.save(encoded, format='WEBP', lossless=True, method=4)
            payload = encoded.getvalue()
            with Image.open(BytesIO(payload)) as decoded:
                if decoded.size != master.size or ImageChops.difference(master, decoded.convert('RGBA')).getbbox():
                    raise SystemExit(f'Lossless WebP verification failed: {relative}')

        temporary = runtime.with_suffix('.webp.tmp')
        temporary.write_bytes(payload)
        temporary.replace(runtime)
        source_size, runtime_size = source.stat().st_size, runtime.stat().st_size
        source_total += source_size
        runtime_total += runtime_size
        print(f'{relative}: {source_size:,} -> {runtime_size:,} bytes')

    saved = 100 * (1 - runtime_total / source_total)
    print(f'PNG masters: {source_total:,} bytes; lossless WebP runtime: {runtime_total:,} bytes; saved: {saved:.1f}%')
    print('Existing runtime WebP files are regenerated and overwritten from their PNG masters.')


if __name__ == '__main__':
    main()
