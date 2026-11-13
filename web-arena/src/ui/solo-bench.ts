import type {
  CanonicalBuckets,
  EngineId,
  NormalizedTelemetry,
  RunnerBridge,
  ScenarioSpec,
  SoloRunMetrics,
} from '../shared/types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

export interface SoloRunnerHost {
  mountSingleSlot(slot: 'left' | 'right', engineId: EngineId, scenario: ScenarioSpec, perfEnabled: boolean): Promise<RunnerBridge>;
  unmountSlot(slot: 'left' | 'right'): void;
  onProgress(text: string): void;
}

/**
 * Runs Engine A completely alone (with Slot B unloaded to `about:blank` so zero GPU/CPU contention occurs),
 * replays the scenario's deterministic flight curve, unloads A, and runs Engine B completely alone.
 */
export async function executeSoloFlightPair(
  host: SoloRunnerHost,
  leftEngine: EngineId,
  rightEngine: EngineId,
  scenario: ScenarioSpec,
): Promise<[SoloRunMetrics, SoloRunMetrics]> {
  host.unmountSlot('left');
  host.unmountSlot('right');

  const runOne = async (slot: 'left' | 'right', engineId: EngineId): Promise<SoloRunMetrics> => {
    host.onProgress(`正在独立挂载 ${engineId} (${scenario.code}) 并等待首屏瓦片就绪…`);
    const bootT0 = performance.now();
    const bridge = await host.mountSingleSlot(slot, engineId, scenario, true);
    const readyInfo = await Promise.race([
      bridge.ready,
      new Promise<{ loadedMs: number }>((r) => window.setTimeout(() => r({ loadedMs: performance.now() - bootT0 }), 6500)),
    ]);
    await bridge.waitIdle(3500);

    const samples: NormalizedTelemetry[] = [];
    bridge.onTelemetry((sample) => {
      samples.push(sample);
    });
    bridge.setTelemetryEnabled(true);

    host.onProgress(`正在执行 ${engineId} 独占确定性航线压测 (${(scenario.durationMs / 1000).toFixed(1)}s)…`);
    const startFlight = performance.now();
    let tick = 0;

    await new Promise<void>((resolve) => {
      const step = () => {
        const elapsed = performance.now() - startFlight;
        const t = Math.min(1, elapsed / scenario.durationMs);
        bridge.jumpTo(scenario.flightPoseAt(t));
        if (scenario.dynamicGeoJsonStress) {
          bridge.stepDynamicStress?.(tick++);
        }
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    bridge.setTelemetryEnabled(false);
    bridge.onTelemetry(null);
    host.unmountSlot(slot);

    const cpus = samples.map((s) => s.cpuTotalMs).sort((a, b) => a - b);
    const intervals = samples.map((s) => s.frameIntervalMs).sort((a, b) => a - b);
    const gpus = samples.map((s) => s.gpuPassMs).filter((v): v is number => v !== null);
    const count = Math.max(1, samples.length);

    const sumBuckets: CanonicalBuckets = {
      inputSetupMs: 0,
      tileIngestMs: 0,
      symbolPlacementMs: 0,
      terrainDrapeUploadMs: 0,
      renderSubmitMs: 0,
    };
    let peakWasm = 0;
    let peakGpu = 0;
    let totalDraws = 0;
    let maxDrapes = 0;

    for (const s of samples) {
      sumBuckets.inputSetupMs += s.buckets.inputSetupMs;
      sumBuckets.tileIngestMs += s.buckets.tileIngestMs;
      sumBuckets.symbolPlacementMs += s.buckets.symbolPlacementMs;
      sumBuckets.terrainDrapeUploadMs += s.buckets.terrainDrapeUploadMs;
      sumBuckets.renderSubmitMs += s.buckets.renderSubmitMs;
      peakWasm = Math.max(peakWasm, s.wasmMemoryBytes);
      peakGpu = Math.max(peakGpu, s.gpuMemoryBytes);
      totalDraws += s.drawCalls;
      maxDrapes = Math.max(maxDrapes, s.drapeRedraws);
    }

    const miss60 = samples.filter((s) => s.cpuTotalMs > 16.67 || s.frameIntervalMs > 20.0).length;
    const miss90 = samples.filter((s) => s.cpuTotalMs > 11.11 || s.frameIntervalMs > 13.5).length;

    return {
      engineId,
      scenarioCode: scenario.code,
      coldLoadMs: readyInfo.loadedMs,
      framesSampled: samples.length,
      cpuAvgMs: cpus.length ? cpus.reduce((a, b) => a + b, 0) / cpus.length : 0,
      cpuP50Ms: percentile(cpus, 50),
      cpuP95Ms: percentile(cpus, 95),
      cpuP99Ms: percentile(cpus, 99),
      frameIntervalP95Ms: percentile(intervals, 95),
      budget60HzMissPct: (miss60 / count) * 100,
      budget90HzMissPct: (miss90 / count) * 100,
      gpuAvgMs: gpus.length ? gpus.reduce((a, b) => a + b, 0) / gpus.length : null,
      peakWasmMiB: peakWasm / (1024 * 1024),
      peakGpuMiB: peakGpu / (1024 * 1024),
      avgDrawCalls: totalDraws / count,
      totalDrapeRedraws: maxDrapes,
      meanBuckets: {
        inputSetupMs: sumBuckets.inputSetupMs / count,
        tileIngestMs: sumBuckets.tileIngestMs / count,
        symbolPlacementMs: sumBuckets.symbolPlacementMs / count,
        terrainDrapeUploadMs: sumBuckets.terrainDrapeUploadMs / count,
        renderSubmitMs: sumBuckets.renderSubmitMs / count,
      },
    };
  };

  const leftMetrics = await runOne('left', leftEngine);
  await new Promise((r) => window.setTimeout(r, 350));
  const rightMetrics = await runOne('right', rightEngine);

  return [leftMetrics, rightMetrics];
}
