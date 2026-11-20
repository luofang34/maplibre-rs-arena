# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-20T17:19:32.948Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2476.2 | 889.9 |
| `exp-st-worker` | 1615.8 | 626.0 |
| `exp-webgl2` | 3799.5 | 1395.5 |
| `exp-mt` | 3288.5 | 1247.8 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 418.9 | 113.6 | 1.76 | 2.88 | 5.58 | 0.0% | 284 | 51.8 | 39.2 | 0 |
| S1 | `exp-st` | 556.9 | 119.0 | 1.62 | 2.76 | 5.41 | 0.4% | 152 | 26.1 | 31.9 | 0 |
| S1 | `exp-mt` | 576.4 | 185.1 | 1.39 | 2.33 | 3.69 | 0.0% | 145 | 41.4 | 30.9 | 0 |
| S2 | `mln-webgpu` | 650.3 | 219.0 | 2.25 | 4.03 | 6.08 | 0.0% | 301 | 81.4 | 62.5 | 8 |
| S2 | `exp-st` | 483.9 | 120.5 | 1.74 | 3.17 | 3.88 | 0.0% | 155 | 60.0 | 42.0 | 0 |
| S2 | `exp-mt` | 702.9 | 160.8 | 1.44 | 2.62 | 3.86 | 0.0% | 127 | 61.5 | 40.5 | 0 |
| S3 | `mln-webgpu` | 381.6 | 99.1 | 2.81 | 4.09 | 6.80 | 0.0% | 324 | 67.8 | 54.5 | 43 |
| S3 | `exp-st` | 366.4 | 115.1 | 2.13 | 3.42 | 3.74 | 0.4% | 197 | 29.1 | 33.9 | 0 |
| S3 | `exp-mt` | 743.2 | 145.8 | 1.83 | 3.12 | 3.83 | 0.0% | 180 | 45.0 | 33.9 | 0 |
| S4 | `mln-webgpu` | 480.0 | 129.9 | 0.66 | 1.45 | 2.15 | 0.0% | 74 | 32.6 | 22.0 | 49 |
| S4 | `exp-st` | 470.9 | 71.3 | 1.04 | 1.77 | 3.06 | 0.0% | 25 | 19.3 | 11.7 | 0 |
| S4 | `exp-mt` | 544.8 | 75.2 | 0.88 | 1.52 | 2.33 | 0.0% | 29 | 42.3 | 11.9 | 0 |
| S5 | `mln-webgpu` | 1236.9 | 636.3 | 1.68 | 2.65 | 5.48 | 0.0% | 234 | 71.9 | 66.1 | 0 |
| S5 | `exp-st` | 840.4 | 160.9 | 3.15 | 4.75 | 5.87 | 0.0% | 83 | 32.4 | 48.3 | 0 |
| S5 | `exp-mt` | 1104.6 | 205.9 | 2.77 | 4.67 | 5.79 | 0.0% | 85 | 52.3 | 47.4 | 0 |
| S6 | `mln-webgpu` | 371.9 | 64.8 | 0.49 | 0.86 | 1.43 | 0.0% | 50 | 6.0 | 11.3 | 0 |
| S6 | `exp-st` | 489.1 | 56.2 | 1.14 | 1.63 | 2.67 | 0.0% | 37 | 11.0 | 19.2 | 0 |
| S6 | `exp-mt` | 347.9 | 59.4 | 1.11 | 1.82 | 2.41 | 0.0% | 38 | 24.9 | 18.9 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 851.6 | 155.2 | 2.63 | 3.81 | 5.79 | 0.0% | 124 | 36.6 | 36.2 | 0 |
| S7 | `exp-mt` | 959.2 | 205.5 | 2.39 | 3.61 | 5.61 | 0.0% | 126 | 58.8 | 36.5 | 0 |
| S8 | `mln-webgpu` | 488.4 | 116.3 | 1.03 | 2.15 | 4.45 | 0.0% | 132 | 68.1 | 62.6 | 42 |
| S8 | `exp-st` | 501.0 | 138.7 | 1.68 | 3.42 | 6.44 | 0.0% | 76 | 31.9 | 33.3 | 0 |
| S8 | `exp-mt` | 459.0 | 184.5 | 1.88 | 3.66 | 6.21 | 0.0% | 78 | 53.4 | 33.3 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 485 | -22.68% | 0.8590 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 485 | -22.68% | 0.8590 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 485 | -22.68% | 0.9322 | 2.64% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7273 | 8.99% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7273 | 8.99% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 325 | -19.08% | 0.7200 | 9.11% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9828 | 0.43% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 348 | -30.17% | 0.9117 | 3.78% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 348 | -30.17% | 0.9117 | 3.78% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 348 | -30.17% | 0.9156 | 3.58% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 64 / 64 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 64 / 64 | 0.00% | 0.9983 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9264 | 4.81% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9264 | 4.81% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9254 | 4.86% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 0.9996 | 0.00% | PASS |
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
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 346 / 346 | 0.00% | 0.9875 | 0.65% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 346 / 346 | 0.00% | 0.9568 | 2.02% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8250 | 7.88% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8254 | 7.82% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 346 / 479 | -27.77% | 0.8568 | 6.36% | PASS |
