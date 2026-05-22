'use strict';
const { samplePixel } = require('./image-buffer');

function isFinderPattern(row, col, N) {
  return (row < 7 && col < 7) ||
         (row < 7 && col >= N - 7) ||
         (row >= N - 7 && col < 7);
}

function luminance({ r, g, b }) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function renderFinderPattern(r0, c0, ms, color) {
  const fill = `rgb(${color.r},${color.g},${color.b})`;
  const x = v => v.toFixed(1);
  return (
    `<rect x="${x(c0*ms)}" y="${x(r0*ms)}" width="${x(7*ms)}" height="${x(7*ms)}" rx="${x(ms*0.5)}" fill="${fill}"/>` +
    `<rect x="${x(c0*ms+ms)}" y="${x(r0*ms+ms)}" width="${x(5*ms)}" height="${x(5*ms)}" rx="${x(ms*0.3)}" fill="white"/>` +
    `<rect x="${x(c0*ms+2*ms)}" y="${x(r0*ms+2*ms)}" width="${x(3*ms)}" height="${x(3*ms)}" rx="${x(ms*0.2)}" fill="${fill}"/>`
  );
}

function renderMosaicSvg({ matrix, pixelBuf, outputSize, freedom }) {
  const N = matrix.length;
  const size = Math.round(Math.max(1, Number(outputSize)));
  const ms = size / N;
  const r_dot = (ms * 0.45).toFixed(2);
  const f = Math.max(0, Math.min(1, freedom));
  // threshold > 255 when f=0 so nothing is ever skipped at freedom=0
  const threshold = f === 0 ? 256 : (1 - f) * 255;

  let totalDark = 0;
  for (let row = 0; row < N; row++)
    for (let col = 0; col < N; col++)
      if (matrix[row][col] && !isFinderPattern(row, col, N)) totalDark++;

  const skipBudget = Math.floor(totalDark * 0.25);
  let skipped = 0;
  const parts = [];

  parts.push(`<rect width="${size}" height="${size}" fill="white"/>`);

  // Finder patterns at TL, TR, BL
  const finders = [[0, 0], [0, N - 7], [N - 7, 0]];
  for (const [r0, c0] of finders) {
    const centerCol = c0 === 0 ? 3 : N - 4;
    const centerRow = r0 === 0 ? 3 : N - 4;
    const color = samplePixel(pixelBuf, centerCol, centerRow);
    parts.push(renderFinderPattern(r0, c0, ms, color));
  }

  // Data modules
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (!matrix[row][col] || isFinderPattern(row, col, N)) continue;
      const color = samplePixel(pixelBuf, col, row);
      if (luminance(color) > threshold && skipped < skipBudget) {
        skipped++;
        continue;
      }
      const cx = (col * ms + ms / 2).toFixed(1);
      const cy = (row * ms + ms / 2).toFixed(1);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r_dot}" fill="rgb(${color.r},${color.g},${color.b})"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${parts.join('')}</svg>`;
}

module.exports = { renderMosaicSvg, isFinderPattern };
