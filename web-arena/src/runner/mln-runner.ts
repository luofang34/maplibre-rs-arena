import type {
  CameraPose,
  NormalizedTelemetry,
  PixelSnapshot,
  RunnerBridge,
  RunnerStartConfig,
  RunnerStatus,
} from '../shared/types';
import {
  MLN_PHASES,
  type FromMlnWorker,
  type MlnBackend,
  type MlnCameraTuple,
  type MlnDebugStats,
  type StartMlnTileWorker,
  type ToMlnWorker,
  WHEEL_NOTCHES,
  WHEEL_PIXELS,
} from './mln-protocol';

const SAFARI_NOTCH = 4.000244140625;
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_']);

function toMlnTuple(pose: CameraPose, eyeOffsetDeg = 0): MlnCameraTuple {
  return [pose.lat, pose.lng + eyeOffsetDeg, pose.zoom, pose.bearing, pose.pitch];
}

function fromMlnTuple([lat, lng, zoom, bearing, pitch]: MlnCameraTuple, eyeOffsetDeg = 0): CameraPose {
  return { lng: lng - eyeOffsetDeg, lat, zoom, bearing, pitch };
}

export async function createMlnRunner(
  cfg: RunnerStartConfig,
  canvas: HTMLCanvasElement,
  onBanner: (status: RunnerStatus) => void,
): Promise<RunnerBridge> {
  const backend: MlnBackend = cfg.engineId === 'mln-webgl2' ? 'webgl2' : 'webgpu';
  const eyeOffset = cfg.stereoEyeOffsetDeg ?? 0;
  const wasmRel = backend === 'webgl2' ? '/wasm/mln/pkg/webgl/mln_web_bg.wasm' : '/wasm/mln/pkg/mln_web_bg.wasm';
  const wasmUrl = new URL(wasmRel, location.origin).href;

  let cameraCb: ((pose: CameraPose) => void) | null = null;
  let telemetryCb: ((sample: NormalizedTelemetry) => void) | null = null;
  let statusCb: ((status: RunnerStatus) => void) | null = null;

  const emitStatus = (s: RunnerStatus) => {
    onBanner(s);
    statusCb?.(s);
  };

  if (backend === 'webgpu' && !('gpu' in navigator)) {
    const unsupportedStatus: RunnerStatus = {
      state: 'unsupported',
      message: 'WebGPU (navigator.gpu) is unavailable in this browser. Switch to mln-rs (WebGL2) or use a WebGPU-enabled browser.',
    };
    emitStatus(unsupportedStatus);
    return makeInertBridge(cfg, 'WebGPU Unsupported');
  }

  emitStatus({ state: 'booting', message: `Fetching & compiling ${cfg.engineId} WASM module…` });

  const ratio = window.devicePixelRatio || 1;
  let width = Math.max(1, canvas.parentElement?.clientWidth || window.innerWidth);
  let height = Math.max(1, canvas.parentElement?.clientHeight || window.innerHeight);
  const fitCanvas = () => {
    const devW = Math.round(width * ratio);
    const devH = Math.round(height * ratio);
    canvas.style.width = `${devW / ratio}px`;
    canvas.style.height = `${devH / ratio}px`;
  };
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  fitCanvas();

  const workerCount = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
  const tileWorkers = Array.from(
    { length: workerCount },
    () => new Worker(new URL('./mln-tile-worker.ts', import.meta.url), { type: 'module' }),
  );
  const mapWorker = new Worker(new URL('./mln-map-worker.ts', import.meta.url), {
    type: 'module',
    name: backend,
  });

  const postToMap = (msg: ToMlnWorker, transfer: Transferable[] = []) => mapWorker.postMessage(msg, transfer);
  const resolvedStyleUrl = new URL(cfg.styleUrl, location.origin).href;
  postToMap({ type: 'preload', style: resolvedStyleUrl, ratio, zoom: cfg.camera.zoom });

  let module: WebAssembly.Module;
  try {
    const wasmResp = await fetch(wasmUrl);
    const ct = wasmResp.headers.get('content-type') ?? '';
    if (!wasmResp.ok || ct.includes('text/html')) {
      mapWorker.terminate();
      for (const tw of tileWorkers) tw.terminate();
      emitStatus({
        state: 'missing-wasm',
        message: 'mln-rs WASM artifacts not found. Run `just build-wasm` locally or trigger the GitHub Actions workflow.',
      });
      return makeInertBridge(cfg, 'WASM Not Built');
    }
    if (typeof WebAssembly.compileStreaming === 'function' && ct.includes('wasm')) {
      module = await WebAssembly.compileStreaming(wasmResp);
    } else {
      module = await WebAssembly.compile(await wasmResp.arrayBuffer());
    }
  } catch (err) {
    mapWorker.terminate();
    for (const tw of tileWorkers) tw.terminate();
    emitStatus({
      state: 'missing-wasm',
      message: `Failed to fetch ${wasmRel}: ${String(err)}`,
    });
    return makeInertBridge(cfg, 'WASM Missing');
  }

  const ports = tileWorkers.map((tw) => {
    const channel = new MessageChannel();
    const startMsg: StartMlnTileWorker = {
      backend,
      origin: location.origin,
      module,
      port: channel.port2,
    };
    tw.postMessage(startMsg, [channel.port2]);
    return channel.port1;
  });

  let currentCamera: CameraPose = { ...cfg.camera };
  let latestStats: MlnDebugStats = {
    drawCalls: 0,
    memory: 0,
    gpuMemory: 0,
    pending: 0,
    requests: 0,
    loadedMs: null,
  };
  let telemetryEnabled = Boolean(cfg.perfEnabled);
  let followingSilently = false;
  let lastTelemetry: NormalizedTelemetry | null = null;

  let resolveReady: (v: { loadedMs: number }) => void = () => {};
  const ready = new Promise<{ loadedMs: number }>((resolve) => {
    resolveReady = resolve;
  });

  const idleQueue: Array<(pose: CameraPose) => void> = [];
  const pixelQueue: Array<(snap: PixelSnapshot | null) => void> = [];

  mapWorker.onmessage = ({ data }: MessageEvent<FromMlnWorker>) => {
    switch (data.type) {
      case 'loaded':
        emitStatus({
          state: 'ready',
          message: `Loaded in ${Math.round(data.loadedMs)} ms`,
          loadedMs: data.loadedMs,
        });
        resolveReady({ loadedMs: data.loadedMs });
        break;
      case 'camera': {
        currentCamera = fromMlnTuple(data.camera, eyeOffset);
        if (!followingSilently) {
          cameraCb?.(currentCamera);
        }
        followingSilently = false;
        break;
      }
      case 'idle': {
        const pose = fromMlnTuple(data.camera, eyeOffset);
        idleQueue.shift()?.(pose);
        break;
      }
      case 'pixels': {
        pixelQueue.shift()?.({
          width: data.width,
          height: data.height,
          rgba: new Uint8ClampedArray(data.pixels.buffer, data.pixels.byteOffset, data.pixels.byteLength),
        });
        break;
      }
      case 'stats':
        latestStats = data.stats;
        if (lastTelemetry) {
          lastTelemetry = {
            ...lastTelemetry,
            drawCalls: latestStats.drawCalls,
            wasmMemoryBytes: latestStats.memory,
            gpuMemoryBytes: latestStats.gpuMemory,
            pendingRequests: latestStats.pending,
            totalRequests: latestStats.requests,
            loadedMs: latestStats.loadedMs,
            settled: latestStats.pending === 0,
          };
        }
        break;
      case 'frame': {
        if (!telemetryEnabled) break;
        const p = data.sample.phases;
        const mapMs = p[0] ?? 0;
        const tilesMs = p[1] ?? 0;
        const sourcesMs = p[2] ?? 0;
        const symbolsMs = p[3] ?? 0;
        const layersMs = p[4] ?? 0;
        const uploadMs = p[5] ?? 0;
        const drawMs = p[6] ?? 0;
        const tasksMs = p[7] ?? 0;
        const cpuTotalMs = mapMs + tilesMs + sourcesMs + symbolsMs + layersMs + uploadMs + drawMs + tasksMs;

        const sample: NormalizedTelemetry = {
          engineId: cfg.engineId,
          timestampMs: performance.now(),
          frameIntervalMs: data.sample.interval,
          cpuTotalMs,
          gpuPassMs: null,
          buckets: {
            inputSetupMs: mapMs,
            tileIngestMs: tilesMs + sourcesMs + tasksMs,
            symbolPlacementMs: symbolsMs,
            terrainDrapeUploadMs: uploadMs,
            renderSubmitMs: layersMs + drawMs,
          },
          nativeStages: MLN_PHASES.map((name, i) => ({ name, ms: p[i] ?? 0 })),
          drawCalls: latestStats.drawCalls,
          wasmMemoryBytes: latestStats.memory,
          gpuMemoryBytes: latestStats.gpuMemory,
          uploadBytes: 0,
          drapeRedraws: 0,
          pendingRequests: latestStats.pending,
          totalRequests: latestStats.requests,
          loadedMs: latestStats.loadedMs,
          settled: latestStats.pending === 0,
          camera: currentCamera,
        };
        lastTelemetry = sample;
        telemetryCb?.(sample);
        break;
      }
      case 'unsupported':
        emitStatus({ state: 'unsupported', message: data.message });
        break;
      case 'fatal':
        emitStatus({ state: 'error', message: data.message });
        break;
    }
  };

  const offscreen = canvas.transferControlToOffscreen();
  emitStatus({ state: 'loading', message: 'Loading style and vector tiles…' });

  postToMap(
    {
      type: 'start',
      backend,
      origin: location.origin,
      module,
      canvas: offscreen,
      ports,
      width,
      height,
      ratio,
      style: resolvedStyleUrl,
      camera: toMlnTuple(cfg.camera, eyeOffset),
      globeFreeBearing: Boolean(cfg.globeFreeBearing),
    },
    [offscreen, ...ports],
  );

  if (telemetryEnabled) {
    postToMap({ type: 'debug', on: true });
  }

  let rect = canvas.getBoundingClientRect();
  const evtTime = (e: Event) => performance.timeOrigin + e.timeStamp;
  const evtMods = (e: MouseEvent | KeyboardEvent) =>
    (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0) | (e.metaKey ? 8 : 0);
  const localPt = (e: MouseEvent) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });

  canvas.tabIndex = 0;
  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    rect = canvas.getBoundingClientRect();
    followingSilently = false;
    postToMap({
      type: 'input',
      input: {
        kind: 'pointer_down',
        id: e.pointerId,
        pointerType: e.pointerType,
        button: e.button,
        ...localPt(e),
        modifiers: evtMods(e),
        time: evtTime(e),
      },
    });
    if (e.button === 0 || e.button === 2) {
      canvas.setPointerCapture(e.pointerId);
    }
  });

  const moveEvtName = 'onpointerrawupdate' in HTMLElement.prototype ? 'pointerrawupdate' : 'pointermove';
  canvas.addEventListener(moveEvtName, (e) => {
    if (e instanceof PointerEvent) {
      postToMap({
        type: 'input',
        input: { kind: 'pointer_move', id: e.pointerId, ...localPt(e), time: evtTime(e) },
      });
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    postToMap({
      type: 'input',
      input: { kind: 'pointer_up', id: e.pointerId, ...localPt(e), time: evtTime(e) },
    });
  });
  canvas.addEventListener('pointercancel', (e) => {
    postToMap({
      type: 'input',
      input: { kind: 'pointer_cancel', id: e.pointerId, time: evtTime(e) },
    });
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.deltaY === 0) return;
      followingSilently = false;
      let wheel = WHEEL_PIXELS;
      let amount = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        wheel = WHEEL_NOTCHES;
        amount = e.deltaY / 3;
      } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        wheel = WHEEL_NOTCHES;
        amount = e.deltaY;
      } else if (e.deltaY % SAFARI_NOTCH === 0) {
        wheel = WHEEL_NOTCHES;
        amount = e.deltaY / SAFARI_NOTCH;
      }
      postToMap({
        type: 'input',
        input: { kind: 'wheel', ...localPt(e), wheel, amount, modifiers: evtMods(e), time: evtTime(e) },
      });
    },
    { passive: false },
  );
  canvas.addEventListener('keydown', (e) => {
    if (KEYS.has(e.key)) e.preventDefault();
    if (KEYS.has(e.key) || e.key === 'Escape') {
      followingSilently = false;
      postToMap({
        type: 'input',
        input: { kind: 'key', key: e.key, modifiers: evtMods(e), time: evtTime(e) },
      });
    }
  });
  canvas.addEventListener('blur', (e) => {
    postToMap({ type: 'input', input: { kind: 'blur', time: evtTime(e) } });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const resizeObs = new ResizeObserver(() => {
    rect = canvas.getBoundingClientRect();
    const parent = canvas.parentElement;
    if (!parent) return;
    const nextW = Math.max(1, parent.clientWidth);
    const nextH = Math.max(1, parent.clientHeight);
    if (nextW === width && nextH === height) return;
    width = nextW;
    height = nextH;
    fitCanvas();
    postToMap({ type: 'resize', width, height });
  });
  if (canvas.parentElement) resizeObs.observe(canvas.parentElement);

  return {
    engineId: cfg.engineId,
    backendLabel: backend === 'webgl2' ? 'mln-rs WebGL2' : 'mln-rs WebGPU',
    ready,
    getCamera: () => currentCamera,
    followCamera: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      postToMap({ type: 'follow', camera: toMlnTuple(pose, eyeOffset) });
    },
    jumpTo: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      postToMap({ type: 'jumpTo', camera: toMlnTuple(pose, eyeOffset) });
    },
    stop: () => {
      postToMap({ type: 'stop' });
    },
    setTelemetryEnabled: (enabled) => {
      telemetryEnabled = enabled;
      postToMap({ type: 'debug', on: enabled });
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
    waitIdle: (timeoutMs = 8000) =>
      new Promise<CameraPose>((resolve) => {
        const timer = window.setTimeout(() => resolve(currentCamera), timeoutMs);
        idleQueue.push((pose) => {
          window.clearTimeout(timer);
          resolve(pose);
        });
        postToMap({ type: 'idle' });
      }),
    readPixels: () =>
      new Promise<PixelSnapshot | null>((resolve) => {
        const timer = window.setTimeout(() => resolve(null), 3000);
        pixelQueue.push((snap) => {
          window.clearTimeout(timer);
          resolve(snap);
        });
        postToMap({ type: 'readPixels' });
      }),
    destroy: () => {
      resizeObs.disconnect();
      mapWorker.terminate();
      for (const tw of tileWorkers) tw.terminate();
    },
  };
}

function makeInertBridge(cfg: RunnerStartConfig, label: string): RunnerBridge {
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
