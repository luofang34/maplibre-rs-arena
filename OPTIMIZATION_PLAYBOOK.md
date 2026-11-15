# Local Run Workflow & Wave-2 Agent Optimization Playbook (No Cloudflare Worker)

This playbook runs **100% locally** (`127.0.0.1` + native Apple Silicon Metal CLI) with **zero Cloudflare / Wrangler / remote CI dependencies**.

---

## Part 1: Local Run Workflow (Zero Cloudflare Dependency)

### Directory Layout Assumption
Keep the three sibling checkouts side by side:
- `/Users/fangluo/maplibre-rs-experimental` — **Target repo under active optimization**
- `/Users/fangluo/mln-rs` — **Read-only reference baseline (`0ca2ff95+`, NEVER modify)**
- `/Users/fangluo/maplibre-rs-arena` — **Local benchmark harness & visual comparison workbench**

### Step 1: One-Time Local Setup & Reference Build
```bash
cd /Users/fangluo/maplibre-rs-arena

# 1. Symlink ../maplibre-rs-experimental and ../mln-rs into ./engines/
just sync-local

# 2. Install local web-arena frontend dependencies
just install-web

# 3. Build BOTH mln-rs and maplibre-rs-experimental release WASM bundles
#    (mln-rs compiles into .cache/mln-wasm-target so ../mln-rs stays 100% clean)
just build-wasm release

# 4. Generate capability & native ABBA baseline report + web bundle
just native-bench matrix --live --rounds 5
just build-web
```

### Step 2: Fast Inner Loop (Rebuild ONLY `maplibre-rs-experimental`)
Whenever you modify code in `/Users/fangluo/maplibre-rs-experimental`:

```bash
cd /Users/fangluo/maplibre-rs-arena

# Rebuild ONLY exp-st + exp-mt WASM bundles and refresh public/wasm/manifest.json
just build-wasm-exp release
just build-web
```

### Step 3: Run Local WebGPU Comparison, Solo Flight & Book Examples (No CF Worker)
Vite serves `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` locally so both `exp-st` and `exp-mt` (`SharedArrayBuffer`) work on `127.0.0.1`:

```bash
# Terminal 1: Production minified Arena preview -> http://127.0.0.1:4179/?perf=1
cd /Users/fangluo/maplibre-rs-arena
just preview

# Terminal 2: Rebuild & verify mdBook live examples -> http://127.0.0.1:3000/
cd /Users/fangluo/maplibre-rs-experimental
just web-lib build --release
just web-demo build
rm -f docs/src/examples/demo/maplibre_bg-*.wasm
cp web/demo/dist/assets/index-*.js docs/src/examples/demo/index.js
cp web/demo/dist/assets/maplibre_bg-*.wasm docs/src/examples/demo/
just book-serve
```

### Step 4: Run Local Native Metal Headless Benchmarks & Repo CI Guards
```bash
# 1. All 6 repository CI guards + formatting check (MUST pass before committing)
cd /Users/fangluo/maplibre-rs-experimental
RUSTUP_TOOLCHAIN=nightly cargo fmt -- --check
node scripts/check-file-length.mjs origin/main
node scripts/check-panics.mjs
python3 scripts/check-module-layout.py --base origin/main
python3 scripts/check-wasm-deps.py
python3 scripts/check-release-version.py
python3 scripts/check-immersive-stability.py --self-test

# 2. Native Metal headless snapshot + wait4 rusage (S1 2D, S4 Globe, S5 3D Terrain, S7 XR)
cargo build --release -p maplibre-demo --features headless
/usr/bin/time -l ./target/release/maplibre-demo snapshot \
  --terrain --width 1024 --height 768 --lat 47.27 --lon 11.40 --zoom 12.2 --pitch 66 --bearing 28 \
  --max-frames 60 --timeout-secs 18 --out /tmp/exp-s5-terrain.png

# 3. Reference mln-rs native Metal benchmark (writes ONLY to /tmp; zero edits to ../mln-rs)
python3 /Users/fangluo/mln-rs/tools/bench/fixtures.py /tmp/mln-bench-fixtures
CARGO_TARGET_DIR=/tmp/mln-bench-target cargo run --release \
  --manifest-path /Users/fangluo/mln-rs/Cargo.toml -p mln-rs-bench -- \
  run --fixtures /tmp/mln-bench-fixtures --scale 0.5 --json
```

