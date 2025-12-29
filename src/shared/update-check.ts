const REPO_OWNER = 'demetriuszhomir';
const REPO_NAME = 'XRayFeed';
const RELEASES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`;

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string | null;
  latestReleaseUrl: string | null;
}

export function getCurrentVersion(): string {
  return chrome.runtime.getManifest().version;
}

/**
 * Compare two semver versions (x.y.z format)
 * Returns: positive if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * Strip 'v' prefix from tag name
 */
function tagToVersion(tag: string): string {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

/**
 * Check if the current version is a prerelease by looking it up in the releases list
 */
async function isCurrentVersionPrerelease(currentVersion: string): Promise<boolean> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!response.ok) {
      console.error('[XRayFeed] Failed to fetch releases list:', response.status);
      return false;
    }
    
    const releases: GitHubRelease[] = await response.json();
    const currentRelease = releases.find(r => tagToVersion(r.tag_name) === currentVersion);
    
    return currentRelease?.prerelease ?? false;
  } catch (error) {
    console.error('[XRayFeed] Error checking prerelease status:', error);
    return false;
  }
}

/**
 * Get the most recent non-draft release (can be stable or prerelease)
 */
async function getMostRecentRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!response.ok) {
      console.error('[XRayFeed] Failed to fetch releases:', response.status);
      return null;
    }
    
    const releases: GitHubRelease[] = await response.json();
    // Releases are returned sorted by created_at desc, first non-draft is most recent
    return releases.find(r => !r.draft) ?? null;
  } catch (error) {
    console.error('[XRayFeed] Error fetching most recent release:', error);
    return null;
  }
}

/**
 * Get the latest stable release (marked as "latest" on GitHub)
 */
async function getLatestStableRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!response.ok) {
      console.error('[XRayFeed] Failed to fetch latest release:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('[XRayFeed] Error fetching latest release:', error);
    return null;
  }
}

/**
 * Main update check function
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  
  try {
    // Step 1: Determine if current version is a prerelease
    const isPrerelease = await isCurrentVersionPrerelease(currentVersion);
    
    // Step 2: Get the appropriate comparison target
    let targetRelease: GitHubRelease | null;
    
    if (isPrerelease) {
      // Prerelease users get notified about any newer release (stable or prerelease)
      targetRelease = await getMostRecentRelease();
    } else {
      // Stable users only get notified about newer stable releases
      targetRelease = await getLatestStableRelease();
    }
    
    if (!targetRelease) {
      console.warn('[XRayFeed] No release found for comparison');
      return { updateAvailable: false, latestVersion: null, latestReleaseUrl: null };
    }
    
    const latestVersion = tagToVersion(targetRelease.tag_name);
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    
    return {
      updateAvailable,
      latestVersion,
      latestReleaseUrl: targetRelease.html_url
    };
  } catch (error) {
    console.error('[XRayFeed] Update check failed:', error);
    return { updateAvailable: false, latestVersion: null, latestReleaseUrl: null };
  }
}
