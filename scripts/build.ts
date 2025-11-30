import { mkdir, rm, copyFile, readFile, writeFile } from 'fs/promises';
import { existsSync, lstatSync, watch as fsWatch } from 'fs';
import { join } from 'path';

const distDir = './dist';
const srcDir = './src';
const watchTargets = [srcDir, './assets', './manifest.json', './package.json'];
const isWatchMode = process.argv.includes('--watch');

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
  
  // Read version from package.json and inject into manifest
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
  const manifestJson = JSON.parse(await readFile('./manifest.json', 'utf-8'));
  manifestJson.version = packageJson.version;
  await writeFile(join(distDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2));
  
  if (existsSync('./assets')) {
    await mkdir(join(distDir, 'assets'), { recursive: true });
    if (existsSync('./assets/icon16.png')) {
      await copyFile('./assets/icon16.png', join(distDir, 'assets/icon16.png'));
      await copyFile('./assets/icon32.png', join(distDir, 'assets/icon32.png'));
      await copyFile('./assets/icon48.png', join(distDir, 'assets/icon48.png'));
      await copyFile('./assets/icon128.png', join(distDir, 'assets/icon128.png'));
    }
  }

  await copyFile('./LICENSE', join(distDir, 'LICENSE'));
  if (existsSync('./NOTICE')) {
    await copyFile('./NOTICE', join(distDir, 'NOTICE'));
  }

  console.log('✅ Build complete!');
}

async function runBuild() {
  let building = false;
  let queued = false;

  const execute = async () => {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    try {
      await build();
    } catch (error) {
      console.error(error);
    } finally {
      building = false;
      if (queued) {
        queued = false;
        await execute();
      }
    }
  };

  await execute();

  if (!isWatchMode) {
    return;
  }

  const watchers = createWatchers(() => {
    void execute();
  });

  const cleanup = () => {
    watchers.forEach((watcher) => watcher.close());
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function createWatchers(onChange: () => void) {
  console.log('👀 Watching for changes...');
  return watchTargets
    .filter((target) => existsSync(target))
    .map((target) => {
      const isDir = lstatSync(target).isDirectory();
      return fsWatch(
        target,
        { recursive: isDir && process.platform !== 'linux' },
        (_, file) => {
          console.log(`🔁 Change detected in ${file ? join(target, file) : target}`);
          onChange();
        }
      );
    });
}

runBuild().catch(console.error);
