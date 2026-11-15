# Local Run Workflow & Long-Term Engine Architecture Playbook (No Cloudflare Worker)

This playbook runs **100% locally** (`127.0.0.1` + native Apple Silicon Metal CLI) with **zero Cloudflare / Wrangler / remote CI dependencies**, and codifies the **long-term architectural roadmap** for `maplibre-rs-experimental` based on empirical WebGPU API & Metal stage-level profiling against `mln-rs` (`0ca2ff95fb`).

---

## Part 1: Local Run Workflow (Zero Cloudflare Dependency)

### Directory Layout Assumption
Keep the three sibling checkouts side by side:
- `/Users/fangluo/maplibre-rs-experimental` — **Target repo under active engineering**
- `/Users/fangluo/mln-rs` — **Read-only reference baseline (`0ca2ff95fb`, NEVER modify)**
- `/Users/fangluo/maplibre-rs-arena` — **Local benchmark harness & visual comparison workbench**

### Step 1: Fast Inner Loop (Rebuild ONLY `maplibre-rs-experimental`)
Whenever you modify code in `/Users/fangluo/maplibre-rs-experimental`:

```bash
cd /Users/fangluo/maplibre-rs-arena

# Rebuild ONLY exp-st + exp-mt WASM bundles (with --arena-telemetry) and refresh manifest.json
just build-wasm-exp release
just build-web
```

### Step 2: Run Local WebGPU Arena & Book Examples (No CF Worker)
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

### Step 3: Mandatory Repo CI Guards & Native Metal Verification
```bash
cd /Users/fangluo/maplibre-rs-experimental

# 1. All 6 repository CI guards + formatting + unit tests (MUST pass before every commit)
RUSTUP_TOOLCHAIN=nightly cargo fmt -- --check
node scripts/check-file-length.mjs origin/main
node scripts/check-panics.mjs
python3 scripts/check-module-layout.py --base origin/main
python3 scripts/check-wasm-deps.py
python3 scripts/check-release-version.py
python3 scripts/check-immersive-stability.py --self-test
cargo test --workspace --exclude web --exclude maplibre-android

# 2. Native Metal headless snapshot + warm steady-state benchmark
cargo build --release -p maplibre-demo --features headless
/usr/bin/time -l ./target/release/maplibre-demo snapshot \
  --terrain --width 1024 --height 768 --lat 47.27 --lon 11.40 --zoom 12.2 --pitch 66 --bearing 28 \
  --max-frames 60 --timeout-secs 18 --out /tmp/exp-s5-terrain.png
```

---

## Part 2: Empirical Diagnosis Summary (Why Previous Optimizations Stopped at 17–56 ms)

Stage-level and WebGPU hardware call profiling across `S1`–`S8` established four ground-truth facts:
1. **7-Bit Per-Frame Stencil `MaskGroup` Works**: Cutting per-layer tile-mask clears reduced draw calls by **`-60%` to `-69%`** (`S1`: `1,683 -> 669` WebGPU, `1,054 -> 414` Metal; `S2`: `2,003 -> 721`; `S5`: `198 -> 61` Metal) and reduced GPU pass execution (`Render`) to **`1.22–1.38 ms`**.
2. **`PhaseSort` (`CollisionSystem`) Is 64%–84% of Frame CPU & >90% of Upload Bandwidth**:
   - Zero-text `S6` (900 live GeoJSON nodes) already runs at **`2.13 ms` CPU (`PhaseSort = 0.03 ms`)**.
   - Label-heavy `S1` (`17.08 ms`), `S2` (`25.86 ms`), and `S3` (`56.08 ms`) spend **`10.87 ms`**, **`16.33 ms`**, and **`46.90 ms`** inside `maplibre/src/sdf/collision_system.rs`, while issuing **`533–739` `queue.writeBuffer` calls (`6.5–22.0 MiB`/frame)** rewriting 4-vertex `SDFShaderFeatureMetadata` for every glyph on every 1-pixel camera move.
