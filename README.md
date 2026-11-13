# maplibre-rs-arena

Cross-engine visual comparison, optional telemetry HUD, and multi-platform benchmark suite for evaluating **`maplibre-rs-experimental`** vs **`mln-rs`** (with **`MapLibre GL JS`** as the style-spec visual baseline) across **Web, Desktop, Mobile, XR (visionOS / HMD), and WebXR**.

## Core Capabilities

1. **Interactive Web Arena (`web-arena/`)**:
   - **4 Visual Comparison Modes**:
     - **Curtain (Swipe Slider)**: Fullscreen overlay with CSS `clip-path: inset(0 0 0 var(--split))` and bidirectional Leader/Follower camera arbitration (zero echo loop).
     - **Side-by-Side**: Independent dual viewports (`50vw × 100vh` each, eliminating clipped-half GPU overdraw).
     - **Blink (`Space` Hotkey)**: Fullscreen instant A ↔ B toggle at identical camera coordinates for spotting 1px symbol shifts, antialiasing, and gamma differences.
     - **Pixel Diff**: Post-idle RGBA readback diffing (`Diff %` + highlighted mismatch mask).
   - **Zero-Overhead Optional Performance HUD (`?perf=1` or key `D`)**:
     - Zero polling/callbacks when hidden.
     - Normalizes heterogeneous internal stages (`mln-rs` 8-phase worker timings vs `maplibre-rs-experimental` TCS `Schedule` stages) into **5 Canonical Cross-Engine Buckets**, plus GPU pass timestamps (`timestamp-query`), Draw Calls, Terrain Drape redraws, total WASM Linear Memory across workers, and Idle Wakeup discipline.
   - **Solo Trajectory Benchmark & WebXR Stereo Simulator**:
     - Runs deterministic camera flights (`S1`–`S8`: 2D Urban, CJK/RTL/Complex Text, 3D Extrusions, Globe-to-Street, 3D DEM Terrain Draping, Dynamic `feature-state`, Dual-Eye Stereo XR `90Hz`, Memory Pressure) on **one engine at a time** to prevent dual-engine GPU contention.

2. **Native Headless ABBA Suite (`native-arena/`)**:
   - Interleaved `A -> B -> B -> A` process execution over pinned offline fixtures.
   - Tracks wall time, multi-threaded `cpu_ms`, macOS retired CPU instructions (`minstr`), heap allocations (`CountingAllocator`), `HeadlessMap::run_xr_frame` stereo throughput, Mann-Whitney U significance (`p < 0.05`), and RGBA frame verification.

3. **Engine Isolation Policy**:
   - **`mln-rs`**: Consumed 100% unmodified from upstream (`louwers/mln-rs`).
   - **`maplibre-rs-experimental`**: Uses a non-default compile-time Cargo feature (`--features arena-telemetry`) that is completely dead-code-eliminated in standard release builds.

---

## Cloudflare Workers Deployment & GitHub Secrets Setup

This repository deploys `web-arena/dist` to **Cloudflare Workers Static Assets** (`wrangler.jsonc`) with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (`web-arena/public/_headers`), supporting both multithreaded (`SharedArrayBuffer`) and single-threaded WASM builds alongside public CORS tile servers.

### Required GitHub Repository Secrets

Configure these two secrets on `luofang34/maplibre-rs-arena` (no local `.env` needed):

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo luofang34/maplibre-rs-arena
gh secret set CLOUDFLARE_ACCOUNT_ID --repo luofang34/maplibre-rs-arena
```

- **`CLOUDFLARE_API_TOKEN`**: Create at `https://dash.cloudflare.com/profile/api-tokens` using the **Edit Cloudflare Workers** template.
- **`CLOUDFLARE_ACCOUNT_ID`**: Copy your 32-character Account ID from the Cloudflare Workers & Pages overview sidebar.

### Triggering a Latest Comparison Build

Go to **Actions → Sync Latest Engines, Benchmark & Deploy (`compare-latest.yml`) → Run workflow** (or run via CLI):

```bash
gh workflow run compare-latest.yml --repo luofang34/maplibre-rs-arena
```

Optional inputs allow overriding `exp_ref` and `mln_ref` (both default to `main`).

---

## Local Quickstart

```bash
just sync-local          # Link local ../maplibre-rs-experimental and ../mln-rs
just build-wasm          # Build WASM bundles for both engines
just dev                 # Start Vite dev server with COOP/COEP headers
just native-bench        # Run native headless ABBA benchmark suite
```
