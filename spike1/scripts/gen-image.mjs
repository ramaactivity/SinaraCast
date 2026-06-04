// Generates a 1080x1920 (9:16) JPEG test story into public/test-story.jpg.
// Replace it with a real Canva 9:16 export anytime — same filename.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "test-story.jpg");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
  <rect width="1080" height="1920" fill="#0E7C5A"/>
  <text x="540" y="880" font-family="sans-serif" font-size="96" font-weight="700"
        fill="#ffffff" text-anchor="middle">SinaraCast</text>
  <text x="540" y="1010" font-family="sans-serif" font-size="46"
        fill="#CFF5E7" text-anchor="middle">Spike 1 — test story (9:16)</text>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(out);
console.log("wrote", out);
