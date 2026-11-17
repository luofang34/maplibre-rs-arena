import type { FromMlnWorker, MlnCameraTuple, MlnInput, MlnStartMessage, ToMlnWorker } from './mln-protocol';
import { ensureMlnWebGpuCompat } from './mln-webgpu-compat';

ensureMlnWebGpuCompat();

interface MlnWebMapInstance {
  set_style_url(url: string): void;
  jump_to(lat: number, lon: number, zoom: number, bearing: number, pitch: number): void;
  follow(lat: number, lon: number, zoom: number, bearing: number, pitch: number): void;
  set_globe_free_bearing(on: boolean): void;
  resize(width: number, height: number): void;
  set_pixel_ratio(ratio: number): void;
  /** Legacy `0ca2ff95fb` signature: `frame(maxMs, now)`; newer `18af76217b+` signature: `frame(now)`. */
  frame(...args: number[]): boolean;
  /** Present on newer `18af76217b+` session-based `WebMap` builds. */
  drain_frames?: () => number;
  frame_timings(): Float64Array | number[];
  render_stats(): Uint32Array | Float64Array | number[];
  camera(): Float64Array | number[];
  is_fully_loaded(): boolean;
  /** Present on `0ca2ff95fb` baseline builds. */
  received?: () => number;
  request_pixels(): void;
  /** Present on `0ca2ff95fb` baseline builds. */
  take_pixels?: () => Uint8Array | undefined;
  pointer_down(id: number, pointerType: string, button: number, x: number, y: number, modifiers: number, time: number): void;
  pointer_move(id: number, x: number, y: number, time: number): void;
  pointer_up(id: number, x: number, y: number, time: number): void;
  pointer_cancel(id: number, time: number): void;
  wheel(x: number, y: number, wheel: number, amount: number, modifiers: number, time: number): void;
  key(key: string, modifiers: number, time: number): void;
  blur(time: number): void;
}

interface MlnWebBindings {
  default: (opts: { module_or_path: WebAssembly.Module }) => Promise<{ memory?: WebAssembly.Memory }>;
  WebMap: {
    prototype?: {
      drain_frames?: () => number;
    };
    create(...args: unknown[]): Promise<MlnWebMapInstance>;
  };
  mlnWebConfigureTileWorkers?: (count?: number | null, spawn?: (() => MessagePort | undefined) | null) => void;
  set_preloads?: (take: (url: string) => Promise<Response> | undefined) => void;
  mlnWebStopPump: () => void;
}

let requests = 0;
let pending = 0;
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  requests++;
  pending++;
  let settled = false;
  const done = () => {
    if (!settled) {
      settled = true;
      pending--;
    }
  };
  return nativeFetch(input, init).then(
    (res) => {
      if (res.type === 'opaqueredirect') {
        done();
        return res;
      }
      const origArrayBuffer = res.arrayBuffer.bind(res);
      res.arrayBuffer = () => origArrayBuffer().finally(done);
      return res;
    },
    (err: unknown) => {
      done();
      throw err;
    },
  );
};

const post = (msg: FromMlnWorker, transfer: Transferable[] = []) => self.postMessage(msg, transfer);

let stopped = false;
let stopPump = () => {};

function fatal(where: string, error: unknown) {
  if (stopped) return;
  stopped = true;
  try {
    stopPump();
  } catch {
    // ignore post-panic cleanup errors
  }
  const panicMsg = (self as unknown as { mlnPanic?: string }).mlnPanic;
  post({ type: 'fatal', message: `${where}: ${panicMsg ?? String(error)}` });
}

self.addEventListener('error', (e) => fatal('map', e.error ?? e.message));
self.addEventListener('unhandledrejection', (e) => fatal('map', e.reason));

let handlerPromise: Promise<((msg: ToMlnWorker) => void) | undefined> | null = null;
const earlyQueue: ToMlnWorker[] = [];

self.onmessage = ({ data }: MessageEvent<ToMlnWorker>) => {
  if (data.type === 'start') {
    handlerPromise = startWorker(data).catch((err: unknown) => {
      fatal('map', err);
      return undefined;
    });
  } else if (handlerPromise) {
    void handlerPromise.then((fn) => fn?.(data));
  } else {
    earlyQueue.push(data);
  }
};

function normalizeFramePhases(raw: ArrayLike<number>): number[] {
  const arr = Array.from(raw, (v) => Number(v ?? 0));
  if (arr.length >= 8) {
    return arr.slice(0, 8);
  }
  if (arr.length === 6) {
    // Newer 6-phase layout `[sources, layers, symbols, upload, draw, tasks]` ->
    // canonical 8-slot `[map, tiles, sources, symbols, layers, upload, draw, tasks]`.
    return [0, 0, arr[0] ?? 0, arr[2] ?? 0, arr[1] ?? 0, arr[3] ?? 0, arr[4] ?? 0, arr[5] ?? 0];
  }
  while (arr.length < 8) arr.push(0);
  return arr;
}

