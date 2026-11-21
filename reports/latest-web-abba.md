# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-21T16:31:56.308Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2528.8 | 909.0 |
| `exp-st-worker` | 1639.6 | 631.4 |
| `exp-webgl2` | 3851.4 | 1414.2 |
| `exp-mt` | 3350.1 | 1271.9 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 642.5 | 115.9 | 1.72 | 2.76 | 4.16 | 0.0% | 288 | 50.8 | 39.7 | 0 |
| S1 | `exp-st` | 590.9 | 110.2 | 1.65 | 2.88 | 3.46 | 0.0% | 202 | 45.5 | 41.3 | 0 |
| S1 | `exp-mt` | 650.2 | 185.7 | 1.43 | 2.55 | 3.32 | 0.0% | 217 | 52.0 | 43.7 | 0 |
| S2 | `mln-webgpu` | 792.6 | 216.7 | 2.24 | 3.90 | 6.84 | 0.0% | 301 | 83.1 | 61.8 | 10 |
| S2 | `exp-st` | 594.5 | 122.3 | 1.75 | 3.05 | 3.79 | 0.0% | 197 | 52.7 | 44.7 | 0 |
| S2 | `exp-mt` | 562.9 | 146.0 | 1.56 | 2.75 | 3.08 | 0.0% | 214 | 73.6 | 45.9 | 0 |
| S3 | `mln-webgpu` | 896.2 | 89.4 | 2.80 | 4.04 | 6.93 | 0.0% | 329 | 67.4 | 53.9 | 29 |
| S3 | `exp-st` | 429.1 | 111.3 | 1.86 | 2.88 | 3.52 | 0.0% | 217 | 34.1 | 40.8 | 0 |
| S3 | `exp-mt` | 396.9 | 124.1 | 1.61 | 2.32 | 2.81 | 0.0% | 218 | 51.2 | 39.5 | 0 |
| S4 | `mln-webgpu` | 551.6 | 127.9 | 0.60 | 1.17 | 2.15 | 0.0% | 69 | 34.6 | 21.6 | 45 |
| S4 | `exp-st` | 407.8 | 67.0 | 0.98 | 1.65 | 2.54 | 0.0% | 39 | 25.5 | 17.0 | 0 |
| S4 | `exp-mt` | 441.4 | 70.4 | 0.83 | 1.34 | 2.12 | 0.0% | 40 | 42.0 | 16.1 | 0 |
| S5 | `mln-webgpu` | 1301.5 | 172.5 | 1.51 | 2.56 | 5.37 | 0.0% | 218 | 71.1 | 66.2 | 0 |
| S5 | `exp-st` | 957.1 | 194.0 | 3.22 | 5.00 | 6.02 | 0.0% | 85 | 36.6 | 50.4 | 0 |
| S5 | `exp-mt` | 1082.9 | 207.6 | 2.56 | 4.62 | 5.50 | 0.0% | 78 | 55.4 | 49.1 | 0 |
| S6 | `mln-webgpu` | 383.4 | 60.4 | 0.40 | 0.64 | 0.83 | 0.0% | 51 | 6.3 | 11.3 | 0 |
| S6 | `exp-st` | 296.2 | 65.1 | 1.32 | 1.66 | 2.58 | 0.0% | 40 | 11.3 | 21.4 | 0 |
| S6 | `exp-mt` | 385.5 | 74.0 | 1.24 | 1.54 | 2.15 | 0.0% | 40 | 24.5 | 21.1 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 896.9 | 161.5 | 2.48 | 3.63 | 5.39 | 0.0% | 124 | 39.8 | 41.5 | 0 |
| S7 | `exp-mt` | 1126.5 | 209.6 | 2.29 | 3.42 | 4.79 | 0.0% | 126 | 64.3 | 41.6 | 0 |
| S8 | `mln-webgpu` | 505.3 | 107.4 | 0.99 | 2.19 | 3.77 | 0.0% | 149 | 65.2 | 57.3 | 47 |
| S8 | `exp-st` | 578.6 | 138.3 | 1.71 | 3.09 | 3.75 | 0.0% | 99 | 51.9 | 43.0 | 0 |
| S8 | `exp-mt` | 728.4 | 207.4 | 1.88 | 3.45 | 3.87 | 0.0% | 94 | 65.9 | 42.5 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.

## 3. Deterministic Output-Parity Gate (PASS)

| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| S1 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 375 / 375 | 0.00% | 1.0000 | 0.00% | PASS |
| S1 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 375 / 375 | 0.00% | 0.9213 | 2.40% | PASS |
| S1 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 375 / 447 | -16.11% | 0.8215 | 7.00% | PASS |
| S1 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 375 / 447 | -16.11% | 0.8215 | 7.00% | PASS |
| S1 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 375 / 447 | -16.11% | 0.8953 | 4.71% | PASS |
| S2 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 271 / 271 | 0.00% | 1.0000 | 0.00% | PASS |
| S2 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 263 / 271 | -2.95% | 0.9946 | 0.00% | PASS |
| S2 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7590 | 8.76% | PASS |
| S2 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 271 / 325 | -16.61% | 0.7590 | 8.76% | PASS |
| S2 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 263 / 325 | -19.08% | 0.7517 | 8.88% | PASS |
| S3 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 243 / 243 | 0.00% | 1.0000 | 0.00% | PASS |
| S3 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 243 / 243 | 0.00% | 0.9806 | 0.53% | PASS |
| S3 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9124 | 3.71% | PASS |
| S3 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9124 | 3.71% | PASS |
| S3 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 243 / 336 | -27.68% | 0.9148 | 3.59% | PASS |
| S4 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 64 / 64 | 0.00% | 1.0000 | 0.00% | PASS |
| S4 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 64 / 64 | 0.00% | 0.9983 | 0.02% | PASS |
| S4 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9446 | 4.51% | PASS |
| S4 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9446 | 4.51% | PASS |
| S4 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 64 / 96 | -33.33% | 0.9436 | 4.57% | PASS |
| S5 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 63 / 63 | 0.00% | 0.9996 | 0.00% | PASS |
| S5 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 62 / 63 | -1.59% | 0.9432 | 3.56% | PASS |
| S5 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 63 / 381 | -83.47% | — | — | PASS |
| S5 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 62 / 381 | -83.73% | — | — | PASS |
| S6 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 51 / 51 | 0.00% | 1.0000 | 0.00% | PASS |
| S6 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 51 / 51 | 0.00% | 0.9799 | 0.00% | PASS |
| S6 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 51 / 68 | -25.00% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 51 / 68 | -25.00% | — | — | PASS |
| S6 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 51 / 68 | -25.00% | — | — | PASS |
| S7 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 66 / 66 | 0.00% | 1.0000 | 0.00% | PASS |
| S7 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 65 / 66 | -1.51% | 0.9865 | 0.66% | PASS |
| S8 | `exp-variant-vs-st` | `exp-mt` | `exp-st` | 422 / 422 | 0.00% | 0.9816 | 0.93% | PASS |
| S8 | `exp-variant-vs-st` | `exp-webgl2` | `exp-st` | 422 / 422 | 0.00% | 0.9552 | 2.03% | PASS |
| S8 | `exp-vs-mln` | `exp-st` | `mln-webgpu` | 422 / 477 | -11.53% | 0.8385 | 7.40% | PASS |
| S8 | `exp-vs-mln` | `exp-mt` | `mln-webgpu` | 422 / 477 | -11.53% | 0.8439 | 7.18% | PASS |
| S8 | `exp-vs-mln` | `exp-webgl2` | `mln-webgpu` | 422 / 477 | -11.53% | 0.8735 | 5.70% | PASS |
