import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function encodeRgbaPng(width, height, rgba) {
  if (rgba.length < width * height * 4) {
    throw new Error(`encodeRgbaPng buffer too small (${rgba.length} < ${width * height * 4})`);
  }
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0; // filter None
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, rowOff + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('Invalid PNG signature');
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];

  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    const dataStart = pos + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) break;
    const data = buf.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) {
        throw new Error('Interlaced PNGs are not supported by parity decoder');
      }
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos = dataEnd + 4;
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const rgba = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(stride);
  const curRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    const filter = raw[rowOff];
    for (let x = 0; x < stride; x++) {
      const byteVal = raw[rowOff + 1 + x];
      const a = x >= bpp ? curRow[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      let recon = byteVal;
      if (filter === 1) recon = (byteVal + a) & 0xff;
      else if (filter === 2) recon = (byteVal + b) & 0xff;
      else if (filter === 3) recon = (byteVal + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (byteVal + paethPredictor(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      curRow[x] = recon;
    }
    prevRow.set(curRow);
    const outOff = y * width * 4;
    if (bpp === 4) {
      rgba.set(curRow, outOff);
    } else {
      for (let x = 0; x < width; x++) {
        const s = x * 3;
        const d = outOff + x * 4;
        rgba[d] = curRow[s];
        rgba[d + 1] = curRow[s + 1];
        rgba[d + 2] = curRow[s + 2];
        rgba[d + 3] = 255;
      }
    }
  }
  return { width, height, rgba };
}

function imageLumaStats(rgba, width, height) {
  const n = width * height;
  if (n === 0) return { stdDev: 0, quantizedColors: 0, luma: new Float64Array(0) };
  const luma = new Float64Array(n);
  const buckets = new Set();
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = rgba[o + 3] / 255.0;
    const r = 255.0 + (rgba[o] - 255.0) * a;
    const g = 255.0 + (rgba[o + 1] - 255.0) * a;
    const b = 255.0 + (rgba[o + 2] - 255.0) * a;
    const y = 0.29889531 * r + 0.58662247 * g + 0.11448223 * b;
    luma[i] = y;
    sum += y;
    const key = ((Math.round(r) >> 3) << 10) | ((Math.round(g) >> 3) << 5) | (Math.round(b) >> 3);
    buckets.add(key);
  }
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const d = luma[i] - mean;
    sq += d * d;
  }
  return {
    stdDev: Math.sqrt(sq / n),
    quantizedColors: buckets.size,
    luma,
  };
}

export function analyzeSingleImage(img) {
  const st = imageLumaStats(img.rgba, img.width, img.height);
  return {
    width: img.width,
    height: img.height,
    lumaStdDev: Number(st.stdDev.toFixed(3)),
    quantizedColors: st.quantizedColors,
    nonBlank: st.stdDev >= 2.0 && st.quantizedColors >= 8,
  };
}

