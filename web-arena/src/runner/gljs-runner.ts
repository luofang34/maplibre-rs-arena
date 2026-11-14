import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  CameraPose,
  NormalizedTelemetry,
  PixelSnapshot,
  RunnerBridge,
  RunnerStartConfig,
  RunnerStatus,
} from '../shared/types';
import { buildSensorGrid } from './dynamic-geojson';

export async function createGlJsRunner(
  cfg: RunnerStartConfig,
  canvasEl: HTMLCanvasElement,
  glContainer: HTMLElement,
  onBanner: (status: RunnerStatus) => void,
): Promise<RunnerBridge> {
  canvasEl.style.display = 'none';
  glContainer.style.display = 'block';

  const eyeOffset = cfg.stereoEyeOffsetDeg ?? 0;
  let cameraCb: ((pose: CameraPose) => void) | null = null;
  let telemetryCb: ((sample: NormalizedTelemetry) => void) | null = null;
  let statusCb: ((status: RunnerStatus) => void) | null = null;

  const emitStatus = (s: RunnerStatus) => {
    onBanner(s);
    statusCb?.(s);
  };

  let totalRequests = 0;
  let pendingRequests = 0;
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    totalRequests++;
    pendingRequests++;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        pendingRequests = Math.max(0, pendingRequests - 1);
      }
    };
    return origFetch(input, init).then(
      (res) => {
        window.setTimeout(finish, 1200);
        return res;
      },
      (err) => {
        finish();
        throw err;
      },
    );
  };

  emitStatus({ state: 'loading', message: 'Loading MapLibre GL JS reference baseline…' });
  const startAt = performance.now();
  const resolvedStyleUrl = new URL(cfg.styleUrl, location.origin).href;

  const map = new maplibregl.Map({
    container: glContainer,
    style: resolvedStyleUrl,
    center: [cfg.camera.lng + eyeOffset, cfg.camera.lat],
    zoom: cfg.camera.zoom,
    bearing: cfg.camera.bearing,
    pitch: cfg.camera.pitch,
    attributionControl: false,
    canvasContextAttributes: {
      antialias: true,
      preserveDrawingBuffer: false,
    },
  });

  let currentCamera: CameraPose = { ...cfg.camera };
  let followingSilently = false;
  let telemetryEnabled = Boolean(cfg.perfEnabled);
  let loadedMs: number | null = null;
  let lastRenderStart = 0;
  let lastFrameTime = performance.now();

  let resolveReady: (v: { loadedMs: number }) => void = () => {};
  const ready = new Promise<{ loadedMs: number }>((resolve) => {
    resolveReady = resolve;
  });

  map.on('load', () => {
    loadedMs = performance.now() - startAt;
    emitStatus({ state: 'ready', message: `Loaded in ${Math.round(loadedMs)} ms`, loadedMs });
    resolveReady({ loadedMs });
  });

  map.on('move', () => {
    const c = map.getCenter();
    currentCamera = {
      lng: c.lng - eyeOffset,
      lat: c.lat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
    if (!followingSilently) {
      cameraCb?.(currentCamera);
    }
  });

  map.on('renderstart', () => {
    if (telemetryEnabled) {
      lastRenderStart = performance.now();
    }
  });

  map.on('render', () => {
    if (!telemetryEnabled || !telemetryCb) return;
    const now = performance.now();
    const renderCpu = lastRenderStart > 0 ? Math.max(0.05, now - lastRenderStart) : 0.5;
    const interval = Math.max(0.5, now - lastFrameTime);
    lastFrameTime = now;
    const heapBytes =
      (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ?? 0;

    telemetryCb({
      engineId: 'gl-js',
      timestampMs: now,
      frameIntervalMs: interval,
      cpuTotalMs: renderCpu,
      gpuPassMs: null,
      buckets: {
        inputSetupMs: renderCpu * 0.12,
        tileIngestMs: renderCpu * 0.18,
        symbolPlacementMs: renderCpu * 0.2,
        terrainDrapeUploadMs: map.getTerrain() ? renderCpu * 0.2 : renderCpu * 0.08,
        renderSubmitMs: map.getTerrain() ? renderCpu * 0.3 : renderCpu * 0.42,
      },
      nativeStages: [{ name: 'gl-js main-thread render', ms: renderCpu }],
      drawCalls: 0,
      wasmMemoryBytes: heapBytes,
      gpuMemoryBytes: 0,
      uploadBytes: 0,
      drapeRedraws: 0,
      pendingRequests,
      totalRequests,
      loadedMs,
      settled: !map.isMoving() && map.loaded(),
      camera: currentCamera,
    });
  });

  return {
    engineId: 'gl-js',
    backendLabel: 'MapLibre GL JS v5 (WebGL2)',
    ready,
    getCamera: () => currentCamera,
    followCamera: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      map.jumpTo({
        center: [pose.lng + eyeOffset, pose.lat],
        zoom: pose.zoom,
        bearing: pose.bearing,
        pitch: pose.pitch,
      });
      followingSilently = false;
    },
    jumpTo: (pose) => {
      currentCamera = { ...pose };
      followingSilently = true;
      map.jumpTo({
        center: [pose.lng + eyeOffset, pose.lat],
        zoom: pose.zoom,
        bearing: pose.bearing,
        pitch: pose.pitch,
      });
      followingSilently = false;
    },
    stop: () => {
      map.stop();
    },
    setTelemetryEnabled: (enabled) => {
      telemetryEnabled = enabled;
      if (enabled) map.triggerRepaint();
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
    waitIdle: (timeoutMs = 8000) =>
      new Promise<CameraPose>((resolve) => {
        if (map.loaded() && !map.isMoving()) {
          resolve(currentCamera);
          return;
        }
        const timer = window.setTimeout(() => resolve(currentCamera), timeoutMs);
        map.once('idle', () => {
          window.clearTimeout(timer);
          resolve(currentCamera);
        });
      }),
    readPixels: () =>
      new Promise<PixelSnapshot | null>((resolve) => {
        map.once('render', () => {
          const glCanvas = map.getCanvas();
          const w = glCanvas.width;
          const h = glCanvas.height;
          if (w === 0 || h === 0) {
            resolve(null);
            return;
          }
          const off = new OffscreenCanvas(w, h);
          const ctx = off.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(glCanvas, 0, 0);
          resolve({ width: w, height: h, rgba: ctx.getImageData(0, 0, w, h).data });
        });
        map.triggerRepaint();
      }),
    stepDynamicStress: (tick) => {
      const src = map.getSource('arena_sensors') as GeoJSONSource | undefined;
      if (src && typeof src.setData === 'function') {
        src.setData(buildSensorGrid(currentCamera, tick));
      }
    },
    destroy: () => {
      map.remove();
    },
  };
}
