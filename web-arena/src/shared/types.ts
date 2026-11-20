export type EngineId = 'exp-mt' | 'exp-st' | 'exp-webgl2' | 'mln-webgpu' | 'mln-webgl2' | 'gl-js';

export type ViewMode = 'curtain' | 'side-by-side' | 'blink' | 'diff';

export interface EngineDescriptor {
  id: EngineId;
  shortLabel: string;
  label: string;
  repo: 'maplibre-rs-experimental' | 'mln-rs' | 'maplibre-gl-js';
  backend: string;
  requiresCrossOriginIsolated?: boolean;
  requiresWasmBundle?: 'exp-mt' | 'exp-st' | 'exp-webgl2' | 'mln-webgpu' | 'mln-webgl2';
}

export const ENGINES: Record<EngineId, EngineDescriptor> = {
  'exp-mt': {
    id: 'exp-mt',
    shortLabel: 'exp-rs (MT)',
    label: 'maplibre-rs-experimental · WebGPU Multithreaded',
    repo: 'maplibre-rs-experimental',
    backend: 'WebGPU + SharedArrayBuffer',
    requiresCrossOriginIsolated: true,
    requiresWasmBundle: 'exp-mt',
  },
  'exp-st': {
    id: 'exp-st',
    shortLabel: 'exp-rs (ST)',
    label: 'maplibre-rs-experimental · WebGPU Single-Threaded',
    repo: 'maplibre-rs-experimental',
    backend: 'WebGPU + Worker Pool',
    requiresWasmBundle: 'exp-st',
  },
  'exp-webgl2': {
    id: 'exp-webgl2',
    shortLabel: 'exp-rs (WebGL2)',
    label: 'maplibre-rs-experimental · WebGL2 Single-Threaded',
    repo: 'maplibre-rs-experimental',
    backend: 'WebGL2 + Worker Pool',
    requiresWasmBundle: 'exp-webgl2',
  },
  'mln-webgpu': {
    id: 'mln-webgpu',
    shortLabel: 'mln-rs (WebGPU)',
    label: 'mln-rs · OffscreenCanvas WebGPU',
    repo: 'mln-rs',
    backend: 'WebGPU + OffscreenCanvas',
    requiresWasmBundle: 'mln-webgpu',
  },
  'mln-webgl2': {
    id: 'mln-webgl2',
    shortLabel: 'mln-rs (WebGL2)',
    label: 'mln-rs · OffscreenCanvas WebGL2',
    repo: 'mln-rs',
    backend: 'WebGL2 + OffscreenCanvas',
    requiresWasmBundle: 'mln-webgl2',
  },
  'gl-js': {
    id: 'gl-js',
    shortLabel: 'MapLibre GL JS',
    label: 'MapLibre GL JS v5 · Spec Reference',
    repo: 'maplibre-gl-js',
    backend: 'WebGL2 Reference',
  },
};

export interface CameraPose {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
  roll?: number;
}

/**
 * 5 cross-engine canonical stage buckets so mln-rs (8 phases) and
 * maplibre-rs-experimental (ECS schedule stages + GPU pass) compare apples-to-apples.
 */
export interface CanonicalBuckets {
  /** B1: Input, camera evaluation, style/view state setup */
  inputSetupMs: number;
  /** B2: Tile covering, worker replies, source decoding & ingest */
  tileIngestMs: number;
  /** B3: Text shaping, glyph atlas, collision & symbol placement */
  symbolPlacementMs: number;
  /** B4: 3D DEM terrain drape cache, buffer/texture GPU upload */
  terrainDrapeUploadMs: number;
  /** B5: Layer sorting, command pass encoding & queue submit */
  renderSubmitMs: number;
}

export interface NativeStageTiming {
  name: string;
  ms: number;
}

export interface NormalizedTelemetry {
  engineId: EngineId;
  timestampMs: number;
  frameIntervalMs: number;
  cpuTotalMs: number;
  gpuPassMs: number | null;
  buckets: CanonicalBuckets;
  nativeStages: NativeStageTiming[];
  drawCalls: number;
  wasmMemoryBytes: number;
  gpuMemoryBytes: number;
  uploadBytes: number;
  drapeRedraws: number;
  pendingRequests: number;
  totalRequests: number;
  loadedMs: number | null;
  settled: boolean;
  camera: CameraPose;
}

export interface PixelSnapshot {
  width: number;
  height: number;
  /** Non-premultiplied RGBA bytes (width * height * 4) */
  rgba: Uint8ClampedArray;
}

export interface RunnerStartConfig {
  slot: 'left' | 'right';
  engineId: EngineId;
  styleUrl: string;
  camera: CameraPose;
  globeFreeBearing?: boolean;
  stereoEyeOffsetDeg?: number;
  perfEnabled?: boolean;
  scenarioId: string;
}

