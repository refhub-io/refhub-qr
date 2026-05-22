'use strict';
const { DEFAULT_LOGO_SVG } = require('../netlify/functions/lib/default-logo');

test('DEFAULT_LOGO_SVG is a non-empty string', () => {
  expect(typeof DEFAULT_LOGO_SVG).toBe('string');
  expect(DEFAULT_LOGO_SVG.length).toBeGreaterThan(0);
});

test('DEFAULT_LOGO_SVG is valid SVG', () => {
  expect(DEFAULT_LOGO_SVG.trimStart()).toMatch(/^<svg/);
  expect(DEFAULT_LOGO_SVG).toContain('</svg>');
});