export function computeImageMetrics(imgA, imgB, { yiqThreshold = 0.12 } = {}) {
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(`Image dimensions differ: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`);
  }
  const w = imgA.width;
  const h = imgA.height;
  const n = w * h;
  const stA = imageLumaStats(imgA.rgba, w, h);
  const stB = imageLumaStats(imgB.rgba, w, h);

  // Perceptual NTSC YIQ diff matching native-arena/src/diff.rs
  const maxDelta = 35215.0 * yiqThreshold * yiqThreshold;
  let mismatched = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const aR = imgA.rgba[o], aG = imgA.rgba[o + 1], aB = imgA.rgba[o + 2], aA = imgA.rgba[o + 3];
    const bR = imgB.rgba[o], bG = imgB.rgba[o + 1], bB = imgB.rgba[o + 2], bA = imgB.rgba[o + 3];
    if (aR === bR && aG === bG && aB === bB && aA === bA) continue;
    const alphaA = aA / 255.0;
    const alphaB = bA / 255.0;
    const r1 = 255.0 + (aR - 255.0) * alphaA;
    const g1 = 255.0 + (aG - 255.0) * alphaA;
    const b1 = 255.0 + (aB - 255.0) * alphaA;
    const r2 = 255.0 + (bR - 255.0) * alphaB;
    const g2 = 255.0 + (bG - 255.0) * alphaB;
    const b2 = 255.0 + (bB - 255.0) * alphaB;
    const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223;
    const ci = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.2741761 - (b1 - b2) * 0.32180189;
    const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694;
    const delta = 0.5053 * y * y + 0.299 * ci * ci + 0.1957 * q * q;
    if (delta > maxDelta) mismatched++;
  }

  // 8x8 windowed luminance SSIM
  const C1 = (0.01 * 255.0) ** 2;
  const C2 = (0.03 * 255.0) ** 2;
  const blocksX = Math.floor(w / 8);
  const blocksY = Math.floor(h / 8);
  let ssimSum = 0;
  let blockCount = 0;
  let activeSsimSum = 0;
  let activeBlockCount = 0;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let sumA = 0, sumB = 0;
      for (let dy = 0; dy < 8; dy++) {
        const row = (by * 8 + dy) * w + bx * 8;
        for (let dx = 0; dx < 8; dx++) {
          sumA += stA.luma[row + dx];
          sumB += stB.luma[row + dx];
        }
      }
      const muA = sumA / 64.0;
      const muB = sumB / 64.0;
      let varA = 0, varB = 0, cov = 0;
      for (let dy = 0; dy < 8; dy++) {
        const row = (by * 8 + dy) * w + bx * 8;
        for (let dx = 0; dx < 8; dx++) {
          const da = stA.luma[row + dx] - muA;
          const db = stB.luma[row + dx] - muB;
          varA += da * da;
          varB += db * db;
          cov += da * db;
        }
      }
      varA /= 64.0;
      varB /= 64.0;
      cov /= 64.0;
      const num = (2 * muA * muB + C1) * (2 * cov + C2);
      const den = (muA * muA + muB * muB + C1) * (varA + varB + C2);
      const blockSsim = den > 0 ? num / den : 1.0;
      ssimSum += blockSsim;
      blockCount++;
      if (Math.max(muA, muB) >= 16.0 || Math.max(varA, varB) >= 4.0) {
        activeSsimSum += blockSsim;
        activeBlockCount++;
      }
    }
  }

  const fullSsim = blockCount > 0 ? ssimSum / blockCount : 1.0;
  const activeSsim = activeBlockCount > 0 ? activeSsimSum / activeBlockCount : fullSsim;

  return {
    width: w,
    height: h,
    ssim: Number(fullSsim.toFixed(4)),
    activeSsim: Number(activeSsim.toFixed(4)),
    diffPct: Number(((mismatched / Math.max(1, n)) * 100.0).toFixed(3)),
    mismatchedPixels: mismatched,
    lumaStdA: Number(stA.stdDev.toFixed(3)),
    lumaStdB: Number(stB.stdDev.toFixed(3)),
    nonBlankA: stA.stdDev >= 2.0 && stA.quantizedColors >= 8,
    nonBlankB: stB.stdDev >= 2.0 && stB.quantizedColors >= 8,
  };
}

export function drawDeltaPct(actual, reference) {
  if (!Number.isFinite(actual) || !Number.isFinite(reference) || reference <= 0) {
    return Infinity;
  }
  return Number((((actual - reference) / reference) * 100.0).toFixed(3));
}

function loadPngIfPresent(pngPath, cache) {
  if (!pngPath || !fs.existsSync(pngPath)) return null;
  if (!cache.has(pngPath)) {
    cache.set(pngPath, decodePng(fs.readFileSync(pngPath)));
  }
  return cache.get(pngPath);
}

const CROSS_VISUAL_SCENARIOS = new Set(['S1', 'S2', 'S3', 'S4', 'S8']);
const CROSS_DRAW_SCENARIOS = new Set(['S1', 'S2', 'S3', 'S4', 'S6', 'S8']);

/**
 * Evaluates hard settled output parity across engines for each scenario.
 * @param {Array<{scenario: string, engineId: string, unsupported?: boolean, settledDrawCalls: number, drawCallsMean?: number, parityPngPath?: string}>} captures
 */
