// Regenerates build/icon.{ico,png} and build/icons/*.png from build/icon.svg.
// Run after editing the SVG: npm run icon
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svgPath = path.join(root, 'build/icon.svg');
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

async function main() {
  const pngBuffers = {};
  for (const size of sizes) {
    pngBuffers[size] = await sharp(svgPath, { density: 384 }).resize(size, size).png().toBuffer();
  }

  fs.writeFileSync(path.join(root, 'build/icon.png'), pngBuffers[512]);

  fs.mkdirSync(path.join(root, 'build/icons'), { recursive: true });
  for (const size of sizes) {
    fs.writeFileSync(path.join(root, `build/icons/${size}.png`), pngBuffers[size]);
  }

  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuf = await pngToIco(icoSizes.map((s) => path.join(root, `build/icons/${s}.png`)));
  fs.writeFileSync(path.join(root, 'build/icon.ico'), icoBuf);

  console.log('Icon rebuilt:', sizes.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