---

## Part 2: Copy-Paste Prompt for Wave-2 Implementation Agent

Copy the prompt below into an agent session opened in `/Users/fangluo/maplibre-rs-experimental`:

```markdown
You are a Principal Rust Graphics & WebGPU Engine Architect working in `/Users/fangluo/maplibre-rs-experimental`.

Wave 1 landed major wins:
- **WASM Gzip-9 Size**: `exp-mt` (`1,372.8 KiB`) and `exp-st` (`1,441.6 KiB`) are now **smaller** than `mln-rs` `0ca2ff95` (`1,504.9 KiB` + `543.9 KiB` shaper).
- **Web Stability & Memory**: `winit RefCell` Solo Flight panics are eliminated (`0` panics across `S1` & `S5`); initial `200 MiB` SAB floor is gone (`S1` Peak WASM `65.7–67.6 MiB` vs `mln-rs` `58.6–60.1 MiB`).
- **3D DEM Terrain Leadership**: On `S5` Web Solo Flight, `exp-mt` renders full 3D DEM terrain + vector draping at `14.61 ms` CPU Avg / `20.21 ms` P95 / `122.2 MiB` WASM (vs `mln-rs` 2D hillshade at `161.70 ms` Avg / `404.24 ms` P95 / `420.4 MiB` WASM). Native `S1` cold snapshot dropped `1,331.5 ms -> 169.0 ms` (7.9x faster) and `S5` dropped `2,122.9 ms -> 548.6 ms` (3.9x faster).
- **Capability Matrix**: All 7 capability rows are `Full`.

Your Wave-2 mission is to close the remaining **2D Urban WebGPU frame-time / draw-call gap**, **native warm steady-state frame throughput**, **3D Terrain native Peak RSS**, and **crate modularity** so `maplibre-rs-experimental` matches or beats `mln-rs` (`0ca2ff95`) on every remaining metric.

## Hard Constraints (Non-Negotiable)
1. **NEVER modify `/Users/fangluo/mln-rs`** (`git status` must stay 100% empty; always use `CARGO_TARGET_DIR=/tmp/mln-target` if running `mln-rs-bench`).
2. **NO Cloudflare Workers / Wrangler / remote deployments**: Run all verification locally (`127.0.0.1` + native Metal CLI).
3. **Pass All 6 Repo CI Guards Before Every Commit**:
   - `RUSTUP_TOOLCHAIN=nightly cargo fmt -- --check`
   - `node scripts/check-file-length.mjs origin/main` (strict `<= 500` lines per file, no `mod.rs` files per `python3 scripts/check-module-layout.py --base origin/main`)
   - `node scripts/check-panics.mjs` (`<= 813` non-test panic sites; `--deny clippy::unwrap_used --deny clippy::expect_used --deny unsafe_code`)
   - `python3 scripts/check-wasm-deps.py`
   - `python3 scripts/check-release-version.py`
   - `python3 scripts/check-immersive-stability.py --self-test`
4. **Keep `docs` Book Examples Green**: Whenever touching `web/` or `maplibre/`, rebuild `just web-lib build --release && just web-demo build`, sync `web/demo/dist/assets/*` into `docs/src/examples/demo/`, and verify book examples render with zero console errors.

## Current Post-Wave-1 Baseline vs `mln-rs` (`0ca2ff95`) & Wave-2 Targets

| Metric | Current `exp-rs` (`main`) | `mln-rs` (`0ca2ff95`) | Wave-2 Target for `exp-rs` |
| :--- | ---: | ---: | ---: |
| **WASM Gzip-9 Size (`release`)** | `1,372.8 KiB` (MT) / `1,441.6 KiB` (ST) | `1,504.9 KiB` (+`543.9 KiB` shaper) | **Keep `<= 1,400 KiB` (MT) / `<= 1,450 KiB` (ST)** |
| **Web `S1` 2D Urban Avg Draw Calls** | `1,629` (MT) / `1,760` (ST) (`3,064` peak) | `337–340` (`642` peak) | **`<= 400` Avg Draw Calls** |
| **Web `S1` Solo Flight CPU Avg / P95** | `16.18 / 29.96 ms` (ST), `28.07 / 52.80 ms` (MT) | `2.62 / 3.72 ms` | **`<= 4.0 ms` Avg / `<= 6.5 ms` P95** |
| **Web `S1` Cold Load** | `413 ms` (ST) / `2,614 ms` (MT) | `111–119 ms` (warm cache) | **`<= 300 ms` (both ST & MT)** |
| **Web `S5` 3D Terrain CPU Avg / P95** | `14.61 / 20.21 ms` (`122.2 MiB`) | `161.70 / 404.24 ms` (2D only) | **`<= 9.0 ms` Avg / `<= 14.0 ms` P95 (`< 11.1 ms` 90Hz goal)** |
| **Native Warm Frame Throughput (`1024×768`)** | Cold-process CLI (`114.1 ms` w/ init) | `5.21 ms` (`2.21 ms` CPU, `10.35 ms` P95) | **Add warm frame bench: `<= 5.0 ms` GPU / `<= 2.2 ms` CPU** |
| **Native `S5` / `S7` 3D Terrain Peak RSS** | `401.1 MiB` (`S5`) / `392.5 MiB` (`S7`) | Unsupported | **`<= 220 MiB` Peak RSS** |

## Wave-2 Execution Roadmap (Ordered by Impact)

### Phase 1: Slash 2D Vector Draw Calls (`1,760 -> <= 400`) & Align `512px` Zoom-Tile Coverage
- **Root Cause**:
  1. At nominal `z14.2` on `S1`, `exp-rs` resolves ~1 zoom level finer vector tiles than MapLibre GL JS / `mln-rs` (`256px` vs `512px` CSS tile-size convention), decoding ~4x as many tiles and overcrowding dense urban views.
  2. Each tile-layer pair issues separate `setBindGroup` + `setVertexBuffer` + `drawIndexed` calls across `wasm-bindgen` JS glue (`B5 Encode & Submit = 6.1–9.7 ms` even when tiles are already uploaded).
- **Actions**:
  1. Audit camera zoom -> tile `z` selection (`maplibre/src/render/view_state/` & `tile_view_pattern`) against the MapLibre Style Spec (`512px` CSS reference tile size for standard vector styles unless source `tileSize == 256`) so `exp-rs` and `mln-rs` cover the exact same geographic extent and tile pyramid level at a given `(lng, lat, zoom)`.
  2. Batch draw submission across visible tiles per style layer: sub-allocate tile vertex/index slices into shared Slab/Arena GPU buffers (`wgpu::Buffer`), pack per-tile transforms into a single uniform/storage array with dynamic offset or instance index, and minimize redundant `setPipeline`/`setBindGroup` calls so `S1` draw calls drop from `~1,700` to `<= 400`.

### Phase 2: Dedicated `OffscreenCanvas` Render Worker & Eliminate `SharedArrayBuffer` Upload Copies
- **Root Cause**:
  - Today `exp-st` (`P95 = 29.96 ms`, `Cold Load = 413 ms`) outperforms `exp-mt` (`P95 = 52.80 ms`, `Cold Load = 2,614 ms`) on `S1` because WebGPU rejects `SharedArrayBuffer`-backed views in `writeBuffer`/`writeTexture`, forcing JS compatibility wrappers to allocate & copy temporary unshared `Uint8Array` slices on every upload, AND `winit` encodes WebGPU passes on the browser main UI thread.
- **Actions**:
  1. Introduce an `OffscreenCanvas` Dedicated Render Worker path (`canvas.transferControlToOffscreen()`) in `web/` + `web/lib/` using non-shared WASM linear memory (zero `SharedArrayBuffer` upload copies, zero main-thread blocking, zero COOP/COEP requirement) paired with transferable `ArrayBuffer` tile workers via `MessageChannel`.
  2. For `exp-mt` (`SharedArrayBuffer`), coalesce per-frame GPU uploads into a single unshared JS staging `ArrayBuffer` ring instead of copying per individual `writeBuffer` call, and pre-warm worker initialization concurrently with `fetch(style)` + `navigator.gpu.requestAdapter()` so `exp-mt` cold load drops from `2,614 ms` to `<= 300 ms`.

### Phase 3: Native Warm Steady-State Benchmark & Idle Zero-CPU Gate
- **Root Cause**:
  - `native-arena` currently times cold process spawn + Metal device/pipeline init (`114.1 ms`) for `maplibre-demo snapshot` against warm in-process `mln-rs`.
- **Actions**:
  1. Add a `bench` subcommand (or `--bench-frames N --json`) to `maplibre-demo` (`headless` feature) that measures cold style load separately from warm `Still`, `Frame/Throughput` (panning/orbiting), `Frame/Extrusions`, and `Frame/Idle` (`0.0 fps` when settled), outputting `wall_ms`, `cpu_ms`, `frame_p50_ms`, `frame_p95_ms`, `frame_p99_ms`, and `peak_rss_mib`.
  2. Optimize per-frame CPU overhead (reusable command encoder state, cached bind groups, dirty-only uniform uploads, zero work on settled frames) until warm `Frame/Throughput` reaches `<= 5.0 ms` wall / `<= 2.2 ms` CPU (`P95 <= 9.0 ms`).

### Phase 4: Cut `S5` / `S7` 3D DEM Terrain Native Peak RSS (`401 MiB -> <= 220 MiB`) & WebGL2 Fallback
- **Actions**:
  1. Profile `maplibre/src/terrain/` (`drape_targets.rs`, DEM raster caches, elevation mesh staging): cap `DrapeCache` pool residency, scale drape texture resolution by tile screen-space footprint (e.g. `512px` near, `256px` mid/far), drop decoded CPU RGBA DEM/raster buffers immediately after GPU texture upload, and reuse a single `StagingBelt`.
  2. Verify `just web-lib build --release --webgl` compiles cleanly within CI guards and serves as an automatic fallback when `navigator.gpu` is absent.
  3. Begin extracting leaf crates from `maplibre` (`GAPS.md` `Crate layering`, e.g. `maplibre-coords` / `maplibre-style` / `maplibre-expr`) only where cleanly decoupled and compliant with the 500-line & module-layout guards.

## Verification Checklist After Every Phase
1. Run all 6 CI guards (`check-file-length.mjs`, `check-panics.mjs`, `check-module-layout.py`, `check-wasm-deps.py`, `check-release-version.py`, `check-immersive-stability.py --self-test`) + `cargo test --workspace --exclude web --exclude maplibre-android`.
2. Rebuild Arena (`cd /Users/fangluo/maplibre-rs-arena && just build-wasm-exp release && just build-web`) and record `S1` + `S5` Solo Flight metrics (`Cold Load`, `CPU Avg / P95 / P99`, `Peak WASM MiB`, `Avg Draw Calls`).
3. Record Native Metal headless `S1`, `S4`, `S5`, `S7` `wall_ms`, `cpu_ms`, `peak_rss_mib` + warm frame throughput.
```
