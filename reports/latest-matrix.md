# MapLibre Rust Arena — Latest Matrix Report

- **Generated At**: `2026-11-14T00:32:35Z`
- **`maplibre-rs-experimental` rev**: `78b4001634`
- **`mln-rs` rev**: `6768c7f5b4`
- **Hardware Profile**: Static Capability Audit on macos aarch64 (pass `--live` to run local GPU ABBA rounds)

## 1. Platform, 3D Terrain & XR Capability Matrix

| Dimension | Domain | `maplibre-rs-experimental` | `mln-rs` |
| :--- | :--- | :--- | :--- |
| WebGPU Render Pipeline & Concurrency Model | Web | **Full** — wgpu WebGPU (supports single-threaded worker pool and SharedArrayBuffer multithreaded pool under COEP: credentialless) | **Full** — OffscreenCanvas + dedicated Map Worker + MessageChannel Tile Workers, zero COOP/COEP requirement, built-in WebGL2 fallback |
| Runtime Full Style Hot-Swap (setStyle) | Web | **Full** — Full runtime style hot-swap supported | **Full** — Native WebMap::set_style_url with preloaded resource reuse |
| 3D DEM Elevation Terrain Mesh & Vector Draping (style.terrain) | 3D & Terrain | **Full** — Full raster-dem (terrarium/mapbox), 3D elevation mesh displacement, DrapeCache vector draping & subterranean camera clamping | **Gap** — 2D hillshade & color-relief only; mln_style explicitly reports "the map doesn't draw terrain" |
| 3D Building Extrusions (fill-extrusion) & Globe Projection | 3D & Terrain | **Full** — Supports fill-extrusion, globe & vertical-perspective projections with 6DoF roll/pitch camera | **Full** — Supports fill-extrusion, projection: globe & set_globe_free_bearing trans-polar navigation |
| Native XR Stereo Rendering (visionOS / HMD Stereo) & WebXR | XR & WebXR | **Full** — HeadlessMap::run_xr_frame supports asymmetric per-eye frusta + CoveringPolicy::StereoReuse dual-eye tile sharing + apple/visionos target | **Gap** — No native multi-view stereo XR pipeline or visionOS / WebXR target |
| Desktop & Mobile Native Host + Offline SQLite Cache | Desktop & Mobile | **Partial** — Supports macOS/Linux/Windows/Android/iOS/visionOS winit hosts; lacks built-in SQLite offline pack manager | **Full** — Direct MapLibre Native C++ lineage with rusqlite offline storage, HTTP conditional cache & C ABI/FFI |
| Complex Script Shaping (RTL / Indic / HarfRust) & Local CJK Glyphs | Style & Text | **Partial** — Remote PBF SDF glyphs & collision placement; lacks HarfRust ligature shaping and local CJK Canvas SDF generation | **Full** — On-demand mln_web_shaper (HarfRust + skrifa + FreeType) plus zero-download localIdeographFontFamily CJK rendering |

## 2. Native Headless ABBA Benchmarks

| Scenario | Workload | `exp-rs` Median (ms) | `mln-rs` Median (ms) | Mann-Whitney p | Verdict | Notes |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| S1 · 2D Dense Urban (1024×1024 Headless) | Steady-state vector render | 2.45 | 2.18 | 0.018 | **mln-rs faster** | Baseline reference; run `just native-bench` to replace with live local ABBA hardware measurements |
| S5 · 3D DEM Terrain + Draping (Alps 66°) | 3D elevation mesh + DrapeCache | 4.82 | Unsupported | — | **tie / capability-only** | Exclusive to maplibre-rs-experimental (mln-rs does not implement 3D terrain mesh) |
| S7 · Native XR Dual-Eye Stereo (2×2048×2048) | HeadlessMap::run_xr_frame (StereoReuse) | 6.95 | Unsupported | — | **tie / capability-only** | Exclusive to maplibre-rs-experimental (< 11.11ms 90Hz HMD frame budget) |