3. **Per-Style-Layer Duplicate Geometry Buffers Inflate WebGPU RAM to `339–478 MiB`** (vs `50–63 MiB` on `mln-rs`): `transportation` and `building` source-layers are tessellated and uploaded separately for 10–18 overlapping style layers.
4. **Host Event-Loop & `Queue` Allocation Bottlenecks**:
   - `maplibre-winit` `ProxyWake::wake()` on `wasm32` calls `EventLoopProxy::send_event(())` even while active, causing `winit` 0.30 to call `cancelAnimationFrame` on its own pending frame (`0` rendered frames during external `rAF` `jumpTo` loops).
   - `LayerItem` clones `String` + boxes `DrawState` + runs `O(L)` string scans per draw item (`Queue = 3.6–10.5 ms`, causing shared `dlmalloc` lock contention on `exp-mt`).

---

## Part 3: Staged Long-Term Architectural Prompts

### Stage A Prompt — Immediate Steering to Stabilize & Commit Current Worktree (Stencil `MaskGroup` + `OffscreenCanvas` Host)

Use this prompt **immediately** on the current uncommitted worktree (~50 touched files) so it lands cleanly before starting core SDF/Vector subsystem refactors:

```markdown
Pause before starting Phase 3 or Phase 4 of the previous prompt. Do NOT start crate extraction or ad-hoc frame micro-optimizations on top of the current 50-file worktree.

Your current worktree has two strong architectural wins that we want to harden, verify, and land cleanly as **Commit 1**:
1. Per-frame collision-free 7-bit stencil IDs + `MaskGroup` across main/translucent/drape passes (verified -60% to -69% draw calls and -31% to -34% GPU pass time).
2. Dedicated `OffscreenCanvas` render worker (`web/src/offscreen.rs` + `web/src/offscreen/` + `web/lib/src/offscreen-client.ts` + `render.worker.ts`) wired directly to 4 tile workers via `MessageChannel`.

Before committing this stage, fix these **3 host-layer correctness & IPC issues** that belong in Commit 1, run full verification, and commit:

1. **Fix `maplibre-winit` `wasm32` `cancelAnimationFrame` Render Starvation (`maplibre-winit/src/event_loop.rs`)**:
   - When an external JS caller invokes `map.jumpTo(...)` inside `requestAnimationFrame`, `ProxyWake::wake()` calls `EventLoopProxy::send_event(())`. On `wasm32`, `winit` 0.30's user-event wakeup cancels and reschedules its own pending animation frame (`cancelAnimationFrame`), starving `exp-mt` and main-thread `winit` fallback to 0 rendered frames!
   - Architect a clean split on `wasm32`: store a shared handle/flag to the active `winit::window::Window` when resumed/active; in `ProxyWake::wake()`, call idempotent `window.request_redraw()` whenever the window is active, and fall back to `EventLoopProxy::send_event(())` ONLY when `Dormant`/`Suspended` (before window creation or while suspended).

2. **Add Frame/Microtask Latest-Wins Coalescing in `web/lib/src/offscreen-client.ts`**:
   - Right now `onPointerMove` posts raw 120–240Hz events uncoalesced, and `jumpTo` creates a separate `rpc` message + Promise round-trip on every call. Under dual-map curtain sync or >16ms frames, this queues stale messages in the worker.
   - Coalesce high-frequency `pmove` and `wheel` deltas per animation frame / microtask flush, and coalesce back-to-back `jumpTo` calls (latest camera options win before flush, settling all coalesced callers cleanly when applied) so Offscreen IPC matches `web/src/controller/coalesce.rs` semantics.

3. **Fix Pre-Loop Timeout Guard in `maplibre-demo/src/snapshot.rs`**:
   - Wrap `resolve_tile_json_sources` (around line 93, before the frame loop deadline is armed) in `tokio::time::timeout` bounded by `--timeout-secs` so hung network TileJSON endpoints can never hang headless runs indefinitely.

4. **Verify & Commit Stage A**:
   - Run all 6 repo CI guards (`RUSTUP_TOOLCHAIN=nightly cargo fmt -- --check`, `check-file-length.mjs`, `check-panics.mjs`, `check-module-layout.py`, `check-wasm-deps.py`, `check-release-version.py`, `check-immersive-stability.py --self-test`) + `cargo test --workspace --exclude web --exclude maplibre-android`.
   - Build `just web-lib build --release`, `just web-lib build --release --multithreaded`, and `just web-demo build`, sync `docs/src/examples/demo/`, and verify zero errors.
   - Commit Stage A cleanly on `main` (local commit only, do not push) and report ready for Stage B.
```

