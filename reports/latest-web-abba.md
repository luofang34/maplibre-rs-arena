# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-22T13:32:59.597Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 4048.7 | 1496.4 |
| `mln-shaper` | 1292.9 | 544.4 |
| `mln-webgl2` | 3941.1 | 1466.5 |
| `exp-st` | 2560.6 | 923.2 |
| `exp-st-worker` | 1647.7 | 635.1 |
| `exp-webgl2` | 3883.6 | 1428.8 |
| `exp-mt` | 3392.7 | 1291.4 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 456.2 | 105.7 | 1.53 | 2.58 | 4.18 | 0.0% | 314 | 44.1 | 44.4 | 0 |
| S1 | `exp-st` | 468.0 | 126.6 | 1.75 | 2.90 | 4.09 | 0.0% | 200 | 46.0 | 42.3 | 0 |
| S1 | `exp-mt` | 443.4 | 189.3 | 1.45 | 2.35 | 3.33 | 0.0% | 221 | 51.6 | 44.8 | 0 |
| S2 | `mln-webgpu` | 703.1 | 213.5 | 1.91 | 3.73 | 6.30 | 0.4% | 390 | 70.4 | 61.0 | 1 |
| S2 | `exp-st` | 518.4 | 118.1 | 1.85 | 3.15 | 4.30 | 0.0% | 215 | 64.0 | 45.3 | 0 |
| S2 | `exp-mt` | 464.8 | 143.9 | 1.58 | 2.75 | 3.10 | 0.0% | 238 | 76.3 | 57.9 | 0 |
| S3 | `mln-webgpu` | 432.8 | 99.3 | 3.02 | 5.05 | 7.58 | 0.0% | 628 | 60.9 | 40.0 | 7 |
| S3 | `exp-st` | 400.1 | 92.8 | 1.80 | 2.77 | 3.23 | 0.0% | 219 | 32.3 | 40.3 | 0 |
| S3 | `exp-mt` | 510.1 | 140.3 | 1.59 | 2.32 | 2.84 | 0.0% | 219 | 51.6 | 39.6 | 0 |
| S4 | `mln-webgpu` | 368.3 | 128.2 | 0.59 | 1.21 | 1.77 | 0.0% | 59 | 32.9 | 23.3 | 2 |
| S4 | `exp-st` | 307.5 | 67.9 | 1.00 | 1.65 | 2.20 | 0.0% | 34 | 25.3 | 18.2 | 0 |
| S4 | `exp-mt` | 645.8 | 68.1 | 0.86 | 1.38 | 1.91 | 0.0% | 34 | 47.6 | 17.6 | 0 |
| S5 | `mln-webgpu` | 1209.4 | 450.2 | 1.63 | 2.67 | 3.46 | 0.0% | 223 | 93.6 | 63.0 | 0 |
| S5 | `exp-st` | 855.0 | 155.8 | 3.37 | 5.16 | 5.82 | 0.0% | 81 | 35.8 | 49.4 | 0 |
| S5 | `exp-mt` | 913.3 | 205.3 | 2.87 | 4.81 | 5.59 | 0.0% | 78 | 54.9 | 50.0 | 0 |
| S6 | `mln-webgpu` | 214.5 | 57.4 | 0.46 | 0.86 | 1.17 | 0.0% | 46 | 6.1 | 23.1 | 0 |
| S6 | `exp-st` | 368.5 | 64.3 | 1.34 | 1.66 | 2.89 | 0.0% | 40 | 10.8 | 21.4 | 0 |
| S6 | `exp-mt` | 246.6 | 75.1 | 1.22 | 1.49 | 2.49 | 0.0% | 40 | 27.8 | 21.6 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 872.1 | 162.1 | 2.50 | 3.63 | 5.48 | 0.0% | 118 | 40.2 | 41.5 | 0 |
| S7 | `exp-mt` | 908.1 | 216.1 | 2.25 | 3.42 | 4.90 | 0.0% | 125 | 62.3 | 42.0 | 0 |
| S8 | `mln-webgpu` | 387.8 | 105.3 | 0.99 | 1.96 | 3.47 | 0.0% | 151 | 63.9 | 72.0 | 14 |
| S8 | `exp-st` | 557.9 | 154.3 | 1.70 | 3.05 | 3.83 | 0.0% | 101 | 48.3 | 43.3 | 0 |
| S8 | `exp-mt` | 614.4 | 205.2 | 1.90 | 3.55 | 4.11 | 0.0% | 92 | 62.8 | 43.3 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8591 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8591 | 4.93% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 484 | -22.52% | 0.9321 | 2.64% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7651 | 8.71% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7651 | 8.71% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 337 | -21.96% | 0.7579 | 8.83% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9806 | 0.53% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8487 | 6.72% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8487 | 6.72% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8516 | 6.59% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 54 / 54 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 54 / 54 | 0.00% | 0.9983 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9541 | 3.46% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9541 | 3.46% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9531 | 3.51% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 1.0000 | 0.00% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9164 | 3.71% | PASS |
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
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 422 / 422 | 0.00% | 0.9816 | 0.93% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 422 / 422 | 0.00% | 0.9481 | 2.42% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 422 / 463 | -8.86% | 0.8240 | 7.64% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 422 / 463 | -8.86% | 0.8278 | 7.50% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 422 / 463 | -8.86% | 0.8582 | 6.03% | PASS |
