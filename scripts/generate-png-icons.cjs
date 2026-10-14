const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG specification helper: writes IHDR, IDAT, IEND chunks
function createPNG(width, height, getPixelRGBA) {
  // RGBA buffer: (width * 4 + 1) * height bytes (1 filter byte 0x00 per scanline)
  const rowSize = width * 4 + 1;
  const rawBuffer = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawBuffer[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawBuffer[pixelOffset] = r;
      rawBuffer[pixelOffset + 1] = g;
      rawBuffer[pixelOffset + 2] = b;
      rawBuffer[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawBuffer, { level: 9 });

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw a stylized MKKS Citos emblem
function drawIcon(width, height, isMaskable = false) {
  return createPNG(width, height, (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Background gradient (Teal-700 #0f766e to Indigo-950 #1e1b4b)
    const t = (nx + ny) * 0.5;
    let r = Math.round(15 + (30 - 15) * t);
    let g = Math.round(118 + (27 - 118) * t);
    let b = Math.round(110 + (75 - 110) * t);
    let a = 255;

    // Outer border rounded rect for non-maskable
    if (!isMaskable) {
      const cornerR = 0.22;
      const cornerDx = Math.max(0, Math.abs(dx) - (0.5 - cornerR));
      const cornerDy = Math.max(0, Math.abs(dy) - (0.5 - cornerR));
      const cornerDist = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
      if (cornerDist > cornerR) {
        return [0, 0, 0, 0];
      }
    }

    // Concentric gold ring in safe zone
    const ringRadius = isMaskable ? 0.36 : 0.39;
    const ringWidth = isMaskable ? 0.015 : 0.018;
    if (Math.abs(dist - ringRadius) < ringWidth) {
      // Gold #facc15
      return [250, 204, 21, 255];
    }

    // Center Shield Shape
    // Centered around (0.5, 0.46)
    const sx = Math.abs(nx - 0.5) / 0.24;
    const sy = (ny - 0.22) / 0.44;

    if (sy >= 0 && sy <= 1 && sx <= 1) {
      let inShield = false;
      if (sy < 0.4) {
        inShield = true;
      } else {
        // Curve to point at bottom
        const curveLimit = 1 - Math.pow((sy - 0.4) / 0.6, 2);
        if (sx <= curveLimit) {
          inShield = true;
        }
      }

      if (inShield) {
        // Shield border
        const isBorder = (sy > 0.95 || Math.abs(sx - 1) < 0.08 || sy < 0.05);
        if (isBorder) {
          return [255, 255, 255, 255]; // White border
        }

        // Inside shield: Emerald Teal #0d9488
        r = 13;
        g = 148;
        b = 136;

        // Pillars & Pediment inside shield
        // Pediment triangle top: ny between 0.26 and 0.32
        if (ny >= 0.26 && ny <= 0.32) {
          const pedX = Math.abs(nx - 0.5) / 0.16;
          const pedY = (ny - 0.26) / 0.06;
          if (pedX <= pedY) {
            // Gold Roof
            return [250, 204, 21, 255];
          }
        }
        // Architrave line
        if (ny >= 0.325 && ny <= 0.345 && Math.abs(nx - 0.5) <= 0.16) {
          return [255, 255, 255, 255];
        }
        // 4 Columns
        if (ny >= 0.345 && ny <= 0.44) {
          const colRel = Math.abs(nx - 0.5);
          // Columns at 0.03 and 0.10 distance from center
          if (Math.abs(colRel - 0.04) < 0.015 || Math.abs(colRel - 0.12) < 0.015) {
            return [255, 255, 255, 255];
          }
        }
        // Base line
        if (ny >= 0.44 && ny <= 0.46 && Math.abs(nx - 0.5) <= 0.18) {
          return [255, 255, 255, 255];
        }

        // Gold coin emblem at bottom of shield (ny: 0.52 to 0.62)
        const coinDx = nx - 0.5;
        const coinDy = ny - 0.54;
        const coinDist = Math.sqrt(coinDx * coinDx + coinDy * coinDy);
        if (coinDist < 0.065) {
          if (coinDist > 0.055) {
            return [255, 255, 255, 255]; // Coin ring
          }
          return [250, 204, 21, 255]; // Gold coin
        }
      }
    }

    // Bottom letters bar (visual badge accent for text area)
    if (ny >= 0.74 && ny <= 0.84 && Math.abs(nx - 0.5) <= 0.36) {
      // Subtle glow
      r = Math.min(255, r + 25);
      g = Math.min(255, g + 40);
      b = Math.min(255, b + 40);
    }

    return [r, g, b, a];
  });
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons in /public...');

// 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), drawIcon(192, 192, false));
console.log('pwa-192x192.png created');

// 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), drawIcon(512, 512, false));
console.log('pwa-512x512.png created');

// 512x512 Maskable (Safe zone with background extending all the way)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), drawIcon(512, 512, true));
console.log('pwa-maskable-512x512.png created');

// Apple Touch Icon (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), drawIcon(180, 180, false));
console.log('apple-touch-icon.png created');

// Favicon (copy 192 as favicon.ico for convenience)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), drawIcon(48, 48, false));
console.log('favicon.ico created');

console.log('All icons generated successfully!');
