import type {
  CameraPose,
  CanonicalBuckets,
  NativeStageTiming,
  NormalizedTelemetry,
  RunnerBridge,
  RunnerStartConfig,
  RunnerStatus,
} from '../shared/types';
import { buildSensorGrid } from './dynamic-geojson';

declare const __ARENA_BUILD_REV__: string | undefined;

interface ExpCameraState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

interface ExpArenaTelemetry {
  frame: number;
  hostFrame: number;
  cpuMs: number;
  gpuMs?: number | null;
  uploadBytes: number;
  draws: number;
  passes?: number;
  setVertexBuffers?: number;
  writeBufferCalls?: number;
  writeBufferBytes?: number;
  drapeRedraws: number;
  prefetchDrapes: number;
  loaded?: boolean;
  settled: boolean;
  wasmMemoryBytes: number;
  gpuMemoryBytes?: number;
  pendingRequests?: number;
  totalRequests?: number;
  camera: ExpCameraState;
  redrawReasons?: Record<string, boolean>;
  stages: Array<{ name: string; ms: number }>;
}

interface ExpMapInstance {
  readonly canvas: HTMLCanvasElement;
  jumpTo(opts: { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number; roll?: number }): Promise<void>;
  stop(): Promise<void>;
  getCamera(): Promise<ExpCameraState>;
  setGeoJsonData(sourceId: string, data: object | string): Promise<void>;
  setArenaCameraListener?: (cb: ((c: ExpCameraState) => void) | null) => void;
  setArenaTelemetryListener?: (cb: ((t: ExpArenaTelemetry) => void) | null) => void;
  waitArenaLoaded?: () => Promise<ExpCameraState>;
  waitArenaIdle?: () => Promise<ExpCameraState>;
  destroy?: () => void;
  remove?: () => void;
}

interface ExpModuleExports {
  startMapLibre(
    wasmPath: string | WebAssembly.Module | Promise<WebAssembly.Module> | undefined,
    workerPath: string | undefined,
    styleJson?: string | Promise<string | undefined>,
    imageProviderModules?: string[],
    canvasId?: string,
    options?: {
      workerWasmPath?: string | WebAssembly.Module | Promise<WebAssembly.Module>;
      webglModulePath?: string;
      webglWasmPath?: string | WebAssembly.Module | Promise<WebAssembly.Module>;
    },
  ): Promise<ExpMapInstance | undefined>;
}

const compiledWasmCache = new Map<string, Promise<WebAssembly.Module>>();
const rawWindowFetch = window.fetch.bind(window);
const activeFetchTrackers = new Set<{ onStart: () => void; onEnd: () => void }>();
let fetchHookInstalled = false;

function ensureGlobalFetchTracker(): void {
  if (fetchHookInstalled) return;
  fetchHookInstalled = true;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (activeFetchTrackers.size === 0) {
      return rawWindowFetch(input, init);
    }
    const trackers = Array.from(activeFetchTrackers);
    for (const t of trackers) t.onStart();
    let doneFlag = false;
    const done = () => {
      if (!doneFlag) {
        doneFlag = true;
        for (const t of trackers) t.onEnd();
      }
    };
    return rawWindowFetch(input, init).then(
      (res) => {
        const cloneAb = res.arrayBuffer.bind(res);
        res.arrayBuffer = () => cloneAb().finally(done);
        window.setTimeout(done, 8000);
        return res;
      },
      (err) => {
        done();
        throw err;
      },
    );
  };
}

