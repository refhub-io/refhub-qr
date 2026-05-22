'use strict';
const { handler } = require('../netlify/functions/generate-qr');

test('OPTIONS returns 200 with CORS headers', async () => {
  const res = await handler({ httpMethod: 'OPTIONS' });
  expect(res.statusCode).toBe(200);
  expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
});

test('missing url returns 400', async () => {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ freedom: 0.5 }),
    headers: { 'content-type': 'application/json' }
  });
  expect(res.statusCode).toBe(400);
  expect(JSON.parse(res.body).error).toMatch(/url/i);
});

test('valid url returns 200 SVG', async () => {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ url: 'https://example.com' }),
    headers: { 'content-type': 'application/json' }
  });
  expect(res.statusCode).toBe(200);
  expect(res.headers['Content-Type']).toBe('image/svg+xml');
  expect(res.body).toContain('<svg');
  expect(res.body).toContain('</svg>');
});

test('out-of-range freedom is clamped — no error', async () => {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ url: 'https://example.com', freedom: 99 }),
    headers: { 'content-type': 'application/json' }
  });
  expect(res.statusCode).toBe(200);
});

test('invalid base64 image returns 400', async () => {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ url: 'https://example.com', image: '!!!not-base64!!!' }),
    headers: { 'content-type': 'application/json' }
  });
  expect(res.statusCode).toBe(400);
  expect(JSON.parse(res.body).error).toMatch(/image/i);
});

test('custom size is respected in SVG output', async () => {
  const res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ url: 'https://example.com', size: 300 }),
    headers: { 'content-type': 'application/json' }
  });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('width="300"');
});
