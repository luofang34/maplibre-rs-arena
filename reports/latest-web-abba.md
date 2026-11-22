# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-22T23:08:34.389Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 4048.7 | 1496.4 |
| `mln-shaper` | 1292.9 | 544.4 |
| `mln-webgl2` | 3941.1 | 1466.5 |
| `exp-st` | 2602.1 | 945.5 |
| `exp-st-worker` | 1648.4 | 636.5 |
| `exp-webgl2` | 3926.1 | 1452.6 |
| `exp-mt` | 3461.7 | 1322.5 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 371.9 | 104.9 | 1.57 | 2.83 | 4.32 | 0.0% | 317 | 43.6 | 44.9 | 0 |
| S1 | `exp-st` | 450.5 | 104.6 | 1.57 | 2.80 | 3.48 | 0.0% | 214 | 56.4 | 42.5 | 0 |
| S1 | `exp-mt` | 546.9 | 172.1 | 1.35 | 2.29 | 3.08 | 0.0% | 217 | 69.3 | 44.1 | 0 |
| S2 | `mln-webgpu` | 679.6 | 206.4 | 2.10 | 4.02 | 5.92 | 0.0% | 396 | 70.6 | 59.2 | 1 |
| S2 | `exp-st` | 564.2 | 108.2 | 1.83 | 3.16 | 3.92 | 0.0% | 224 | 73.4 | 57.3 | 0 |
| S2 | `exp-mt` | 478.1 | 120.8 | 1.53 | 2.62 | 3.00 | 0.0% | 214 | 85.6 | 52.0 | 0 |
| S3 | `mln-webgpu` | 538.3 | 96.3 | 3.31 | 5.62 | 8.13 | 0.0% | 628 | 62.0 | 41.3 | 1 |
| S3 | `exp-st` | 480.4 | 95.7 | 1.75 | 2.75 | 3.38 | 0.0% | 219 | 32.5 | 39.7 | 0 |
| S3 | `exp-mt` | 436.3 | 145.9 | 1.47 | 2.26 | 2.67 | 0.0% | 219 | 60.9 | 39.0 | 0 |
| S4 | `mln-webgpu` | 567.5 | 120.1 | 0.59 | 1.23 | 1.55 | 0.0% | 59 | 33.6 | 21.8 | 1 |
| S4 | `exp-st` | 371.8 | 68.2 | 0.91 | 1.55 | 2.01 | 0.0% | 33 | 27.8 | 17.3 | 0 |
| S4 | `exp-mt` | 495.3 | 76.1 | 0.80 | 1.32 | 1.79 | 0.0% | 34 | 60.9 | 17.9 | 0 |
| S5 | `mln-webgpu` | 1303.3 | 172.2 | 1.59 | 2.50 | 3.44 | 0.0% | 203 | 95.7 | 66.4 | 0 |
| S5 | `exp-st` | 866.2 | 178.3 | 2.73 | 4.49 | 5.46 | 0.0% | 61 | 36.5 | 48.6 | 0 |
| S5 | `exp-mt` | 882.6 | 280.9 | 2.85 | 5.16 | 6.03 | 0.0% | 67 | 75.4 | 50.2 | 0 |
| S6 | `mln-webgpu` | 242.7 | 52.7 | 0.37 | 0.49 | 0.71 | 0.0% | 46 | 6.2 | 23.2 | 0 |
| S6 | `exp-st` | 348.8 | 69.5 | 1.42 | 1.68 | 2.94 | 0.0% | 40 | 10.9 | 21.4 | 0 |
| S6 | `exp-mt` | 359.5 | 80.1 | 1.33 | 1.60 | 2.27 | 0.0% | 40 | 31.4 | 21.4 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 870.3 | 187.5 | 2.39 | 3.64 | 5.64 | 0.0% | 95 | 41.6 | 42.0 | 0 |
| S7 | `exp-mt` | 895.8 | 341.5 | 2.14 | 3.42 | 4.58 | 0.0% | 97 | 78.5 | 40.9 | 0 |
| S8 | `mln-webgpu` | 553.4 | 106.6 | 0.98 | 2.00 | 4.17 | 0.0% | 127 | 60.7 | 58.6 | 12 |
| S8 | `exp-st` | 621.1 | 125.1 | 1.51 | 2.81 | 3.55 | 0.0% | 94 | 60.9 | 43.1 | 0 |
| S8 | `exp-mt` | 525.5 | 228.2 | 1.33 | 2.73 | 3.46 | 0.0% | 107 | 86.3 | 43.0 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8557 | 5.17% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 484 | -22.52% | 0.8557 | 5.17% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 484 | -22.52% | 0.9288 | 2.88% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7710 | 8.58% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 337 | -19.59% | 0.7710 | 8.58% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 337 | -21.96% | 0.7638 | 8.70% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9806 | 0.53% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8472 | 6.83% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8472 | 6.83% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 465 | -47.74% | 0.8501 | 6.69% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 54 / 54 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 54 / 54 | 0.00% | 0.9986 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9715 | 1.69% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9715 | 1.69% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 54 / 86 | -37.21% | 0.9704 | 1.74% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 0.9722 | 0.16% | PASS |
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
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 422 / 422 | 0.00% | 0.9817 | 1.00% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 422 / 422 | 0.00% | 0.9395 | 2.89% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8328 | 7.76% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8339 | 7.69% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 422 / 465 | -9.25% | 0.8676 | 6.14% | PASS |
