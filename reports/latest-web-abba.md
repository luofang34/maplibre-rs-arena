# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-20T07:16:57.136Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2397.2 | 876.9 |
| `exp-st-worker` | 1597.6 | 617.2 |
| `exp-webgl2` | 3671.6 | 1362.9 |
| `exp-mt` | 2812.7 | 1055.7 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 491.0 | 114.0 | 1.70 | 2.51 | 4.68 | 0.0% | 285 | 52.7 | 40.9 | 0 |
| S1 | `exp-st` | 401.3 | 113.4 | 1.64 | 2.77 | 6.61 | 0.4% | 177 | 26.4 | 27.1 | 0 |
| S1 | `exp-mt` | 591.0 | 293.9 | 1.55 | 2.60 | 4.21 | 0.0% | 173 | 41.8 | 26.1 | 0 |
| S2 | `mln-webgpu` | 752.6 | 214.6 | 2.19 | 4.11 | 6.49 | 0.0% | 301 | 82.8 | 62.4 | 18 |
| S2 | `exp-st` | 548.3 | 169.8 | 1.65 | 3.05 | 3.69 | 0.0% | 130 | 54.1 | 47.3 | 0 |
| S2 | `exp-mt` | 736.0 | 304.3 | 1.49 | 2.74 | 6.07 | 0.0% | 105 | 99.0 | 36.7 | 0 |
| S3 | `mln-webgpu` | 512.5 | 91.3 | 2.86 | 4.19 | 6.75 | 0.0% | 327 | 67.2 | 53.4 | 28 |
| S3 | `exp-st` | 471.7 | 106.1 | 2.30 | 3.42 | 5.53 | 0.4% | 262 | 38.7 | 35.0 | 0 |
| S3 | `exp-mt` | 576.1 | 228.1 | 2.13 | 3.34 | 4.13 | 0.0% | 234 | 56.0 | 36.2 | 0 |
| S4 | `mln-webgpu` | 492.0 | 134.5 | 0.65 | 1.41 | 2.05 | 0.0% | 65 | 34.6 | 21.8 | 38 |
| S4 | `exp-st` | 418.9 | 75.8 | 1.03 | 1.77 | 2.69 | 0.0% | 31 | 22.1 | 12.1 | 0 |
| S4 | `exp-mt` | 378.1 | 124.2 | 0.91 | 1.63 | 2.09 | 0.0% | 29 | 34.3 | 12.9 | 0 |
| S5 | `mln-webgpu` | 1242.4 | 660.5 | 1.74 | 3.23 | 5.44 | 0.0% | 240 | 72.6 | 66.1 | 0 |
| S5 | `exp-st` | 856.4 | 176.2 | 3.38 | 5.08 | 6.17 | 0.0% | 82 | 103.9 | 50.7 | 0 |
| S5 | `exp-mt` | 940.5 | 299.3 | 3.41 | 5.21 | 6.05 | 0.0% | 83 | 127.7 | 49.7 | 0 |
| S6 | `mln-webgpu` | 344.8 | 63.3 | 0.58 | 1.02 | 1.51 | 0.0% | 50 | 6.9 | 11.9 | 0 |
| S6 | `exp-st` | 264.5 | 56.0 | 1.15 | 1.94 | 2.63 | 0.0% | 70 | 11.6 | 15.5 | 0 |
| S6 | `exp-mt` | 281.2 | 93.3 | 1.19 | 1.65 | 2.61 | 0.0% | 70 | 22.6 | 15.7 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 860.2 | 207.4 | 2.90 | 4.09 | 5.93 | 0.0% | 134 | 85.5 | 37.5 | 0 |
| S7 | `exp-mt` | 919.2 | 316.3 | 2.91 | 4.25 | 5.72 | 0.0% | 130 | 126.7 | 37.5 | 0 |
| S8 | `mln-webgpu` | 400.7 | 112.7 | 1.23 | 2.51 | 4.54 | 0.0% | 130 | 69.5 | 72.7 | 43 |
| S8 | `exp-st` | 594.6 | 143.9 | 1.68 | 3.37 | 6.83 | 0.0% | 85 | 40.1 | 31.1 | 0 |
| S8 | `exp-mt` | 663.0 | 293.5 | 1.62 | 3.47 | 6.60 | 0.0% | 92 | 57.8 | 31.1 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 437 / 437 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 437 / 485 | -9.90% | 0.8590 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 437 / 485 | -9.90% | 0.8590 | 4.93% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 265 / 265 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 265 / 325 | -18.46% | 0.7352 | 8.89% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 265 / 325 | -18.46% | 0.7352 | 8.89% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 297 / 295 | 0.68% | 0.9968 | 0.18% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 295 / 348 | -15.23% | 0.4715 | 39.30% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 297 / 348 | -14.65% | 0.4698 | 39.41% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 64 / 64 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 64 / 96 | -33.33% | 0.4037 | 4.91% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 64 / 96 | -33.33% | 0.4037 | 4.91% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 1.0000 | 0.00% | PASS |
| S5 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S6 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 86 / 86 | 0.00% | 1.0000 | 0.00% | PASS |
| S6 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 86 / 68 | 26.47% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 86 / 68 | 26.47% | — | — | PASS |
| S7 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 75 / 75 | 0.00% | 1.0000 | 0.00% | PASS |
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 383 / 383 | 0.00% | 0.9842 | 0.81% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 383 / 477 | -19.71% | 0.8316 | 7.73% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 383 / 477 | -19.71% | 0.8326 | 7.71% | PASS |