export function evaluateWebParity(captures, opts = {}) {
  const drawTolPct = opts.drawTolPct ?? 5.0;
  const mtSsimMin = opts.mtSsimMin ?? 0.95;
  const mtDiffMax = opts.mtDiffMax ?? 6.0;
  const webglSsimMin = opts.webglSsimMin ?? 0.88;
  const webglDiffMax = opts.webglDiffMax ?? 14.0;
  const goldenSsimMin = opts.goldenSsimMin ?? 0.95;
  const goldenDiffMax = opts.goldenDiffMax ?? 5.0;
  const crossSsimMin = opts.crossSsimMin ?? 0.65;
  const crossExtrusionSsimMin = opts.crossExtrusionSsimMin ?? 0.42;
  const crossDiffMax = opts.crossDiffMax ?? 45.0;
  const parityRefsDir = opts.parityRefsDir || null;

  const goldenJsonPath = parityRefsDir ? path.join(parityRefsDir, 'web-reference.json') : null;
  const goldenRefs = goldenJsonPath && fs.existsSync(goldenJsonPath)
    ? JSON.parse(fs.readFileSync(goldenJsonPath, 'utf8'))
    : {};

  const pngCache = new Map();
  const byScenario = {};
  const checks = [];
  const failures = [];

  for (const cap of captures) {
    if (cap.unsupported) continue;
    byScenario[cap.scenario] ??= {};
    byScenario[cap.scenario][cap.engineId] = cap;
  }

  for (const [sc, engMap] of Object.entries(byScenario)) {
    // 1. Non-blank frame + non-zero draw count + no runner error banner check per engine
    for (const [eng, cap] of Object.entries(engMap)) {
      const bannerOk = !cap.bannerError;
      const draws = cap.settledDrawCalls ?? 0;
      const img = loadPngIfPresent(cap.parityPngPath, pngCache);
      const single = img ? analyzeSingleImage(img) : null;
      const drawOk = draws > 0;
      const imgOk = single ? single.nonBlank : true;
      const ok = bannerOk && drawOk && imgOk;
      const check = {
        scenario: sc,
        kind: 'engine-alive',
        engine: eng,
        draws,
        bannerError: cap.bannerError || null,
        nonBlank: single ? single.nonBlank : null,
        lumaStdDev: single ? single.lumaStdDev : null,
        ok,
      };
      checks.push(check);
      if (!ok) {
        const reasons = [];
        if (!bannerOk) reasons.push(`runner error banner (${cap.bannerError})`);
        if (!drawOk) reasons.push(`settledDrawCalls=${draws} (must be > 0)`);
        if (!imgOk) reasons.push(`blank frame (stdDev=${single?.lumaStdDev}, colors=${single?.quantizedColors})`);
        failures.push(`${sc} ${eng}: ${reasons.join('; ')}`);
      }
    }

    const st = engMap['exp-st'];
    const mln = engMap['mln-webgpu'];

    // 2. Compare exp variants (`exp-mt`, `exp-webgl2`) against `exp-st`
    if (st) {
      const stImg = loadPngIfPresent(st.parityPngPath, pngCache);
      const stDraws = st.settledDrawCalls ?? 0;
      for (const variant of ['exp-mt', 'exp-webgl2']) {
        const cap = engMap[variant];
        if (!cap) continue;
        const deltaPct = drawDeltaPct(cap.settledDrawCalls ?? 0, stDraws);
        const drawOk = Number.isFinite(deltaPct) && Math.abs(deltaPct) <= drawTolPct;

        let ssim = null;
        let diffPct = null;
        let pxOk = true;
        const minSsim = variant === 'exp-mt' ? mtSsimMin : webglSsimMin;
        const maxDiff = variant === 'exp-mt' ? mtDiffMax : webglDiffMax;
        const varImg = loadPngIfPresent(cap.parityPngPath, pngCache);
        if (stImg && varImg) {
          const m = computeImageMetrics(stImg, varImg);
          ssim = m.ssim;
          diffPct = m.diffPct;
          pxOk = m.ssim >= minSsim && m.diffPct <= maxDiff && m.nonBlankA && m.nonBlankB;
        }
        const ok = drawOk && pxOk;
        checks.push({
          scenario: sc,
          kind: 'exp-variant-vs-st',
          engine: variant,
          baseline: 'exp-st',
          draws: cap.settledDrawCalls,
          baselineDraws: stDraws,
          drawDeltaPct: deltaPct,
          ssim,
          diffPct,
          ok,
        });
        if (!ok) {
          const reasons = [];
          if (!drawOk) reasons.push(`draws=${cap.settledDrawCalls} vs exp-st=${stDraws} (delta=${deltaPct}% > ±${drawTolPct}%)`);
          if (!pxOk) reasons.push(`ssim=${ssim} (<${minSsim}) or diff=${diffPct}% (>${maxDiff}%)`);
          failures.push(`${sc} ${variant} vs exp-st: ${reasons.join('; ')}`);
        }
      }

      // 3. Compare exp-st against golden reference (when present)
      const goldenEntry = goldenRefs[sc];
      if (goldenEntry && typeof goldenEntry.settledDrawCalls === 'number') {
        const deltaPct = drawDeltaPct(stDraws, goldenEntry.settledDrawCalls);
        const drawOk = Number.isFinite(deltaPct) && Math.abs(deltaPct) <= drawTolPct;
        let ssim = null;
        let diffPct = null;
        let pxOk = true;
        const goldenPng = parityRefsDir ? path.join(parityRefsDir, `${sc}.png`) : null;
        const goldImg = loadPngIfPresent(goldenPng, pngCache);
        if (stImg && goldImg) {
          const m = computeImageMetrics(goldImg, stImg);
          ssim = m.ssim;
          diffPct = m.diffPct;
          pxOk = m.ssim >= goldenSsimMin && m.diffPct <= goldenDiffMax;
        }
        const ok = drawOk && pxOk;
        checks.push({
          scenario: sc,
          kind: 'exp-st-vs-golden',
          engine: 'exp-st',
          baseline: 'golden',
          draws: stDraws,
          baselineDraws: goldenEntry.settledDrawCalls,
          drawDeltaPct: deltaPct,
          ssim,
          diffPct,
          ok,
        });
        if (!ok) {
          failures.push(
            `${sc} exp-st vs golden: drawDelta=${deltaPct}% (tol ±${drawTolPct}%), ssim=${ssim} (min ${goldenSsimMin}), diff=${diffPct}% (max ${goldenDiffMax}%)`,
          );
        }
      }
    }

    // 4. Cross-engine parity: exp-* vs mln-webgpu on shared scenarios
    if (mln) {
      const mlnImg = loadPngIfPresent(mln.parityPngPath, pngCache);
      const mlnDraws = mln.settledDrawCalls ?? 0;
      for (const eng of ['exp-st', 'exp-mt', 'exp-webgl2']) {
        const cap = engMap[eng];
        if (!cap) continue;
        const expDraws = cap.settledDrawCalls ?? 0;
        const drawNonCollapseOk = !CROSS_DRAW_SCENARIOS.has(sc) || mlnDraws <= 0 || expDraws >= mlnDraws * 0.25;
        let ssim = null;
        let activeSsim = null;
        let diffPct = null;
        let pxOk = true;
        const expImg = loadPngIfPresent(cap.parityPngPath, pngCache);
        if (CROSS_VISUAL_SCENARIOS.has(sc) && mlnImg && expImg) {
          const m = computeImageMetrics(mlnImg, expImg);
          ssim = m.ssim;
          activeSsim = m.activeSsim;
          diffPct = m.diffPct;
          const scCrossSsimMin = sc === 'S3' ? crossExtrusionSsimMin : crossSsimMin;
          const ssimOk = m.ssim >= scCrossSsimMin || (m.activeSsim >= scCrossSsimMin && m.diffPct <= 15.0);
          pxOk = m.nonBlankA && m.nonBlankB && ssimOk && m.diffPct <= crossDiffMax;
        }
        const ok = drawNonCollapseOk && pxOk;
        checks.push({
          scenario: sc,
          kind: 'exp-vs-mln',
          engine: eng,
          baseline: 'mln-webgpu',
          draws: expDraws,
          baselineDraws: mlnDraws,
          drawDeltaPct: drawDeltaPct(expDraws, mlnDraws),
          ssim,
          activeSsim,
          diffPct,
          ok,
        });
        if (!ok) {
          const scCrossSsimMin = sc === 'S3' ? crossExtrusionSsimMin : crossSsimMin;
          const reasons = [];
          if (!drawNonCollapseOk) reasons.push(`draws=${expDraws} collapsed below 25% of mln-webgpu=${mlnDraws}`);
          if (!pxOk) {
            reasons.push(
              `cross-engine ssim=${ssim}, activeSsim=${activeSsim} (<${scCrossSsimMin}) or diff=${diffPct}% (>${crossDiffMax}%)`,
            );
          }
          failures.push(`${sc} ${eng} vs mln-webgpu: ${reasons.join('; ')}`);
        }
      }
    }
  }

  return {
    passed: failures.length === 0,
    thresholds: {
      drawTolPct,
      mtSsimMin,
      mtDiffMax,
      webglSsimMin,
      webglDiffMax,
      goldenSsimMin,
      goldenDiffMax,
      crossSsimMin,
      crossExtrusionSsimMin,
      crossDiffMax,
    },
    failures,
    checks,
    byScenario: Object.fromEntries(
      Object.entries(byScenario).map(([sc, map]) => [
        sc,
        Object.fromEntries(
          Object.entries(map).map(([eng, c]) => [
            eng,
            {
              settledDrawCalls: c.settledDrawCalls,
              parityPngPath: c.parityPngPath || null,
            },
          ]),
        ),
      ]),
    ),
  };
}
