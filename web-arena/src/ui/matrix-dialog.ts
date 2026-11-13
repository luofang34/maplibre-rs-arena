import { ENGINES, type CapabilityRow, type MatrixReport, type SoloRunMetrics, type WasmManifest } from '../shared/types';

function statusBadge(status: CapabilityRow['expStatus']): string {
  const cls = status === 'Full' ? 'badge-full' : status === 'Partial' ? 'badge-partial' : 'badge-gap';
  return `<span class="cap-badge ${cls}">${status}</span>`;
}

function fmtBytesKiB(bytes: number | undefined): string {
  if (!bytes) return '未构建';
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function renderMatrixDialogBody(
  container: HTMLElement,
  report: MatrixReport,
  manifest: WasmManifest | null,
  liveSoloRuns: SoloRunMetrics[],
): void {
  const allSolo = [...liveSoloRuns, ...report.soloWebRuns];

  const wasmRowsHtml = manifest
    ? Object.entries(manifest.bundles)
        .map(([name, stat]) => {
          return `
            <tr>
              <th scope="row">${name}</th>
              <td class="num">${fmtBytesKiB(stat?.rawBytes)}</td>
              <td class="num">${fmtBytesKiB(stat?.gzipBytes)}</td>
              <td><code>${stat?.path ?? '—'}</code></td>
            </tr>`;
        })
        .join('')
    : `<tr><th scope="row">WASM 产物包体</th><td class="num">—</td><td class="num">—</td><td>执行 <code>just build-wasm</code> 后自动生成包体统计</td></tr>`;

  const soloRowsHtml =
    allSolo.length > 0
      ? allSolo
          .map((r) => {
            const label = ENGINES[r.engineId]?.shortLabel ?? r.engineId;
            return `
              <tr>
                <th scope="row">${r.scenarioCode} · ${label}</th>
                <td class="num">${Math.round(r.coldLoadMs)} ms</td>
                <td class="num">${r.cpuAvgMs.toFixed(2)} ms</td>
                <td class="num">${r.cpuP95Ms.toFixed(2)} ms</td>
                <td class="num">${r.cpuP99Ms.toFixed(2)} ms</td>
                <td class="num">${r.budget90HzMissPct.toFixed(1)}%</td>
                <td class="num">${r.peakWasmMiB > 0 ? `${r.peakWasmMiB.toFixed(1)} MiB` : '—'}</td>
                <td class="num">${Math.round(r.avgDrawCalls) || '—'}</td>
              </tr>`;
          })
          .join('')
      : `<tr><th scope="row">暂无当前会话跑分</th><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`;

  const nativeRowsHtml = report.nativeAbba
    .map(
      (row) => `
      <tr>
        <th scope="row">${row.scenario}</th>
        <td>${row.workload}</td>
        <td class="num">${row.expMedianMs > 0 ? `${row.expMedianMs.toFixed(2)} ms` : '—'}</td>
        <td class="num">${row.mlnMedianMs > 0 ? `${row.mlnMedianMs.toFixed(2)} ms` : '不支持'}</td>
        <td class="num">${row.mlnMedianMs > 0 ? `p=${row.mannWhitneyP.toFixed(3)}` : '—'}</td>
        <td class="num">${row.expPeakRssMiB ? `${row.expPeakRssMiB.toFixed(0)} MiB` : '—'} / ${row.mlnPeakRssMiB ? `${row.mlnPeakRssMiB.toFixed(0)} MiB` : '—'}</td>
        <td><strong>${row.verdict}</strong> · <span class="muted">${row.notes}</span></td>
      </tr>`,
    )
    .join('');

  const capRowsHtml = report.capabilities
    .map(
      (c) => `
      <tr>
        <th scope="row">${c.dimension}</th>
        <td>${c.domain}</td>
        <td>${statusBadge(c.expStatus)} <div class="cell-note">${c.expDetail}</div></td>
        <td>${statusBadge(c.mlnStatus)} <div class="cell-note">${c.mlnDetail}</div></td>
        <td><div class="cell-note">${c.gljsReference}</div></td>
      </tr>`,
    )
    .join('');

  container.innerHTML = `
    <div class="matrix-meta-strip">
      <div><span>maplibre-rs-experimental:</span> <code>${manifest?.commits.maplibreRsExperimental ?? report.commits.maplibreRsExperimental}</code></div>
      <div><span>mln-rs:</span> <code>${manifest?.commits.mlnRs ?? report.commits.mlnRs}</code></div>
      <div><span>跨源隔离 (COOP/COEP):</span> <code>${window.crossOriginIsolated ? '已启用 (SharedArrayBuffer 可用)' : '未启用'}</code></div>
    </div>

    <h3 id="tbl-cap-heading" class="matrix-section-title">1. 全平台能力矩阵（Web · Desktop · Mobile · 3D Terrain · Native XR / WebXR）</h3>
    <div tabindex="0" role="region" aria-labelledby="tbl-cap-heading" class="table-wrapper">
      <table class="arena-table" style="--label-1:'领域';--label-2:'maplibre-rs-experimental';--label-3:'mln-rs';--label-4:'GL JS 基线'">
        <thead>
          <tr>
            <th scope="col">核心维度</th>
            <th scope="col">所属域</th>
            <th scope="col">maplibre-rs-experimental</th>
            <th scope="col">mln-rs</th>
            <th scope="col">MapLibre GL JS 基线</th>
          </tr>
        </thead>
        <tbody>${capRowsHtml}</tbody>
      </table>
    </div>

    <h3 id="tbl-solo-heading" class="matrix-section-title">2. Web 端 Solo 独占航线跑分（零同页 GPU 争用）</h3>
    <div tabindex="0" role="region" aria-labelledby="tbl-solo-heading" class="table-wrapper">
      <table class="arena-table" style="--label-1:'首屏耗时';--label-2:'CPU Avg';--label-3:'CPU P95';--label-4:'CPU P99';--label-5:'90Hz 超预算率';--label-6:'峰值 WASM';--label-7:'平均 Draw Calls'">
        <thead>
          <tr>
            <th scope="col">场景与引擎</th>
            <th scope="col" class="num">首屏冷加载</th>
            <th scope="col" class="num">CPU Avg</th>
            <th scope="col" class="num">CPU P95</th>
            <th scope="col" class="num">CPU P99</th>
            <th scope="col" class="num">90Hz XR 掉帧率</th>
            <th scope="col" class="num">峰值 WASM 内存</th>
            <th scope="col" class="num">平均 Draw Calls</th>
          </tr>
        </thead>
        <tbody>${soloRowsHtml}</tbody>
      </table>
    </div>

    <h3 id="tbl-native-heading" class="matrix-section-title">3. Native Headless ABBA 交错基准与 XR 双目压测</h3>
    <div tabindex="0" role="region" aria-labelledby="tbl-native-heading" class="table-wrapper">
      <table class="arena-table" style="--label-1:'负载';--label-2:'exp-rs 中位数';--label-3:'mln-rs 中位数';--label-4:'Mann-Whitney';--label-5:'峰值 RSS (exp/mln)';--label-6:'结论与说明'">
        <thead>
          <tr>
            <th scope="col">评测场景</th>
            <th scope="col">负载类型</th>
            <th scope="col" class="num">exp-rs Median</th>
            <th scope="col" class="num">mln-rs Median</th>
            <th scope="col" class="num">显著性检验</th>
            <th scope="col" class="num">Peak RSS (exp / mln)</th>
            <th scope="col">统计判定与架构备注</th>
          </tr>
        </thead>
        <tbody>${nativeRowsHtml}</tbody>
      </table>
    </div>

    <h3 id="tbl-wasm-heading" class="matrix-section-title">4. WASM 产物包体审计（Raw vs Gzip-9）</h3>
    <div tabindex="0" role="region" aria-labelledby="tbl-wasm-heading" class="table-wrapper">
      <table class="arena-table" style="--label-1:'Raw 体积';--label-2:'Gzip-9 体积';--label-3:'产物路径'">
        <thead>
          <tr>
            <th scope="col">构建目标</th>
            <th scope="col" class="num">Raw 大小</th>
            <th scope="col" class="num">Gzip -9 大小</th>
            <th scope="col">静态路径</th>
          </tr>
        </thead>
        <tbody>${wasmRowsHtml}</tbody>
      </table>
    </div>
  `;
}

export function exportReportMarkdown(report: MatrixReport, liveSoloRuns: SoloRunMetrics[]): string {
  const lines: string[] = [
    '# MapLibre Rust Engines Comparison & Benchmark Report',
    '',
    `- Generated At: \`${new Date().toISOString()}\``,
    `- \`maplibre-rs-experimental\`: \`${report.commits.maplibreRsExperimental}\``,
    `- \`mln-rs\`: \`${report.commits.mlnRs}\``,
    '',
    '## 1. Platform & 3D / Terrain / XR Capability Matrix',
    '',
    '| Dimension | Domain | maplibre-rs-experimental | mln-rs |',
    '| :--- | :--- | :--- | :--- |',
  ];
  for (const c of report.capabilities) {
    lines.push(`| ${c.dimension} | ${c.domain} | **${c.expStatus}** — ${c.expDetail} | **${c.mlnStatus}** — ${c.mlnDetail} |`);
  }

  const allSolo = [...liveSoloRuns, ...report.soloWebRuns];
  if (allSolo.length > 0) {
    lines.push(
      '',
      '## 2. Web Solo Automated Flight Benchmarks',
      '',
      '| Scenario & Engine | Cold Load (ms) | CPU Avg (ms) | CPU P95 (ms) | CPU P99 (ms) | 90Hz Miss % | Peak WASM (MiB) |',
      '| :--- | ---: | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const r of allSolo) {
      lines.push(
        `| ${r.scenarioCode} · ${r.engineId} | ${Math.round(r.coldLoadMs)} | ${r.cpuAvgMs.toFixed(2)} | ${r.cpuP95Ms.toFixed(2)} | ${r.cpuP99Ms.toFixed(2)} | ${r.budget90HzMissPct.toFixed(1)}% | ${r.peakWasmMiB.toFixed(1)} |`,
      );
    }
  }
  return lines.join('\n');
}
