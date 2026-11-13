# MapLibre Rust Arena — Latest Matrix Report

- **Generated At**: `2026-11-13T23:23:59Z`
- **`maplibre-rs-experimental` rev**: `78b4001634`
- **`mln-rs` rev**: `6768c7f5b4`
- **Hardware Profile**: Static Capability Audit on macos aarch64 (pass `--live` to run local GPU ABBA rounds)

## 1. Platform, 3D Terrain & XR Capability Matrix

| Dimension | Domain | `maplibre-rs-experimental` | `mln-rs` |
| :--- | :--- | :--- | :--- |
| WebGPU 渲染管线与并发模型 | Web | **Full** — wgpu WebGPU (支持单线程 Worker 池与 COEP: credentialless 下的 SharedArrayBuffer 多线程池) | **Full** — OffscreenCanvas + 独立 Map Worker + MessageChannel Tile Workers，零 COOP/COEP 依赖，内置 WebGL2 回退 |
| 运行时整套样式热切换 (setStyle) | Web | **Full** — 已支持运行时完整样式切换 | **Full** — 原生支持 WebMap::set_style_url 与预加载资源复用 |
| 3D DEM 高程地形网格与矢量贴地 (style.terrain) | 3D & Terrain | **Full** — 完整支持 raster-dem (terrarium/mapbox)、3D 地形网格起伏、DrapeCache 道路/面贴地重绘及海拔防穿模 | **Gap** — 仅支持 2D hillshade 与 color-relief；mln_style 明确返回 the map doesn't draw terrain |
| 3D 建筑挤压 (fill-extrusion) 与 Globe 球面投影 | 3D & Terrain | **Full** — 支持 fill-extrusion、globe 与 vertical-perspective 投影及 6DoF roll/pitch 相机 | **Full** — 支持 fill-extrusion、projection: globe 及 set_globe_free_bearing 跨极点自由航向 |
| Native XR 双目立体渲染 (visionOS / HMD Stereo) 与 WebXR | XR & WebXR | **Full** — HeadlessMap::run_xr_frame 原生支持左右眼非对称视锥体 + CoveringPolicy::StereoReuse 双目瓦片共享 + apple/visionos 工程 | **Gap** — 无原生 XR 多视图立体管线或 visionOS / WebXR 目标 |
| 桌面与移动端原生宿主 + 离线存储 | Desktop & Mobile | **Partial** — 支持 macOS/Linux/Windows/Android/iOS/visionOS winit 宿主，缺少原生 SQLite 离线包管理 | **Full** — 源自 MapLibre Native C++ 完整架构，含 rusqlite 离线存储、HTTP 条件缓存与 C ABI/FFI |
| 复杂文本塑形 (RTL / Indic / HarfRust) 与本地 CJK 字形 | Style & Text | **Partial** — 支持远程 PBF SDF 字形与碰撞检测；暂缺 HarfRust 连字塑形与本地 CJK Canvas SDF 生成 | **Full** — 按需加载 mln_web_shaper (HarfRust + skrifa + FreeType) 并支持 localIdeographFontFamily 免下载绘制 CJK |

## 2. Native Headless ABBA Benchmarks

| Scenario | Workload | `exp-rs` Median (ms) | `mln-rs` Median (ms) | Mann-Whitney p | Verdict | Notes |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| S1 · 2D Dense Urban (1024×1024 Headless) | Steady-state vector render | 2.45 | 2.18 | 0.018 | **mln-rs faster** | Baseline reference; run `just native-bench` to replace with live local ABBA hardware measurements |
| S5 · 3D DEM Terrain + Draping (Alps 66°) | 3D elevation mesh + DrapeCache | 4.82 | Unsupported | — | **tie / capability-only** | Exclusive to maplibre-rs-experimental (mln-rs does not implement 3D terrain mesh) |
| S7 · Native XR Dual-Eye Stereo (2×2048×2048) | HeadlessMap::run_xr_frame (StereoReuse) | 6.95 | Unsupported | — | **tie / capability-only** | Exclusive to maplibre-rs-experimental (< 11.11ms 90Hz HMD frame budget) |
