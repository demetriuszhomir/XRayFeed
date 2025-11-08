# XRayFeed

A Chrome extension that highlights high-performing posts on X (formerly Twitter). XRayFeed scans your home timeline and marks posts based on engagement rate and recency, helping you quickly identify trending content.

## Features

- 🎯 **Smart Highlighting**: Automatically identifies posts with high engagement rates
- ⚙️ **Configurable Thresholds**: Adjust frequency, max post age, and likes-per-hour threshold
- 🎨 **Custom Colors**: Choose your preferred highlight color
- 🔄 **Dynamic Control**: Start/stop without page refresh
- 💾 **Persistent Settings**: Your configuration is saved across sessions

## Installation

### From Release

1. Download the latest release ZIP file from the [Releases page](https://github.com/demetriuszhomir/XRayFeed/releases)
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" using the toggle in the top right corner
5. Click "Load unpacked" and select the extracted folder
6. The XRayFeed icon should appear in your Chrome toolbar

### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/demetriuszhomir/XRayFeed.git
   cd XRayFeed
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create icon files (see [Icon Setup](#icon-setup))

4. Build the extension:
   ```bash
   bun run build
   ```

5. Load the `dist` folder as an unpacked extension in Chrome (see step 3-5 above)

## Icon Setup

Before building, you need to create three icon files in the `assets` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can:
- Design custom icons using any image editor
- Use the included `create-icons.js` script to generate SVG placeholders, then convert to PNG
- Use online tools like [favicon-generator.org](https://www.favicon-generator.org/)

## Usage

1. Navigate to https://x.com/home in Chrome
2. Click the XRayFeed icon in your Chrome toolbar
3. Toggle "Enable XRayFeed" to start highlighting posts
4. Adjust settings as needed:
   - **Check Frequency**: How often to scan for new posts (default: 3000ms)
   - **Max Age**: Maximum post age to consider (default: 3 hours)
   - **Engagement Threshold**: Minimum likes per hour (default: 12)
   - **Highlight Color**: CSS color for highlighting (default: lightgreen)
5. Click "OK" to apply changes, or "Reset" to restore defaults

## How It Works

XRayFeed uses two filtering criteria:

1. **Age Filter**: Posts older than the max age threshold are filtered out unless they have recent replies
2. **Engagement Filter**: Posts older than 10 minutes with engagement below the threshold (likes/hour) are filtered out

Posts that pass both filters are highlighted with your chosen background color.

## Development

### Project Structure

```
XRayFeed/
├── src/
│   ├── background/       # Service worker for extension lifecycle
│   ├── content/          # Content script for X.com home page
│   ├── popup/            # Popup UI with Fluent UI components
│   └── shared/           # Shared utilities and storage
├── assets/               # Extension icons
├── .github/workflows/    # CI/CD pipeline
├── manifest.json         # Chrome extension manifest V3
├── build.ts              # Bun build script
└── package.json          # Project dependencies
```

### Build Commands

- `bun run build` - Build the extension for production
- `bun run dev` - Build in watch mode (not yet implemented)
- `bun run clean` - Remove the dist folder

### Tech Stack

- **Runtime**: [Bun](https://bun.com) for fast builds and TypeScript support
- **UI Framework**: [Fluent UI Web Components](https://github.com/microsoft/fluentui)
- **Language**: TypeScript with strict mode
- **Extension API**: Chrome Extension Manifest V3

## CI/CD

The project includes a GitHub Actions workflow for automated builds and releases:

1. Go to the **Actions** tab in your GitHub repository
2. Select "Build and Release XRayFeed"
3. Click "Run workflow"
4. Enter a release tag (e.g., `v1.0.0`)
5. The workflow will build the extension, create a release, and upload the ZIP file

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## Author

Created by [Dmitry Zhomir](https://demetriuszhomir.com/)

## Acknowledgments

- Built with [Bun](https://bun.com)
- UI powered by [Microsoft Fluent UI](https://github.com/microsoft/fluentui)
- Inspired by the need to filter high-signal content on social media
