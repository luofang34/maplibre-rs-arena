import type { EngineId, RunnerStartConfig, RunnerStatus } from '../shared/types';
import { createExpRunner } from './exp-runner';
import { createMlnRunner } from './mln-runner';

function parseConfig(): RunnerStartConfig {
  const p = new URLSearchParams(location.search);
  const slot = p.get('slot') === 'right' ? 'right' : 'left';
  const engineId = (p.get('engine') ?? 'gl-js') as EngineId;
  const styleUrl = p.get('style') ?? 'https://tiles.openfreemap.org/styles/liberty';
  const scenarioId = p.get('scenario') ?? 's1-urban-2d';
  const lng = Number(p.get('lng') ?? 4.8952);
  const lat = Number(p.get('lat') ?? 52.3702);
  const zoom = Number(p.get('zoom') ?? 14.2);
  const bearing = Number(p.get('bearing') ?? 0);
  const pitch = Number(p.get('pitch') ?? 0);
  const globeFreeBearing = p.get('freeBearing') === '1';
  const stereoEyeOffsetDeg = Number(p.get('eyeOffset') ?? 0);
  const perfEnabled = p.get('perf') === '1';

  return {
    slot,
    engineId,
    styleUrl,
    scenarioId,
    camera: { lng, lat, zoom, bearing, pitch },
    globeFreeBearing,
    stereoEyeOffsetDeg,
    perfEnabled,
  };
}

async function boot() {
  const cfg = parseConfig();
  const canvas = document.getElementById('maplibre') as HTMLCanvasElement;
  const glContainer = document.getElementById('gl-container') as HTMLElement;
  const banner = document.getElementById('runner-banner') as HTMLElement;
  const bannerTitle = document.getElementById('banner-title') as HTMLElement;
  const bannerDesc = document.getElementById('banner-desc') as HTMLElement;

  const updateBanner = (status: RunnerStatus) => {
    if (status.state === 'ready' || status.state === 'loading') {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    const titles: Record<RunnerStatus['state'], string> = {
      booting: 'Preparing rendering engine…',
      loading: 'Loading style and vector tiles…',
      ready: '',
      'missing-wasm': `${cfg.engineId} WASM bundle not built`,
      unsupported: `${cfg.engineId} unsupported in this browser`,
      error: `${cfg.engineId} runtime error`,
    };
    bannerTitle.textContent = titles[status.state];
    bannerDesc.textContent = status.message;
  };

  let bridge;
  if (cfg.engineId === 'exp-mt' || cfg.engineId === 'exp-st') {
    bridge = await createExpRunner(cfg, canvas, updateBanner);
  } else if (cfg.engineId === 'mln-webgpu' || cfg.engineId === 'mln-webgl2') {
    bridge = await createMlnRunner(cfg, canvas, updateBanner);
  } else {
    const { createGlJsRunner } = await import('./gljs-runner');
    bridge = await createGlJsRunner(cfg, canvas, glContainer, updateBanner);
  }

  window.__arenaRunner = bridge;
  window.parent.postMessage({ type: 'arena-runner-ready', slot: cfg.slot, engineId: cfg.engineId }, location.origin);
}

void boot();
