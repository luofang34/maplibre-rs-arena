# MapLibre Rust Arena — Latest Matrix Report

- **Generated At**: `2026-11-16T06:57:00Z`
- **`maplibre-rs-experimental` rev**: `7b331955bf`
- **`mln-rs` rev**: `0ca2ff95fb`
- **Hardware Profile**: macos aarch64 (3 ABBA rounds)

## 1. Platform, 3D Terrain & XR Capability Matrix

| Dimension | Domain | `maplibre-rs-experimental` | `mln-rs` |
| :--- | :--- | :--- | :--- |
| WebGPU Render Pipeline & Concurrency Model | Web | **Full** — wgpu WebGPU (4-worker single-threaded pool and SharedArrayBuffer multithreaded pool with on-arrival event waking) | **Full** — OffscreenCanvas + dedicated Map Worker + MessageChannel Tile Workers, zero COOP/COEP requirement, built-in WebGL2 fallback |
| Runtime Full Style Hot-Swap (setStyle) | Web | **Full** — Full MapController::setStyle (URL / JSON / object + TileJSON resolution) diffing sources & preserving cached tiles | **Full** — Native WebMap::set_style_url with preloaded resource reuse |
| 3D DEM Elevation Terrain Mesh & Vector Draping (style.terrain) | 3D & Terrain | **Full** — Full raster-dem (terrarium/mapbox), 3D elevation mesh displacement, DrapeCache vector draping & subterranean camera clamping | **Gap** — 2D hillshade & color-relief only; mln_style explicitly reports "the map doesn't draw terrain" |
| 3D Building Extrusions (fill-extrusion) & Globe Projection | 3D & Terrain | **Full** — Supports fill-extrusion, globe & vertical-perspective projections with 6DoF roll/pitch camera | **Full** — Supports fill-extrusion, projection: globe & set_globe_free_bearing trans-polar navigation |
| Native XR Stereo Rendering (visionOS / HMD Stereo) & WebXR | XR & WebXR | **Full** — HeadlessMap::run_xr_frame supports asymmetric per-eye frusta + CoveringPolicy::StereoReuse dual-eye tile sharing + apple/visionos target | **Gap** — No native multi-view stereo XR pipeline or visionOS / WebXR target |
| Desktop & Mobile Native Host + Offline SQLite Cache | Desktop & Mobile | **Full** — Supports macOS/Linux/Windows/Android/iOS/visionOS hosts + rusqlite OfflineDatabase region pack manager & MBTiles/PMTiles | **Full** — Direct MapLibre Native C++ lineage with rusqlite offline storage, HTTP conditional cache & C ABI/FFI |
| Complex Script Shaping (RTL / Indic / HarfRust) & Local CJK Glyphs | Style & Text | **Full** — Native HarfRust + skrifa GSUB/GPOS shaping (optional font-shaping feature) + zero-download browser OffscreenCanvas 2D CJK SDF | **Full** — On-demand mln_web_shaper (HarfRust + skrifa + FreeType) plus zero-download localIdeographFontFamily CJK rendering |

## 2. Native Headless ABBA Benchmarks

| Scenario | Workload | `exp-rs` Median (ms) | `mln-rs` Median (ms) | Mann-Whitney p | Verdict | Notes |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| S1 · Warm 2D Urban PanThroughput (1024×768 Metal, 120f) | GPU-synced per-frame wall time ABBA (3 rounds × 120 frames) | 4.92 | 5.37 | 0.005 | **exp-rs faster** | Per-frame CPU median: exp=1.17ms vs mln=2.01ms (1024×768 headless Metal) |
