import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import JSZip from 'jszip';

const distDir = './dist';

async function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string = '') {
  const entries = await readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entryZipPath);
    } else {
      const content = await readFile(fullPath);
      zip.file(entryZipPath, content);
    }
  }
}

async function release() {
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
  const version = packageJson.version;
  const versionForFilename = version.replace(/\./g, '-');
  const zipName = `XRayFeed_v${versionForFilename}.zip`;
  
  console.log(`📦 Creating ${zipName}...`);
  
  const zip = new JSZip();
  await addDirectoryToZip(zip, distDir);
  
  const zipContent = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  await Bun.write(zipName, zipContent);
  
  const zipStat = await stat(zipName);
  const sizeKb = (zipStat.size / 1024).toFixed(2);
  
  console.log(`✅ Release complete: ${zipName} (${sizeKb} KB)`);
}

release().catch(console.error);
