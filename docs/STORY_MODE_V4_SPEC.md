# Story Mode V4 Completion Gate

This document defines the acceptance criteria for the next story-mode polish pass.

## Current story set

The game has five story themes:

| Theme | Background | Recommended outfit | Current custom-art status |
| --- | --- | --- | --- |
| picnic | park | dress_05 | background gap |
| princess | castle | dress_06 | ready |
| rainy | playground | pants_02 | background + outfit gap |
| birthday | birthday | dress_12 | ready |
| beach | beach | dress_08 | ready |

At the start of V4, **3/5 themes are fully custom-art ready**.

## Required V4 art gaps

V4 should at minimum provide custom art for:

- `park` background
- `playground` background
- `pants_02`

The rainy story should also be visually coherent with the existing catalog. A rain-appropriate top, boots, and umbrella may be added if they materially improve the story, but they are secondary to the three required gaps above.

## Validation

Run:

```bash
node scripts/audit-story-mode.js
```

This reports readiness without failing the build.

When V4 has completed the required art gaps, the strict gate must pass:

```bash
node scripts/audit-story-mode.js --strict
```

Before V4 is declared complete, update GitHub Actions so the story-mode step uses `--strict`.

## UX acceptance

Story mode should remain simple for a preschool user:

1. Selecting a story automatically applies the story background.
2. The recommended outfit is visually obvious.
3. Recommendations never block free choice.
4. Story selection cards should communicate primarily through imagery rather than text.
5. Editor, finish view, and album must render the same selected art.
6. No failure state, score pressure, purchase, login, or locked content is introduced.

## Scope discipline

V4 is not the stage for:

- filling all 104 custom items;
- adding a second fully custom character;
- adding complex quests or scoring;
- changing frameworks;
- large architecture refactors.

The objective is to make all five existing stories feel consistently finished.
