import { mkdir, rm, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const distDir = './dist';
const srcDir = './src';

async function build() {
  console.log('🧹 Cleaning dist directory...');
  if (existsSync(distDir)) {
    await rm(distDir, { recursive: true });
  }
  await mkdir(distDir, { recursive: true });

  console.log('📦 Building content script...');
  await Bun.build({
    entrypoints: [join(srcDir, 'content/content.ts')],
    outdir: distDir,
    target: 'browser',
    minify: true,
    naming: '[dir]/[name].js'
  });

  console.log('📦 Building background service worker...');
  await Bun.build({
    entrypoints: [join(srcDir, 'background/background.ts')],
    outdir: distDir,
    target: 'browser',
    minify: true,
    naming: '[dir]/[name].js'
  });

  console.log('📦 Building popup script...');
  await Bun.build({
    entrypoints: [join(srcDir, 'popup/popup.ts')],
    outdir: join(distDir, 'popup'),
    target: 'browser',
    minify: true,
    naming: '[name].js'
  });

  console.log('📄 Copying static files...');
  await mkdir(join(distDir, 'popup'), { recursive: true });
  await copyFile(join(srcDir, 'popup/popup.html'), join(distDir, 'popup/popup.html'));
  await copyFile(join(srcDir, 'popup/web-components.min.js'), join(distDir, 'popup/web-components.min.js'));
  await copyFile('./manifest.json', join(distDir, 'manifest.json'));
  
  if (existsSync('./assets')) {
    await mkdir(join(distDir, 'assets'), { recursive: true });
    if (existsSync('./assets/icon16.png')) {
      await copyFile('./assets/icon16.png', join(distDir, 'assets/icon16.png'));
      await copyFile('./assets/icon48.png', join(distDir, 'assets/icon48.png'));
      await copyFile('./assets/icon128.png', join(distDir, 'assets/icon128.png'));
    }
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);
