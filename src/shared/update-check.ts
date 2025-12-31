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

function tagToVersion(tag: string): string {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

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
    return releases.find(r => !r.draft) ?? null;
  } catch (error) {
    console.error('[XRayFeed] Error fetching most recent release:', error);
    return null;
  }
}

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

export async function checkForUpdates(stableOnly: boolean): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  
  try {
    const targetRelease = stableOnly
      ? await getLatestStableRelease()
      : await getMostRecentRelease();
    
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
