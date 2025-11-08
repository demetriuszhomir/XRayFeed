# Development Workflow

## Quick Start

```powershell
# Install dependencies
bun install

# Generate icons (if needed)
bun run icons

# Build extension
bun run build

# Output will be in dist/
```

## Icons

The extension uses PNG icons (required by Chrome - SVG is not supported in manifests).

- **Source**: SVG files are generated as reference in `assets/`
- **Used by extension**: PNG files in `assets/` (16x16, 48x48, 128x128)
- **Generation**: Run `bun run icons` to regenerate both SVG and PNG files
- **Library**: Uses `sharp` for high-quality SVG → PNG conversion

Note: Chrome extensions do NOT support SVG icons in the manifest. Always use PNG format.

## Project Structure

```
XRayFeed/
├── src/
│   ├── shared/
│   │   └── storage.ts          # Config & messaging system
│   ├── content/
│   │   └── content.ts          # Main highlighting logic
│   ├── background/
│   │   └── background.ts       # Service worker
│   └── popup/
│       ├── popup.html          # UI with Fluent UI
│       └── popup.ts            # Popup logic
├── assets/                     # Extension icons
├── dist/                       # Build output (git ignored)
├── manifest.json              # Chrome Extension manifest V3
└── build.ts                   # Bun build script
```

## Key Files

### `src/shared/storage.ts`
- Defines `ExtensionConfig` interface
- Storage abstraction for chrome.storage.sync
- Message types for content/background communication

### `src/content/content.ts`
- Main highlighting algorithm
- Listens for START/STOP/UPDATE_CONFIG messages
- Runs interval to scan and mark posts
- Cleanup function removes all highlights

### `src/background/background.ts`
- Service worker lifecycle management
- Routes messages between popup and content scripts
- Initializes content script on page load

### `src/popup/popup.ts` & `popup.html`
- Fluent UI components for settings
- Real-time toggle and configuration
- Persistent storage integration

## Build Process

The `build.ts` script:
1. Cleans `dist/` folder
2. Bundles TypeScript files → JavaScript
3. Minifies output
4. Copies static files (HTML, manifest, icons)

## Making Changes

### Modify Highlighting Logic
Edit `src/content/content.ts` → `markFilteredPosts()` function

### Change UI
Edit `src/popup/popup.html` and `src/popup/popup.ts`

### Add New Settings
1. Update `ExtensionConfig` in `src/shared/storage.ts`
2. Update UI in `popup.html`
3. Add logic in `popup.ts` to save/load
4. Use in `content.ts`

### After Changes
```powershell
bun run build
```
Then reload extension in Chrome (chrome://extensions → click reload icon)

## Debugging

### Content Script
- Open DevTools on x.com/home (F12)
- Console tab shows content script logs
- Sources → content.js to debug

### Background Script
- chrome://extensions → XRayFeed → "Inspect views: service worker"
- Console shows background logs

### Popup
- Right-click extension icon → "Inspect popup"
- Shows popup HTML/JS console

## Testing Changes Without Rebuild

For quick testing of logic:
1. Go to x.com/home
2. Open DevTools Console
3. Paste modified logic directly
4. Test behavior
5. When working, update actual files

## Common Tasks

### Change default settings
Edit `DEFAULT_CONFIG` in `src/shared/storage.ts`

### Change extension name
Edit `manifest.json` → `name` field

### Add new permissions
Edit `manifest.json` → `permissions` array

### Support additional URLs
Edit `manifest.json` → `host_permissions` and `content_scripts.matches`

## Performance Notes

- Content script runs every `frequency` ms (default 3000ms)
- Scans all tweets on page each run
- Safe for reasonable frequencies (>1000ms recommended)
- DOM queries are cached per run
- No external API calls

## Security

- No external data transmission
- All processing local
- Only accesses x.com/home
- Uses chrome.storage.sync for settings
- No eval() or unsafe practices
