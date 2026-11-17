# MapLibre Rust Arena — Latest Matrix Report

- **Generated At**: `2026-11-17T11:52:31Z`
- **`maplibre-rs-experimental` rev**: `68f5b1158b`
- **`mln-rs` rev**: `0ca2ff95fb`
- **Hardware Profile**: macos aarch64 (5 ABBA rounds)

## 1. Platform, 3D Terrain & XR Capability Matrix

| Dimension | Domain | `maplibre-rs-experimental` | `mln-rs` |
| :--- | :--- | :--- | :--- |
| WebGPU Render Pipeline & Concurrency Model | Web | **Full** — Split wgpu-free Tile Worker WASM + zero-COOP/COEP single-threaded pool, SharedArrayBuffer multithreaded pool, and automatic WebGL2 fallback | **Full** — OffscreenCanvas + dedicated Map Worker + MessageChannel Tile Workers, zero COOP/COEP requirement, built-in WebGL2 fallback |
| Runtime Full Style Hot-Swap (setStyle) | Web | **Full** — Full MapController::setStyle (URL / JSON / object + TileJSON resolution) diffing sources & preserving cached tiles | **Full** — Native WebMap::set_style_url with preloaded resource reuse |
| 3D DEM Elevation Terrain Mesh & Vector Draping (style.terrain) | 3D & Terrain | **Full** — Full raster-dem (terrarium/mapbox), 3D elevation mesh displacement, DrapeCache vector draping & subterranean camera clamping | **Gap** — 2D hillshade & color-relief only; mln_style explicitly reports "the map doesn't draw terrain" |
| 3D Building Extrusions (fill-extrusion) & Globe Projection | 3D & Terrain | **Full** — Supports fill-extrusion, globe & vertical-perspective projections with 6DoF roll/pitch camera | **Full** — Supports fill-extrusion, projection: globe & set_globe_free_bearing trans-polar navigation |
| Native XR Stereo Rendering (visionOS / HMD Stereo) & WebXR | XR & WebXR | **Full** — HeadlessMap::run_xr_frame supports asymmetric per-eye frusta + CoveringPolicy::StereoReuse dual-eye tile sharing + apple/visionos target | **Gap** — No native multi-view stereo XR pipeline or visionOS / WebXR target |
| Desktop & Mobile Native Host + Offline SQLite Cache | Desktop & Mobile | **Full** — Supports macOS/Linux/Windows/Android/iOS/visionOS hosts + rusqlite OfflineDatabase region pack manager & MBTiles/PMTiles | **Full** — Direct MapLibre Native C++ lineage with rusqlite offline storage, HTTP conditional cache & C ABI/FFI |
| Complex Script Shaping (RTL / Indic / HarfRust) & Local CJK Glyphs | Style & Text | **Full** — Native HarfRust + skrifa GSUB/GPOS shaping (optional font-shaping feature) + zero-download browser OffscreenCanvas 2D CJK SDF | **Full** — On-demand mln_web_shaper (HarfRust + skrifa + FreeType) plus zero-download localIdeographFontFamily CJK rendering |

## 2. Native Headless ABBA Benchmarks

| Scenario | Workload | `exp-rs` Median (ms) | `mln-rs` Median (ms) | Mann-Whitney p | Verdict | Notes |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| S1 · Warm 2D Urban PanThroughput (1024×768 Metal, 120f) | GPU-synced per-frame wall time ABBA (5 rounds × 120 frames) | 2.57 | 2.58 | 0.345 | **exp-rs faster** | CPU median: exp=0.74ms vs mln=1.38ms | RSS: exp=165.7 MiB vs mln=184.2 MiB | cold_first_frame=136.1ms |
| S3 · Dense CJK Tokyo (1024×768 Metal, 120f) | Local CJK glyph rasterization + PanThroughput | 2.52 | Unsupported | — | **exp-rs native probe** | CPU mean=0.76ms | cold=173.5ms | idle_redraws=0 | Unpaired on native fixtures |
| S4 · Globe Polar Overview (1024×768 Metal, 120f) | Spherical globe mesh + PanThroughput | 1.03 | Unsupported | — | **exp-rs native probe** | CPU mean=0.18ms | cold=62.1ms | idle_redraws=0 | Unpaired on native fixtures |
| S5 · 3D DEM Terrain Innsbruck (1024×768 Metal, 120f) | 3D DEM mesh + DrapeCache + PanThroughput | 1.71 | Unsupported | — | **exp-rs exclusive (terrain 3D)** | CPU mean=0.73ms | cold=152.9ms | idle_redraws=0 | Unsupported in mln-rs (2D hillshade only) |
