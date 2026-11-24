# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-24T14:24:37.685Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 4048.7 | 1496.4 |
| `mln-shaper` | 1292.9 | 544.4 |
| `mln-webgl2` | 3941.1 | 1466.5 |
| `exp-st` | 2665.6 | 974.1 |
| `exp-st-worker` | 1686.7 | 652.6 |
| `exp-webgl2` | 3990.6 | 1480.1 |
| `exp-mt` | 3518.5 | 1349.4 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 600.6 | 113.9 | 1.50 | 2.65 | 3.95 | 0.0% | 310 | 44.4 | 45.3 | 0 |
| S1 | `exp-st` | 688.3 | 103.1 | 1.32 | 2.91 | 3.53 | 0.0% | 220 | 53.1 | 41.5 | 0 |
| S1 | `exp-mt` | 563.7 | 216.5 | 1.08 | 1.99 | 2.64 | 0.0% | 187 | 58.4 | 40.5 | 0 |
| S2 | `mln-webgpu` | 782.2 | 215.2 | 2.02 | 3.94 | 6.13 | 0.0% | 387 | 68.4 | 55.0 | 1 |
| S2 | `exp-st` | 624.1 | 110.4 | 1.50 | 3.16 | 4.18 | 0.0% | 224 | 62.8 | 54.3 | 0 |
| S2 | `exp-mt` | 650.4 | 185.5 | 1.26 | 2.38 | 2.76 | 0.0% | 217 | 83.9 | 50.0 | 0 |
| S3 | `mln-webgpu` | 558.2 | 101.1 | 3.11 | 5.79 | 7.72 | 0.0% | 605 | 59.3 | 38.3 | 1 |
| S3 | `exp-st` | 525.5 | 88.9 | 1.46 | 2.60 | 3.81 | 0.0% | 213 | 34.2 | 39.8 | 0 |
| S3 | `exp-mt` | 498.9 | 179.1 | 1.20 | 2.13 | 2.60 | 0.0% | 207 | 46.2 | 39.1 | 5 |
| S4 | `mln-webgpu` | 400.8 | 125.5 | 0.60 | 1.24 | 1.94 | 0.0% | 59 | 34.9 | 22.1 | 1 |
| S4 | `exp-st` | 472.1 | 74.4 | 0.81 | 1.58 | 2.10 | 0.0% | 28 | 25.8 | 17.5 | 1 |
| S4 | `exp-mt` | 436.3 | 86.5 | 0.71 | 1.24 | 2.12 | 0.0% | 28 | 53.0 | 18.0 | 0 |
| S5 | `mln-webgpu` | 1405.6 | 180.0 | 1.65 | 2.58 | 3.60 | 0.0% | 209 | 90.8 | 63.0 | 0 |
| S5 | `exp-st` | 861.8 | 192.7 | 2.60 | 4.63 | 5.17 | 0.0% | 57 | 36.6 | 48.8 | 0 |
| S5 | `exp-mt` | 938.8 | 294.0 | 2.61 | 4.99 | 5.65 | 0.0% | 58 | 59.3 | 50.2 | 0 |
| S6 | `mln-webgpu` | 456.9 | 57.8 | 0.49 | 0.88 | 1.25 | 0.0% | 46 | 7.2 | 24.0 | 0 |
| S6 | `exp-st` | 272.1 | 65.2 | 0.67 | 1.11 | 2.08 | 0.0% | 40 | 13.7 | 21.4 | 0 |
| S6 | `exp-mt` | 295.0 | 110.2 | 0.58 | 1.02 | 1.93 | 0.0% | 40 | 25.6 | 21.2 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 893.4 | 173.5 | 2.03 | 3.48 | 5.36 | 0.0% | 85 | 41.4 | 41.6 | 0 |
| S7 | `exp-mt` | 795.3 | 279.3 | 1.77 | 3.04 | 4.37 | 0.0% | 86 | 62.3 | 42.5 | 0 |
| S8 | `mln-webgpu` | 527.3 | 108.0 | 0.97 | 2.04 | 3.72 | 0.0% | 126 | 67.6 | 64.5 | 9 |
| S8 | `exp-st` | 552.8 | 138.2 | 1.35 | 2.77 | 3.35 | 0.0% | 99 | 63.0 | 43.4 | 0 |
| S8 | `exp-mt` | 575.6 | 258.1 | 1.11 | 2.42 | 3.33 | 0.0% | 101 | 71.3 | 43.1 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9211 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8625 | 4.83% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8625 | 4.83% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 484 | -22.52% | 0.9357 | 2.55% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 0.9971 | 0.13% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7477 | 9.01% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7456 | 9.10% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 337 | -21.96% | 0.7404 | 9.13% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 239 / 239 | 0.00% | 0.9977 | 0.10% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 239 / 239 | 0.00% | 0.9829 | 0.43% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 239 / 461 | -48.16% | 0.8489 | 6.80% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 239 / 461 | -48.16% | 0.8479 | 6.86% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 239 / 461 | -48.16% | 0.8527 | 6.60% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 46 / 46 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 46 / 46 | 0.00% | 0.9986 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 46 / 86 | -46.51% | 0.9685 | 2.28% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 46 / 86 | -46.51% | 0.9685 | 2.28% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 46 / 86 | -46.51% | 0.9674 | 2.33% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 1.0000 | 0.00% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9432 | 3.55% | PASS |
| S5 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 63 / 367 | -82.83% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 63 / 367 | -82.83% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 62 / 367 | -83.11% | — | — | PASS |
| S6 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 51 / 51 | 0.00% | 1.0000 | 0.00% | PASS |
| S6 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 51 / 51 | 0.00% | 0.9799 | 0.00% | PASS |
| S6 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 51 / 61 | -16.39% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 51 / 61 | -16.39% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 51 / 61 | -16.39% | — | — | PASS |
| S7 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 66 / 66 | 0.00% | 1.0000 | 0.00% | PASS |
| S7 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 65 / 66 | -1.51% | 0.9865 | 0.66% | PASS |
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 422 / 422 | 0.00% | 0.9836 | 0.83% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 422 / 422 | 0.00% | 0.9637 | 1.60% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8474 | 7.01% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8414 | 7.31% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8775 | 5.55% | PASS |
