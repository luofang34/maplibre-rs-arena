import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  computeImageMetrics,
  decodePng,
  drawDeltaPct,
  encodeRgbaPng,
  evaluateWebParity,
} from './parity-gate.mjs';

function makePatternRgba(width, height, shift = 0, blank = false) {
  const buf = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (blank) {
        buf[o] = 240;
        buf[o + 1] = 240;
        buf[o + 2] = 240;
        buf[o + 3] = 255;
      } else {
        buf[o] = (x * 7 + shift) & 255;
        buf[o + 1] = (y * 11 + x * 3) & 255;
        buf[o + 2] = ((x ^ y) * 5 + shift) & 255;
        buf[o + 3] = 255;
      }
    }
  }
  return buf;
}

test('PNG encode/decode round-trip and identical SSIM = 1.0', () => {
  const rgba = makePatternRgba(32, 32);
  const png = encodeRgbaPng(32, 32, rgba);
  const dec = decodePng(png);
  assert.equal(dec.width, 32);
  assert.equal(dec.height, 32);
  const m = computeImageMetrics(dec, { width: 32, height: 32, rgba });
  assert.equal(m.ssim, 1);
  assert.equal(m.diffPct, 0);
  assert.equal(m.nonBlankA, true);
  assert.equal(m.nonBlankB, true);
});

test('enforces ±5% draw-call parity and rejects blank or dropped-layer frames', () => {
  const dir = mkdtempSync(join(tmpdir(), 'parity-gate-test-'));
  try {
    const basePng = join(dir, 'base.png');
    const identicalPng = join(dir, 'ident.png');
    const shiftedPng = join(dir, 'shifted.png');
    const blankPng = join(dir, 'blank.png');
    writeFileSync(basePng, encodeRgbaPng(32, 32, makePatternRgba(32, 32, 0)));
    writeFileSync(identicalPng, encodeRgbaPng(32, 32, makePatternRgba(32, 32, 0)));
    writeFileSync(shiftedPng, encodeRgbaPng(32, 32, makePatternRgba(32, 32, 120)));
    writeFileSync(blankPng, encodeRgbaPng(32, 32, makePatternRgba(32, 32, 0, true)));

    assert.equal(drawDeltaPct(209, 200), 4.5);
    assert.equal(drawDeltaPct(211, 200), 5.5);

    // 4.5% draw delta + identical image passes
    const ok = evaluateWebParity([
      { scenario: 'S1', engineId: 'exp-st', settledDrawCalls: 200, parityPngPath: basePng },
      { scenario: 'S1', engineId: 'exp-mt', settledDrawCalls: 209, parityPngPath: identicalPng },
      { scenario: 'S1', engineId: 'exp-webgl2', settledDrawCalls: 192, parityPngPath: identicalPng },
      { scenario: 'S1', engineId: 'mln-webgpu', settledDrawCalls: 280, parityPngPath: identicalPng },
    ]);
    assert.equal(ok.passed, true, ok.failures.join('\n'));

    // 5.5% draw delta fails hard
    const failDraws = evaluateWebParity([
      { scenario: 'S1', engineId: 'exp-st', settledDrawCalls: 200, parityPngPath: basePng },
      { scenario: 'S1', engineId: 'exp-mt', settledDrawCalls: 211, parityPngPath: identicalPng },
    ]);
    assert.equal(failDraws.passed, false);
    assert.match(failDraws.failures[0], /delta=5\.5%/);

    // SSIM mismatch fails hard
    const failSsim = evaluateWebParity([
      { scenario: 'S1', engineId: 'exp-st', settledDrawCalls: 200, parityPngPath: basePng },
      { scenario: 'S1', engineId: 'exp-mt', settledDrawCalls: 200, parityPngPath: shiftedPng },
    ]);
    assert.equal(failSsim.passed, false);
    assert.match(failSsim.failures.join('\n'), /ssim=/);

    // Blank canvas fails hard
    const failBlank = evaluateWebParity([
      { scenario: 'S1', engineId: 'exp-st', settledDrawCalls: 200, parityPngPath: blankPng },
    ]);
    assert.equal(failBlank.passed, false);
    assert.match(failBlank.failures.join('\n'), /blank frame/);

    // Runner error banner fails hard even with patterned PNG
    const failBanner = evaluateWebParity([
      {
        scenario: 'S1',
        engineId: 'exp-webgl2',
        settledDrawCalls: 200,
        parityPngPath: basePng,
        bannerError: 'exp-webgl2 crashed',
      },
    ]);
    assert.equal(failBanner.passed, false);
    assert.match(failBanner.failures.join('\n'), /runner error banner/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeSpaceGlobeRgba(width, height, bgRgb, invertForeground = false) {
  const buf = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const inGlobe = x >= width * 0.25 && x < width * 0.75 && y >= height * 0.25 && y < height * 0.75;
      if (!inGlobe) {
        buf[o] = bgRgb[0];
        buf[o + 1] = bgRgb[1];
        buf[o + 2] = bgRgb[2];
        buf[o + 3] = 255;
      } else if (invertForeground) {
        buf[o] = 255 - ((x * 9) & 255);
        buf[o + 1] = 255 - ((y * 13) & 255);
        buf[o + 2] = 60;
        buf[o + 3] = 255;
      } else {
        buf[o] = 40 + ((x * 9) & 191);
        buf[o + 1] = 60 + ((y * 13) & 191);
        buf[o + 2] = 180;
        buf[o + 3] = 255;
      }
    }
  }
  return buf;
}

test('dark-space cross-engine parity uses activeSsim when black background differs slightly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'parity-space-test-'));
  try {
    const mlnPng = join(dir, 'mln-s4.png');
    const expPng = join(dir, 'exp-s4.png');
    const brokenPng = join(dir, 'broken-s4.png');
    // 128x128: 75% outer border dark space (#090d16 vs #000000), 25% globe interior
    writeFileSync(mlnPng, encodeRgbaPng(128, 128, makeSpaceGlobeRgba(128, 128, [9, 13, 22], false)));
    writeFileSync(expPng, encodeRgbaPng(128, 128, makeSpaceGlobeRgba(128, 128, [0, 0, 0], false)));
    writeFileSync(brokenPng, encodeRgbaPng(128, 128, makeSpaceGlobeRgba(128, 128, [0, 0, 0], true)));

    const okCross = evaluateWebParity([
      { scenario: 'S4', engineId: 'mln-webgpu', settledDrawCalls: 80, parityPngPath: mlnPng },
      { scenario: 'S4', engineId: 'exp-st', settledDrawCalls: 64, parityPngPath: expPng },
    ]);
    assert.equal(okCross.passed, true, okCross.failures.join('\n'));
    const crossCheck = okCross.checks.find((c) => c.kind === 'exp-vs-mln');
    assert.ok(crossCheck.ssim < 0.65);
    assert.ok(crossCheck.activeSsim >= 0.65);

    const failBroken = evaluateWebParity([
      { scenario: 'S4', engineId: 'mln-webgpu', settledDrawCalls: 80, parityPngPath: mlnPng },
      { scenario: 'S4', engineId: 'exp-st', settledDrawCalls: 64, parityPngPath: brokenPng },
    ]);
    assert.equal(failBroken.passed, false);
    assert.match(failBroken.failures.join('\n'), /activeSsim=/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