---

### Stage B Prompt — Core Long-Term Engine Architecture (Run on Clean Tree Right After Stage A Commits)

Paste this prompt once Stage A is committed cleanly:

```markdown
You are a Principal Rust Graphics & Engine Architect working in `/Users/fangluo/maplibre-rs-experimental` on top of Commit 1 (`MaskGroup` stencil + `OffscreenCanvas` worker).

Never modify `/Users/fangluo/mln-rs`, never use Cloudflare/Wrangler, and pass all 6 repository CI guards (`<= 500` lines/file, no `mod.rs`, panic budget, wasm-deps, formatting) at every commit boundary.

Empirical stage-level profiling shows why `exp-rs` still takes `17ms` (`S1`), `26ms` (`S2`), and `56ms` (`S3`) vs `2.8–3.6ms` on `mln-rs` while zero-text `S6` already runs in `2.1ms`:
- `Render` is already down to `1.2–1.4ms`!
- `PhaseSort` (`CollisionSystem` in `maplibre/src/sdf/collision_system.rs`) consumes `10.9ms` (`S1`), `16.3ms` (`S2`), and `46.9ms` (`S3` — 84% of frame!), and emits `533–739` `queue.writeBuffer` calls (`6.5–22.0 MiB/frame`) rewriting 4-vertex `SDFShaderFeatureMetadata` for every glyph on every 1px camera change.
- `Queue` consumes `3.6–10.5ms` due to per-item `String` clones, `Box<DrawState>` allocations, and `O(L)` string scans (`vector_layers.iter().find`), causing shared `dlmalloc` contention on `exp-mt`.
- WebGPU buffer memory reaches `339–478 MiB` (`S1`/`S3`) vs `50–63 MiB` on `mln-rs` because identical `(tile, source_layer)` geometries are re-tessellated and uploaded separately per style layer.

Implement the following **4 long-term architectural subsystems** cleanly, committing each coherent milestone once verified:

### Milestone B1: Decoupled `PlacementEpoch` Controller + GPU Shader Time-Interpolated Symbol Fading (`maplibre/src/sdf/`)
Design a first-principles symbol placement & fading architecture (no hacky frame-skipping):
1. **Separate Placement Evaluation from Frame Rendering**:
   - Introduce an explicit `PlacementController` resource managing discrete `PlacementEpoch`s:
     - Re-run spatial grid collision & cross-tile priority sorting at a `250ms` cadence during continuous camera motion, with a fast `30ms` debounce when newly uploaded symbol tiles arrive or integer zoom levels cross, and `0 Hz` when camera & tiles are settled (after final settle placement).
     - Support an immediate deterministic mode (`fade_duration == Duration::ZERO`, used by headless `snapshot` tests) where opacity resolves to `0.0` or `1.0` immediately on the first placement epoch.
   - On intermediate frames between `PlacementEpoch`s (60Hz Web, 120Hz ProMotion Metal, 90Hz WebXR Stereo), `PhaseSort` performs **zero** spatial collision grid rebuilds (`~0.05ms`).
2. **GPU Vertex-Shader Opacity Interpolation (`sdf.vertex.wgsl` + `SDFShaderFeatureMetadata`)**:
   - Replace CPU-driven per-frame `opacity` mutation with GPU time interpolation: store `(start_opacity, target_opacity, start_time_ms)` in `SDFShaderFeatureMetadata` and pass `(u_fade_time_ms, u_fade_duration_ms)` in the SDF uniform buffer every frame.
   - Compute `alpha = clamp((u_fade_time_ms - start_time_ms) / max(u_fade_duration_ms, 0.001), 0.0, 1.0)` in `sdf.vertex.wgsl`, collapsing degenerate vertices (`vec4(2.0, 2.0, 2.0, 1.0)`) when interpolated opacity `<= 0.001`.
   - During a `PlacementEpoch`, track each symbol's previous `placed: bool` state and ONLY upload `SDFShaderFeatureMetadata` sub-ranges for symbols whose `placed` state actually flipped (`Placed <-> Hidden`). Intermediate frames issue **0 per-glyph `writeBuffer` calls**.

### Milestone B2: Interned IDs, Zero-Allocation `Copy` `RenderPhase` Items & Unified `FrameUploadStaging` Belt
1. **Zero-Alloc Indexed `Queue` & `RenderCommand` (`maplibre/src/vector/`, `maplibre/src/render/`)**:
   - Intern `StyleLayerId(u16)` and `SourceLayerId(u16)` on style load/mutation.
   - Refactor `LayerItem` into a compact, heap-free `Copy` struct holding `StyleLayerId`, `WorldTileCoords`, direct pool/buffer slice handles, and `StencilRef` — eliminating per-frame `String::clone`, `Box<DrawState>`, and `O(L)` `style_layer.id` string lookups during `RenderCommand::render` (and removing shared `dlmalloc` lock contention in `exp-mt`).
2. **Coalesced `FrameUploadStaging` (`maplibre/src/render/upload_queue.rs`)**:
   - Coalesce small (`< 64 KiB`) per-frame buffer writes into a reusable aligned staging buffer / `StagingBelt` + `encoder.copy_buffer_to_buffer` in a single frame upload encoder pass, collapsing hundreds of individual `queue.write_buffer` calls into one.

### Milestone B3: Shared `(Tile, SourceLayer, GeometryLayout)` Buckets Decoupled from Style-Layer Paint
- Eliminate `6x` WebGPU buffer duplication (`339–478 MiB -> <= 95 MiB` on `S1`/`S3`):
  1. Key tessellated geometry buffers by `(WorldTileCoords, SourceLayerId, GeometryBucketKey)` (where `GeometryBucketKey` captures tessellation-affecting layout parameters such as fill vs line cap/join/miter/dash-topology vs extrusion) rather than duplicating full vertex/index buffers for every referencing style layer.
  2. Each style layer binds shared geometry buffers with compact filtered index sub-ranges + either `ShaderLayerMetadata` uniforms (for data-constant paint) or compact per-feature paint attributes (only when data-driven paint expressions exist).

### Milestone B4: Distance-LOD Tiered Terrain `DrapeCache` (`<= 200 MiB` RSS) & Warm Steady-State Metal Benchmark (`maplibre-demo bench`)
1. **LOD-Tiered `DrapeCache` (`maplibre/src/terrain/`)**:
   - Replace the fixed `64 × 1024×1024` (`341 MiB`) drape texture allocation with screen-space footprint / distance-tiered texture pools (`1024` near camera, `512` mid-range, `256` horizon tiles) and release CPU decoded raster staging slices immediately after upload so Native `S5`/`S7` Peak RSS drops from `~401 MiB` to `<= 200 MiB`.
2. **Native Warm Steady-State Benchmark (`maplibre-demo bench`)**:
   - Add a `bench` subcommand (`--json`) to `maplibre-demo` (`headless`) measuring warm steady-state `Still`, `PanThroughput`, `ZoomSweep`, and settled `Idle` (`0` redraws) across `S1` (2D Urban), `S3` (3D Extrusions), and `S5` (3D Terrain) with `mean_ms`, `p50_ms`, `p95_ms`, `p99_ms`, `avg_draws`, and `peak_rss_mib`.

### Acceptance Targets Across Stage B
- **Web `S1` / `S2` / `S3` Flight CPU Avg**: `<= 4.0 ms` (`S1`), `<= 5.0 ms` (`S2`), `<= 6.0 ms` (`S3`), `PhaseSort` `< 0.2 ms` on non-epoch frames, `< 20` `writeBuffer` calls/frame avg.
- **Web `S1` / `S3` GPU Buffer Footprint**: `<= 95 MiB` (down from `339–478 MiB`).
- **Native Metal `S1` Warm `PanThroughput` (`1024×768`)**: `<= 5.0 ms` mean (`<= 420` draws).
- **Native Metal `S5` 3D Terrain Peak RSS**: `<= 200 MiB`.
- **All 6 CI guards + workspace unit tests + Arena (`just build-wasm-exp release && just build-web`) + Book demo green.**
```

---

### Stage C (Defer Until AFTER Stage A & B Land)
- Only once Stage A and Stage B are committed and empirically verified on `main`, extract leaf crates (`maplibre-coords`, `maplibre-style`, `maplibre-expr`) on a clean worktree with zero active rendering diffs.
