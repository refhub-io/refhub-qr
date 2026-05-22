'use strict';
const { renderMosaicSvg, isFinderPattern } = require('../netlify/functions/lib/render-svg');

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

test('freedom=0: all dark non-finder modules rendered as circles', () => {
  const N = 21;
  // Only non-finder modules dark, all black (lum=0 → never skipped)
  const matrix = makeMatrix(N, (r, c) => !isFinderPattern(r, c, N));
  const pixelBuf = makeBuffer(N, 0, 0, 0); // black
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const circleCount = (svg.match(/<circle/g) || []).length;
  expect(circleCount).toBeGreaterThan(0);
  // Count expected dark non-finder modules
  let expected = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (!isFinderPattern(r, c, N)) expected++;
  expect(circleCount).toBe(expected);
});

test('freedom=1: white image skips up to 25% of dark modules', () => {
  const N = 21;
  const matrix = makeMatrix(N, (r, c) => !isFinderPattern(r, c, N));
  const pixelBuf = makeBuffer(N, 255, 255, 255); // all white → all bright
  const svgFull = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  const svgFree = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 1 });
  const countFull = (svgFull.match(/<circle/g) || []).length;
  const countFree = (svgFree.match(/<circle/g) || []).length;
  expect(countFree).toBeLessThan(countFull);
  expect(countFree).toBeGreaterThanOrEqual(Math.floor(countFull * 0.75));
});

test('finder patterns rendered as rects not circles', () => {
  const N = 21;
  const matrix = makeMatrix(N, () => true);
  const pixelBuf = makeBuffer(N, 168, 85, 247);
  const svg = renderMosaicSvg({ matrix, pixelBuf, outputSize: 210, freedom: 0 });
  expect(svg).toContain('<rect');
});
