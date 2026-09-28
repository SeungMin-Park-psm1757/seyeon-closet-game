#!/usr/bin/env python3
"""Verify that committed runtime WebP files are pixel-identical to registered PNG masters."""

import re
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError as exc:
    raise SystemExit("Install Pillow: python -m pip install Pillow") from exc

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "assets" / "assetRegistry.js"


def runtime_path(source_relative: str) -> str:
    return source_relative.replace("assets/custom/", "assets/runtime/", 1)[:-4] + ".webp"


def main() -> None:
    registry = REGISTRY.read_text(encoding="utf-8")
    sources = sorted(set(re.findall(r"""['"](assets/custom/[^'"]+\.png)['"]""", registry)))
    if not sources:
        raise SystemExit("No registered custom PNG assets found.")

    source_total = 0
    runtime_total = 0

    for source_relative in sources:
        source = ROOT / source_relative
        runtime_relative = runtime_path(source_relative)
        runtime = ROOT / runtime_relative

        if not source.is_file():
            raise SystemExit(f"Missing PNG master: {source_relative}")
        if not runtime.is_file():
            raise SystemExit(f"Missing runtime WebP: {runtime_relative}")

        with Image.open(source) as source_image, Image.open(runtime) as runtime_image:
            source_rgba = source_image.convert("RGBA")
            runtime_rgba = runtime_image.convert("RGBA")

            if source_rgba.size != runtime_rgba.size:
                raise SystemExit(
                    f"Runtime size mismatch for {source_relative}: "
                    f"{source_rgba.size} != {runtime_rgba.size}"
                )

            if ImageChops.difference(source_rgba, runtime_rgba).getbbox():
                raise SystemExit(
                    f"Stale or lossy runtime asset: {runtime_relative} "
                    f"does not match {source_relative}"
                )

        source_total += source.stat().st_size
        runtime_total += runtime.stat().st_size
        print(f"OK {source_relative} -> {runtime_relative}")

    saved = 100 * (1 - runtime_total / source_total) if source_total else 0
    print(
        f"Verified {len(sources)} runtime assets: "
        f"{source_total / 1024 / 1024:.2f} MiB PNG -> "
        f"{runtime_total / 1024 / 1024:.2f} MiB WebP ({saved:.1f}% smaller)."
    )


if __name__ == "__main__":
    main()
