<div align="center">

![image](assets/icon128.png)

# XRayFeed

A Chrome extension that highlights high-performing posts on X (formerly Twitter). 

XRayFeed scans your home timeline and marks posts based on engagement rate & recency, helping you quickly identify trending content.

</div>

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

---

<div align="center">

Check out my other projects: https://demetriuszhomir.com<br>
🔹<br>
[X profile](https://x.com/DemetriusZhomir) <b>|</b> [YouTube channel](https://www.youtube.com/@DemetriusZhomir)

</div>