export interface RunnerBridge {
  readonly engineId: EngineId;
  readonly backendLabel: string;
  readonly ready: Promise<{ loadedMs: number }>;
  getCamera(): CameraPose;
  followCamera(pose: CameraPose): void;
  jumpTo(pose: CameraPose): void;
  stop(): void;
  setTelemetryEnabled(enabled: boolean): void;
  getLastTelemetry(): NormalizedTelemetry | null;
  onCameraChange(cb: ((pose: CameraPose) => void) | null): void;
  onTelemetry(cb: ((sample: NormalizedTelemetry) => void) | null): void;
  onStatus(cb: ((status: RunnerStatus) => void) | null): void;
  waitIdle(timeoutMs?: number): Promise<CameraPose>;
  readPixels(): Promise<PixelSnapshot | null>;
  stepDynamicStress?(tick: number): void;
  destroy(): void;
}

export interface RunnerStatus {
  state: 'booting' | 'loading' | 'ready' | 'unsupported' | 'missing-wasm' | 'error';
  message: string;
  loadedMs?: number;
  warningBadge?: string;
}

export interface ScenarioSpec {
  id: string;
  code: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
  title: string;
  category: '2D Vector' | 'Text & CJK' | '3D Extrusion' | 'Globe' | '3D Terrain' | 'Dynamic Data' | 'XR Stereo' | 'Memory Stress';
  description: string;
  styleUrl: string;
  initialCamera: CameraPose;
  globeFreeBearing?: boolean;
  stereoIpdSimulation?: boolean;
  dynamicGeoJsonStress?: boolean;
  mlnCapabilityNote?: string;
  expCapabilityNote?: string;
  durationMs: number;
  targetBudgetMs: number;
  /** Deterministic flight curve t in [0, 1] -> CameraPose */
  flightPoseAt(t: number): CameraPose;
}

export interface WasmBundleStat {
  path: string;
  rawBytes: number;
  gzipBytes: number;
}

export interface WasmManifest {
  builtAt: string;
  profile: string;
  commits: {
    maplibreRsExperimental: string;
    mlnRs: string;
  };
  bundles: Partial<
    Record<
      'mln-webgpu' | 'mln-shaper' | 'mln-webgl2' | 'exp-st' | 'exp-st-worker' | 'exp-webgl2' | 'exp-mt',
      WasmBundleStat | null
    >
  >;
}

export interface SoloRunMetrics {
  engineId: EngineId;
  scenarioCode: string;
  coldLoadMs: number;
  framesSampled: number;
  cpuAvgMs: number;
  cpuP50Ms: number;
  cpuP95Ms: number;
  cpuP99Ms: number;
  frameIntervalP95Ms: number;
  budget60HzMissPct: number;
  budget90HzMissPct: number;
  gpuAvgMs: number | null;
  peakWasmMiB: number;
  peakGpuMiB: number;
  avgDrawCalls: number;
  totalDrapeRedraws: number;
  meanBuckets: CanonicalBuckets;
}

export interface CapabilityRow {
  dimension: string;
  domain: 'Web' | 'Desktop & Mobile' | '3D & Terrain' | 'XR & WebXR' | 'Style & Text';
  expStatus: 'Full' | 'Partial' | 'Gap';
  expDetail: string;
  mlnStatus: 'Full' | 'Partial' | 'Gap';
  mlnDetail: string;
  gljsReference: string;
}

export interface NativeAbbaRow {
  scenario: string;
  workload: string;
  expMedianMs: number;
  mlnMedianMs: number;
  deltaPct: number;
  mannWhitneyP: number;
  verdict: 'exp-rs faster' | 'mln-rs faster' | 'tie / capability-only';
  expMinstr: number | null;
  mlnMinstr: number | null;
  expPeakRssMiB: number | null;
  mlnPeakRssMiB: number | null;
  notes: string;
}

export interface MatrixReport {
  generatedAt: string;
  commits: {
    maplibreRsExperimental: string;
    mlnRs: string;
    maplibreGlJs: string;
  };
  hardwareProfile: string;
  capabilities: CapabilityRow[];
  nativeAbba: NativeAbbaRow[];
  conformanceSummary: {
    renderTestsExpPassPct: number;
    renderTestsMlnPassPct: number;
    expressionTestsMlnPassPct: number;
    terrain3dConformance: string;
    xrStereoConformance: string;
  };
  soloWebRuns: SoloRunMetrics[];
}

declare global {
  interface Window {
    __arenaRunner?: RunnerBridge;
  }
}