function compileWasmOnce(wasmUrl: string): Promise<WebAssembly.Module> {
  let cached = compiledWasmCache.get(wasmUrl);
  if (!cached) {
    cached = (async () => {
      if (typeof WebAssembly.compileStreaming === 'function') {
        try {
          return await WebAssembly.compileStreaming(rawWindowFetch(wasmUrl));
        } catch {
          // Fall back if server omits application/wasm MIME header
        }
      }
      const resp = await rawWindowFetch(wasmUrl);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} fetching ${wasmUrl}`);
      }
      return WebAssembly.compile(await resp.arrayBuffer());
    })();
    cached.catch(() => compiledWasmCache.delete(wasmUrl));
    compiledWasmCache.set(wasmUrl, cached);
  }
  return cached;
}

let sharedCapturedMemory: WebAssembly.Memory | null = null;
let sharedLiveBufferBytes = 0;
let memoryHooksInstalled = false;

function ensureMemoryHooks(): void {
  if (memoryHooksInstalled) return;
  memoryHooksInstalled = true;

  const scanImportsAndInstance = (importObject: WebAssembly.Imports | undefined, maybeResult: unknown) => {
    if (importObject) {
      for (const ns of Object.values(importObject)) {
        if (ns && typeof ns === 'object') {
          for (const val of Object.values(ns as Record<string, unknown>)) {
            if (val instanceof WebAssembly.Memory) sharedCapturedMemory = val;
          }
        }
      }
    }
    const inst =
      maybeResult && typeof maybeResult === 'object' && 'instance' in maybeResult
        ? (maybeResult as WebAssembly.WebAssemblyInstantiatedSource).instance
        : (maybeResult as WebAssembly.Instance | null);
    if (inst && inst.exports) {
      for (const val of Object.values(inst.exports)) {
        if (val instanceof WebAssembly.Memory) sharedCapturedMemory = val;
      }
    }
  };

  const origInstantiate = WebAssembly.instantiate.bind(WebAssembly);
  WebAssembly.instantiate = (async (source: BufferSource | WebAssembly.Module, importObject?: WebAssembly.Imports) => {
    const res = await origInstantiate(source as WebAssembly.Module, importObject);
    scanImportsAndInstance(importObject, res);
    return res;
  }) as typeof WebAssembly.instantiate;

  if (typeof WebAssembly.instantiateStreaming === 'function') {
    const origStreaming = WebAssembly.instantiateStreaming.bind(WebAssembly);
    WebAssembly.instantiateStreaming = (async (
      source: Response | PromiseLike<Response>,
      importObject?: WebAssembly.Imports,
    ) => {
      const res = await origStreaming(source, importObject);
      scanImportsAndInstance(importObject, res);
      return res;
    }) as typeof WebAssembly.instantiateStreaming;
  }

  const devProto = (globalThis as unknown as { GPUDevice?: { prototype: Record<string, unknown> } }).GPUDevice?.prototype;
  if (devProto && typeof devProto.createBuffer === 'function') {
    const origCreateBuffer = devProto.createBuffer as (desc: { size?: number }) => { destroy?: () => void };
    devProto.createBuffer = function (this: unknown, desc: { size?: number }) {
      const sz = Number(desc?.size ?? 0);
      sharedLiveBufferBytes += sz;
      const buf = origCreateBuffer.call(this, desc);
      if (buf && typeof buf.destroy === 'function') {
        const origDestroy = buf.destroy.bind(buf);
        let freed = false;
        buf.destroy = () => {
          if (!freed) {
            freed = true;
            sharedLiveBufferBytes = Math.max(0, sharedLiveBufferBytes - sz);
          }
          origDestroy();
        };
      }
      return buf;
    };
  }
}

/**
 * Lightweight WebGPU + WebAssembly.Memory instrumentation for unmodified upstream `exp-rs` builds
 * (when `--arena-telemetry` has not yet been merged upstream).
 * Draw/pass/write wrappers are installed ONLY while `enabled === true` and restored immediately when disabled!
 */
interface WebGpuFallbackMeter {
  setEnabled(on: boolean): void;
  getWasmBytes(): number;
  getGpuBufferBytes(): number;
}

function installWebGpuFallbackMeter(
  onFrameSubmit: (sample: {
    intervalMs: number;
    encodeMs: number;
    uploadMs: number;
    uploadBytes: number;
    draws: number;
    passes: number;
    gpuMs: number | null;
  }) => void,
): WebGpuFallbackMeter {
  ensureMemoryHooks();

  let enabled = false;
  let frameDraws = 0;
  let framePasses = 0;
  let frameUploadBytes = 0;
  let frameUploadMs = 0;
  let frameEncodeStart = 0;
  let lastSubmitAt = performance.now();
  let lastGpuMs: number | null = null;
  let gpuProbeInFlight = false;

  const rpeProto = (globalThis as unknown as { GPURenderPassEncoder?: { prototype: Record<string, unknown> } })
    .GPURenderPassEncoder?.prototype;
  const encProto = (globalThis as unknown as { GPUCommandEncoder?: { prototype: Record<string, unknown> } })
    .GPUCommandEncoder?.prototype;
  const queueProto = (globalThis as unknown as { GPUQueue?: { prototype: Record<string, unknown> } }).GPUQueue
    ?.prototype;

  let origDraw: ((...args: unknown[]) => unknown) | undefined;
  let origDrawIndexed: ((...args: unknown[]) => unknown) | undefined;
  let origBeginRenderPass: ((...args: unknown[]) => unknown) | undefined;
  let origWriteBuffer: ((...args: unknown[]) => unknown) | undefined;
  let origWriteTexture: ((...args: unknown[]) => unknown) | undefined;
  let origSubmit: ((cmdBufs: unknown) => unknown) | undefined;

  const setEnabled = (on: boolean) => {
    if (on === enabled) return;
    enabled = on;
    if (!rpeProto || !encProto || !queueProto) return;

    if (on) {
      origDraw = rpeProto.draw as ((...args: unknown[]) => unknown) | undefined;
      origDrawIndexed = rpeProto.drawIndexed as ((...args: unknown[]) => unknown) | undefined;
      origBeginRenderPass = encProto.beginRenderPass as ((...args: unknown[]) => unknown) | undefined;
      origWriteBuffer = queueProto.writeBuffer as ((...args: unknown[]) => unknown) | undefined;
      origWriteTexture = queueProto.writeTexture as ((...args: unknown[]) => unknown) | undefined;
      origSubmit = queueProto.submit as ((cmdBufs: unknown) => unknown) | undefined;

      lastSubmitAt = performance.now();
      if (origDraw) {
        const fn = origDraw;
        rpeProto.draw = function (this: unknown, ...args: unknown[]) {
          frameDraws++;
          return fn.apply(this, args);
        };
      }
      if (origDrawIndexed) {
        const fn = origDrawIndexed;
        rpeProto.drawIndexed = function (this: unknown, ...args: unknown[]) {
          frameDraws++;
          return fn.apply(this, args);
        };
      }
      if (origBeginRenderPass) {
        const fn = origBeginRenderPass;
        encProto.beginRenderPass = function (this: unknown, ...args: unknown[]) {
          if (framePasses === 0) frameEncodeStart = performance.now();
          framePasses++;
          return fn.apply(this, args);
        };
      }
      if (origWriteBuffer) {
        const fn = origWriteBuffer;
        queueProto.writeBuffer = function (this: unknown, ...args: unknown[]) {
          const t0 = performance.now();
          const sizeArg = args[4];
          const dataArg = args[2] as { byteLength?: number } | undefined;
          frameUploadBytes += typeof sizeArg === 'number' ? sizeArg : Number(dataArg?.byteLength ?? 0);
          const out = fn.apply(this, args);
          frameUploadMs += performance.now() - t0;
          return out;
        };
      }
      if (origWriteTexture) {
        const fn = origWriteTexture;
        queueProto.writeTexture = function (this: unknown, ...args: unknown[]) {
          const t0 = performance.now();
          const dataArg = args[1] as { byteLength?: number } | undefined;
          frameUploadBytes += Number(dataArg?.byteLength ?? 0);
          const out = fn.apply(this, args);
          frameUploadMs += performance.now() - t0;
          return out;
        };
      }
      if (origSubmit) {
        const fn = origSubmit;
        queueProto.submit = function (this: { onSubmittedWorkDone?: () => Promise<void> }, cmdBufs: unknown) {
          const t0 = performance.now();
          const out = fn.call(this, cmdBufs);
          const now = performance.now();
          if (framePasses > 0 || frameDraws > 0) {
            const encodeMs =
              (frameEncodeStart > 0 ? now - frameEncodeStart : now - t0) + (now - t0);
            const intervalMs = Math.max(0.2, now - lastSubmitAt);
            lastSubmitAt = now;

            if (!gpuProbeInFlight && typeof this.onSubmittedWorkDone === 'function') {
              gpuProbeInFlight = true;
              const submitMark = performance.now();
              this.onSubmittedWorkDone()
                .then(() => {
                  lastGpuMs = performance.now() - submitMark;
                })
                .catch(() => {})
                .finally(() => {
                  gpuProbeInFlight = false;
                });
            }

            onFrameSubmit({
              intervalMs,
              encodeMs: Math.max(0.05, encodeMs),
              uploadMs: frameUploadMs,
              uploadBytes: frameUploadBytes,
              draws: frameDraws,
              passes: framePasses,
              gpuMs: lastGpuMs,
            });
            frameDraws = 0;
            framePasses = 0;
            frameUploadBytes = 0;
            frameUploadMs = 0;
            frameEncodeStart = 0;
          }
          return out;
        };
      }
    } else {
      // Restore 100% untouched native prototypes when HUD / Solo Flight is off
      if (origDraw) rpeProto.draw = origDraw;
      if (origDrawIndexed) rpeProto.drawIndexed = origDrawIndexed;
      if (origBeginRenderPass) encProto.beginRenderPass = origBeginRenderPass;
      if (origWriteBuffer) queueProto.writeBuffer = origWriteBuffer;
      if (origWriteTexture) queueProto.writeTexture = origWriteTexture;
      if (origSubmit) queueProto.submit = origSubmit;
    }
  };

  return {
    setEnabled,
    getWasmBytes: () => sharedCapturedMemory?.buffer.byteLength ?? 0,
    getGpuBufferBytes: () => sharedLiveBufferBytes,
  };
}

function classifyExpStages(stages: NativeStageTiming[]): CanonicalBuckets {
  const buckets: CanonicalBuckets = {
    inputSetupMs: 0,
    tileIngestMs: 0,
    symbolPlacementMs: 0,
    terrainDrapeUploadMs: 0,
    renderSubmitMs: 0,
  };
  for (const st of stages) {
    const k = st.name.toLowerCase();
    if (/input|event|camera|view|change|prepare|setup/.test(k)) {
      buckets.inputSetupMs += st.ms;
    } else if (/populate|request|tile|source|worker|ingest|parse|retain|retention/.test(k)) {
      buckets.tileIngestMs += st.ms;
    } else if (/symbol|glyph|collision|label|text|atlas/.test(k)) {
      buckets.symbolPlacementMs += st.ms;
    } else if (/terrain|drape|upload|buffer|texture/.test(k)) {
      buckets.terrainDrapeUploadMs += st.ms;
    } else {
      buckets.renderSubmitMs += st.ms;
    }
  }
  return buckets;
}

export async function createExpRunner(
  cfg: RunnerStartConfig,
  canvas: HTMLCanvasElement,
  onBanner: (status: RunnerStatus) => void,
): Promise<RunnerBridge> {
  const isMt = cfg.engineId === 'exp-mt';
  const isWebGl = cfg.engineId === 'exp-webgl2';
  const eyeOffset = cfg.stereoEyeOffsetDeg ?? 0;

  let cameraCb: ((pose: CameraPose) => void) | null = null;
  let telemetryCb: ((sample: NormalizedTelemetry) => void) | null = null;
  let statusCb: ((status: RunnerStatus) => void) | null = null;
  let lastTelemetry: NormalizedTelemetry | null = null;

  const emitStatus = (s: RunnerStatus) => {
    onBanner(s);
    statusCb?.(s);
  };

  if (!isWebGl && !('gpu' in navigator) && isMt) {
    emitStatus({
      state: 'unsupported',
      message: 'exp-mt requires WebGPU (navigator.gpu) and COOP/COEP headers.',
    });
    return makeFallbackBridge(cfg, 'WebGPU Unsupported');
  }

  if (isMt && !window.crossOriginIsolated) {
    emitStatus({
      state: 'unsupported',
      message:
        'exp-mt (Multithreaded SharedArrayBuffer) requires COOP: same-origin + COEP: credentialless headers. Switch to exp-rs (ST).',
    });
    return makeFallbackBridge(cfg, 'Requires COOP/COEP');
  }

  const variantDir = isMt ? '/wasm/exp-mt' : isWebGl ? '/wasm/exp-webgl' : '/wasm/exp-st';
  const buildRev = typeof __ARENA_BUILD_REV__ === 'string' ? __ARENA_BUILD_REV__ : 'dev';
  const moduleJsUrl = new URL(`${variantDir}/module.js?v=${buildRev}`, location.origin).href;
  const wasmUrl = new URL(`${variantDir}/assets/maplibre_bg.wasm?v=${buildRev}`, location.origin).href;
  const workerWasmUrl = new URL(`${variantDir}/assets/maplibre_tile_worker_bg.wasm?v=${buildRev}`, location.origin).href;
  const webglModuleUrl = new URL(`/wasm/exp-webgl/module.js?v=${buildRev}`, location.origin).href;
  const webglWasmUrl = new URL(`/wasm/exp-webgl/assets/maplibre_bg.wasm?v=${buildRev}`, location.origin).href;

  emitStatus({ state: 'booting', message: `Checking ${cfg.engineId} WASM & style document…` });

  let requestsCount = 0;
  let pendingRequests = 0;
  ensureGlobalFetchTracker();
  const fetchTracker = {
    onStart: () => {
      requestsCount++;
      pendingRequests++;
    },
    onEnd: () => {
      pendingRequests = Math.max(0, pendingRequests - 1);
    },
  };
  activeFetchTrackers.add(fetchTracker);

  const resolvedStyleUrl = new URL(cfg.styleUrl, location.origin).href;
  const wasmModulePromise = compileWasmOnce(wasmUrl);
  const workerWasmPromise = !isMt ? compileWasmOnce(workerWasmUrl) : undefined;
  const styleJsonPromise: Promise<string> = rawWindowFetch(resolvedStyleUrl).then(async (styleResp) => {
    if (!styleResp.ok) {
      throw new Error(`HTTP ${styleResp.status} fetching ${resolvedStyleUrl}`);
    }
    const styleObj = (await styleResp.json()) as Record<string, unknown>;
    styleObj.center = [cfg.camera.lng + eyeOffset, cfg.camera.lat];
    styleObj.zoom = cfg.camera.zoom;
    styleObj.bearing = cfg.camera.bearing;
    styleObj.pitch = cfg.camera.pitch;
    return JSON.stringify(styleObj);
  });
  styleJsonPromise.catch(() => {});

  let expMod: ExpModuleExports;
  try {
    expMod = (await import(/* @vite-ignore */ moduleJsUrl)) as ExpModuleExports;
  } catch (err) {
    activeFetchTrackers.delete(fetchTracker);
    emitStatus({
      state: 'missing-wasm',
      message: `Unable to load maplibre-rs-experimental bundle (${String(err)}). Run \`just build-wasm\` locally.`,
    });
    return makeFallbackBridge(cfg, 'WASM Not Built');
  }

  let currentCamera: CameraPose = { ...cfg.camera };
  let followingSilently = true;
  let telemetryEnabled = Boolean(cfg.perfEnabled);
  let loadedMs: number | null = null;
  let bootStart = performance.now();
  let lastFrameAt = performance.now();
  let map: ExpMapInstance | undefined;
  let hasNativeTelemetry = false;
  let destroyed = false;

  let resolveReady: (v: { loadedMs: number }) => void = () => {};
  const ready = new Promise<{ loadedMs: number }>((resolve) => {
    resolveReady = resolve;
  });

  const fallbackMeter = installWebGpuFallbackMeter((sub) => {
    if (!telemetryEnabled) return;
    const cpuTotalMs = sub.uploadMs + sub.encodeMs;
    const sample: NormalizedTelemetry = {
      engineId: cfg.engineId,
      timestampMs: performance.now(),
      frameIntervalMs: sub.intervalMs,
      cpuTotalMs,
      gpuPassMs: sub.gpuMs,
      buckets: {
        inputSetupMs: cpuTotalMs * 0.08,
        tileIngestMs: pendingRequests > 0 ? cpuTotalMs * 0.15 : 0,
        symbolPlacementMs: 0,
        terrainDrapeUploadMs: sub.uploadMs,
        renderSubmitMs: sub.encodeMs,
      },
      nativeStages: [
        { name: 'wgpu queue uploads', ms: sub.uploadMs },
        { name: `wgpu render passes (${sub.passes})`, ms: sub.encodeMs },
      ],
      drawCalls: sub.draws,
      wasmMemoryBytes: fallbackMeter.getWasmBytes(),
      gpuMemoryBytes: fallbackMeter.getGpuBufferBytes(),
      uploadBytes: sub.uploadBytes,
      drapeRedraws: 0,
      pendingRequests,
      totalRequests: requestsCount,
      loadedMs,
      settled: pendingRequests === 0,
      camera: currentCamera,
    };
    lastTelemetry = sample;
    telemetryCb?.(sample);
  });

  emitStatus({ state: 'loading', message: 'Initializing wgpu device & rendering pipeline…' });

  const wireTelemetry = (enabled: boolean) => {
    const win = window as unknown as {
      __lastExpTelemetry?: ExpArenaTelemetry;
      __expTelemetryFrames?: ExpArenaTelemetry[];
    };
    if (!enabled && Array.isArray(win.__expTelemetryFrames) && win.__expTelemetryFrames.length > 0) {
      const frames = win.__expTelemetryFrames;
      const n = frames.length;
      let sumPasses = 0;
      let sumSetVb = 0;
      let sumWbCalls = 0;
      let sumWbBytes = 0;
      let sumPhaseSortMs = 0;
      let sumRequestMs = 0;
      let maxGpuBytes = 0;
      let maxWasmBytes = 0;
      for (const f of frames) {
        sumPasses += f.passes ?? 0;
        sumSetVb += f.setVertexBuffers ?? 0;
        sumWbCalls += f.writeBufferCalls ?? 0;
        sumWbBytes += f.writeBufferBytes ?? 0;
        maxGpuBytes = Math.max(maxGpuBytes, f.gpuMemoryBytes ?? 0);
        maxWasmBytes = Math.max(maxWasmBytes, f.wasmMemoryBytes ?? 0);
        for (const st of f.stages) {
          if (/phasesort|collision/i.test(st.name)) {
            sumPhaseSortMs += st.ms;
          }
          if (/^request$/i.test(st.name)) {
            sumRequestMs += st.ms;
          }
        }
      }
      try {
        const parentWin = window.parent as unknown as { __arenaExpRunHistory?: unknown[] };
        if (parentWin && parentWin !== (window as unknown)) {
          parentWin.__arenaExpRunHistory ??= [];
          parentWin.__arenaExpRunHistory.unshift({
            engineId: cfg.engineId,
            scenario: new URLSearchParams(location.search).get('scenario') ?? '',
            frames: n,
            reportedLoadedMs: loadedMs,
            avgPasses: sumPasses / n,
            avgSetVertexBuf: sumSetVb / n,
            avgWriteBufCalls: sumWbCalls / n,
            avgWriteBufKiB: sumWbBytes / n / 1024,
            avgPhaseSortMs: sumPhaseSortMs / n,
            avgRequestMs: sumRequestMs / n,
            peakGpuMiB: maxGpuBytes / (1024 * 1024),
            peakWasmMiB: maxWasmBytes / (1024 * 1024),
          });
        }
      } catch {
        // Ignore cross-frame access errors when standalone.
      }
    }
    telemetryEnabled = enabled;
    if (enabled) {
      win.__expTelemetryFrames = [];
    }
    if (!map) return;
    if (hasNativeTelemetry) {
      map.setArenaTelemetryListener?.(
        enabled
          ? (t) => {
              const win = window as unknown as {
                __lastExpTelemetry?: ExpArenaTelemetry;
                __expTelemetryFrames?: ExpArenaTelemetry[];
              };
              win.__lastExpTelemetry = t;
              if (Array.isArray(win.__expTelemetryFrames) && win.__expTelemetryFrames.length < 4096) {
                win.__expTelemetryFrames.push(t);
              }
              const now = performance.now();
              const interval = Math.max(0.1, now - lastFrameAt);
              lastFrameAt = now;
              if (loadedMs === null && (t.loaded ?? t.settled)) {
                loadedMs = now - bootStart;
                emitStatus({ state: 'ready', message: `Loaded in ${Math.round(loadedMs)} ms`, loadedMs });
                resolveReady({ loadedMs });
              }
              const sample: NormalizedTelemetry = {
                engineId: cfg.engineId,
                timestampMs: now,
                frameIntervalMs: interval,
                cpuTotalMs: t.cpuMs,
                gpuPassMs: t.gpuMs ?? null,
                buckets: classifyExpStages(t.stages),
                nativeStages: t.stages,
                drawCalls: t.draws,
                wasmMemoryBytes: t.wasmMemoryBytes || fallbackMeter.getWasmBytes(),
                gpuMemoryBytes:
                  typeof t.gpuMemoryBytes === 'number' &&
                  (t.gpuMemoryBytes > 0 || fallbackMeter.getGpuBufferBytes() === 0)
                    ? t.gpuMemoryBytes
                    : fallbackMeter.getGpuBufferBytes() || t.uploadBytes,
                uploadBytes: t.uploadBytes,
                drapeRedraws: t.drapeRedraws,
                pendingRequests:
                  typeof t.pendingRequests === 'number' ? t.pendingRequests : pendingRequests,
                totalRequests:
                  typeof t.totalRequests === 'number'
                    ? Math.max(t.totalRequests, requestsCount)
                    : requestsCount,
                loadedMs,
                settled: t.settled,
                camera: currentCamera,
              };
              lastTelemetry = sample;
              telemetryCb?.(sample);
            }
          : null,
      );
    } else {
      fallbackMeter.setEnabled(enabled);
    }
  };

  const attachMapListeners = (startedMap: ExpMapInstance) => {
    hasNativeTelemetry = typeof startedMap.setArenaTelemetryListener === 'function';
    const clearSilentFollowOnUserInput = () => {
      followingSilently = false;
    };
    canvas.addEventListener('pointerdown', clearSilentFollowOnUserInput);
    canvas.addEventListener('wheel', clearSilentFollowOnUserInput, { passive: true });
    canvas.addEventListener('keydown', clearSilentFollowOnUserInput);
    canvas.addEventListener('touchstart', clearSilentFollowOnUserInput, { passive: true });

    if (typeof startedMap.setArenaCameraListener === 'function') {
      startedMap.setArenaCameraListener((cam) => {
        currentCamera = {
          lng: cam.center[0] - eyeOffset,
          lat: cam.center[1],
          zoom: cam.zoom,
          bearing: cam.bearing,
          pitch: cam.pitch,
        };
        if (!followingSilently) {
          cameraCb?.(currentCamera);
        }
      });
    } else {
      let interacting = false;
      const poll = async () => {
        if (!interacting || destroyed) return;
        try {
          const cam = await startedMap.getCamera();
          currentCamera = {
            lng: cam.center[0] - eyeOffset,
            lat: cam.center[1],
            zoom: cam.zoom,
            bearing: cam.bearing,
            pitch: cam.pitch,
          };
          if (!followingSilently) cameraCb?.(currentCamera);
        } catch {
          // ignore transient poll failures
        }
        if (interacting && !destroyed) requestAnimationFrame(() => void poll());
      };
      canvas.addEventListener('pointerdown', () => {
        interacting = true;
        void poll();
      });
      window.addEventListener('pointerup', () => {
        window.setTimeout(() => {
          interacting = false;
        }, 600);
      });
      canvas.addEventListener('wheel', () => {
        if (!interacting) {
          interacting = true;
          void poll();
          window.setTimeout(() => {
            interacting = false;
          }, 500);
        }
      });
    }
    wireTelemetry(telemetryEnabled);
  };

  const mapReady: Promise<ExpMapInstance | undefined> = (async () => {
    let startedMap: ExpMapInstance | undefined;
    try {
      startedMap = await expMod.startMapLibre(wasmModulePromise, undefined, styleJsonPromise, [], canvas.id, {
        workerWasmPath: workerWasmPromise,
        webglModulePath: isMt || isWebGl ? undefined : webglModuleUrl,
        webglWasmPath: isMt || isWebGl ? undefined : webglWasmUrl,
      });
    } catch (err) {
      activeFetchTrackers.delete(fetchTracker);
      const detail =
        typeof ErrorEvent !== 'undefined' && err instanceof ErrorEvent
          ? `${err.message || 'ErrorEvent'} (${err.filename || '?'}:${err.lineno || 0})`
          : String(err);
      emitStatus({ state: 'missing-wasm', message: `Failed to instantiate ${wasmUrl}: ${detail}` });
      resolveReady({ loadedMs: 0 });
      return undefined;
    }
    if (destroyed) {
      startedMap?.destroy?.();
      resolveReady({ loadedMs: 0 });
      return undefined;
    }
    if (!startedMap) {
      activeFetchTrackers.delete(fetchTracker);
      emitStatus({
        state: 'unsupported',
        message: `maplibre-rs-experimental (${cfg.engineId}) failed to initialize ${isWebGl ? 'WebGL2' : 'WebGPU'} on this device.`,
      });
      resolveReady({ loadedMs: 0 });
      return undefined;
    }
    bootStart = performance.now();
    map = startedMap;
    attachMapListeners(startedMap);
    try {
      if (typeof startedMap.waitArenaLoaded === 'function') {
        await startedMap.waitArenaLoaded();
      } else if (typeof startedMap.waitArenaIdle === 'function') {
        await startedMap.waitArenaIdle();
      } else {
        await startedMap.getCamera();
        const deadline = performance.now() + 4000;
        while (!destroyed && pendingRequests > 0 && performance.now() < deadline) {
          await new Promise((r) => window.setTimeout(r, 80));
        }
      }
    } catch {
      // Ignore shutdown while waiting for initial idle.
    }
    if (!destroyed && loadedMs === null) {
      loadedMs = performance.now() - bootStart;
      emitStatus({ state: 'ready', message: `Loaded in ${Math.round(loadedMs)} ms`, loadedMs });
      resolveReady({ loadedMs });
    }
    return startedMap;
  })();

  const sendJump = (pose: CameraPose) => {
    if (destroyed) return;
    currentCamera = { ...pose };
    followingSilently = true;
    const opts = {
      center: [pose.lng + eyeOffset, pose.lat] as [number, number],
      zoom: pose.zoom,
      bearing: pose.bearing,
      pitch: pose.pitch,
      roll: pose.roll,
    };
    if (map) {
      void map.jumpTo(opts).catch(() => {});
    } else {
      void mapReady.then((m) => (m && !destroyed ? m.jumpTo(opts).catch(() => {}) : undefined));
    }
  };

  return {
    engineId: cfg.engineId,
    backendLabel: isMt ? 'exp-rs WebGPU (MT)' : isWebGl ? 'exp-rs WebGL2 (ST)' : 'exp-rs WebGPU (ST)',
    ready,
    getCamera: () => currentCamera,
    followCamera: sendJump,
    jumpTo: sendJump,
    stop: () => {
      if (destroyed) return;
      if (map) {
        void map.stop().catch(() => {});
      } else {
        void mapReady.then((m) => (m && !destroyed ? m.stop().catch(() => {}) : undefined));
      }
    },
    setTelemetryEnabled: (enabled) => {
      if (destroyed && enabled) return;
      wireTelemetry(enabled);
    },
    getLastTelemetry: () => lastTelemetry,
    onCameraChange: (cb) => {
      cameraCb = cb;
    },
    onTelemetry: (cb) => {
      telemetryCb = cb;
    },
    onStatus: (cb) => {
      statusCb = cb;
    },
    waitIdle: async (timeoutMs = 8000) => {
      const m = map ?? (await mapReady);
      if (!m || destroyed) return currentCamera;
      if (typeof m.waitArenaIdle === 'function') {
        try {
          const res = await Promise.race([
            m.waitArenaIdle(),
            new Promise<null>((r) => window.setTimeout(() => r(null), timeoutMs)),
          ]);
          if (res && Array.isArray(res.center)) {
            return {
              lng: res.center[0] - eyeOffset,
              lat: res.center[1],
              zoom: res.zoom,
              bearing: res.bearing,
              pitch: res.pitch,
            };
          }
        } catch {
          // Ignore teardown during waitIdle
        }
      } else {
        const deadline = performance.now() + Math.min(timeoutMs, 2500);
        while (!destroyed && pendingRequests > 0 && performance.now() < deadline) {
          await new Promise((r) => window.setTimeout(r, 60));
        }
      }
      return currentCamera;
    },
    readPixels: async () => {
      const m = map ?? (await mapReady);
      if (!m || destroyed) return null;
      await m
        .jumpTo({
          center: [currentCamera.lng + eyeOffset, currentCamera.lat],
          zoom: currentCamera.zoom,
          bearing: currentCamera.bearing,
          pitch: currentCamera.pitch,
        })
        .catch(() => {});
      await new Promise((r) => requestAnimationFrame(r));
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return null;
      const off = new OffscreenCanvas(w, h);
      const ctx = off.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(canvas, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      return { width: w, height: h, rgba: img.data };
    },
    stepDynamicStress: (tick) => {
      if (destroyed) return;
      const data = buildSensorGrid(currentCamera, tick);
      if (map) {
        void map.setGeoJsonData('arena_sensors', data).catch(() => {});
      } else {
        void mapReady.then((m) =>
          m && !destroyed ? m.setGeoJsonData('arena_sensors', data).catch(() => {}) : undefined,
        );
      }
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      activeFetchTrackers.delete(fetchTracker);
      wireTelemetry(false);
      if (map) {
        map.setArenaCameraListener?.(null);
        map.destroy?.();
      } else {
        void mapReady.then((m) => {
          m?.setArenaCameraListener?.(null);
          m?.destroy?.();
        });
      }
    },
  };
}

function makeFallbackBridge(cfg: RunnerStartConfig, label: string): RunnerBridge {
  let cam = { ...cfg.camera };
  return {
    engineId: cfg.engineId,
    backendLabel: label,
    ready: Promise.resolve({ loadedMs: 0 }),
    getCamera: () => cam,
    followCamera: (pose) => {
      cam = { ...pose };
    },
    jumpTo: (pose) => {
      cam = { ...pose };
    },
    stop: () => {},
    setTelemetryEnabled: () => {},
    getLastTelemetry: () => null,
    onCameraChange: () => {},
    onTelemetry: () => {},
    onStatus: () => {},
    waitIdle: async () => cam,
    readPixels: async () => null,
    destroy: () => {},
  };
}
