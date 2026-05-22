'use strict';
const { samplePixel } = require('./image-buffer');

const QUIET = 4;        // quiet zone modules on each side (QR spec minimum)
const LIGHT_MIN = 180;  // minimum luminance for rendered elements to stay visible on dark bg

function isFinderPattern(row, col, N) {
  return (row < 7 && col < 7) ||
         (row < 7 && col >= N - 7) ||
         (row >= N - 7 && col < 7);
}

// Protects all non-data structural modules from being used as negative space.
// Skipping timing or format info destroys QR decodability regardless of EC budget.
function isStructural(row, col, N) {
  if (isFinderPattern(row, col, N)) return true;
  // Timing strips (alternating row/col between finders)
  if (row === 6 || col === 6) return true;
  // Format information strips adjacent to each finder
  if (row === 8 && (col <= 8 || col >= N - 8)) return true;
  if (col === 8 && (row <= 8 || row >= N - 8)) return true;
  return false;
}

function luminance({ r, g, b }) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Scale color up so luminance ≥ LIGHT_MIN, preserving hue, for visibility on dark backgrounds.
function ensureLight({ r, g, b }) {
  const lum = luminance({ r, g, b });
  if (lum >= LIGHT_MIN) return { r, g, b };
  const scale = LIGHT_MIN / Math.max(lum, 1);
  return {
    r: Math.min(255, Math.round(r * scale)),
    g: Math.min(255, Math.round(g * scale)),
    b: Math.min(255, Math.round(b * scale)),
  };
}

function renderFinderPattern(r0, c0, ms, offset, dotRadius, color) {
  const fill = `rgb(${color.r},${color.g},${color.b})`;
  const x = v => v.toFixed(1);
  const parts = [];

  for (let dr = 0; dr < 7; dr++) {
    for (let dc = 0; dc < 7; dc++) {
      const isOuterRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      if (!isOuterRing && !isCenter) continue;

      const cx = x(offset + (c0 + dc) * ms + ms / 2);
      const cy = x(offset + (r0 + dr) * ms + ms / 2);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="${fill}"/>`);
    }
  }

  return parts.join('');
}

function renderMosaicSvg({ matrix, pixelBuf, outputSize, freedom }) {
  const N = matrix.length;
  const size = Math.round(Math.max(1, Number(outputSize)));
  // Fit the QR grid inside outputSize with QUIET-module border on each side
  const ms = size / (N + QUIET * 2);
  const offset = QUIET * ms;
  const dotRadius = (ms * 0.45).toFixed(2);
  const f = Math.max(0, Math.min(1, freedom));
  // threshold > 255 when f=0 so nothing is ever skipped at freedom=0
  const threshold = f === 0 ? 256 : (1 - f) * 255;

  let totalDark = 0;
  for (let row = 0; row < N; row++)
    for (let col = 0; col < N; col++)
      if (matrix[row][col] && !isStructural(row, col, N)) totalDark++;

  const skipBudget = Math.floor(totalDark * 0.25);
  let skipped = 0;
  const parts = [];

  // Finder patterns at TL, TR, BL — always visible regardless of image brightness
  const finders = [[0, 0], [0, N - 7], [N - 7, 0]];
  for (const [r0, c0] of finders) {
    const centerCol = c0 === 0 ? 3 : N - 4;
    const centerRow = r0 === 0 ? 3 : N - 4;
    const color = ensureLight(samplePixel(pixelBuf, centerCol, centerRow));
    parts.push(renderFinderPattern(r0, c0, ms, offset, dotRadius, color));
  }

  // Data modules
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (!matrix[row][col] || isFinderPattern(row, col, N)) continue;
      const rawColor = samplePixel(pixelBuf, col, row);
      // Structural modules (timing, format info) are never subject to the skip budget
      if (!isStructural(row, col, N) && luminance(rawColor) > threshold && skipped < skipBudget) {
        skipped++;
        continue;
      }
      const color = ensureLight(rawColor);
      const cx = (offset + col * ms + ms / 2).toFixed(1);
      const cy = (offset + row * ms + ms / 2).toFixed(1);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="rgb(${color.r},${color.g},${color.b})"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${parts.join('')}</svg>`;
}

module.exports = { renderMosaicSvg, isFinderPattern, isStructural };
