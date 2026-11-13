export type MlnBackend = 'webgpu' | 'webgl2';

/** Notice mln-rs tuple order: [lat, lon, zoom, bearing, pitch] */
export type MlnCameraTuple = [lat: number, lon: number, zoom: number, bearing: number, pitch: number];

export const WHEEL_PIXELS = 0;
export const WHEEL_NOTCHES = 1;

export type MlnInput =
  | {
      kind: 'pointer_down';
      id: number;
      pointerType: string;
      button: number;
      x: number;
      y: number;
      modifiers: number;
      time: number;
    }
  | { kind: 'pointer_move'; id: number; x: number; y: number; time: number }
  | { kind: 'pointer_up'; id: number; x: number; y: number; time: number }
  | { kind: 'pointer_cancel'; id: number; time: number }
  | { kind: 'wheel'; x: number; y: number; wheel: number; amount: number; modifiers: number; time: number }
  | { kind: 'key'; key: string; modifiers: number; time: number }
  | { kind: 'blur'; time: number };

export interface MlnStartMessage {
  type: 'start';
  backend: MlnBackend;
  origin: string;
  module: WebAssembly.Module;
  canvas: OffscreenCanvas;
  ports: MessagePort[];
  width: number;
  height: number;
  ratio: number;
  style: string;
  camera: MlnCameraTuple;
  globeFreeBearing: boolean;
}

export type ToMlnWorker =
  | MlnStartMessage
  | { type: 'readPixels' }
  | { type: 'idle' }
  | { type: 'resize'; width: number; height: number }
  | { type: 'pixelRatio'; ratio: number }
  | { type: 'style'; url: string }
  | { type: 'jumpTo'; camera: MlnCameraTuple }
  | { type: 'follow'; camera: MlnCameraTuple }
  | { type: 'stop' }
  | { type: 'globeFreeBearing'; on: boolean }
  | { type: 'input'; input: MlnInput }
  | { type: 'debug'; on: boolean };

export const MLN_PHASES = ['map', 'tiles', 'sources', 'symbols', 'layers', 'upload', 'draw', 'tasks'] as const;

export interface MlnFrameSample {
  interval: number;
  phases: number[];
}

export interface MlnDebugStats {
  drawCalls: number;
  memory: number;
  gpuMemory: number;
  pending: number;
  requests: number;
  loadedMs: number | null;
}

export type FromMlnWorker =
  | { type: 'loaded'; loadedMs: number; replies: number }
  | { type: 'pixels'; width: number; height: number; pixels: Uint8Array }
  | { type: 'idle'; camera: MlnCameraTuple }
  | { type: 'camera'; camera: MlnCameraTuple }
  | { type: 'frame'; sample: MlnFrameSample }
  | { type: 'stats'; stats: MlnDebugStats }
  | { type: 'fatal'; message: string }
  | { type: 'unsupported'; message: string };

export interface StartMlnTileWorker {
  backend: MlnBackend;
  origin: string;
  module: WebAssembly.Module;
  port: MessagePort;
}
