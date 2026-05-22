# refhub-qr

> // generate_qr • embed_logo • color_mosaic

netlify serverless function that turns a url into a branded SVG QR code. each dark module is a colored circle sampled from the refhub.io logo — or any custom image you pass. uses H-level error correction so up to 25% of data modules can be skipped as negative space without breaking scannability.

[![netlify](https://img.shields.io/badge/netlify-functions-00C7B7)](https://docs.netlify.com/functions/overview/)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org/)

---

## // api

```
POST /api/generate-qr
Content-Type: application/json
```

| field | type | required | default | notes |
|---|---|---|---|---|
| `url` | string | yes | — | must be `http` or `https` |
| `image` | string | no | — | base64-encoded PNG or JPG; overrides bundled logo |
| `freedom` | number | no | `0` | 0–1; fraction of bright-area modules to skip as negative space; clamped silently |
| `size` | number | no | `512` | output SVG pixel dimensions; clamped to [256, 2048] |

**success:** `200 image/svg+xml`

**error:** `400 application/json` → `{ "error": "..." }`

```sh
# basic
curl -X POST https://your-site.netlify.app/api/generate-qr \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://refhub.io"}' \
  -o qr.svg

# with custom image
B64=$(base64 -w 0 logo.png)
curl -X POST https://your-site.netlify.app/api/generate-qr \
  -H 'Content-Type: application/json' \
  -d "{\"url\": \"https://refhub.io\", \"image\": \"$B64\", \"freedom\": 0.3}" \
  -o qr.svg
```

### freedom

controls how aggressively bright image pixels become negative space (absent modules). timing strips and format info are always protected regardless of this value.

| value | effect |
|---|---|
| `0` | no negative space — every data module rendered (default, most reliable) |
| `0.3` | ~10% of data modules skipped |
| `0.7` | ~25% skipped (budget cap approached) |
| `1.0` | 25% skipped (hard cap — stays within H-level 30% recovery budget) |

---

## // stack

```
runtime:      node.js 18+
deploy:       netlify functions (esbuild bundler)
qr:           qrcode — pure-js matrix generation
rasterize:    @resvg/resvg-js — WASM SVG renderer (default logo)
decode:       jimp 0.22 — pure-js PNG/JPG decoder (custom images)
tests:        jest 29
```

---

## // setup

**prerequisites:** node 18+ · netlify cli

```sh
git clone https://github.com/refhub-io/refhub-qr.git
cd refhub-qr
npm install
npm install -g netlify-cli
```

start dev server:

```sh
netlify dev
# → http://localhost:8888/api/generate-qr
```

run tests:

```sh
npm test
# 28 tests — matrix generation, image decoding, SVG rendering, HTTP handler
```

---

## // deploy

**netlify ui:** push to github → import project at [app.netlify.com](https://app.netlify.com) → build settings auto-detected from `netlify.toml`.

**netlify cli:**

```sh
netlify login
netlify init
netlify deploy --prod
```

no build step. the function is plain commonjs and runs directly.

---

## // env

no required environment variables. the function runs entirely from bundled dependencies.

```sh
# .env — optional, not committed
# ALLOWED_ORIGIN=https://refhub.io   # tighten CORS (default: *)
```

---

## // structure

```
refhub-qr/
├── netlify/
│   └── functions/
│       ├── generate-qr.js       # HTTP handler — validation, routing, orchestration
│       └── lib/
│           ├── default-logo.js  # bundled refhub.io logo SVG (inlined)
│           ├── image-buffer.js  # SVG rasterization (resvg) + raster decode (jimp)
│           ├── qr-matrix.js     # QR boolean matrix generation
│           └── render-svg.js    # mosaic SVG renderer + structural module guard
├── tests/
├── netlify.toml
└── package.json
```
