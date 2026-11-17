# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report

- **Generated At**: `2026-11-17T06:23:59.056Z`
- **Adapter**: `apple metal-3`
- **Rounds**: `3` × `240` frames/flight (fresh BrowserContext per cold run)

## 1. WASM Bundle Sizes

| Artifact | Raw (KiB) | Gzip-9 (KiB) |
| :--- | ---: | ---: |
| `mln-webgpu` | 4113.2 | 1504.9 |
| `mln-shaper` | 1291.7 | 543.9 |
| `exp-st` | 3197.7 | 1247.1 |
| `exp-st-worker` | 1589.2 | 690.9 |
| `exp-mt` | 3642.4 | 1462.2 |

## 2. Scenario Matrix (Medians Across Interleaved Rounds)

| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| S1 | `mln-webgpu` | 1245.9 | 130.9 | 2.33 | 3.45 | 7.44 | 0.0% | 288 | 39.6 | 79.2 | 0 |
| S1 | `exp-st` | 1424.0 | 221.5 | 1.93 | 3.34 | 3.98 | 0.0% | 234 | 32.9 | 48.7 | 0 |
| S1 | `exp-mt` | 1397.9 | 594.0 | 2.52 | 5.37 | 9.69 | 0.4% | 223 | 59.6 | 48.7 | 0 |
| S2 | `mln-webgpu` | 1397.8 | 251.4 | 2.81 | 9.13 | 21.04 | 4.2% | 261 | 83.4 | 76.5 | 53 |
| S2 | `exp-st` | 1351.8 | 198.9 | 2.05 | 3.79 | 4.64 | 0.0% | 195 | 39.2 | 56.9 | 0 |
| S2 | `exp-mt` | 882.4 | 471.9 | 1.75 | 3.80 | 7.05 | 0.0% | 143 | 88.5 | 43.4 | 0 |
| S3 | `mln-webgpu` | 869.5 | 115.8 | 3.77 | 6.44 | 9.89 | 0.3% | 335 | 64.8 | 298.6 | 34 |
| S3 | `exp-st` | 977.3 | 163.3 | 2.74 | 4.59 | 5.76 | 0.0% | 252 | 44.7 | 52.8 | 0 |
| S3 | `exp-mt` | 1094.3 | 370.0 | 3.21 | 6.38 | 9.55 | 0.6% | 207 | 61.9 | 49.6 | 0 |
| S4 | `mln-webgpu` | 1181.7 | 114.1 | 0.73 | 1.53 | 2.39 | 0.0% | 54 | 29.3 | 22.1 | 28 |
| S4 | `exp-st` | 880.1 | 187.3 | 1.13 | 2.31 | 6.05 | 0.0% | 35 | 48.4 | 15.8 | 0 |
| S4 | `exp-mt` | 2800.3 | 495.6 | 1.03 | 1.73 | 3.79 | 0.0% | 35 | 71.3 | 12.4 | 0 |
| S5 | `mln-webgpu` | 1854.4 | 1388.0 | 108.04 | 219.63 | 255.22 | 90.4% | 232 | 396.6 | 974.8 | 0 |
| S5 | `exp-st` | 3726.6 | 1078.4 | 6.23 | 14.62 | 20.40 | 8.7% | 73 | 155.4 | 66.9 | 0 |
| S5 | `exp-mt` | 2939.1 | 666.6 | 4.47 | 6.46 | 8.02 | 0.0% | 74 | 170.6 | 66.1 | 0 |
| S6 | `mln-webgpu` | 750.5 | 62.3 | 0.56 | 0.95 | 1.31 | 0.0% | 50 | 6.1 | 11.6 | 0 |
| S6 | `exp-st` | 478.4 | 115.0 | 1.42 | 1.82 | 2.57 | 0.0% | 50 | 18.9 | 33.8 | 0 |
| S6 | `exp-mt` | 472.5 | 141.1 | 1.67 | 2.94 | 7.61 | 0.0% | 50 | 57.6 | 33.8 | 0 |
| S7 | `mln-webgpu` | Unsupported | — | — | — | — | — | — | — | — | — |
| S7 | `exp-st` | 2676.8 | 1036.2 | 8.50 | 24.00 | 33.07 | 24.9% | 126 | 145.3 | 52.9 | 0 |
| S7 | `exp-mt` | 4235.5 | 688.9 | 4.23 | 6.05 | 8.24 | 0.0% | 129 | 161.4 | 45.5 | 0 |
| S8 | `mln-webgpu` | 2112.6 | 125.1 | 1.26 | 2.67 | 5.80 | 0.0% | 107 | 47.6 | 44.1 | 80 |
| S8 | `exp-st` | 1160.8 | 239.5 | 1.76 | 4.33 | 7.35 | 0.0% | 97 | 25.3 | 55.4 | 0 |
| S8 | `exp-mt` | 1070.8 | 709.1 | 4.02 | 11.44 | 13.60 | 6.1% | 140 | 67.7 | 54.9 | 0 |

> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.
