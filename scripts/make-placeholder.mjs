/**
 * Pure Node.js script to generate a high-res (5184x285) placeholder blank-tag PNG
 * without any external canvas or native graphics libraries.
 * It encodes a valid PNG with zlib deflate.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // No interlace
  const ihdr = writeChunk("IHDR", ihdrData);

  // Raw image data with 0 filter byte per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });
  const idat = writeChunk("IDAT", compressed);
  const iend = writeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate the 5184 x 285 banner
const width = 5184;
const height = 285;

console.log(`Generating ${width}x${height} placeholder blank tag...`);

const pngBuffer = createPng(width, height, (x, y, w, h) => {
  // Base banner background: sleek dark charcoal/black with subtle vertical gradient and top border
  // Dark background #0e1013 -> #14171a
  const t = y / h;
  let r = Math.round(14 + t * 6);
  let g = Math.round(16 + t * 7);
  let b = Math.round(19 + t * 8);
  let a = 240; // High opacity dark banner

  // Top accent line (thin 4px bar: club green #00b140 fade)
  if (y < 4) {
    return [0, 177, 64, 255];
  } else if (y === 4 || y === 5) {
    return [30, 60, 40, 200];
  }

  // Left club logo placeholder: circle emblem around x: 140, y: 142, radius 70
  const cx = 140;
  const cy = 142;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist < 68 && dist > 62) {
    return [0, 177, 64, 255]; // Green circle
  }
  if (dist <= 62 && dist > 58) {
    return [255, 255, 255, 200];
  }
  // Camera aperture petals icon inside emblem
  if (dist <= 48 && dist >= 16) {
    const angle = Math.atan2(y - cy, x - cx);
    if (Math.abs(Math.sin(angle * 3)) < 0.15) {
      return [0, 214, 90, 255];
    }
    return [35, 42, 48, 240];
  }
  if (dist < 14) {
    return [0, 177, 64, 255];
  }

  // Vertical separator lines
  // Separator 1 (after club emblem & club name zone, at x = 1450)
  if (x >= 1450 && x <= 1452 && y > 35 && y < h - 35) {
    return [60, 65, 72, 180];
  }

  // Separator 2 (between event zone and right details zone, at x = 3730)
  if (x >= 3730 && x <= 3732 && y > 35 && y < h - 35) {
    return [60, 65, 72, 180];
  }

  // Dotted/light guide boxes for visual clarity in placeholder mode:
  // QR slot outline at x: 4890 to 5100, y: 35 to 245
  if (x >= 4890 && x <= 5100 && y >= 37 && y <= 247) {
    const border = x === 4890 || x === 5100 || y === 37 || y === 247;
    if (border) return [45, 52, 60, 160];
  }

  // Fixed text watermark marks rendered as subtle shapes/patterns
  // Small copyright mark at bottom right
  if (x > 3800 && x < 4820 && y > 235 && y < 255) {
    // subtle baseline guide
    if (y === 245 && x % 8 < 4) {
      return [50, 56, 62, 100];
    }
  }

  return [r, g, b, a];
});

const outDir = path.resolve("public/templates/default");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "blank-tag.png");
fs.writeFileSync(outPath, pngBuffer);
console.log(`Saved blank tag to ${outPath} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
