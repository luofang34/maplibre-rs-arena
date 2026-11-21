# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-21T07:02:51.736Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2504.4 | 901.0 |
| `exp-st-worker` | 1615.8 | 626.0 |
| `exp-webgl2` | 3827.2 | 1406.7 |
| `exp-mt` | 3323.3 | 1262.4 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 420.4 | 120.9 | 1.76 | 2.50 | 5.28 | 0.0% | 289 | 49.0 | 37.8 | 0 |
| S1 | `exp-st` | 1873.5 | 117.0 | 1.69 | 2.99 | 3.67 | 0.0% | 202 | 46.2 | 41.8 | 0 |
| S1 | `exp-mt` | 658.8 | 190.8 | 1.50 | 2.42 | 3.48 | 0.0% | 204 | 51.5 | 41.1 | 0 |
| S2 | `mln-webgpu` | 716.3 | 213.9 | 2.02 | 3.55 | 7.38 | 0.4% | 270 | 76.1 | 51.7 | 45 |
| S2 | `exp-st` | 780.7 | 120.9 | 1.68 | 3.08 | 3.87 | 0.0% | 195 | 41.9 | 43.8 | 0 |
| S2 | `exp-mt` | 641.5 | 150.1 | 1.66 | 2.75 | 3.36 | 0.0% | 223 | 74.8 | 44.8 | 0 |
| S3 | `mln-webgpu` | 342.2 | 96.2 | 2.92 | 4.17 | 9.36 | 0.0% | 339 | 67.4 | 54.0 | 17 |
| S3 | `exp-st` | 486.0 | 96.3 | 1.92 | 2.88 | 3.46 | 0.0% | 215 | 29.9 | 38.6 | 0 |
| S3 | `exp-mt` | 470.0 | 125.5 | 1.61 | 2.42 | 2.73 | 0.0% | 213 | 47.8 | 40.0 | 0 |
| S4 | `mln-webgpu` | 494.7 | 125.8 | 0.64 | 1.40 | 2.15 | 0.0% | 68 | 33.6 | 21.7 | 35 |
| S4 | `exp-st` | 361.9 | 66.7 | 1.02 | 1.71 | 2.62 | 0.0% | 39 | 23.9 | 17.3 | 0 |
| S4 | `exp-mt` | 668.9 | 76.0 | 0.90 | 1.57 | 2.02 | 0.0% | 39 | 45.1 | 16.9 | 0 |
| S5 | `mln-webgpu` | 1577.8 | 339.3 | 1.59 | 2.71 | 5.42 | 0.0% | 225 | 71.1 | 66.2 | 11 |
| S5 | `exp-st` | 1336.7 | 165.9 | 2.98 | 4.74 | 5.79 | 0.0% | 78 | 34.8 | 47.7 | 0 |
| S5 | `exp-mt` | 1109.2 | 215.2 | 2.67 | 4.58 | 5.79 | 0.0% | 72 | 55.4 | 48.9 | 0 |
| S6 | `mln-webgpu` | 380.4 | 56.1 | 0.46 | 0.82 | 1.29 | 0.0% | 50 | 6.3 | 11.3 | 0 |
| S6 | `exp-st` | 324.8 | 58.0 | 1.45 | 1.89 | 2.69 | 0.0% | 39 | 11.1 | 20.7 | 0 |
| S6 | `exp-mt` | 355.3 | 59.6 | 1.44 | 1.88 | 2.27 | 0.0% | 39 | 22.9 | 20.9 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 809.2 | 176.2 | 2.89 | 4.17 | 6.84 | 0.0% | 102 | 38.2 | 41.3 | 0 |
| S7 | `exp-mt` | 979.5 | 261.9 | 2.40 | 3.73 | 5.39 | 0.0% | 109 | 60.4 | 41.0 | 0 |
| S8 | `mln-webgpu` | 577.3 | 130.8 | 1.15 | 2.48 | 4.81 | 0.0% | 145 | 70.7 | 65.9 | 38 |
| S8 | `exp-st` | 524.1 | 140.4 | 1.79 | 3.13 | 3.74 | 0.0% | 99 | 48.1 | 42.1 | 0 |
| S8 | `exp-mt` | 658.3 | 171.4 | 1.82 | 3.52 | 4.05 | 0.0% | 96 | 58.1 | 41.6 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 485 | -22.68% | 0.8590 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 485 | -22.68% | 0.8590 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 485 | -22.68% | 0.9322 | 2.64% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 0.9971 | 0.13% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 295 | -8.14% | 0.7242 | 9.03% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 295 | -8.14% | 0.7221 | 9.13% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 295 | -10.85% | 0.7169 | 9.16% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9828 | 0.43% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 350 | -30.57% | 0.8807 | 5.53% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 350 | -30.57% | 0.8807 | 5.53% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 350 | -30.57% | 0.8847 | 5.33% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 64 / 64 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 64 / 64 | 0.00% | 0.9983 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9462 | 4.45% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9462 | 4.45% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9452 | 4.50% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 0.9718 | 0.17% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9163 | 3.72% | PASS |
| S5 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 62 / 381 | -83.73% | — | — | PASS |
| S6 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 46 / 46 | 0.00% | 1.0000 | 0.00% | PASS |
| S6 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 46 / 46 | 0.00% | 0.9799 | 0.00% | PASS |
| S6 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 46 / 68 | -32.35% | — | — | PASS |
| S7 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 60 / 60 | 0.00% | 1.0000 | 0.00% | PASS |
| S7 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 59 / 60 | -1.67% | 0.9865 | 0.66% | PASS |
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 346 / 346 | 0.00% | 0.9822 | 0.92% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 346 / 346 | 0.00% | 0.9551 | 2.03% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 346 / 477 | -27.46% | 0.8341 | 7.58% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 346 / 477 | -27.46% | 0.8319 | 7.64% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 346 / 477 | -27.46% | 0.8625 | 6.21% | PASS |
