export type EngagementType = 'views' | 'likes' | 'reposts' | 'replies' | 'bookmarks';

export interface EngagementThresholds {
  views: number;
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
}

export interface ExtensionConfig {
  frequency: number;
  maxHours: number;
  engagementType: EngagementType;
  engagementThresholds: EngagementThresholds;
  highlightColor: string;
  isActive: boolean;
  likesPerHourThreshold?: number; // Kept for backward compatibility with older versions
}

export interface UpdateState {
  showBadge: boolean;
  stableOnly: boolean;
  lastCheckTimestamp: number;
  latestVersion: string | null;
  latestReleaseUrl: string | null;
  updateAvailable: boolean;
}

export const DEFAULT_THRESHOLDS: EngagementThresholds = {
  views: 3000,
  likes: 12,
  reposts: 5,
  replies: 5,
  bookmarks: 5
};

export const DEFAULT_CONFIG: ExtensionConfig = {
  frequency: 3000,
  maxHours: 3,
  engagementType: 'views',
  engagementThresholds: { ...DEFAULT_THRESHOLDS },
  highlightColor: '#064e3b',
  isActive: true
};

export const DEFAULT_UPDATE_STATE: UpdateState = {
  showBadge: true,
  stableOnly: true,
  lastCheckTimestamp: 0,
  latestVersion: null,
  latestReleaseUrl: null,
  updateAvailable: false
};

async function migrateConfigIfNeeded(storedConfig: any): Promise<ExtensionConfig | null> {
  // Check if migration is needed: has old likesPerHourThreshold but no new engagementType
  if (!storedConfig || !('likesPerHourThreshold' in storedConfig) || 'engagementType' in storedConfig) {
    return null; // No migration needed
  }
  
  const legacyThreshold = storedConfig.likesPerHourThreshold;
  const migratedConfig: ExtensionConfig = {
    ...DEFAULT_CONFIG,
    ...storedConfig,
    engagementType: 'views',
    engagementThresholds: {
      ...DEFAULT_THRESHOLDS,
      likes: legacyThreshold
    },
    likesPerHourThreshold: legacyThreshold // Keep for backward compatibility
  };
  
  // Save migrated config
  await chrome.storage.sync.set({ config: migratedConfig });
  
  return migratedConfig;
}

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.sync.get('config');
  const storedConfig = result.config;
  
  // Try migration first
  const migratedConfig = await migrateConfigIfNeeded(storedConfig);
  if (migratedConfig) {
    return migratedConfig;
  }
  
  return storedConfig || DEFAULT_CONFIG;
}

export async function setConfig(config: Partial<ExtensionConfig>): Promise<void> {
  const currentConfig = await getConfig();
  const newConfig = { ...currentConfig, ...config };
  await chrome.storage.sync.set({ config: newConfig });
}

export async function resetDefaultConfig(): Promise<void> {
  await chrome.storage.sync.set({ config: DEFAULT_CONFIG });
}

export async function getUpdateState(): Promise<UpdateState> {
  const result = await chrome.storage.local.get('updateState');
  return { ...DEFAULT_UPDATE_STATE, ...result.updateState };
}

export async function setUpdateState(state: Partial<UpdateState>): Promise<void> {
  const currentState = await getUpdateState();
  const newState = { ...currentState, ...state };
  await chrome.storage.local.set({ updateState: newState });
}

export type MessageType = 
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'UPDATE_CONFIG'; config: Partial<ExtensionConfig> }
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_RESPONSE'; isActive: boolean }
  | { type: 'SET_SHOW_BADGE'; showBadge: boolean }
  | { type: 'SET_STABLE_ONLY'; stableOnly: boolean };

export function sendMessage(message: MessageType): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(callback: (message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void | boolean): void {
  chrome.runtime.onMessage.addListener(callback);
}
