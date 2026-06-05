// Generates SinaraCast app icons (PWA + Apple) from an inline SVG of the logo:
// white rounded-grid glyph on the brand yellow→orange gradient.
// Run: node scripts/gen-icons.mjs   (sharp is a devDependency)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const glyph = (color) => `
  <g transform="translate(146,146)" fill="${color}">
    <rect x="0"   y="0"   width="92" height="92" rx="26"/>
    <rect x="128" y="0"   width="92" height="92" rx="26"/>
    <rect x="0"   y="128" width="92" height="92" rx="26"/>
    <rect x="128" y="128" width="92" height="92" rx="26"/>
  </g>`;

const grad = `
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFD66B"/><stop offset="1" stop-color="#F9A826"/>
  </linearGradient></defs>`;

// rounded square (for favicon + manifest/maskable; full-bleed bg works as maskable)
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" rx="112" fill="url(#g)"/>${glyph("#fff")}</svg>`;

// full square (Apple masks to its own squircle; no transparent corners)
const square = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" fill="url(#g)"/>${glyph("#fff")}</svg>`;

await mkdir("public", { recursive: true });
await mkdir("app", { recursive: true });

// favicon (SVG) — crisp on modern browsers
await writeFile("app/icon.svg", rounded);

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

await writeFile("public/icon-192.png", await png(rounded, 192));
await writeFile("public/icon-512.png", await png(rounded, 512));
await writeFile("public/icon-maskable-512.png", await png(square, 512)); // full-bleed for maskable
await writeFile("app/apple-icon.png", await png(square, 180));           // Apple touch icon

console.log("icons generated: app/icon.svg, app/apple-icon.png, public/icon-192/512, public/icon-maskable-512");
