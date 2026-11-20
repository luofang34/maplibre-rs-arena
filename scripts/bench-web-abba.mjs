#!/usr/bin/env node
/**
 * 3-Round Interleaved ABBA WebGPU Arena Benchmark Harness (S1-S8)
 * Compares `mln-webgpu`, `exp-st`, and `exp-mt` in isolated Chrome WebGPU contexts.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { evaluateWebParity } from './parity-gate.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARENA_ROOT = path.resolve(SCRIPT_DIR, '..');

function resolvePlaywright() {
  const candidates = [
    path.join(ARENA_ROOT, 'web-arena/package.json'),
    '/Users/fangluo/photobooth/package.json',
    '/Users/fangluo/content-runtime/package.json',
  ];
  for (const pkgPath of candidates) {
    if (!fs.existsSync(pkgPath)) continue;
    const req = createRequire(pkgPath);
    for (const name of ['playwright', 'playwright-core']) {
      try {
        return req(name);
      } catch {
        // try next
      }
    }
  }
  throw new Error('Could not locate playwright / playwright-core');
}

const { chromium } = resolvePlaywright();

const CHROME_EXEC =
  process.env.CHROME_BIN ||
  (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pbf': 'application/x-protobuf',
};

const SCENARIOS = {
  S1: {
    id: 's1-urban-2d',
    title: 'S1 · 2D Dense Urban (Amsterdam)',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: 4.8952, lat: 52.3702, zoom: 14.2, bearing: 0, pitch: 0 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
  S2: {
    id: 's2-cjk-shaping',
    title: 'S2 · CJK & Multilingual Labels (Tokyo)',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    initialCamera: { lng: 139.7671, lat: 35.6812, zoom: 14.6, bearing: 0, pitch: 20 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
  S3: {
    id: 's3-extrusion-3d',
    title: 'S3 · 3D Fill-Extrusion Orbit (Manhattan 60°)',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: -74.009, lat: 40.7082, zoom: 15.9, bearing: -36, pitch: 60 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
  S4: {
    id: 's4-globe-polar',
    title: 'S4 · Globe Space-to-Street Dive',
    styleUrl: '/styles/s4-globe.json',
    initialCamera: { lng: 11.25, lat: 38.5, zoom: 2.1, bearing: 0, pitch: 18 },
    globeFreeBearing: true,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
  S5: {
    id: 's5-terrain-3d',
    title: 'S5 · 3D DEM Terrain + Draping (Alps)',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 11.392, lat: 47.269, zoom: 12.7, bearing: 142, pitch: 66 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
  S6: {
    id: 's6-dynamic-stress',
    title: 'S6 · Dynamic GeoJSON 900 Nodes (SF)',
    styleUrl: '/styles/s6-feature-state.json',
    initialCamera: { lng: -122.4194, lat: 37.7749, zoom: 13.6, bearing: 24, pitch: 48 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: true,
  },
  S7: {
    id: 's7-xr-stereo',
    title: 'S7 · XR / WebXR Stereo 90Hz Budget',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 7.6586, lat: 45.9763, zoom: 13.1, bearing: -28, pitch: 65 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: -0.0012,
    dynamicGeoJsonStress: false,
  },
  S8: {
    id: 's8-memory-tour',
    title: 'S8 · Cross-Continent Eviction Tour',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: -0.1276, lat: 51.5072, zoom: 14.4, bearing: 0, pitch: 45 },
    globeFreeBearing: false,
    stereoEyeOffsetDeg: 0,
    dynamicGeoJsonStress: false,
  },
};

function parseArgs(argv) {
  const opts = {
    rounds: 3,
    scenarios: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    engines: ['mln-webgpu', 'exp-st', 'exp-mt'],
    enginesExplicit: false,
    frames: 240,
    measureWarm: true,
    distDir: path.join(ARENA_ROOT, 'web-arena/dist'),
    jsonOut: path.join(ARENA_ROOT, 'reports/latest-web-abba.json'),
    mdOut: path.join(ARENA_ROOT, 'reports/latest-web-abba.md'),
    parity: true,
    parityOnly: false,
    parityDir: path.join(ARENA_ROOT, 'reports/parity-last'),
    parityRefsDir: path.join(ARENA_ROOT, 'reports/parity-refs/web'),
    parityOut: path.join(ARENA_ROOT, 'reports/latest-web-parity.json'),
    updateParityRefs: false,
    drawTolPct: 5.0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rounds') opts.rounds = Math.max(1, Number(argv[++i]));
    else if (a === '--scenarios') opts.scenarios = argv[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (a === '--engines') {
      opts.engines = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
      opts.enginesExplicit = true;
    }
    else if (a === '--frames') opts.frames = Math.max(30, Number(argv[++i]));
    else if (a === '--skip-warm') opts.measureWarm = false;
    else if (a === '--dist') opts.distDir = path.resolve(argv[++i]);
    else if (a === '--json-out') opts.jsonOut = path.resolve(argv[++i]);
    else if (a === '--md-out') opts.mdOut = path.resolve(argv[++i]);
    else if (a === '--no-parity') opts.parity = false;
    else if (a === '--parity-only') {
      opts.parity = true;
      opts.parityOnly = true;
      opts.measureWarm = false;
    } else if (a === '--parity-dir') opts.parityDir = path.resolve(argv[++i]);
    else if (a === '--parity-refs') opts.parityRefsDir = path.resolve(argv[++i]);
    else if (a === '--parity-out') opts.parityOut = path.resolve(argv[++i]);
    else if (a === '--update-parity-refs') opts.updateParityRefs = true;
    else if (a === '--draw-tol-pct') opts.drawTolPct = Math.max(0.1, Number(argv[++i]));
    else throw new Error(`Unknown CLI flag: ${a}`);
  }
  return opts;
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || '/', 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/index.html';
        let full = path.join(rootDir, rel);
        if (!full.startsWith(rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
          if (fs.existsSync(full + '.html')) {
            full = full + '.html';
          } else {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
        }
        const ext = path.extname(full).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=600');
        fs.createReadStream(full).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function mean(arr) {
  if (!arr.length) return 0;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3));
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const val = s.length % 2 === 1 ? s[m] : 0.5 * (s[m - 1] + s[m]);
  return Number(val.toFixed(3));
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx].toFixed(3));
}

function standardNormalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
  const erf = sign * (1 - poly * Math.exp(-z * z));
  return 0.5 * (1 + erf);
}

function mannWhitneyU(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  if (!n1 || !n2) return { u: 0, p: 1 };
  const combined = [...a.map((v) => ({ v, isA: true })), ...b.map((v) => ({ v, isA: false }))].sort(
    (x, y) => x.v - y.v,
  );
  const total = combined.length;
  const ranks = new Array(total).fill(0);
  let tieTerm = 0;
  let i = 0;
  while (i < total) {
    let j = i + 1;
    while (j < total && Math.abs(combined[j].v - combined[i].v) <= 1e-9) j++;
    const avgRank = 0.5 * (i + 1 + j);
    for (let k = i; k < j; k++) ranks[k] = avgRank;
    const t = j - i;
    if (t > 1) tieTerm += t ** 3 - t;
    i = j;
  }
  let rankSumA = 0;
  for (let k = 0; k < total; k++) {
    if (combined[k].isA) rankSumA += ranks[k];
  }
  const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  const mu = 0.5 * n1 * n2;
  const n = n1 + n2;
  const tieCorr = n > 1 ? tieTerm / (n * (n - 1)) : 0;
  const variance = ((n1 * n2) / 12) * (n + 1 - tieCorr);
  if (variance <= 1e-12) return { u, p: 1 };
  const z = Math.max(0, Math.abs(u - mu) - 0.5) / Math.sqrt(variance);
  const p = Math.min(1, Math.max(0, 2 * (1 - standardNormalCdf(z))));
  return { u, p: Number(p.toFixed(4)) };
}

const SCOPE_GPU_PROBE_SRC = `(() => {
  if (globalThis.__gpuScopeProbeInstalled) return;
  globalThis.__gpuScopeProbeInstalled = true;
  const state = {
    bootT0: performance.now(),
    ttffFirstMapSubmitMs: null,
    phase: 'boot',
    idleSubmits: 0,
    lastSubmitDraws: 0,
    liveBufBytes: 0,
    peakBufBytes: 0,
  };
  globalThis.__gpuApiProbe = state;

  const dev = globalThis.GPUDevice?.prototype;
  if (dev && typeof dev.createBuffer === 'function') {
    const origCb = dev.createBuffer;
    dev.createBuffer = function (desc) {
      const sz = Number(desc?.size ?? 0);
      state.liveBufBytes += sz;
      if (state.liveBufBytes > state.peakBufBytes) state.peakBufBytes = state.liveBufBytes;
      const b = origCb.call(this, desc);
      if (b && typeof b.destroy === 'function') {
        const origD = b.destroy.bind(b);
        let freed = false;
        b.destroy = () => {
          if (!freed) {
            freed = true;
            state.liveBufBytes = Math.max(0, state.liveBufBytes - sz);
          }
          origD();
        };
      }
      return b;
    };
  }

  const rpe = globalThis.GPURenderPassEncoder?.prototype;
  const enc = globalThis.GPUCommandEncoder?.prototype;
  const q = globalThis.GPUQueue?.prototype;
  if (rpe && enc && q) {
    let cur = { passes: 0, draws: 0 };
    for (const [proto, name, field] of [
      [rpe, 'draw', 'draws'],
      [rpe, 'drawIndexed', 'draws'],
      [enc, 'beginRenderPass', 'passes'],
    ]) {
      const orig = proto[name];
      if (typeof orig === 'function') {
        proto[name] = function (...args) {
          cur[field]++;
          return orig.apply(this, args);
        };
      }
    }
    const origSub = q.submit;
    if (typeof origSub === 'function') {
      q.submit = function (cmdBufs) {
        const r = origSub.call(this, cmdBufs);
        if (cur.draws > 0) {
          state.lastSubmitDraws = cur.draws;
        }
        if (cur.draws >= 5 && state.ttffFirstMapSubmitMs === null) {
          state.ttffFirstMapSubmitMs = performance.now() - state.bootT0;
        }
        if (state.phase === 'idle' && (cur.passes > 0 || cur.draws > 0)) {
          state.idleSubmits++;
        }
        cur = { passes: 0, draws: 0 };
        return r;
      };
    }
  }
})();`;

async function setAllScopesPhase(page, phase) {
  await page.evaluate((p) => {
    if (window.__gpuApiProbe) window.__gpuApiProbe.phase = p;
  }, phase);
  for (const w of page.workers()) {
    try {
      await w.evaluate(SCOPE_GPU_PROBE_SRC);
      await w.evaluate((p) => {
        if (globalThis.__gpuApiProbe) globalThis.__gpuApiProbe.phase = p;
      }, phase);
    } catch {}
  }
}

async function collectAllProbes(page) {
  const out = [];
  const mainProbe = await page.evaluate(() => window.__gpuApiProbe || null).catch(() => null);
  if (mainProbe) out.push(mainProbe);
  for (const w of page.workers()) {
    try {
      const p = await w.evaluate(() => globalThis.__gpuApiProbe || null);
      if (p) out.push(p);
    } catch {}
  }
  return out;
}

function buildRunnerUrl(baseUrl, engineId, sc) {
  const q = new URLSearchParams({
    slot: 'left',
    engine: engineId,
    style: sc.styleUrl,
    scenario: sc.id,
    lng: String(sc.initialCamera.lng),
    lat: String(sc.initialCamera.lat),
    zoom: String(sc.initialCamera.zoom),
    bearing: String(sc.initialCamera.bearing),
    pitch: String(sc.initialCamera.pitch),
    freeBearing: sc.globeFreeBearing ? '1' : '0',
    eyeOffset: String(sc.stereoEyeOffsetDeg),
    perf: '1',
  });
  return `${baseUrl}/runner.html?${q.toString()}`;
}

async function waitRunnerReady(page, navStartMs) {
  const boot = await page.evaluate(async () => {
    const t0 = performance.now();
    while (!window.__arenaRunner && performance.now() - t0 < 12000) {
      await new Promise((r) => setTimeout(r, 10));
    }
    const bridge = window.__arenaRunner;
    if (!bridge) return { error: 'no_bridge' };
    const readyInfo = await Promise.race([
      bridge.ready.then((v) => ({ loadedMs: v?.loadedMs ?? 0, timedOut: false })),
      new Promise((r) => setTimeout(() => r({ loadedMs: performance.now() - t0, timedOut: true }), 20000)),
    ]);
    await bridge.waitIdle(3000);
    const e2e =
      typeof window.__arenaE2eLoadedMs === 'number'
        ? window.__arenaE2eLoadedMs
        : typeof window.__arenaBootStartMs === 'number'
          ? performance.now() - window.__arenaBootStartMs
          : readyInfo.loadedMs;
    return {
      engineLoadedMs: Number((readyInfo.loadedMs || 0).toFixed(2)),
      e2eColdMs: Number(e2e.toFixed(2)),
      timedOut: Boolean(readyInfo.timedOut),
    };
  });
  const navToReadyMs = Number((Date.now() - navStartMs).toFixed(2));
  return { ...boot, navToReadyMs };
}

async function runSingle(browser, baseUrl, engineId, scenarioKey, flightFrames, measureWarm, parityCfg = null) {
  if (scenarioKey === 'S7' && engineId === 'mln-webgpu') {
    return { scenario: scenarioKey, engineId, unsupported: true };
  }
  const sc = SCENARIOS[scenarioKey];
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`);
  });
  page.on('worker', async (w) => {
    try {
      await w.evaluate(SCOPE_GPU_PROBE_SRC);
    } catch {}
  });
  await page.addInitScript({ content: SCOPE_GPU_PROBE_SRC });

  try {
    const runnerUrl = buildRunnerUrl(baseUrl, engineId, sc);
    const navT0 = Date.now();
    await page.goto(runnerUrl, { waitUntil: 'domcontentloaded' });
    const coldBoot = await waitRunnerReady(page, navT0);
    if (coldBoot.error) {
      throw new Error(`Boot failed for ${engineId} ${scenarioKey}: ${pageErrors.join('; ')}`);
    }

    const bannerError = await page.evaluate(() => {
      const el = document.getElementById('runner-banner');
      if (!el || el.hidden) return null;
      const title = document.getElementById('banner-title')?.textContent?.trim() || '';
      const desc = document.getElementById('banner-desc')?.textContent?.trim() || '';
      return [title, desc].filter(Boolean).join(': ') || 'runner banner visible';
    });

    // Settle telemetry snapshot & deterministic parity capture at initial camera before flight
    const settledSnap = await page.evaluate(async () => {
      const bridge = window.__arenaRunner;
      let latest = null;
      bridge.onTelemetry((s) => {
        latest = s;
      });
      bridge.setTelemetryEnabled(true);
      const pose = bridge.getCamera?.();
      if (pose) {
        bridge.jumpTo(pose);
      }
      await new Promise((r) => setTimeout(r, 250));
      latest = latest || bridge.getLastTelemetry?.() || null;
      bridge.setTelemetryEnabled(false);
      bridge.onTelemetry(null);
      return latest;
    });

    const bootProbes = await collectAllProbes(page);
    const probeDraws = Math.max(0, ...bootProbes.map((p) => p.lastSubmitDraws || 0));
    const settledDrawCalls = Number((probeDraws || settledSnap?.drawCalls || 0).toFixed(0));

    let parityPngPath = null;
    if (parityCfg?.pngPath) {
      fs.mkdirSync(path.dirname(parityCfg.pngPath), { recursive: true });
      await page.locator('#maplibre').screenshot({ path: parityCfg.pngPath, type: 'png' });
      parityPngPath = parityCfg.pngPath;
    }

    if (parityCfg?.parityOnly) {
      await page.evaluate(() => {
        try { window.__arenaRunner?.destroy(); } catch {}
      });
      return {
        scenario: scenarioKey,
        engineId,
        unsupported: false,
        e2eColdMs: coldBoot.e2eColdMs,
        engineLoadedMs: coldBoot.engineLoadedMs,
        warmLoadedMs: null,
        ttffFirstMapSubmitMs: null,
        framesSampled: 0,
        cpuMeanMs: 0,
        cpuMedianMs: 0,
        cpuP95Ms: 0,
        cpuP99Ms: 0,
        miss90HzPct: 0,
        miss60HzPct: 0,
        drawCallsMean: settledDrawCalls,
        settledDrawCalls,
        parityPngPath,
        bannerError,
        wasmSettledMiB: Number(((settledSnap?.wasmMemoryBytes || 0) / 1048576).toFixed(2)),
        wasmPeakMiB: Number(((settledSnap?.wasmMemoryBytes || 0) / 1048576).toFixed(2)),
        gpuSettledMiB: Number(((settledSnap?.gpuMemoryBytes || 0) / 1048576).toFixed(2)),
        gpuPeakMiB: Number(((settledSnap?.gpuMemoryBytes || 0) / 1048576).toFixed(2)),
        idleFramesAfterSettle: 0,
        avgStages: {},
        errors: pageErrors,
      };
    }

    // Solo camera flight across fixed frame count (240 frames)
    await setAllScopesPhase(page, 'flight');
    const flightData = await page.evaluate(
      async ({ scKey, totalFrames, dynamicStress }) => {
        const lerp = (a, b, t) => a + (b - a) * t;
        const smooth = (t) => {
          const x = Math.max(0, Math.min(1, t));
          return x * x * (3 - 2 * x);
        };
        const interp = (kf, t) => {
          const c = Math.max(0, Math.min(1, t));
          const s = c * (kf.length - 1);
          const i = Math.min(kf.length - 2, Math.floor(s));
          const lt = smooth(s - i);
          const a = kf[i], b = kf[i + 1];
          return {
            lng: lerp(a.lng, b.lng, lt),
            lat: lerp(a.lat, b.lat, lt),
            zoom: lerp(a.zoom, b.zoom, lt),
            bearing: lerp(a.bearing, b.bearing, lt),
            pitch: lerp(a.pitch, b.pitch, lt),
          };
        };
        const curves = {
          S1: (t) => interp([
            { lng: 4.8952, lat: 52.3702, zoom: 12.6, bearing: 0, pitch: 0 },
            { lng: 4.9015, lat: 52.3731, zoom: 15.8, bearing: 18, pitch: 0 },
            { lng: 4.8835, lat: 52.3665, zoom: 14.5, bearing: -12, pitch: 0 },
          ], t),
          S2: (t) => interp([
            { lng: 139.7671, lat: 35.6812, zoom: 13.5, bearing: 0, pitch: 15 },
            { lng: 139.7016, lat: 35.6595, zoom: 15.6, bearing: 32, pitch: 28 },
            { lng: 139.7514, lat: 35.6938, zoom: 14.8, bearing: -20, pitch: 18 },
          ], t),
          S3: (t) => ({
            lng: lerp(-74.012, -73.985, smooth(t)),
            lat: lerp(40.706, 40.748, smooth(t)),
            zoom: 15.7 + Math.sin(t * Math.PI) * 0.5,
            bearing: -36 + t * 240,
            pitch: 60,
          }),
          S4: (t) => interp([
            { lng: 11.25, lat: 38.5, zoom: 1.8, bearing: 0, pitch: 10 },
            { lng: 18.0, lat: 76.0, zoom: 3.6, bearing: 35, pitch: 25 },
            { lng: 8.5417, lat: 47.3769, zoom: 12.8, bearing: -18, pitch: 48 },
          ], t),
          S5: (t) => interp([
            { lng: 11.392, lat: 47.269, zoom: 12.4, bearing: 142, pitch: 66 },
            { lng: 11.18, lat: 47.12, zoom: 13.4, bearing: 168, pitch: 68 },
            { lng: 10.985, lat: 47.421, zoom: 12.9, bearing: 95, pitch: 62 },
          ], t),
          S6: (t) => ({
            lng: -122.4194 + Math.cos(t * Math.PI * 2) * 0.02,
            lat: 37.7749 + Math.sin(t * Math.PI * 2) * 0.015,
            zoom: 13.6 + Math.sin(t * Math.PI) * 0.4,
            bearing: 24 + t * 90,
            pitch: 48,
          }),
          S7: (t) => ({
            lng: 7.6586 + Math.sin(t * Math.PI * 2) * 0.018,
            lat: 45.9763 + Math.cos(t * Math.PI * 2) * 0.012,
            zoom: 13.1 + Math.sin(t * Math.PI * 4) * 0.18,
            bearing: -28 + Math.sin(t * Math.PI * 3) * 22,
            pitch: 64 + Math.cos(t * Math.PI * 4) * 4,
          }),
          S8: (t) => interp([
            { lng: -0.1276, lat: 51.5072, zoom: 14.4, bearing: 0, pitch: 45 },
            { lng: 4.5, lat: 49.2, zoom: 6.2, bearing: 25, pitch: 20 },
            { lng: 8.5417, lat: 47.3769, zoom: 14.8, bearing: -15, pitch: 52 },
            { lng: 103.8519, lat: 1.2903, zoom: 14.6, bearing: 40, pitch: 50 },
          ], t),
        };
        const bridge = window.__arenaRunner;
        const samples = [];
        bridge.onTelemetry((s) => samples.push(s));
        bridge.setTelemetryEnabled(true);
        for (let frame = 0; frame < totalFrames; frame++) {
          const t = frame / Math.max(1, totalFrames - 1);
          bridge.jumpTo(curves[scKey](t));
          if (dynamicStress) bridge.stepDynamicStress?.(frame);
          await new Promise((r) => requestAnimationFrame(r));
        }
        await bridge.waitIdle(5000);
        // Settle residual label fades (~350ms) then inspect 1000ms idle discipline
        await new Promise((r) => setTimeout(r, 400));
        let idleTelemCount = 0;
        bridge.onTelemetry(() => { idleTelemCount++; });
        return { samples, idleTelemAfterWait: idleTelemCount };
      },
      { scKey: scenarioKey, totalFrames: flightFrames, dynamicStress: sc.dynamicGeoJsonStress },
    );

    // 1000 ms strict post-settle idle window across GPUQueue.submit probes
    await setAllScopesPhase(page, 'idle');
    await page.waitForTimeout(1000);
    await setAllScopesPhase(page, 'done');

    const idleTelemAfter1s = await page.evaluate(() => {
      const bridge = window.__arenaRunner;
      bridge?.setTelemetryEnabled(false);
      bridge?.onTelemetry(null);
      return true;
    });
    void idleTelemAfter1s;

    const probes = await collectAllProbes(page);
    const totalIdleSubmits = probes.reduce((acc, p) => acc + (p.idleSubmits || 0), 0);
    const totalPeakBufBytes = probes.reduce((acc, p) => acc + (p.peakBufBytes || 0), 0);
    const ttffs = probes.map((p) => p.ttffFirstMapSubmitMs).filter((v) => typeof v === 'number');

    let warmLoadedMs = null;
    if (measureWarm) {
      await page.evaluate(() => {
        try { window.__arenaRunner?.destroy(); } catch {}
      });
      const warmNavT0 = Date.now();
      await page.goto(runnerUrl, { waitUntil: 'domcontentloaded' });
      const warmBoot = await waitRunnerReady(page, warmNavT0);
      warmLoadedMs = warmBoot.e2eColdMs;
    }

    await page.evaluate(() => {
      try { window.__arenaRunner?.destroy(); } catch {}
    });

    const sList = flightData.samples || [];
    const cpus = sList.map((s) => s.cpuTotalMs).sort((a, b) => a - b);
    const draws = sList.map((s) => s.drawCalls);
    const n = Math.max(1, sList.length);
    const miss90 = sList.filter((s) => s.cpuTotalMs > 11.11).length;
    const miss60 = sList.filter((s) => s.cpuTotalMs > 16.67).length;

    const stageSums = {};
    for (const s of sList) {
      for (const st of s.nativeStages || []) {
        stageSums[st.name] = (stageSums[st.name] || 0) + st.ms;
      }
    }
    const avgStages = {};
    for (const [k, v] of Object.entries(stageSums)) {
      avgStages[k] = Number((v / n).toFixed(3));
    }

    const peakWasmBytes = sList.length
      ? Math.max(...sList.map((s) => s.wasmMemoryBytes || 0))
      : settledSnap?.wasmMemoryBytes || 0;
    const peakGpuBytes = Math.max(
      sList.length ? Math.max(...sList.map((s) => s.gpuMemoryBytes || 0)) : 0,
      totalPeakBufBytes,
    );
    const settledWasmBytes = settledSnap?.wasmMemoryBytes || (sList[0]?.wasmMemoryBytes ?? 0);
    const settledGpuBytes = settledSnap?.gpuMemoryBytes || (sList[0]?.gpuMemoryBytes ?? 0);

    return {
      scenario: scenarioKey,
      engineId,
      unsupported: false,
      e2eColdMs: coldBoot.e2eColdMs,
      engineLoadedMs: coldBoot.engineLoadedMs,
      warmLoadedMs,
      ttffFirstMapSubmitMs: ttffs.length ? Number(Math.min(...ttffs).toFixed(2)) : null,
      framesSampled: sList.length,
      cpuMeanMs: mean(cpus),
      cpuMedianMs: pct(cpus, 50),
      cpuP95Ms: pct(cpus, 95),
      cpuP99Ms: pct(cpus, 99),
      miss90HzPct: Number(((miss90 / n) * 100).toFixed(2)),
      miss60HzPct: Number(((miss60 / n) * 100).toFixed(2)),
      drawCallsMean: mean(draws),
      settledDrawCalls: settledDrawCalls || Math.round(mean(draws)),
      parityPngPath,
      bannerError,
      wasmSettledMiB: Number((settledWasmBytes / 1048576).toFixed(2)),
      wasmPeakMiB: Number((peakWasmBytes / 1048576).toFixed(2)),
      gpuSettledMiB: Number((settledGpuBytes / 1048576).toFixed(2)),
      gpuPeakMiB: Number((peakGpuBytes / 1048576).toFixed(2)),
      idleFramesAfterSettle: totalIdleSubmits,
      avgStages,
      errors: pageErrors,
    };
  } finally {
    await context.close();
  }
}

function readBundleSizes(distDir) {
  const files = {
    'mln-webgpu': ['wasm/mln/pkg/mln_web_bg.wasm'],
    'mln-shaper': ['wasm/mln/pkg/mln_web_shaper_bg.wasm'],
    'mln-webgl2': ['wasm/mln/pkg/webgl/mln_web_bg.wasm'],
    'exp-st': ['wasm/exp-st/assets/maplibre_bg.wasm'],
    'exp-st-worker': ['wasm/exp-st/assets/maplibre_tile_worker_bg.wasm'],
    'exp-webgl2': ['wasm/exp-webgl/assets/maplibre_bg.wasm'],
    'exp-mt': ['wasm/exp-mt/assets/maplibre_bg.wasm'],
  };
  const out = {};
  for (const [key, rels] of Object.entries(files)) {
    for (const rel of rels) {
      const full = path.join(distDir, rel);
      if (!fs.existsSync(full)) continue;
      const buf = fs.readFileSync(full);
      const gz = zlib.gzipSync(buf, { level: 9 }).length;
      out[key] = {
        path: `/${rel}`,
        rawBytes: buf.length,
        rawKiB: Number((buf.length / 1024).toFixed(1)),
        gzipBytes: gz,
        gzipKiB: Number((gz / 1024).toFixed(1)),
      };
    }
  }
  return out;
}

function aggregateRuns(runs, opts) {
  const matrix = [];
  for (const scKey of opts.scenarios) {
    const byEngine = {};
    for (const eng of opts.engines) {
      const rows = runs.filter((r) => r.scenario === scKey && r.engineId === eng);
      if (!rows.length) continue;
      if (rows.every((r) => r.unsupported)) {
        byEngine[eng] = { unsupported: true };
        continue;
      }
      const ok = rows.filter((r) => !r.unsupported);
      byEngine[eng] = {
        rounds: ok.length,
        e2eColdMsMedian: median(ok.map((r) => r.e2eColdMs)),
        e2eColdMsMean: mean(ok.map((r) => r.e2eColdMs)),
        engineLoadedMsMedian: median(ok.map((r) => r.engineLoadedMs)),
        warmLoadedMsMedian: ok.some((r) => r.warmLoadedMs !== null)
          ? median(ok.map((r) => r.warmLoadedMs).filter((v) => v !== null))
          : null,
        cpuMeanMsMedian: median(ok.map((r) => r.cpuMeanMs)),
        cpuMedianMsMedian: median(ok.map((r) => r.cpuMedianMs)),
        cpuP95MsMedian: median(ok.map((r) => r.cpuP95Ms)),
        cpuP99MsMedian: median(ok.map((r) => r.cpuP99Ms)),
        miss90HzPctMedian: median(ok.map((r) => r.miss90HzPct)),
        miss60HzPctMedian: median(ok.map((r) => r.miss60HzPct)),
        drawCallsMeanMedian: median(ok.map((r) => r.drawCallsMean)),
        wasmSettledMiBMedian: median(ok.map((r) => r.wasmSettledMiB)),
        wasmPeakMiBMedian: median(ok.map((r) => r.wasmPeakMiB)),
        gpuSettledMiBMedian: median(ok.map((r) => r.gpuSettledMiB)),
        gpuPeakMiBMedian: median(ok.map((r) => r.gpuPeakMiB)),
        idleFramesAfterSettleMax: Math.max(...ok.map((r) => r.idleFramesAfterSettle)),
        e2eColdSamples: ok.map((r) => r.e2eColdMs),
        cpuMeanSamples: ok.map((r) => r.cpuMeanMs),
      };
    }

    const comparisons = {};
    const mln = byEngine['mln-webgpu'];
    if (mln && !mln.unsupported) {
      for (const eng of ['exp-st', 'exp-mt']) {
        const exp = byEngine[eng];
        if (!exp || exp.unsupported) continue;
        comparisons[`${eng}_vs_mln`] = {
          coldMannWhitneyP: mannWhitneyU(exp.e2eColdSamples, mln.e2eColdSamples).p,
          cpuMeanMannWhitneyP: mannWhitneyU(exp.cpuMeanSamples, mln.cpuMeanSamples).p,
        };
      }
    }
    matrix.push({ scenario: scKey, title: SCENARIOS[scKey].title, byEngine, comparisons });
  }
  return matrix;
}

function renderMarkdown(report) {
  const lines = [
    '# MapLibre Rust Arena — Web WebGPU Interleaved ABBA Report',
    '',
    `- **Generated At**: \`${report.generatedAt}\``,
    `- **Adapter**: \`${report.adapterInfo}\``,
    `- **Rounds**: \`${report.rounds}\` × \`${report.framesPerFlight}\` frames/flight (fresh BrowserContext per cold run)`,
    '',
    '## 1. WASM Bundle Sizes',
    '',
    '| Artifact | Raw (KiB) | Gzip-9 (KiB) |',
    '| :--- | ---: | ---: |',
  ];
  for (const [k, s] of Object.entries(report.bundleSizes)) {
    lines.push(`| \`${k}\` | ${s.rawKiB.toFixed(1)} | ${s.gzipKiB.toFixed(1)} |`);
  }
  lines.push(
    '',
    '## 2. Scenario Matrix (Medians Across Interleaved Rounds)',
    '',
    '| Scenario | Engine | Cold E2E (ms) | Warm (ms) | CPU Mean (ms) | CPU P95 (ms) | CPU P99 (ms) | >11.1ms % | Draws | WASM Peak (MiB) | GPU Peak (MiB) | Idle Submits |',
    '| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const row of report.matrix) {
    for (const eng of report.engines) {
      const m = row.byEngine[eng];
      if (!m) continue;
      if (m.unsupported) {
        lines.push(`| ${row.scenario} | \`${eng}\` | Unsupported | — | — | — | — | — | — | — | — | — |`);
        continue;
      }
      const warm = m.warmLoadedMsMedian !== null ? m.warmLoadedMsMedian.toFixed(1) : '—';
      lines.push(
        `| ${row.scenario} | \`${eng}\` | ${m.e2eColdMsMedian.toFixed(1)} | ${warm} | ${m.cpuMeanMsMedian.toFixed(2)} | ${m.cpuP95MsMedian.toFixed(2)} | ${m.cpuP99MsMedian.toFixed(2)} | ${m.miss90HzPctMedian.toFixed(1)}% | ${m.drawCallsMeanMedian.toFixed(0)} | ${m.wasmPeakMiBMedian.toFixed(1)} | ${m.gpuPeakMiBMedian.toFixed(1)} | ${m.idleFramesAfterSettleMax} |`,
      );
    }
  }
  lines.push(
    '',
    '> **Methodology Notes:** In **S6**, `mln-webgpu` has no `setGeoJsonData` mutation binding (`stepDynamicStress` is a no-op, rendering 0 animated sensors vs 900 animated sensors updated per frame in `exp-st`/`exp-mt`). In **S7**, XR dual-eye stereo rendering is not implemented in `mln-webgpu`.',
    '',
  );
  if (report.parity?.checks?.length) {
    lines.push(
      '## 3. Deterministic Output-Parity Gate (PASS)',
      '',
      '| Scenario | Kind | Engine | Baseline | Draws | Delta% | SSIM | Diff% | Status |',
      '| :--- | :--- | :--- | :--- | ---: | ---: | ---: | ---: | :--- |',
    );
    for (const c of report.parity.checks.filter((x) => x.kind !== 'engine-alive')) {
      lines.push(
        `| ${c.scenario} | \`${c.kind}\` | \`${c.engine}\` | \`${c.baseline}\` | ${c.draws} / ${c.baselineDraws} | ${Number(c.drawDeltaPct ?? 0).toFixed(2)}% | ${c.ssim !== null ? c.ssim.toFixed(4) : '—'} | ${c.diffPct !== null ? `${c.diffPct.toFixed(2)}%` : '—'} | ${c.ok ? 'PASS' : 'FAIL'} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(path.join(opts.distDir, 'runner.html'))) {
    throw new Error(`Missing built web-arena dist at ${opts.distDir}. Run \`just build-web\` first.`);
  }
  const srv = await startStaticServer(opts.distDir);
  const browser = await chromium.launch({
    ...(CHROME_EXEC ? { executablePath: CHROME_EXEC } : {}),
    headless: false,
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan,UseSkiaRenderer',
      '--ignore-gpu-blocklist',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--window-size=1100,840',
    ],
  });

  try {
    // Verify hardware WebGPU adapter upfront
    const probeCtx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const probePage = await probeCtx.newPage();
    await probePage.goto(`${srv.baseUrl}/`, { waitUntil: 'domcontentloaded' });
    const adapter = await probePage.evaluate(async () => {
      if (!('gpu' in navigator)) return null;
      const a = await navigator.gpu.requestAdapter();
      if (!a) return null;
      const info = a.info || (typeof a.requestAdapterInfo === 'function' ? await a.requestAdapterInfo() : {});
      return {
        vendor: info.vendor || 'unknown',
        architecture: info.architecture || '',
        description: info.description || '',
        isFallbackAdapter: Boolean(info.isFallbackAdapter ?? a.isFallbackAdapter),
      };
    });
    await probeCtx.close();
    if (!adapter || adapter.isFallbackAdapter) {
      throw new Error(`Hardware WebGPU adapter unavailable: ${JSON.stringify(adapter)}`);
    }
    const adapterInfo = `${adapter.vendor} ${adapter.architecture} ${adapter.description}`.trim();
    console.log(`[ABBA] Verified hardware WebGPU adapter: ${adapterInfo}`);

    const runs = [];
    const parityCaptures = [];
    const hasExpWebglBundle = fs.existsSync(path.join(opts.distDir, 'wasm/exp-webgl/assets/maplibre_bg.wasm'));
    const roundsToRun = opts.parityOnly ? 1 : opts.rounds;

    for (let r = 0; r < roundsToRun; r++) {
      const rot = r % opts.engines.length;
      const order = [...opts.engines.slice(rot), ...opts.engines.slice(0, rot)];
      console.log(`\n=== Round ${r + 1}/${roundsToRun} order: ${order.join(' -> ')} ===`);
      for (const scKey of opts.scenarios) {
        for (const eng of order) {
          const captureParity = opts.parity && r === 0;
          const parityCfg = captureParity
            ? {
                pngPath: path.join(opts.parityDir, `${scKey}-${eng}.png`),
                parityOnly: opts.parityOnly,
              }
            : opts.parityOnly
              ? { pngPath: null, parityOnly: true }
              : null;
          const row = await runSingle(browser, srv.baseUrl, eng, scKey, opts.frames, opts.measureWarm, parityCfg);
          runs.push(row);
          if (captureParity) {
            parityCaptures.push(row);
          }
          if (row.unsupported) {
            console.log(`[${scKey}] ${eng.padEnd(10)} | Unsupported`);
          } else if (opts.parityOnly) {
            console.log(`[${scKey}] ${eng.padEnd(10)} | parity cold=${row.e2eColdMs.toFixed(1)}ms | settledDraws=${row.settledDrawCalls}`);
          } else {
            console.log(
              `[${scKey}] ${eng.padEnd(10)} | cold=${row.e2eColdMs.toFixed(1)}ms warm=${row.warmLoadedMs?.toFixed(1) ?? '-'}ms | cpu=${row.cpuMeanMs.toFixed(2)}/${row.cpuP95Ms.toFixed(2)}/${row.cpuP99Ms.toFixed(2)}ms | >11.1=${row.miss90HzPct}% | draws=${row.drawCallsMean.toFixed(0)} | WASM=${row.wasmPeakMiB}M GPU=${row.gpuPeakMiB}M | idle=${row.idleFramesAfterSettle}`,
            );
          }
        }
        if (opts.parity && r === 0 && !opts.enginesExplicit && !order.includes('exp-webgl2') && hasExpWebglBundle) {
          const glRow = await runSingle(browser, srv.baseUrl, 'exp-webgl2', scKey, opts.frames, false, {
            pngPath: path.join(opts.parityDir, `${scKey}-exp-webgl2.png`),
            parityOnly: true,
          });
          parityCaptures.push(glRow);
          console.log(`[${scKey}] ${'exp-webgl2'.padEnd(10)} | parity cold=${glRow.e2eColdMs.toFixed(1)}ms | settledDraws=${glRow.settledDrawCalls}`);
        }
      }
    }

    let parityReport = null;
    if (opts.parity) {
      parityReport = evaluateWebParity(parityCaptures, {
        drawTolPct: opts.drawTolPct,
        parityRefsDir: opts.parityRefsDir,
      });
      fs.mkdirSync(path.dirname(opts.parityOut), { recursive: true });
      fs.writeFileSync(opts.parityOut, JSON.stringify(parityReport, null, 2));
      console.log(`\nWrote Web Parity JSON -> ${opts.parityOut}`);
      if (!parityReport.passed) {
        console.error('\n[PARITY GATE FAILED] Refusing to publish speed numbers:');
        for (const f of parityReport.failures) {
          console.error(`  - ${f}`);
        }
        process.exitCode = 1;
        return;
      }
      if (opts.updateParityRefs) {
        fs.mkdirSync(opts.parityRefsDir, { recursive: true });
        const refDraws = {};
        for (const cap of parityCaptures) {
          if (cap.engineId === 'exp-st' && !cap.unsupported) {
            refDraws[cap.scenario] = { settledDrawCalls: cap.settledDrawCalls };
            if (cap.parityPngPath && fs.existsSync(cap.parityPngPath)) {
              fs.copyFileSync(cap.parityPngPath, path.join(opts.parityRefsDir, `${cap.scenario}.png`));
            }
          }
        }
        fs.writeFileSync(path.join(opts.parityRefsDir, 'web-reference.json'), JSON.stringify(refDraws, null, 2));
        console.log(`Updated golden web parity refs in ${opts.parityRefsDir}`);
      }
    }

    if (opts.parityOnly) {
      console.log('[PARITY GATE PASSED]');
      return;
    }

    const bundleSizes = readBundleSizes(opts.distDir);
    const matrix = aggregateRuns(runs, opts);
    const report = {
      generatedAt: new Date().toISOString(),
      adapterInfo,
      rounds: opts.rounds,
      framesPerFlight: opts.frames,
      scenarios: opts.scenarios,
      engines: opts.engines,
      bundleSizes,
      parity: parityReport,
      matrix,
      rawRuns: runs,
    };
    fs.mkdirSync(path.dirname(opts.jsonOut), { recursive: true });
    fs.writeFileSync(opts.jsonOut, JSON.stringify(report, null, 2));
    fs.mkdirSync(path.dirname(opts.mdOut), { recursive: true });
    fs.writeFileSync(opts.mdOut, renderMarkdown(report));
    console.log(`\nWrote Web ABBA JSON -> ${opts.jsonOut}`);
    console.log(`Wrote Web ABBA MD   -> ${opts.mdOut}`);
  } finally {
    await browser.close();
    srv.server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
