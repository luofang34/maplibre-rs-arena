import pixelmatch from 'pixelmatch';
import { getScenarioById, SCENARIOS } from './shared/scenarios';
import {
  ENGINES,
  type CameraPose,
  type EngineId,
  type MatrixReport,
  type RunnerBridge,
  type ScenarioSpec,
  type SoloRunMetrics,
  type ViewMode,
  type WasmManifest,
} from './shared/types';
import { exportReportMarkdown, renderMatrixDialogBody } from './ui/matrix-dialog';
import { ArenaPerfHud } from './ui/perf-hud';
import { executeSoloFlightPair } from './ui/solo-bench';

// Conditional polyfills for declarative command/commandfor and popover
if (typeof HTMLButtonElement !== 'undefined' && !('commandForElement' in HTMLButtonElement.prototype)) {
  void import('invokers-polyfill');
}
if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
  void import('@oddbird/popover-polyfill');
}

// Toolbar roving tabindex fallback when native CSS/HTML focusgroup is absent
function installToolbarFocusFallback(toolbar: HTMLElement): void {
  if ('focusGroup' in HTMLElement.prototype) return;
  const getItems = () =>
    Array.from(toolbar.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled])'));
  const initItems = getItems();
  initItems.forEach((el, idx) => {
    el.tabIndex = idx === 0 ? 0 : -1;
  });
  toolbar.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLSelectElement && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const items = getItems();
    const cur = items.indexOf(document.activeElement as HTMLElement);
    if (cur < 0) return;
    e.preventDefault();
    let next = cur;
    if (e.key === 'ArrowRight') next = (cur + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    items[cur]!.tabIndex = -1;
    items[next]!.tabIndex = 0;
    items[next]!.focus();
  });
}

// Dialog light-dismiss fallback when closedby="any" is not natively supported
function installDialogLightDismissFallback(dialog: HTMLDialogElement): void {
  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });
  if ('closedBy' in HTMLDialogElement.prototype) return;
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
}

