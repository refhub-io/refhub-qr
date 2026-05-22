# Mosaic QR — Design Spec

**Date:** 2026-05-22
**Status:** Approved

## Overview

A Netlify serverless function that accepts a destination URL and optionally a custom image, then returns an SVG QR code where each module is rendered as a colored circle sampled from the source image. Bright image areas become negative space (skipped modules), creating a visible logo silhouette within the QR pattern while staying within the H-level error correction budget.

## API

```
POST /api/generate-qr
Content-Type: application/json
```

**Request body:**

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `url` | string | yes | — | URL encoded into the QR code |
| `image` | string | no | — | Base64-encoded PNG/JPG/SVG; accepts raw base64 or `data:image/...;base64,...` prefix; overrides bundled logo |
| `freedom` | number | no | `0.5` | 0–1; controls negative space aggressiveness; clamped silently |
| `size` | number | no | `512` | Output SVG pixel dimensions; clamped to [256, 2048] |

**Responses:**

- `200 image/svg+xml` — SVG string
- `400 application/json` — `{ "error": "..." }` for missing `url` or unparseable `image`

**Headers:**
```
Content-Type: image/svg+xml
Cache-Control: no-store
Access-Control-Allow-Origin: *
```

An `OPTIONS` preflight handler is included for CORS.

## Project Structure

```
mosaic-qr/
├── netlify/
│   └── functions/
│       └── generate-qr.js     # single function, all logic
├── assets/
│   └── logo.svg               # refhub.io logo, bundled default image
├── netlify.toml               # node_bundler = "esbuild"
├── package.json
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-22-mosaic-qr-design.md
```

## Dependencies

| Package | Purpose |
|---|---|
| `qrcode` | Pure-JS QR matrix generation |
| `@resvg/resvg-js` | WASM SVG rasterizer (no native deps) — used for default logo.svg |
| `jimp` | Pure-JS PNG/JPG decoder — used for base64 custom images |

No native binaries. Deploys to Netlify with `node_bundler = "esbuild"` and no extra configuration.

## Algorithm

### 1. Resolve pixel buffer

- If `image` param present: decode base64 → `jimp` → RGBA pixel buffer
- Otherwise: read `assets/logo.svg` → `resvg` rasterize → RGBA pixel buffer
- Resize buffer to N×N (QR grid size) so color lookup is a direct index

### 2. Generate QR matrix

- Use `qrcode` library, error correction level **H** (30% data recovery)
- Version auto-selected based on URL length
- Result: N×N boolean matrix (`true` = dark module)

### 3. Render SVG — color mosaic with negative space

For every module at `(row, col)`:

```
color     = samplePixel(buffer, col, row)   // direct index after resize
luminance = 0.299·R + 0.587·G + 0.114·B    // 0–255
threshold = (1 - freedom) * 255
```

**Decision:**

| Condition | Action |
|---|---|
| Light module (`false`) | Skip — white background shows through |
| Dark module + luminance ≥ threshold + budget remaining | Skip (negative space) — increment skip counter |
| Dark module + budget exhausted | Render circle with `color` |
| Dark module + luminance < threshold | Render circle with `color` |

**Budget cap:** Maximum skipped modules = `floor(totalDarkModules * 0.25)`. This keeps total missing data ≤ 25% regardless of `freedom` value, staying safely within the H-level 30% recovery limit.

**Circle rendering:**
```
moduleSize = size / N
cx = col * moduleSize + moduleSize / 2
cy = row * moduleSize + moduleSize / 2
r  = moduleSize * 0.45
→ <circle cx cy r fill="rgb(R,G,B)" />
```

### 4. Finder pattern rendering

The three corner finder patterns (top-left, top-right, bottom-left) and timing strips are **always** rendered as solid squares regardless of `freedom` or image brightness. They use the sampled color at that position for visual consistency but are never treated as negative space.

```
→ <rect .../> outer ring
→ <rect .../> filled inner square
```

### 5. SVG assembly

```xml
<svg xmlns="..." viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <rect width="100%" height="100%" fill="white"/>
  <!-- finder pattern rects -->
  <!-- data module circles -->
</svg>
```

## freedom Parameter Behaviour

| `freedom` | Threshold luminance | Approx. negative space | EC budget used |
|---|---|---|---|
| 0.0 | 255 (nothing skipped) | 0% | 0% |
| 0.5 | 128 | ~15% | ~15% |
| 0.8 | 51 | ~25% (cap hits) | ~25% |
| 1.0 | 0 (cap limits) | 25% (cap hits) | ~25% |

## Phase 2 — Halftone Logo Embed (future)

The halftone style (Image 2 in original brief) renders variable-size square modules where dot size scales inversely with image brightness. This is a separate rendering path, enabled via a `style: "halftone"` parameter. Not in scope for the initial build.

## Error Handling

| Scenario | Response |
|---|---|
| Missing `url` | 400 `{ "error": "url is required" }` |
| Unparseable `image` | 400 `{ "error": "image must be valid base64 PNG, JPG, or SVG" }` |
| `url` too long for any QR version | 400 `{ "error": "url too long to encode" }` |
| `freedom` out of [0,1] | Clamped silently, no error |
| `size` out of [256,2048] | Clamped silently, no error |
