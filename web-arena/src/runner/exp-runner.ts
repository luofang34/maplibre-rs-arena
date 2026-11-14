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
  drapeRedraws: number;
  prefetchDrapes: number;
  settled: boolean;
  wasmMemoryBytes: number;
  camera: ExpCameraState;
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
  waitArenaIdle?: () => Promise<ExpCameraState>;
}

interface ExpModuleExports {
  startMapLibre(
    wasmPath: string | undefined,
    workerPath: string | undefined,
    styleJson?: string,
    imageProviderModules?: string[],
    canvasId?: string,
  ): Promise<ExpMapInstance | undefined>;
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
  let capturedMemory: WebAssembly.Memory | null = null;
  let liveBufferBytes = 0;

  // Capture WASM linear memory reference once at instantiation (0 runtime cost)
  const scanImportsAndInstance = (importObject: WebAssembly.Imports | undefined, maybeResult: unknown) => {
    if (importObject) {
      for (const ns of Object.values(importObject)) {
        if (ns && typeof ns === 'object') {
          for (const val of Object.values(ns as Record<string, unknown>)) {
            if (val instanceof WebAssembly.Memory) capturedMemory = val;
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
        if (val instanceof WebAssembly.Memory) capturedMemory = val;
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

  // Track live GPU buffer allocations at creation/destroy (negligible setup-only calls)
  const devProto = (globalThis as unknown as { GPUDevice?: { prototype: Record<string, unknown> } }).GPUDevice?.prototype;
  if (devProto && typeof devProto.createBuffer === 'function') {
    const origCreateBuffer = devProto.createBuffer as (desc: { size?: number }) => { destroy?: () => void };
    devProto.createBuffer = function (this: unknown, desc: { size?: number }) {
      const sz = Number(desc?.size ?? 0);
      liveBufferBytes += sz;
      const buf = origCreateBuffer.call(this, desc);
      if (buf && typeof buf.destroy === 'function') {
        const origDestroy = buf.destroy.bind(buf);
        let freed = false;
        buf.destroy = () => {
          if (!freed) {
            freed = true;
            liveBufferBytes = Math.max(0, liveBufferBytes - sz);
          }
          origDestroy();
        };
      }
      return buf;
    };
  }

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

  const origDraw = rpeProto?.draw as ((...args: unknown[]) => unknown) | undefined;
  const origDrawIndexed = rpeProto?.drawIndexed as ((...args: unknown[]) => unknown) | undefined;
  const origBeginRenderPass = encProto?.beginRenderPass as ((...args: unknown[]) => unknown) | undefined;
  const origWriteBuffer = queueProto?.writeBuffer as ((...args: unknown[]) => unknown) | undefined;
  const origWriteTexture = queueProto?.writeTexture as ((...args: unknown[]) => unknown) | undefined;
  const origSubmit = queueProto?.submit as ((cmdBufs: unknown) => unknown) | undefined;

  const setEnabled = (on: boolean) => {
    if (on === enabled) return;
    enabled = on;
    if (!rpeProto || !encProto || !queueProto) return;

    if (on) {
      lastSubmitAt = performance.now();
      if (origDraw) {
        rpeProto.draw = function (this: unknown, ...args: unknown[]) {
          frameDraws++;
          return origDraw.apply(this, args);
        };
      }
      if (origDrawIndexed) {
        rpeProto.drawIndexed = function (this: unknown, ...args: unknown[]) {
          frameDraws++;
          return origDrawIndexed.apply(this, args);
        };
      }
      if (origBeginRenderPass) {
        encProto.beginRenderPass = function (this: unknown, ...args: unknown[]) {
          if (framePasses === 0) frameEncodeStart = performance.now();
          framePasses++;
          return origBeginRenderPass.apply(this, args);
        };
      }
      if (origWriteBuffer) {
        queueProto.writeBuffer = function (this: unknown, ...args: unknown[]) {
          const t0 = performance.now();
          const sizeArg = args[4];
          const dataArg = args[2] as { byteLength?: number } | undefined;
          frameUploadBytes += typeof sizeArg === 'number' ? sizeArg : Number(dataArg?.byteLength ?? 0);
          const out = origWriteBuffer.apply(this, args);
          frameUploadMs += performance.now() - t0;
          return out;
        };
      }
      if (origWriteTexture) {
        queueProto.writeTexture = function (this: unknown, ...args: unknown[]) {
          const t0 = performance.now();
          const dataArg = args[1] as { byteLength?: number } | undefined;
          frameUploadBytes += Number(dataArg?.byteLength ?? 0);
          const out = origWriteTexture.apply(this, args);
          frameUploadMs += performance.now() - t0;
          return out;
        };
      }
      if (origSubmit) {
        queueProto.submit = function (this: { onSubmittedWorkDone?: () => Promise<void> }, cmdBufs: unknown) {
          const t0 = performance.now();
          const out = origSubmit.call(this, cmdBufs);
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
    getWasmBytes: () => capturedMemory?.buffer.byteLength ?? 0,
    getGpuBufferBytes: () => liveBufferBytes,
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
  const eyeOffset = cfg.stereoEyeOffsetDeg ?? 0;

  let cameraCb: ((pose: CameraPose) => void) | null = null;
  let telemetryCb: ((sample: NormalizedTelemetry) => void) | null = null;
  let statusCb: ((status: RunnerStatus) => void) | null = null;

  const emitStatus = (s: RunnerStatus) => {
    onBanner(s);
    statusCb?.(s);
  };

  if (!('gpu' in navigator)) {
    emitStatus({
      state: 'unsupported',
      message: 'maplibre-rs-experimental requires WebGPU (navigator.gpu). Please use a WebGPU-capable browser.',
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

  const variantDir = isMt ? '/wasm/exp-mt' : '/wasm/exp-st';
  const moduleJsUrl = new URL(`${variantDir}/module.js`, location.origin).href;
  const wasmUrl = new URL(`${variantDir}/assets/maplibre_bg.wasm`, location.origin).href;

  emitStatus({ state: 'booting', message: `Checking ${cfg.engineId} WASM & style document…` });

  let requestsCount = 0;
  let pendingRequests = 0;
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    requestsCount++;
    pendingRequests++;
    let doneFlag = false;
    const done = () => {
      if (!doneFlag) {
        doneFlag = true;
        pendingRequests = Math.max(0, pendingRequests - 1);
      }
    };
    return origFetch(input, init).then(
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

  try {
    const checkResp = await origFetch(wasmUrl, { method: 'HEAD' });
    const ct = checkResp.headers.get('content-type') ?? '';
    if (!checkResp.ok || ct.includes('text/html')) {
      emitStatus({
        state: 'missing-wasm',
        message:
          'maplibre-rs-experimental WASM artifacts not found. Run `just build-wasm` locally or trigger the GitHub Actions workflow.',
      });
      return makeFallbackBridge(cfg, 'WASM Not Built');
    }
  } catch (err) {
    emitStatus({ state: 'missing-wasm', message: `Unable to fetch ${wasmUrl}: ${String(err)}` });
    return makeFallbackBridge(cfg, 'WASM Missing');
  }

  const resolvedStyleUrl = new URL(cfg.styleUrl, location.origin).href;
  const styleResp = await origFetch(resolvedStyleUrl);
  const styleObj = (await styleResp.json()) as Record<string, unknown>;
  styleObj.center = [cfg.camera.lng + eyeOffset, cfg.camera.lat];
  styleObj.zoom = cfg.camera.zoom;
  styleObj.bearing = cfg.camera.bearing;
  styleObj.pitch = cfg.camera.pitch;
  const styleJson = JSON.stringify(styleObj);

  let currentCamera: CameraPose = { ...cfg.camera };
  let followingSilently = false;
  let telemetryEnabled = Boolean(cfg.perfEnabled);
  let loadedMs: number | null = null;
  let lastFrameAt = performance.now();

  let resolveReady: (v: { loadedMs: number }) => void = () => {};
  const ready = new Promise<{ loadedMs: number }>((resolve) => {
    resolveReady = resolve;
  });

  const bootStart = performance.now();

  const fallbackMeter = installWebGpuFallbackMeter((sub) => {
    if (!telemetryEnabled || !telemetryCb) return;
    const cpuTotalMs = sub.uploadMs + sub.encodeMs;
    telemetryCb({
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
    });
  });

  emitStatus({ state: 'loading', message: 'Initializing wgpu device & rendering pipeline…' });

  const expMod = (await import(/* @vite-ignore */ moduleJsUrl)) as ExpModuleExports;
  const map = await expMod.startMapLibre(wasmUrl, undefined, styleJson, [], canvas.id);
  if (!map) {
    emitStatus({ state: 'unsupported', message: 'maplibre-rs-experimental failed to initialize WebGPU on this device.' });
    return makeFallbackBridge(cfg, 'Init Failed');
  }

  const hasNativeTelemetry = typeof map.setArenaTelemetryListener === 'function';

  if (typeof map.setArenaCameraListener === 'function') {
    map.setArenaCameraListener((cam) => {
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
      followingSilently = false;
    });
  } else {
    let interacting = false;
    const poll = async () => {
      if (!interacting) return;
      try {
        const cam = await map.getCamera();
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
      if (interacting) requestAnimationFrame(() => void poll());
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

  const wireTelemetry = (enabled: boolean) => {
    telemetryEnabled = enabled;
    if (hasNativeTelemetry) {
      map.setArenaTelemetryListener?.(
        enabled
          ? (t) => {
              const now = performance.now();
              const interval = Math.max(0.1, now - lastFrameAt);
              lastFrameAt = now;
              if (loadedMs === null && t.settled) {
                loadedMs = now - bootStart;
                emitStatus({ state: 'ready', message: `Loaded in ${Math.round(loadedMs)} ms`, loadedMs });
                resolveReady({ loadedMs });
              }
              telemetryCb?.({
                engineId: cfg.engineId,
                timestampMs: now,
                frameIntervalMs: interval,
                cpuTotalMs: t.cpuMs,
                gpuPassMs: t.gpuMs ?? null,
                buckets: classifyExpStages(t.stages),
                nativeStages: t.stages,
                drawCalls: t.draws,
                wasmMemoryBytes: t.wasmMemoryBytes || fallbackMeter.getWasmBytes(),
                gpuMemoryBytes: fallbackMeter.getGpuBufferBytes() || t.uploadBytes,
                uploadBytes: t.uploadBytes,
                drapeRedraws: t.drapeRedraws,
                pendingRequests,
                totalRequests: requestsCount,
                loadedMs,
                settled: t.settled,
                camera: currentCamera,
              });
            }
          : null,
      );
    } else {
      fallbackMeter.setEnabled(enabled);
    }
  };

  wireTelemetry(telemetryEnabled);

  void (async () => {
    if (typeof map.waitArenaIdle === 'function') {
      await map.waitArenaIdle();
    } else {
      await map.getCamera();
      // Wait briefly for initial network tiles to settle on cold start
      const deadline = performance.now() + 4000;
      while (pendingRequests > 0 && performance.now() < deadline) {
        await new Promise((r) => window.setTimeout(r, 80));
      }
    }
    if (loadedMs === null) {
      loadedMs = performance.now() - bootStart;
      emitStatus({ state: 'ready', message: `Loaded in ${Math.round(loadedMs)} ms`, loadedMs });
      resolveReady({ loadedMs });
    }
  })();

  return {
    engineId: cfg.engineId,
    backendLabel: isMt ? 'exp-rs WebGPU (MT)' : 'exp-rs WebGPU (ST)',
    ready,
    getCamera: () => currentCamera,
    followCamera: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      void map.jumpTo({
        center: [pose.lng + eyeOffset, pose.lat],
        zoom: pose.zoom,
        bearing: pose.bearing,
        pitch: pose.pitch,
        roll: pose.roll,
      });
    },
    jumpTo: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      void map.jumpTo({
        center: [pose.lng + eyeOffset, pose.lat],
        zoom: pose.zoom,
        bearing: pose.bearing,
        pitch: pose.pitch,
        roll: pose.roll,
      });
    },
    stop: () => {
      void map.stop();
    },
    setTelemetryEnabled: (enabled) => {
      wireTelemetry(enabled);
    },
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
      if (typeof map.waitArenaIdle === 'function') {
        const res = await Promise.race([
          map.waitArenaIdle(),
          new Promise<null>((r) => window.setTimeout(() => r(null), timeoutMs)),
        ]);
        if (res) {
          return {
            lng: res.center[0] - eyeOffset,
            lat: res.center[1],
            zoom: res.zoom,
            bearing: res.bearing,
            pitch: res.pitch,
          };
        }
      } else {
        const deadline = performance.now() + Math.min(timeoutMs, 2500);
        while (pendingRequests > 0 && performance.now() < deadline) {
          await new Promise((r) => window.setTimeout(r, 60));
        }
      }
      return currentCamera;
    },
    readPixels: async () => {
      await map.jumpTo({
        center: [currentCamera.lng + eyeOffset, currentCamera.lat],
        zoom: currentCamera.zoom,
        bearing: currentCamera.bearing,
        pitch: currentCamera.pitch,
      });
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
      const data = buildSensorGrid(currentCamera, tick);
      void map.setGeoJsonData('arena_sensors', data);
    },
    destroy: () => {
      wireTelemetry(false);
      map.setArenaCameraListener?.(null);
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
    onCameraChange: () => {},
    onTelemetry: () => {},
    onStatus: () => {},
    waitIdle: async () => cam,
    readPixels: async () => null,
    destroy: () => {},
  };
}