function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchOptionalJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    const ct = res.headers.get('content-type') ?? '';
    if (!res.ok || !ct.includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function main() {
  const params = new URLSearchParams(location.search);

  const stageEl = document.getElementById('viewport-stage') as HTMLElement;
  const frameLeft = document.getElementById('frame-left') as HTMLIFrameElement;
  const frameRight = document.getElementById('frame-right') as HTMLIFrameElement;
  const selectLeft = document.getElementById('select-left') as HTMLSelectElement;
  const selectRight = document.getElementById('select-right') as HTMLSelectElement;
  const selectScenario = document.getElementById('select-scenario') as HTMLSelectElement;
  const btnSwap = document.getElementById('btn-swap-engines') as HTMLButtonElement;
  const btnTogglePerf = document.getElementById('btn-toggle-perf') as HTMLButtonElement;
  const btnSoloFlight = document.getElementById('btn-solo-flight') as HTMLButtonElement;
  const dividerEl = document.getElementById('curtain-divider') as HTMLElement;
  const diffCanvas = document.getElementById('diff-canvas') as HTMLCanvasElement;
  const diffSummaryPill = document.getElementById('diff-summary-pill') as HTMLElement;
  const diffSummaryText = document.getElementById('diff-summary-text') as HTMLElement;
  const btnRefreshDiff = document.getElementById('btn-refresh-diff') as HTMLButtonElement;
  const badgeLeftName = document.getElementById('badge-left-name') as HTMLElement;
  const badgeRightName = document.getElementById('badge-right-name') as HTMLElement;
  const badgeLeftNote = document.getElementById('badge-left-note') as HTMLElement;
  const badgeRightNote = document.getElementById('badge-right-note') as HTMLElement;
  const hudEl = document.getElementById('perf-hud') as HTMLElement;
  const hudCamReadout = document.getElementById('hud-camera-readout') as HTMLElement;
  const soloToast = document.getElementById('solo-progress-toast') as HTMLElement;
  const soloToastText = document.getElementById('solo-progress-text') as HTMLElement;
  const popScenarioTitle = document.getElementById('pop-scenario-title') as HTMLElement;
  const popScenarioDesc = document.getElementById('pop-scenario-desc') as HTMLElement;
  const matrixDialog = document.getElementById('matrix-dialog') as HTMLDialogElement;
  const matrixDialogBody = document.getElementById('matrix-dialog-body') as HTMLElement;
  const btnExportJson = document.getElementById('btn-export-json') as HTMLButtonElement;
  const btnExportMd = document.getElementById('btn-export-md') as HTMLButtonElement;
  const toolbarEl = document.querySelector('.arena-toolbar') as HTMLElement;

  installToolbarFocusFallback(toolbarEl);
  installDialogLightDismissFallback(matrixDialog);

  for (const s of SCENARIOS) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    selectScenario.appendChild(opt);
  }

  const [manifest, baselineReport] = await Promise.all([
    fetchOptionalJson<WasmManifest>('/wasm/manifest.json'),
    fetchOptionalJson<MatrixReport>('/reports/latest-matrix.json'),
  ]);

  const report: MatrixReport = baselineReport ?? {
    generatedAt: new Date().toISOString(),
    commits: { maplibreRsExperimental: 'HEAD', mlnRs: 'HEAD', maplibreGlJs: '5.3.0' },
    hardwareProfile: navigator.userAgent,
    capabilities: [],
    nativeAbba: [],
    conformanceSummary: {
      renderTestsExpPassPct: 0,
      renderTestsMlnPassPct: 0,
      expressionTestsMlnPassPct: 0,
      terrain3dConformance: '',
      xrStereoConformance: '',
    },
    soloWebRuns: [],
  };
  const liveSoloRuns: SoloRunMetrics[] = [];

  const defaultLeft: EngineId = (params.get('left') as EngineId) || (window.crossOriginIsolated ? 'exp-mt' : 'exp-st');
  const defaultRight: EngineId = (params.get('right') as EngineId) || 'mln-webgpu';
  selectLeft.value = ENGINES[defaultLeft] ? defaultLeft : 'exp-st';
  selectRight.value = ENGINES[defaultRight] ? defaultRight : 'mln-webgpu';

  let activeScenario: ScenarioSpec = getScenarioById(params.get('scenario'));
  selectScenario.value = activeScenario.id;

  let currentCamera: CameraPose = { ...activeScenario.initialCamera };
  let viewMode: ViewMode = ((params.get('mode') as ViewMode) || 'curtain');
  let blinkSlot: 'left' | 'right' = 'left';
  let splitPct = 50;
  let leader: 'left' | 'right' | null = null;
  let soloRunning = false;

  const perfHud = new ArenaPerfHud(hudEl);
  const initialPerf = params.get('perf') === '1' || params.has('debug');
  perfHud.setEnabled(initialPerf);
  btnTogglePerf.setAttribute('aria-pressed', String(initialPerf));

  let bridgeLeft: RunnerBridge | null = null;
  let bridgeRight: RunnerBridge | null = null;
  const pendingSlotResolvers = new Map<'left' | 'right', (b: RunnerBridge) => void>();

  const refreshScenarioInfo = () => {
    popScenarioTitle.textContent = activeScenario.title;
    popScenarioDesc.textContent = activeScenario.description;

    const leftId = selectLeft.value as EngineId;
    const rightId = selectRight.value as EngineId;
    badgeLeftName.textContent = ENGINES[leftId].shortLabel;
    badgeRightName.textContent = ENGINES[rightId].shortLabel;

    const noteFor = (id: EngineId): string | undefined => {
      if (id.startsWith('exp')) return activeScenario.expCapabilityNote;
      if (id.startsWith('mln')) return activeScenario.mlnCapabilityNote;
      return undefined;
    };
    const lNote = noteFor(leftId);
    const rNote = noteFor(rightId);
    badgeLeftNote.textContent = lNote ? `· ${lNote}` : '';
    badgeLeftNote.hidden = !lNote;
    badgeRightNote.textContent = rNote ? `· ${rNote}` : '';
    badgeRightNote.hidden = !rNote;
  };

  const syncUrlState = () => {
    const next = new URL(location.href);
    next.searchParams.set('left', selectLeft.value);
    next.searchParams.set('right', selectRight.value);
    next.searchParams.set('scenario', activeScenario.id);
    next.searchParams.set('mode', viewMode);
    if (perfHud.isEnabled()) next.searchParams.set('perf', '1');
    else next.searchParams.delete('perf');
    history.replaceState(null, '', next);
  };

  const updateHudCameraText = (pose: CameraPose) => {
    hudCamReadout.textContent = `z${pose.zoom.toFixed(2)} · ${pose.lat.toFixed(4)}, ${pose.lng.toFixed(4)} · p${pose.pitch.toFixed(0)}°`;
  };

  const wireBridgeEvents = (slot: 'left' | 'right', bridge: RunnerBridge) => {
    const iframe = slot === 'left' ? frameLeft : frameRight;
    try {
      const doc = iframe.contentDocument;
      doc?.addEventListener(
        'pointerdown',
        () => {
          leader = slot;
          const other = slot === 'left' ? bridgeRight : bridgeLeft;
          other?.stop();
        },
        { capture: true },
      );
      doc?.addEventListener(
        'wheel',
        () => {
          leader = slot;
          const other = slot === 'left' ? bridgeRight : bridgeLeft;
          other?.stop();
        },
        { capture: true, passive: true },
      );
      doc?.addEventListener(
        'keydown',
        () => {
          leader = slot;
          const other = slot === 'left' ? bridgeRight : bridgeLeft;
          other?.stop();
        },
        { capture: true },
      );
    } catch {
      // ignore if iframe unloaded mid-attach
    }

    bridge.onCameraChange((pose) => {
      if (soloRunning) return;
      if (leader === null) leader = slot;
      if (leader !== slot) return;
      currentCamera = pose;
      updateHudCameraText(pose);
      const follower = slot === 'left' ? bridgeRight : bridgeLeft;
      follower?.followCamera(pose);
    });

    bridge.onTelemetry((sample) => {
      if (!soloRunning) {
        perfHud.pushSample(slot, sample);
      }
    });
  };

  const mountSlot = (
    slot: 'left' | 'right',
    engineId: EngineId,
    scenario: ScenarioSpec,
    pose: CameraPose,
    perfOn: boolean,
  ): Promise<RunnerBridge> => {
    const iframe = slot === 'left' ? frameLeft : frameRight;
    if (slot === 'left') {
      bridgeLeft?.destroy();
      bridgeLeft = null;
    } else {
      bridgeRight?.destroy();
      bridgeRight = null;
    }

    const eyeOffset = scenario.stereoIpdSimulation ? (slot === 'left' ? -0.0012 : 0.0012) : 0;
    const q = new URLSearchParams({
      slot,
      engine: engineId,
      style: scenario.styleUrl,
      scenario: scenario.id,
      lng: String(pose.lng),
      lat: String(pose.lat),
      zoom: String(pose.zoom),
      bearing: String(pose.bearing),
      pitch: String(pose.pitch),
      freeBearing: scenario.globeFreeBearing ? '1' : '0',
      eyeOffset: String(eyeOffset),
      perf: perfOn ? '1' : '0',
    });

    return new Promise<RunnerBridge>((resolve) => {
      pendingSlotResolvers.set(slot, resolve);
      iframe.src = `/runner.html?${q.toString()}`;
    });
  };

  const unmountSlot = (slot: 'left' | 'right') => {
    const iframe = slot === 'left' ? frameLeft : frameRight;
    if (slot === 'left') {
      bridgeLeft?.destroy();
      bridgeLeft = null;
    } else {
      bridgeRight?.destroy();
      bridgeRight = null;
    }
    iframe.src = 'about:blank';
  };

  window.addEventListener('message', (e: MessageEvent<{ type?: string; slot?: 'left' | 'right' }>) => {
    if (e.origin !== location.origin || e.data?.type !== 'arena-runner-ready') return;
    const slot = e.data.slot;
    if (!slot) return;
    const iframe = slot === 'left' ? frameLeft : frameRight;
    const bridge = iframe.contentWindow?.__arenaRunner;
    if (!bridge) return;
    if (slot === 'left') bridgeLeft = bridge;
    else bridgeRight = bridge;
    if (!soloRunning) {
      wireBridgeEvents(slot, bridge);
    }
    pendingSlotResolvers.get(slot)?.(bridge);
    pendingSlotResolvers.delete(slot);
  });

  const remountBoth = async (resetCameraToScenario: boolean) => {
    if (resetCameraToScenario) {
      currentCamera = { ...activeScenario.initialCamera };
    }
    leader = null;
    perfHud.reset();
    refreshScenarioInfo();
    syncUrlState();
    updateHudCameraText(currentCamera);

    // S7 Stereo defaults naturally to Side-by-Side dual-eye view
    if (activeScenario.stereoIpdSimulation && viewMode === 'curtain') {
      setViewMode('side-by-side');
    }

    await Promise.all([
      mountSlot('left', selectLeft.value as EngineId, activeScenario, currentCamera, perfHud.isEnabled()),
      mountSlot('right', selectRight.value as EngineId, activeScenario, currentCamera, perfHud.isEnabled()),
    ]);
    if (viewMode === 'diff') {
      void computePixelDiff();
    }
  };

  // Dynamic GeoJSON live loop when S6 is active outside Solo Flight
  let s6Tick = 0;
  window.setInterval(() => {
    if (soloRunning || !activeScenario.dynamicGeoJsonStress) return;
    s6Tick++;
    bridgeLeft?.stepDynamicStress?.(s6Tick);
    bridgeRight?.stepDynamicStress?.(s6Tick);
  }, 250);

  // View mode switcher
  const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view-mode]'));
  const setViewMode = (mode: ViewMode) => {
    viewMode = mode;
    stageEl.dataset.mode = mode;
    for (const btn of modeButtons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.viewMode === mode));
    }
    const isDiff = mode === 'diff';
    diffCanvas.hidden = !isDiff;
    diffSummaryPill.hidden = !isDiff;
    syncUrlState();
    if (isDiff) {
      void computePixelDiff();
    }
  };

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      const m = btn.dataset.viewMode as ViewMode;
      if (m === 'blink' && viewMode === 'blink') {
        blinkSlot = blinkSlot === 'left' ? 'right' : 'left';
        stageEl.dataset.blinkSlot = blinkSlot;
      } else {
        setViewMode(m);
      }
    });
  }

  // Pixel Diff calculation
  const computePixelDiff = async () => {
    if (!bridgeLeft || !bridgeRight) return;
    diffSummaryText.textContent = '正在等待双端帧静止并回读 RGBA 像素…';
    await Promise.all([bridgeLeft.waitIdle(3500), bridgeRight.waitIdle(3500)]);
    const [snapA, snapB] = await Promise.all([bridgeLeft.readPixels(), bridgeRight.readPixels()]);
    if (!snapA || !snapB) {
      diffSummaryText.textContent = '像素回读不可用（请确认两侧 WASM 引擎均已构建并就绪）';
      return;
    }
    const w = Math.min(snapA.width, snapB.width);
    const h = Math.min(snapA.height, snapB.height);
    diffCanvas.width = w;
    diffCanvas.height = h;
    const ctx = diffCanvas.getContext('2d');
    if (!ctx) return;

    const crop = (src: typeof snapA): Uint8Array => {
      if (src.width === w && src.height === h) {
        return new Uint8Array(src.rgba.buffer, src.rgba.byteOffset, w * h * 4);
      }
      const out = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        const srcRow = y * src.width * 4;
        out.set(src.rgba.subarray(srcRow, srcRow + w * 4), y * w * 4);
      }
      return out;
    };

    const outImg = ctx.createImageData(w, h);
    const mismatched = pixelmatch(crop(snapA), crop(snapB), outImg.data, w, h, {
      threshold: 0.1,
      alpha: 0.2,
      diffColor: [244, 63, 94],
    });
    ctx.putImageData(outImg, 0, 0);
    const pct = ((mismatched / (w * h)) * 100).toFixed(2);
    diffSummaryText.textContent = `Pixel Diff (${w}×${h}px): ${mismatched.toLocaleString()} 差异像素 (${pct}%)`;
  };

  btnRefreshDiff.addEventListener('click', () => void computePixelDiff());

  // Curtain divider pointer + keyboard accessibility
  const applySplit = (pct: number) => {
    splitPct = Math.max(5, Math.min(95, pct));
    stageEl.style.setProperty('--split', `${splitPct.toFixed(2)}%`);
    dividerEl.setAttribute('aria-valuenow', String(Math.round(splitPct)));
  };

  dividerEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dividerEl.setPointerCapture(e.pointerId);
    stageEl.classList.add('dragging-divider');
  });
  dividerEl.addEventListener('pointermove', (e) => {
    if (!dividerEl.hasPointerCapture(e.pointerId)) return;
    applySplit((e.clientX / window.innerWidth) * 100);
  });
  const endDrag = (e: PointerEvent) => {
    if (dividerEl.hasPointerCapture(e.pointerId)) {
      dividerEl.releasePointerCapture(e.pointerId);
    }
    stageEl.classList.remove('dragging-divider');
  };
  dividerEl.addEventListener('pointerup', endDrag);
  dividerEl.addEventListener('pointercancel', endDrag);
  dividerEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      applySplit(splitPct - (e.shiftKey ? 10 : 2));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      applySplit(splitPct + (e.shiftKey ? 10 : 2));
    }
  });

  // Selectors & hotkeys
  selectLeft.addEventListener('change', () => {
    refreshScenarioInfo();
    syncUrlState();
    void mountSlot('left', selectLeft.value as EngineId, activeScenario, currentCamera, perfHud.isEnabled());
  });
  selectRight.addEventListener('change', () => {
    refreshScenarioInfo();
    syncUrlState();
    void mountSlot('right', selectRight.value as EngineId, activeScenario, currentCamera, perfHud.isEnabled());
  });
  selectScenario.addEventListener('change', () => {
    activeScenario = getScenarioById(selectScenario.value);
    void remountBoth(true);
  });

  const swapEngines = () => {
    const tmp = selectLeft.value;
    selectLeft.value = selectRight.value;
    selectRight.value = tmp;
    void remountBoth(false);
  };
  btnSwap.addEventListener('click', swapEngines);

  const togglePerf = () => {
    const next = !perfHud.isEnabled();
    perfHud.setEnabled(next);
    btnTogglePerf.setAttribute('aria-pressed', String(next));
    bridgeLeft?.setTelemetryEnabled(next);
    bridgeRight?.setTelemetryEnabled(next);
    syncUrlState();
  };
  btnTogglePerf.addEventListener('click', togglePerf);

  window.addEventListener('keydown', (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLTextAreaElement ||
      matrixDialog.open
    ) {
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      togglePerf();
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      swapEngines();
    } else if (e.code === 'Space' && viewMode === 'blink') {
      e.preventDefault();
      blinkSlot = blinkSlot === 'left' ? 'right' : 'left';
      stageEl.dataset.blinkSlot = blinkSlot;
    }
  });

  // Solo Flight Benchmark Runner
  btnSoloFlight.addEventListener('click', async () => {
    if (soloRunning) return;
    soloRunning = true;
    btnSoloFlight.disabled = true;
    soloToast.hidden = false;
    try {
      const [runA, runB] = await executeSoloFlightPair(
        {
          mountSingleSlot: (slot, engineId, scenario, perf) =>
            mountSlot(slot, engineId, scenario, scenario.initialCamera, perf),
          unmountSlot,
          onProgress: (text) => {
            soloToastText.textContent = text;
          },
        },
        selectLeft.value as EngineId,
        selectRight.value as EngineId,
        activeScenario,
      );
      liveSoloRuns.unshift(runA, runB);
      refreshMatrixDialog();
      if (!matrixDialog.open) matrixDialog.showModal();
    } finally {
      soloRunning = false;
      btnSoloFlight.disabled = false;
      soloToast.hidden = true;
      await remountBoth(false);
    }
  });

  const refreshMatrixDialog = () => {
    renderMatrixDialogBody(matrixDialogBody, report, manifest, liveSoloRuns);
  };
  refreshMatrixDialog();

  btnExportJson.addEventListener('click', () => {
    const merged: MatrixReport = {
      ...report,
      generatedAt: new Date().toISOString(),
      soloWebRuns: [...liveSoloRuns, ...report.soloWebRuns],
    };
    downloadBlob(`maplibre-rs-arena-report-${Date.now()}.json`, JSON.stringify(merged, null, 2), 'application/json');
  });

  btnExportMd.addEventListener('click', () => {
    const md = exportReportMarkdown(report, liveSoloRuns);
    downloadBlob(`maplibre-rs-arena-report-${Date.now()}.md`, md, 'text/markdown');
  });

  setViewMode(viewMode);
  await remountBoth(true);
}

void main();
