'use strict';
const { renderMosaicSvg, isFinderPattern, isStructural } = require('../netlify/functions/lib/render-svg');

function makeMatrix(N, darkFn) {
  return Array.from({ length: N }, (_, row) =>
    Array.from({ length: N }, (_, col) => darkFn(row, col))
  );
}

function makeBuffer(N, r, g, b, a = 255) {
  const data = Buffer.alloc(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return { data, width: N, height: N };
}

test('isFinderPattern: top-left', () => {
  expect(isFinderPattern(0, 0, 21)).toBe(true);
  expect(isFinderPattern(6, 6, 21)).toBe(true);
  expect(isFinderPattern(7, 7, 21)).toBe(false);
});

test('isFinderPattern: top-right', () => {
  expect(isFinderPattern(0, 20, 21)).toBe(true);
  expect(isFinderPattern(6, 14, 21)).toBe(true);
  expect(isFinderPattern(7, 14, 21)).toBe(false);
});

test('isFinderPattern: bottom-left', () => {
  expect(isFinderPattern(20, 0, 21)).toBe(true);
  expect(isFinderPattern(14, 6, 21)).toBe(true);
  expect(isFinderPattern(14, 7, 21)).toBe(false);
});

test('renderMosaicSvg returns valid SVG', () => {
  const N = 21;
  const matrix = makeMatrix(N, () => true);
  const pixelBuf = makeBuffer(N, 168, 85, 247); // purple, opaque
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  expect(svg).toContain('<svg');
  expect(svg).toContain('</svg>');
  expect(svg).toContain('viewBox="0 0 210 210"');
  expect(svg).toContain('width="210"');
});

test('freedom=0: all dark non-structural modules rendered as circles', () => {
  const N = 21;
  // Only non-structural modules dark, all black (lum=0 → never skipped)
  const matrix = makeMatrix(N, (r, c) => !isStructural(r, c, N));
  const pixelBuf = makeBuffer(N, 0, 0, 0); // black
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const circleCount = (svg.match(/<circle/g) || []).length;
  expect(circleCount).toBeGreaterThan(0);
  // Count expected dark non-structural modules plus the three dot-style finder patterns.
  let expected = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (!isStructural(r, c, N)) expected++;
  expect(circleCount).toBe(expected + 3 * 33);
});

test('freedom=1: white image skips up to 25% of dark modules', () => {
  const N = 21;
  const matrix = makeMatrix(N, (r, c) => !isStructural(r, c, N));
  const pixelBuf = makeBuffer(N, 255, 255, 255); // all white → all bright
  const svgFull = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const svgFree = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 1 });
  const countFull = (svgFull.match(/<circle/g) || []).length;
  const countFree = (svgFree.match(/<circle/g) || []).length;
  expect(countFree).toBeLessThan(countFull);
  expect(countFree).toBeGreaterThanOrEqual(Math.floor(countFull * 0.75));
});

test('freedom=1: dark image modules are NOT skipped', () => {
  const N = 21;
  const matrix = makeMatrix(N, (r, c) => !isStructural(r, c, N));
  const pixelBuf = makeBuffer(N, 0, 0, 0); // all black → lum=0, should never skip
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 1 });
  const circleCount = (svg.match(/<circle/g) || []).length;
  let expected = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (!isStructural(r, c, N)) expected++;
  expect(circleCount).toBe(expected + 3 * 33); // zero data modules skipped; finders stay visible
});

test('finder patterns are rendered as dot modules', () => {
  const N = 21;
  const matrix = makeMatrix(N, () => false);
  const pixelBuf = makeBuffer(N, 168, 85, 247);
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const circleCount = (svg.match(/<circle/g) || []).length;
  const rectCount = (svg.match(/<rect/g) || []).length;

  expect(circleCount).toBe(3 * 33); // 24 outer-ring dots + 9 center dots per finder
  expect(rectCount).toBe(1); // background only; no rectangular finder eyes
});

test('finder and body dots use one radius for the same matrix scale', () => {
  const N = 21;
  const matrix = makeMatrix(N, () => true);
  const pixelBuf = makeBuffer(N, 168, 85, 247);
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });

  const radii = [...svg.matchAll(/<circle[^>]+ r="([0-9.]+)"/g)].map(match => match[1]);
  expect(radii.length).toBeGreaterThan(3 * 33);
  expect(new Set(radii)).toEqual(new Set(['3.26']));
});

test('dot radius scales uniformly with larger QR matrices', () => {
  const smallN = 21;
  const largeN = 37;
  const pixelBufSmall = makeBuffer(smallN, 168, 85, 247);
  const pixelBufLarge = makeBuffer(largeN, 168, 85, 247);

  const smallSvg = renderMosaicSvg({
    matrix: makeMatrix(smallN, () => true),
    pixelBuf: pixelBufSmall,
    outputSize: 210,
    freedom: 0,
  });
  const largeSvg = renderMosaicSvg({
    matrix: makeMatrix(largeN, () => true),
    pixelBuf: pixelBufLarge,
    outputSize: 210,
    freedom: 0,
  });

  const uniqueRadii = svg => new Set([...svg.matchAll(/<circle[^>]+ r="([0-9.]+)"/g)].map(match => match[1]));

  expect(uniqueRadii(smallSvg)).toEqual(new Set(['3.26']));
  expect(uniqueRadii(largeSvg)).toEqual(new Set(['2.10']));
});

test('structural dark modules (timing, format info) are rendered as circles', () => {
  const N = 21;
  // All modules dark, including structural
  const matrix = makeMatrix(N, () => true);
  const pixelBuf = makeBuffer(N, 0, 0, 0);
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });

  // Count circles from timing strip at row 6 (cols 8..N-9) and col 6 (rows 8..N-9)
  // Verify more circles exist than if structural were excluded
  const circleCount = (svg.match(/<circle/g) || []).length;

  let nonStructuralDark = 0;
  let timingFormatDark = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinderPattern(r, c, N)) continue;
      if (isStructural(r, c, N)) timingFormatDark++;
      else nonStructuralDark++;
    }
  }
  // All dark → circles = non-structural + timing/format info + dot-style finders.
  expect(circleCount).toBe(nonStructuralDark + timingFormatDark + 3 * 33);
  expect(timingFormatDark).toBeGreaterThan(0);
});

test('timing/format info dark modules are never skipped by freedom budget', () => {
  const N = 21;
  const matrix = makeMatrix(N, () => true);
  // White pixels → max luminance → freedom=1 would skip data modules
  const pixelBuf = makeBuffer(N, 255, 255, 255);
  const svgFreedom0 = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const svgFreedom1 = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 1 });

  // Count timing+format info circles (should be identical in both renders)
  // We can't easily isolate them, but total with freedom=1 must still include all structural
  let timingFormatCount = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (isStructural(r, c, N) && !isFinderPattern(r, c, N)) timingFormatCount++;

  const count0 = (svgFreedom0.match(/<circle/g) || []).length;
  const count1 = (svgFreedom1.match(/<circle/g) || []).length;
  // freedom=1 skips up to 25% of data modules, but structural are untouched
  expect(count0).toBeGreaterThan(count1); // some data modules skipped
  expect(count1).toBeGreaterThanOrEqual(timingFormatCount); // structural always present
});
