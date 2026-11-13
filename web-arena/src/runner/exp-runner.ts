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
      message: 'maplibre-rs-experimental 默认需要 WebGPU (navigator.gpu)。请使用支持 WebGPU 的 Chrome / Edge / Safari 浏览器。',
    });
    return makeFallbackBridge(cfg, 'WebGPU Unsupported');
  }

  if (isMt && !window.crossOriginIsolated) {
    emitStatus({
      state: 'unsupported',
      message:
        'exp-mt (多线程 SharedArrayBuffer) 需要跨源隔离响应头 (COOP: same-origin + COEP: credentialless)。可切换至 exp-rs (ST) 单线程后端。',
    });
    return makeFallbackBridge(cfg, 'Requires COOP/COEP');
  }

  const variantDir = isMt ? '/wasm/exp-mt' : '/wasm/exp-st';
  const moduleJsUrl = new URL(`${variantDir}/module.js`, location.origin).href;
  const wasmUrl = new URL(`${variantDir}/assets/maplibre_bg.wasm`, location.origin).href;

  emitStatus({ state: 'booting', message: `正在检测 ${cfg.engineId} WASM 与样式文档…` });

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
          '尚未检测到本地编译的 maplibre-rs-experimental WASM 产物。请在仓库根目录执行 `just build-wasm` 或在 GitHub Actions 中触发构建。',
      });
      return makeFallbackBridge(cfg, 'WASM Not Built');
    }
  } catch (err) {
    emitStatus({ state: 'missing-wasm', message: `无法访问 ${wasmUrl}: ${String(err)}` });
    return makeFallbackBridge(cfg, 'WASM Missing');
  }

  // Fetch style document JSON and inject initial camera so frame 1 starts at target pose
  const resolvedStyleUrl = new URL(cfg.styleUrl, location.origin).href;
  const styleResp = await origFetch(resolvedStyleUrl);
  const styleObj = (await styleResp.json()) as Record<string, unknown>;
  styleObj.center = [cfg.camera.lng + eyeOffset, cfg.camera.lat];
  styleObj.zoom = cfg.camera.zoom;
  styleObj.bearing = cfg.camera.bearing;
  styleObj.pitch = cfg.camera.pitch;
  const styleJson = JSON.stringify(styleObj);

  emitStatus({ state: 'loading', message: '正在初始化 wgpu 设备与渲染管线…' });
  const bootStart = performance.now();

  const expMod = (await import(/* @vite-ignore */ moduleJsUrl)) as ExpModuleExports;
  const map = await expMod.startMapLibre(wasmUrl, undefined, styleJson, [], canvas.id);
  if (!map) {
    emitStatus({ state: 'unsupported', message: 'maplibre-rs-experimental 未能在当前浏览器完成初始化。' });
    return makeFallbackBridge(cfg, 'Init Failed');
  }

  let currentCamera: CameraPose = { ...cfg.camera };
  let followingSilently = false;
  let telemetryEnabled = Boolean(cfg.perfEnabled);
  let loadedMs: number | null = null;
  let lastFrameAt = performance.now();

  let resolveReady: (v: { loadedMs: number }) => void = () => {};
  const ready = new Promise<{ loadedMs: number }>((resolve) => {
    resolveReady = resolve;
  });

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
    // Graceful fallback when built against an older commit without `--arena-telemetry`:
    // poll getCamera only while pointer/wheel interaction is active on this canvas.
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
                wasmMemoryBytes: t.wasmMemoryBytes,
                gpuMemoryBytes: t.uploadBytes,
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
    }
  };

  wireTelemetry(telemetryEnabled);

  // Settle initial load banner
  void (async () => {
    if (typeof map.waitArenaIdle === 'function') {
      await map.waitArenaIdle();
    } else {
      await map.getCamera();
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
      }
      return currentCamera;
    },
    readPixels: async () => {
      // Trigger a fresh frame right before sampling the WebGPU canvas swapchain
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
