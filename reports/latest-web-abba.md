# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-21T03:48:02.384Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2486.2 | 893.8 |
| `exp-st-worker` | 1615.8 | 626.0 |
| `exp-webgl2` | 3809.4 | 1399.7 |
| `exp-mt` | 3300.5 | 1253.4 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 567.0 | 104.5 | 1.75 | 2.76 | 4.11 | 0.0% | 289 | 51.9 | 39.6 | 0 |
| S1 | `exp-st` | 627.5 | 111.0 | 1.80 | 3.02 | 3.93 | 0.0% | 205 | 55.3 | 41.1 | 0 |
| S1 | `exp-mt` | 705.7 | 172.5 | 1.58 | 2.72 | 3.25 | 0.0% | 216 | 52.5 | 47.0 | 0 |
| S2 | `mln-webgpu` | 698.0 | 212.0 | 2.13 | 3.86 | 6.14 | 0.0% | 300 | 80.9 | 59.3 | 10 |
| S2 | `exp-st` | 571.9 | 136.7 | 1.88 | 3.14 | 3.90 | 0.0% | 222 | 72.3 | 53.3 | 0 |
| S2 | `exp-mt` | 717.5 | 148.7 | 1.63 | 2.71 | 3.19 | 0.0% | 222 | 79.1 | 57.7 | 0 |
| S3 | `mln-webgpu` | 596.2 | 101.1 | 2.74 | 4.15 | 6.57 | 0.0% | 327 | 66.9 | 54.3 | 33 |
| S3 | `exp-st` | 455.1 | 97.7 | 1.93 | 2.85 | 3.48 | 0.0% | 217 | 32.2 | 44.4 | 0 |
| S3 | `exp-mt` | 395.1 | 131.3 | 1.66 | 2.54 | 2.93 | 0.0% | 211 | 54.9 | 42.7 | 0 |
| S4 | `mln-webgpu` | 512.5 | 121.2 | 0.67 | 1.29 | 2.35 | 0.0% | 69 | 33.7 | 19.6 | 45 |
| S4 | `exp-st` | 507.3 | 63.3 | 1.16 | 1.96 | 3.02 | 0.0% | 40 | 28.5 | 22.2 | 0 |
| S4 | `exp-mt` | 509.4 | 76.7 | 1.05 | 1.90 | 2.58 | 0.0% | 39 | 58.4 | 20.6 | 0 |
| S5 | `mln-webgpu` | 1318.2 | 178.7 | 1.46 | 2.50 | 5.05 | 0.0% | 211 | 68.4 | 66.1 | 13 |
| S5 | `exp-st` | 923.9 | 164.6 | 2.92 | 4.45 | 5.16 | 0.0% | 83 | 36.0 | 50.2 | 0 |
| S5 | `exp-mt` | 1293.4 | 209.7 | 2.68 | 4.37 | 5.18 | 0.0% | 79 | 56.6 | 49.8 | 0 |
| S6 | `mln-webgpu` | 359.2 | 53.0 | 0.59 | 1.12 | 1.46 | 0.0% | 52 | 8.1 | 12.3 | 0 |
| S6 | `exp-st` | 491.1 | 58.1 | 1.42 | 1.82 | 2.90 | 0.0% | 39 | 11.6 | 21.3 | 0 |
| S6 | `exp-mt` | 365.3 | 61.3 | 1.40 | 1.78 | 2.35 | 0.0% | 39 | 28.8 | 20.9 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 877.0 | 151.0 | 2.44 | 3.54 | 5.34 | 0.0% | 125 | 40.3 | 42.4 | 0 |
| S7 | `exp-mt` | 1121.6 | 213.3 | 2.23 | 3.29 | 5.00 | 0.0% | 130 | 63.3 | 42.0 | 0 |
| S8 | `mln-webgpu` | 467.6 | 106.3 | 1.02 | 2.14 | 4.26 | 0.0% | 138 | 71.2 | 69.0 | 43 |
| S8 | `exp-st` | 482.5 | 141.4 | 1.76 | 2.95 | 3.60 | 0.0% | 98 | 56.3 | 46.8 | 0 |
| S8 | `exp-mt` | 433.4 | 182.9 | 2.02 | 3.47 | 4.28 | 0.0% | 102 | 70.4 | 47.9 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 437 | -14.19% | 0.8056 | 7.65% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 437 | -14.19% | 0.8056 | 7.65% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 437 | -14.19% | 0.8795 | 5.36% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7620 | 8.74% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7620 | 8.74% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 325 | -19.08% | 0.7548 | 8.86% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9828 | 0.43% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9120 | 3.75% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9120 | 3.75% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9159 | 3.54% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 64 / 64 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 64 / 64 | 0.00% | 0.9983 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9538 | 3.53% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9538 | 3.53% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9528 | 3.59% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 1.0000 | 0.00% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9432 | 3.55% | PASS |
| S5 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 62 / 381 | -83.73% | — | — | PASS |
| S6 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 46 / 46 | 0.00% | 1.0000 | 0.00% | PASS |
| S6 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 46 / 46 | 0.00% | 0.9799 | 0.00% | PASS |
| S6 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S7 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 72 / 72 | 0.00% | 1.0000 | 0.00% | PASS |
| S7 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 71 / 72 | -1.39% | 0.9865 | 0.66% | PASS |
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 346 / 346 | 0.00% | 0.9894 | 0.56% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 346 / 346 | 0.00% | 0.9641 | 1.60% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8276 | 7.98% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8285 | 7.89% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8584 | 6.53% | PASS |