async function startWorker(cfg: MlnStartMessage): Promise<(msg: ToMlnWorker) => void> {
  ensureMlnWebGpuCompat();
  const webgl2 = cfg.backend === 'webgl2';
  const jsUrl = webgl2 ? `${cfg.origin}/wasm/mln/pkg/webgl/mln_web.js` : `${cfg.origin}/wasm/mln/pkg/mln_web.js`;
  const shaperUrl = `${cfg.origin}/wasm/mln/pkg/mln_web_shaper.js`;

  const bindings = (await import(/* @vite-ignore */ jsUrl)) as MlnWebBindings;
  const wasmExports = await bindings.default({ module_or_path: cfg.module });
  stopPump = bindings.mlnWebStopPump;

  const isSessionAbi = typeof bindings.WebMap?.prototype?.drain_frames === 'function';

  const loadShaper = async () => {
    const shaper = (await import(/* @vite-ignore */ shaperUrl)) as { default: () => Promise<unknown> };
    await shaper.default();
    return shaper;
  };

  let workerReplies = 0;
  let readPixelsCount = 0;
  let renderingMap: MlnWebMapInstance | undefined;

  if (isSessionAbi) {
    bindings.set_preloads?.(() => undefined);
    cfg.ports.forEach((control, idx) => {
      control.onmessage = ({ data }: MessageEvent<{ fatal?: string; replies?: number }>) => {
        if (data && typeof data === 'object') {
          if (typeof data.fatal === 'string') {
            fatal(`tile worker ${idx}`, data.fatal);
          } else if (typeof data.replies === 'number') {
            workerReplies += data.replies;
          }
        }
      };
    });
    let spawned = 0;
    bindings.mlnWebConfigureTileWorkers?.(cfg.ports.length, () => cfg.ports[spawned++]);
  }

  const onSessionFrame = () => {
    if (stopped || !renderingMap?.drain_frames) return;
    try {
      if (renderingMap.drain_frames() === 0 || readPixelsCount === 0) return;
      const pixels = copyCanvasPixels(cfg.canvas);
      if (pixels !== undefined) {
        readPixelsCount--;
        post({ type: 'pixels', width: cfg.canvas.width, height: cfg.canvas.height, pixels }, [pixels.buffer]);
        if (readPixelsCount > 0) renderingMap.request_pixels();
      }
    } catch (err) {
      fatal('map', err);
    }
  };

  let map: MlnWebMapInstance;
  try {
    if (isSessionAbi) {
      map = await bindings.WebMap.create(
        cfg.canvas,
        cfg.width,
        cfg.height,
        cfg.ratio,
        loadShaper,
        null,
        true,
        onSessionFrame,
      );
    } else {
      map = await bindings.WebMap.create(
        cfg.canvas,
        cfg.width,
        cfg.height,
        cfg.ratio,
        cfg.ports,
        (idx: number, msg: unknown) => fatal(`tile worker ${idx}`, msg),
        loadShaper,
        'sans-serif',
      );
    }
  } catch (err) {
    if ((self as unknown as { mlnPanic?: string }).mlnPanic !== undefined) throw err;
    stopped = true;
    post({ type: 'unsupported', message: err instanceof Error ? err.message : String(err) });
    return () => {};
  }
  renderingMap = map;

  map.set_globe_free_bearing(cfg.globeFreeBearing);
  map.set_style_url(cfg.style);
  map.jump_to(...cfg.camera);

  let startedAt = performance.now();
  let loadedMs: number | null = null;
  let debugOn = false;
  let idleWaiters = 0;
  let stillFrames = 0;
  let lastCameraKey = '';
  let lastDrawnAt: number | null = null;
  let lastStatsAt = 0;

  const emitStats = (force: boolean) => {
    if (!debugOn) return;
    const now = performance.now();
    if (!force && now - lastStatsAt < 200) return;
    lastStatsAt = now;
    const rs = map.render_stats();
    post({
      type: 'stats',
      stats: {
        drawCalls: Number(rs[0] ?? 0),
        memory: wasmExports.memory?.buffer.byteLength ?? 0,
        gpuMemory: Number(rs[1] ?? 0) + Number(rs[2] ?? 0),
        pending,
        requests,
        loadedMs,
      },
    });
  };

  const tick = (rafTime: number) => {
    if (stopped) return;
    try {
      const now = performance.now();
      const drew = isSessionAbi ? map.frame(now) : map.frame(8, now);
      if (drew) {
        if (debugOn && lastDrawnAt !== null) {
          post({
            type: 'frame',
            sample: {
              interval: rafTime - lastDrawnAt,
              phases: normalizeFramePhases(map.frame_timings()),
            },
          });
        }
        lastDrawnAt = rafTime;
      }

      const rawCam = map.camera();
      const cam: MlnCameraTuple = [
        Number(rawCam[0] ?? 0),
        Number(rawCam[1] ?? 0),
        Number(rawCam[2] ?? 0),
        Number(rawCam[3] ?? 0),
        Number(rawCam[4] ?? 0),
      ];
      const key = cam.join(',');
      if (key !== lastCameraKey) {
        lastCameraKey = key;
        stillFrames = 0;
        post({ type: 'camera', camera: cam });
      } else {
        stillFrames++;
      }

      if (idleWaiters > 0 && stillFrames >= 10 && map.is_fully_loaded()) {
        while (idleWaiters > 0) {
          idleWaiters--;
          post({ type: 'idle', camera: cam });
        }
      }

      if (loadedMs === null && map.is_fully_loaded()) {
        loadedMs = performance.now() - startedAt;
        const replies = typeof map.received === 'function' ? map.received() : workerReplies;
        post({ type: 'loaded', loadedMs, replies });
        emitStats(true);
      }

      if (!isSessionAbi && readPixelsCount > 0) {
        const pixels = webgl2 ? copyCanvasPixels(cfg.canvas) : map.take_pixels?.();
        if (pixels !== undefined) {
          readPixelsCount--;
          post({ type: 'pixels', width: cfg.canvas.width, height: cfg.canvas.height, pixels }, [pixels.buffer]);
          if (readPixelsCount > 0) map.request_pixels();
        }
      }

      emitStats(false);
    } catch (err) {
      fatal('map', err);
      return;
    }
    if (!stopped) self.requestAnimationFrame(tick);
  };
  self.requestAnimationFrame(tick);

  const handle = (msg: ToMlnWorker) => {
    if (stopped) return;
    try {
      switch (msg.type) {
        case 'readPixels':
          if (readPixelsCount++ === 0) map.request_pixels();
          break;
        case 'idle':
          idleWaiters++;
          break;
        case 'resize':
          map.resize(msg.width, msg.height);
          break;
        case 'pixelRatio':
          map.set_pixel_ratio(msg.ratio);
          break;
        case 'style':
          map.set_style_url(msg.url);
          startedAt = performance.now();
          loadedMs = null;
          break;
        case 'jumpTo':
          map.jump_to(...msg.camera);
          break;
        case 'follow':
          map.follow(...msg.camera);
          break;
        case 'stop': {
          const c = map.camera();
          map.follow(Number(c[0] ?? 0), Number(c[1] ?? 0), Number(c[2] ?? 0), Number(c[3] ?? 0), Number(c[4] ?? 0));
          break;
        }
        case 'globeFreeBearing':
          map.set_globe_free_bearing(msg.on);
          break;
        case 'input':
          applyInput(map, msg.input);
          break;
        case 'debug':
          debugOn = msg.on;
          emitStats(true);
          break;
        case 'start':
          break;
      }
    } catch (err) {
      fatal('map', err);
    }
  };

  for (const item of earlyQueue.splice(0)) handle(item);
  return handle;
}

function copyCanvasPixels(canvas: OffscreenCanvas): Uint8Array | undefined {
  const ctx = new OffscreenCanvas(canvas.width, canvas.height).getContext('2d');
  if (!ctx) return undefined;
  ctx.drawImage(canvas, 0, 0);
  return new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
}

function applyInput(map: MlnWebMapInstance, input: MlnInput) {
  const t = input.time - performance.timeOrigin;
  switch (input.kind) {
    case 'pointer_down':
      map.pointer_down(input.id, input.pointerType, input.button, input.x, input.y, input.modifiers, t);
      break;
    case 'pointer_move':
      map.pointer_move(input.id, input.x, input.y, t);
      break;
    case 'pointer_up':
      map.pointer_up(input.id, input.x, input.y, t);
      break;
    case 'pointer_cancel':
      map.pointer_cancel(input.id, t);
      break;
    case 'wheel':
      map.wheel(input.x, input.y, input.wheel, input.amount, input.modifiers, t);
      break;
    case 'key':
      map.key(input.key, input.modifiers, t);
      break;
    case 'blur':
      map.blur(t);
      break;
  }
}
