# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-23T06:01:39.145Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 4048.7 | 1496.4 |
| `mln-shaper` | 1292.9 | 544.4 |
| `mln-webgl2` | 3941.1 | 1466.5 |
| `exp-st` | 2630.9 | 959.2 |
| `exp-st-worker` | 1684.0 | 652.4 |
| `exp-webgl2` | 3953.3 | 1465.0 |
| `exp-mt` | 3480.1 | 1332.0 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 366.1 | 99.4 | 1.32 | 2.44 | 3.90 | 0.0% | 314 | 44.3 | 45.2 | 0 |
| S1 | `exp-st` | 418.8 | 163.9 | 1.25 | 2.63 | 3.13 | 0.0% | 204 | 56.4 | 41.6 | 0 |
| S1 | `exp-mt` | 538.6 | 226.2 | 1.02 | 2.05 | 2.71 | 0.0% | 218 | 55.4 | 40.4 | 0 |
| S2 | `mln-webgpu` | 660.7 | 207.2 | 1.66 | 3.27 | 6.03 | 0.0% | 383 | 69.8 | 55.9 | 1 |
| S2 | `exp-st` | 588.8 | 107.4 | 1.56 | 3.08 | 3.82 | 0.0% | 212 | 75.1 | 48.0 | 0 |
| S2 | `exp-mt` | 583.8 | 177.7 | 1.21 | 2.38 | 2.83 | 0.0% | 239 | 75.9 | 49.3 | 0 |
| S3 | `mln-webgpu` | 410.1 | 93.8 | 3.03 | 5.53 | 6.95 | 0.0% | 627 | 61.0 | 40.8 | 3 |
| S3 | `exp-st` | 402.9 | 84.3 | 1.41 | 2.66 | 3.27 | 0.0% | 216 | 34.3 | 40.9 | 0 |
| S3 | `exp-mt` | 527.7 | 162.7 | 1.24 | 2.13 | 2.64 | 0.0% | 212 | 50.3 | 39.0 | 0 |
| S4 | `mln-webgpu` | 546.2 | 131.7 | 0.52 | 1.06 | 1.75 | 0.0% | 59 | 34.0 | 22.4 | 1 |
| S4 | `exp-st` | 493.3 | 66.6 | 0.69 | 1.26 | 1.77 | 0.0% | 33 | 26.6 | 18.1 | 0 |
| S4 | `exp-mt` | 612.6 | 88.4 | 0.57 | 1.16 | 1.59 | 0.0% | 33 | 52.0 | 19.2 | 0 |
| S5 | `mln-webgpu` | 1220.4 | 172.4 | 1.57 | 2.54 | 3.29 | 0.0% | 216 | 93.2 | 66.4 | 0 |
| S5 | `exp-st` | 827.9 | 166.3 | 2.79 | 4.71 | 5.33 | 0.0% | 61 | 37.8 | 49.7 | 0 |
| S5 | `exp-mt` | 1283.2 | 247.8 | 2.16 | 4.17 | 4.98 | 0.0% | 60 | 57.6 | 48.5 | 0 |
| S6 | `mln-webgpu` | 347.1 | 55.0 | 0.31 | 0.49 | 0.65 | 0.0% | 46 | 5.4 | 23.1 | 0 |
| S6 | `exp-st` | 303.1 | 83.1 | 0.57 | 0.92 | 1.97 | 0.0% | 40 | 13.1 | 21.3 | 0 |
| S6 | `exp-mt` | 430.1 | 104.0 | 0.44 | 0.70 | 1.69 | 0.0% | 40 | 26.2 | 21.1 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 750.9 | 144.6 | 2.00 | 3.27 | 5.01 | 0.0% | 90 | 40.9 | 42.5 | 0 |
| S7 | `exp-mt` | 1104.6 | 252.7 | 1.82 | 3.04 | 4.46 | 0.0% | 90 | 67.6 | 41.5 | 0 |
| S8 | `mln-webgpu` | 598.9 | 97.7 | 0.88 | 1.85 | 3.91 | 0.0% | 135 | 63.2 | 70.7 | 9 |
| S8 | `exp-st` | 451.0 | 127.3 | 1.42 | 2.74 | 3.63 | 0.0% | 94 | 69.2 | 43.2 | 0 |
| S8 | `exp-mt` | 512.1 | 253.8 | 1.00 | 2.19 | 3.04 | 0.0% | 101 | 61.7 | 43.4 | 0 |

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
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7785 | 8.49% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7785 | 8.49% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 337 | -21.96% | 0.7714 | 8.61% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 0.9977 | 0.10% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9828 | 0.43% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8483 | 6.75% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8473 | 6.81% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8522 | 6.55% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 54 / 54 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 54 / 54 | 0.00% | 0.9986 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9708 | 1.85% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9708 | 1.85% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9697 | 1.91% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 0.9996 | 0.00% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9428 | 3.56% | PASS |
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
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 422 / 422 | 0.00% | 0.9699 | 1.53% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 422 / 422 | 0.00% | 0.9420 | 2.71% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8318 | 7.93% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8325 | 7.88% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8654 | 6.33% | PASS |
