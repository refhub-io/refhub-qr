'use strict';
const { generateMatrix } = require('../netlify/functions/lib/qr-matrix');

test('returns a 2D boolean array', () => {
  const matrix = generateMatrix('https://example.com');
  expect(Array.isArray(matrix)).toBe(true);
  expect(Array.isArray(matrix[0])).toBe(true);
  expect(typeof matrix[0][0]).toBe('boolean');
});

test('matrix is square', () => {
  const matrix = generateMatrix('https://example.com');
  const N = matrix.length;
  expect(N).toBeGreaterThan(0);
  matrix.forEach(row => expect(row.length).toBe(N));
});

test('top-left finder outer ring is all dark', () => {
  const matrix = generateMatrix('https://example.com');
  for (let i = 0; i <= 6; i++) {
    expect(matrix[0][i]).toBe(true);
    expect(matrix[i][0]).toBe(true);
    expect(matrix[6][i]).toBe(true);
    expect(matrix[i][6]).toBe(true);
  }
});

test('throws on empty string', () => {
  expect(() => generateMatrix('')).toThrow();
});

test('throws on non-string input', () => {
  expect(() => generateMatrix(null)).toThrow(TypeError);
  expect(() => generateMatrix(undefined)).toThrow(TypeError);
});
