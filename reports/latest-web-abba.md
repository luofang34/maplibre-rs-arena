# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-19T02:15:42.220Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 3974.7 | 1471.4 |
| `mln-shaper` | 1291.7 | 543.8 |
| `mln-webgl2` | 3880.8 | 1444.5 |
| `exp-st` | 2369.5 | 863.7 |
| `exp-st-worker` | 1060.8 | 441.8 |
| `exp-webgl2` | 3644.8 | 1350.1 |
| `exp-mt` | 2773.8 | 1038.8 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 5233.6 | 126.3 | 1.70 | 2.52 | 4.26 | 0.0% | 297 | 37.2 | 31.4 | 0 |
| S1 | `exp-st` | 2155.4 | 200.9 | 1.39 | 2.42 | 2.93 | 0.0% | 209 | 22.6 | 36.3 | 0 |
| S1 | `exp-mt` | 3342.7 | 965.8 | 2.77 | 7.15 | 9.22 | 0.0% | 213 | 54.4 | 38.0 | 0 |
| S2 | `mln-webgpu` | 2865.7 | 227.3 | 1.20 | 1.94 | 3.35 | 0.0% | 195 | 35.4 | 25.7 | 46 |
| S2 | `exp-st` | 3086.4 | 195.3 | 1.24 | 1.87 | 4.57 | 0.0% | 69 | 19.4 | 29.0 | 0 |
| S2 | `exp-mt` | 2165.6 | 657.1 | 1.54 | 3.49 | 6.41 | 0.3% | 92 | 85.8 | 32.5 | 0 |
| S3 | `mln-webgpu` | 3090.6 | 98.9 | 1.69 | 2.73 | 4.00 | 0.0% | 207 | 52.8 | 40.9 | 37 |
| S3 | `exp-st` | 1211.4 | 144.7 | 1.54 | 2.48 | 3.15 | 0.0% | 203 | 22.3 | 27.7 | 0 |
| S3 | `exp-mt` | 1179.3 | 634.7 | 3.31 | 7.25 | 12.06 | 1.1% | 155 | 68.4 | 33.9 | 0 |
| S4 | `mln-webgpu` | 5052.6 | 136.8 | 0.71 | 1.42 | 2.85 | 0.0% | 60 | 22.2 | 15.8 | 0 |
| S4 | `exp-st` | 4014.4 | 174.5 | 1.09 | 1.76 | 2.67 | 0.0% | 30 | 19.9 | 6.7 | 0 |
| S4 | `exp-mt` | 5540.0 | 768.6 | 1.12 | 2.12 | 2.92 | 0.0% | 36 | 62.4 | 12.8 | 0 |
| S5 | `mln-webgpu` | 5514.4 | 180.4 | 1.01 | 1.82 | 3.17 | 0.0% | 122 | 54.3 | 62.8 | 104 |
| S5 | `exp-st` | 23029.8 | 23012.2 | 2.89 | 4.21 | 5.70 | 0.0% | 39 | 98.9 | 45.3 | 122 |
| S5 | `exp-mt` | 23023.3 | 23011.4 | 3.09 | 4.99 | 6.86 | 0.0% | 49 | 84.6 | 29.9 | 89 |
| S6 | `mln-webgpu` | 1518.7 | 62.8 | 0.49 | 0.79 | 1.18 | 0.0% | 51 | 6.9 | 12.0 | 0 |
| S6 | `exp-st` | 612.5 | 81.2 | 1.08 | 1.59 | 2.60 | 0.0% | 69 | 14.2 | 23.8 | 0 |
| S6 | `exp-mt` | 940.2 | 120.2 | 1.19 | 2.02 | 2.52 | 0.0% | 69 | 66.4 | 24.3 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 23026.3 | 23014.2 | 2.83 | 3.40 | 4.29 | 0.0% | 87 | 89.1 | 39.5 | 121 |
| S7 | `exp-mt` | 23024.4 | 23009.4 | 3.47 | 5.00 | 6.63 | 0.0% | 116 | 113.6 | 37.2 | 124 |
| S8 | `mln-webgpu` | 2249.1 | 152.3 | 0.50 | 1.05 | 1.81 | 0.0% | 60 | 26.9 | 19.5 | 0 |
| S8 | `exp-st` | 2562.6 | 178.8 | 1.48 | 2.07 | 4.97 | 0.0% | 26 | 17.9 | 31.9 | 0 |
| S8 | `exp-mt` | 2212.5 | 1167.7 | 2.76 | 7.35 | 9.55 | 0.5% | 128 | 59.7 | 38.4 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.
