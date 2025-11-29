import { readFile, writeFile } from 'fs/promises';

async function syncVersion() {
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
  const manifestJson = JSON.parse(await readFile('./manifest.json', 'utf-8'));
  
  const version = packageJson.version;
  
  if (manifestJson.version !== version) {
    manifestJson.version = version;
    await writeFile('./manifest.json', JSON.stringify(manifestJson, null, 2) + '\n');
    console.log(`✅ Updated manifest.json version to ${version}`);
  } else {
    console.log(`ℹ️ manifest.json version already at ${version}`);
  }
}

syncVersion().catch(console.error);
