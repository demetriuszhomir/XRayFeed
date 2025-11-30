import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const sizes = [16, 32, 48, 128];
const assetsDir = './assets';
const logoPath = join(assetsDir, 'logo.png');

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

if (!existsSync(logoPath)) {
  console.error('❌ Missing logo at', logoPath);
  process.exit(1);
}

console.log('🎨 Generating icons from logo...\n');

async function generateIcons() {
  for (const size of sizes) {
    const pngPath = join(assetsDir, `icon${size}.png`);
    await sharp(logoPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`✓ Converted to ${pngPath} (${size}x${size})`);
  }
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📋 Icons are ready for Chrome extension use.');
}

generateIcons().catch(console.error);
