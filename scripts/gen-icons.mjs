import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../src/assets/wa-icon.png");
const pub = resolve(__dirname, "../public");

const sizes = [
  { out: "favicon.png",          size: 64,  bg: false },
  { out: "favicon-16x16.png",    size: 16,  bg: false },
  { out: "favicon-32x32.png",    size: 32,  bg: false },
  { out: "favicon-64x64.png",    size: 64,  bg: false },
  { out: "favicon-128x128.png",  size: 128, bg: false },
  { out: "favicon-256x256.png",  size: 256, bg: false },
  { out: "app-icon.png",         size: 512, bg: false },
  { out: "app-icon-192x192.png", size: 192, bg: false },
  { out: "app-icon-512x512.png", size: 512, bg: false },
  { out: "apple-icon.png",       size: 180, bg: "#ffffff" },
  { out: "apple-touch-icon.png", size: 180, bg: "#ffffff" },
  { out: "icons/icon-72.png",    size: 72,  bg: false },
  { out: "icons/icon-96.png",    size: 96,  bg: false },
  { out: "icons/icon-128.png",   size: 128, bg: false },
  { out: "icons/icon-144.png",   size: 144, bg: false },
  { out: "icons/icon-152.png",   size: 152, bg: false },
  { out: "icons/icon-192.png",   size: 192, bg: false },
  { out: "icons/icon-384.png",   size: 384, bg: false },
  { out: "icons/icon-512.png",   size: 512, bg: false },
  { out: "icons/maskable-192.png", size: 192, bg: "#0BD4C0", maskable: true },
  { out: "icons/maskable-512.png", size: 512, bg: "#0BD4C0", maskable: true },
];

for (const { out, size, bg, maskable } of sizes) {
  const outPath = resolve(pub, out);
  mkdirSync(dirname(outPath), { recursive: true });

  if (!bg) {
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
  } else if (maskable) {
    const iconSize = Math.round(size * 0.6);
    const padding = Math.round((size - iconSize) / 2);
    const iconBuf = await sharp(src)
      .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
      .composite([{ input: iconBuf, top: padding, left: padding }])
      .png()
      .toFile(outPath);
  } else {
    const iconBuf = await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
      .composite([{ input: iconBuf, top: 0, left: 0 }])
      .png()
      .toFile(outPath);
  }
  console.log(`✓ ${out} (${size}px)`);
}
console.log("All icons generated.");
