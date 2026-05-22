'use strict';
const { Resvg } = require('@resvg/resvg-js');
const Jimp = require('jimp');

async function rasterizeSvg(svgString, N) {
  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: N } });
  const pngBuf = resvg.render().asPng();
  const img = await Jimp.read(pngBuf);
  img.resize(N, N, Jimp.RESIZE_BILINEAR);
  return { data: img.bitmap.data, width: img.bitmap.width, height: img.bitmap.height };
}

async function decodeBase64Image(base64, N) {
  const raw = base64.replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  const img = await Jimp.read(buf);
  img.resize(N, N, Jimp.RESIZE_BILINEAR);
  return { data: img.bitmap.data, width: img.bitmap.width, height: img.bitmap.height };
}

function samplePixel(pixelBuf, col, row, N) {
  const idx = (row * N + col) * 4;
  const a = pixelBuf.data[idx + 3] / 255;
  return {
    r: Math.round(pixelBuf.data[idx]     * a + 255 * (1 - a)),
    g: Math.round(pixelBuf.data[idx + 1] * a + 255 * (1 - a)),
    b: Math.round(pixelBuf.data[idx + 2] * a + 255 * (1 - a))
  };
}

module.exports = { rasterizeSvg, decodeBase64Image, samplePixel };
