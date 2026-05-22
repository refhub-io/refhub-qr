'use strict';
const { rasterizeSvg, decodeBase64Image, samplePixel } = require('../netlify/functions/lib/image-buffer');

const RED_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>';

test('rasterizeSvg returns buffer at requested grid size', async () => {
  const buf = await rasterizeSvg(RED_SVG, 4);
  expect(buf.width).toBe(4);
  expect(buf.height).toBe(4);
  expect(buf.data.length).toBe(4 * 4 * 4); // N*N*RGBA
});

test('rasterizeSvg: red SVG gives high red channel', async () => {
  const buf = await rasterizeSvg(RED_SVG, 4);
  const px = samplePixel(buf, 2, 2);
  expect(px.r).toBeGreaterThan(200);
  expect(px.g).toBeLessThan(50);
  expect(px.b).toBeLessThan(50);
});

test('decodeBase64Image returns buffer at requested grid size', async () => {
  const Jimp = require('jimp');
  const img = new Jimp(8, 8, 0x0000ffff); // blue, fully opaque
  const base64 = await img.getBase64Async(Jimp.MIME_PNG);
  const buf = await decodeBase64Image(base64, 4);
  expect(buf.width).toBe(4);
  expect(buf.height).toBe(4);
  expect(buf.data.length).toBe(4 * 4 * 4);
});

test('decodeBase64Image accepts raw base64 without data: prefix', async () => {
  const Jimp = require('jimp');
  const img = new Jimp(4, 4, 0xff0000ff);
  const dataUrl = await img.getBase64Async(Jimp.MIME_PNG);
  const raw = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const buf = await decodeBase64Image(raw, 4);
  expect(buf.width).toBe(4);
});

test('samplePixel composites transparent pixels over white', async () => {
  const { DEFAULT_LOGO_SVG } = require('../netlify/functions/lib/default-logo');
  const buf = await rasterizeSvg(DEFAULT_LOGO_SVG, 10);
  // Top-left corner is outside the circular clip — should composite to near-white
  const px = samplePixel(buf, 0, 0);
  expect(px.r).toBeGreaterThan(200);
  expect(px.g).toBeGreaterThan(200);
  expect(px.b).toBeGreaterThan(200);
});
