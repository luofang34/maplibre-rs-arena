import { ENGINES, type CanonicalBuckets, type EngineId, type NormalizedTelemetry } from '../shared/types';

const HISTORY_LEN = 120;

interface SlotHistory {
  intervals: number[];
  cpus: number[];
  latest: NormalizedTelemetry | null;
}

const BUCKET_META: Array<{ key: keyof CanonicalBuckets; label: string; color: string }> = [
  { key: 'inputSetupMs', label: 'B1 Input & Camera', color: '#94a3b8' },
  { key: 'tileIngestMs', label: 'B2 Tiles & Decode', color: '#38bdf8' },
  { key: 'symbolPlacementMs', label: 'B3 Text & Symbols', color: '#facc15' },
  { key: 'terrainDrapeUploadMs', label: 'B4 Terrain & Upload', color: '#a855f7' },
  { key: 'renderSubmitMs', label: 'B5 Encode & Submit', color: '#34d399' },
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

function formatMiB(bytes: number): string {
  if (bytes <= 0) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export class ArenaPerfHud {
  private enabled = false;
  private left: SlotHistory = { intervals: [], cpus: [], latest: null };
  private right: SlotHistory = { intervals: [], cpus: [], latest: null };
  private rafPending = false;
  private readonly sparkCanvas: HTMLCanvasElement;
  private readonly bodyEl: HTMLElement;

  constructor(private readonly rootEl: HTMLElement) {
    this.sparkCanvas = rootEl.querySelector('#hud-sparkline') as HTMLCanvasElement;
    this.bodyEl = rootEl.querySelector('#hud-metrics-body') as HTMLElement;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.rootEl.hidden = !on;
    if (!on) {
      this.reset();
    } else {
      this.scheduleRender();
    }
  }

  reset(): void {
    this.left = { intervals: [], cpus: [], latest: null };
    this.right = { intervals: [], cpus: [], latest: null };
  }

  pushSample(slot: 'left' | 'right', sample: NormalizedTelemetry): void {
    if (!this.enabled) return;
    const target = slot === 'left' ? this.left : this.right;
    target.latest = sample;
    target.intervals.push(sample.frameIntervalMs);
    target.cpus.push(sample.cpuTotalMs);
    if (target.intervals.length > HISTORY_LEN) target.intervals.shift();
    if (target.cpus.length > HISTORY_LEN) target.cpus.shift();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.rafPending || !this.enabled) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.render();
    });
  }

  private render(): void {
    if (!this.enabled) return;
    this.drawSparkline();
    const leftHtml = this.renderSlotColumn('A (Left)', '#38bdf8', this.left);
    const rightHtml = this.renderSlotColumn('B (Right)', '#f472b6', this.right);
    this.bodyEl.innerHTML = `<div class="hud-columns">${leftHtml}${rightHtml}</div>`;
  }

  private drawSparkline(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.sparkCanvas.clientWidth || 440;
    const cssH = 68;
    if (this.sparkCanvas.width !== Math.round(cssW * dpr) || this.sparkCanvas.height !== Math.round(cssH * dpr)) {
      this.sparkCanvas.width = Math.round(cssW * dpr);
      this.sparkCanvas.height = Math.round(cssH * dpr);
    }
    const ctx = this.sparkCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const maxMs = 34;
    const yOf = (ms: number) => cssH - Math.min(1, ms / maxMs) * (cssH - 8) - 4;

    // Reference lines: 60Hz (16.67ms) & 90Hz XR (11.11ms)
    for (const ref of [
      { ms: 16.67, label: '60Hz (16.7ms)', color: 'rgba(148, 163, 184, 0.28)' },
      { ms: 11.11, label: '90Hz XR (11.1ms)', color: 'rgba(250, 204, 21, 0.28)' },
    ]) {
      const y = yOf(ref.ms);
      ctx.strokeStyle = ref.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(ref.label, 6, y - 2);
    }

    const plotSeries = (vals: number[], stroke: string) => {
      if (vals.length < 2) return;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      vals.forEach((v, idx) => {
        const x = (idx / (HISTORY_LEN - 1)) * cssW;
        const y = yOf(v);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    plotSeries(this.left.cpus, '#38bdf8');
    plotSeries(this.right.cpus, '#f472b6');
  }

  private renderSlotColumn(slotTitle: string, accent: string, hist: SlotHistory): string {
    const s = hist.latest;
    if (!s) {
      return `
        <section class="hud-col">
          <header class="hud-col-head">
            <span class="hud-dot" style="background:${accent}"></span>
            <strong>${slotTitle}</strong>
            <span class="hud-badge">Waiting for frames…</span>
          </header>
        </section>`;
    }

    const engineName = ENGINES[s.engineId as EngineId]?.shortLabel ?? s.engineId;
    const sortedCpu = [...hist.cpus].sort((a, b) => a - b);
    const avgCpu = sortedCpu.length ? sortedCpu.reduce((a, b) => a + b, 0) / sortedCpu.length : 0;
    const p95Cpu = percentile(sortedCpu, 95);
    const p99Cpu = percentile(sortedCpu, 99);
    const bucketMax = Math.max(
      0.5,
      s.buckets.inputSetupMs +
        s.buckets.tileIngestMs +
        s.buckets.symbolPlacementMs +
        s.buckets.terrainDrapeUploadMs +
        s.buckets.renderSubmitMs,
    );

    const barsHtml = BUCKET_META.map((b) => {
      const val = s.buckets[b.key];
      const pct = Math.min(100, (val / Math.max(4, bucketMax)) * 100);
      return `
        <div class="hud-bucket-row">
          <span class="hud-bucket-name">${b.label}</span>
          <div class="hud-bucket-track">
            <div class="hud-bucket-fill" style="width:${pct.toFixed(1)}%;background:${b.color}"></div>
          </div>
          <span class="hud-bucket-val">${val.toFixed(2)}</span>
        </div>`;
    }).join('');

    const nativeBreakdown = s.nativeStages
      .slice(0, 8)
      .map((st) => `${st.name}: ${st.ms.toFixed(2)}ms`)
      .join(' · ');

    return `
      <section class="hud-col">
        <header class="hud-col-head">
          <span class="hud-dot" style="background:${accent}"></span>
          <strong>${slotTitle} · ${engineName}</strong>
          <span class="hud-badge">${s.settled ? 'still (idle)' : 'rendering'}</span>
        </header>
        <div class="hud-kv-grid">
          <div><span>CPU Avg / P95 / P99</span><strong>${avgCpu.toFixed(2)} / ${p95Cpu.toFixed(2)} / ${p99Cpu.toFixed(2)} ms</strong></div>
          <div><span>GPU Pass</span><strong>${s.gpuPassMs !== null ? `${s.gpuPassMs.toFixed(2)} ms` : 'N/A'}</strong></div>
          <div><span>Draw Calls / Drapes</span><strong>${s.drawCalls || '—'} / ${s.drapeRedraws}</strong></div>
          <div><span>WASM / GPU Mem</span><strong>${formatMiB(s.wasmMemoryBytes)} / ${formatMiB(s.gpuMemoryBytes)}</strong></div>
          <div><span>Requests (Pend/All)</span><strong>${s.pendingRequests} / ${s.totalRequests}</strong></div>
          <div><span>Cold Load</span><strong>${s.loadedMs !== null ? `${Math.round(s.loadedMs)} ms` : '…'}</strong></div>
        </div>
        <div class="hud-buckets" title="${nativeBreakdown.replace(/"/g, '&quot;')}">
          ${barsHtml}
        </div>
      </section>`;
  }
}
