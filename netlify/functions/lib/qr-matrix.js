'use strict';
const QRCode = require('qrcode');

function generateMatrix(url) {
  if (typeof url !== 'string' || url.length === 0) throw new TypeError('url must be a non-empty string');
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const N = qr.modules.size;
  const matrix = [];
  for (let row = 0; row < N; row++) {
    const rowArr = [];
    for (let col = 0; col < N; col++) {
      rowArr.push(!!qr.modules.get(row, col));
    }
    matrix.push(rowArr);
  }
  return matrix;
}

module.exports = { generateMatrix };
