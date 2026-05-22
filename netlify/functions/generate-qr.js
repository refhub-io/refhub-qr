'use strict';
const { generateMatrix } = require('./lib/qr-matrix');
const { rasterizeSvg, decodeBase64Image } = require('./lib/image-buffer');
const { renderMosaicSvg } = require('./lib/render-svg');
const { DEFAULT_LOGO_SVG } = require('./lib/default-logo');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function err400(message) {
  return {
    statusCode: 400,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS, 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (event.body && event.body.length > 1_500_000) {
    return err400('Request body too large');
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err400('Request body must be valid JSON'); }

  const { url, image, freedom: rawFreedom, size: rawSize } = body;

  if (!url || typeof url !== 'string') return err400('url is required');

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return err400('url must use http or https protocol');
    }
  } catch {
    return err400('url must be a valid URL');
  }

  if (image !== undefined && typeof image !== 'string') {
    return err400('image must be a base64 string');
  }

  const freedom = clamp(typeof rawFreedom === 'number' ? rawFreedom : 0.5, 0, 1);
  const outputSize = clamp(typeof rawSize === 'number' ? rawSize : 512, 256, 2048);

  let matrix;
  try { matrix = generateMatrix(url); }
  catch { return err400('url is too long to encode as a QR code'); }

  const N = matrix.length;

  let pixelBuf;
  try {
    pixelBuf = image
      ? await decodeBase64Image(image, N)
      : await rasterizeSvg(DEFAULT_LOGO_SVG, N);
  } catch {
    return err400('image must be valid base64 PNG or JPG');
  }

  let svg;
  try {
    svg = renderMosaicSvg({ matrix, pixelBuf, outputSize, freedom });
  } catch {
    return { statusCode: 500, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Render failed' }) };
  }

  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
    body: svg
  };
};
