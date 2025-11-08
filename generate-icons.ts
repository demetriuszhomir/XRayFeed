import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const sizes = [16, 48, 128];
const assetsDir = './assets';

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

const createSVG = (size: number): string => {
  const fontSize = size * 0.5;
  const strokeWidth = Math.max(1, size * 0.08);
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1DA1F2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0078d4;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow${size}">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - strokeWidth/2}" fill="url(#grad${size})"/>
  
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold"
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
    filter="url(#shadow${size})">X</text>
</svg>`;
};

console.log('🎨 Generating icons from SVG to PNG...\n');

async function generateIcons() {
  for (const size of sizes) {
    const svgContent = createSVG(size);
    const svgPath = join(assetsDir, `icon${size}.svg`);
    writeFileSync(svgPath, svgContent);
    console.log(`✓ Created ${svgPath}`);
    
    const pngPath = join(assetsDir, `icon${size}.png`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`✓ Converted to ${pngPath} (${size}x${size})`);
  }
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📋 Icons are ready for Chrome extension use.');
}

generateIcons().catch(console.error);
