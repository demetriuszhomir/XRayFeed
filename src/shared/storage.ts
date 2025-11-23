export interface ExtensionConfig {
  frequency: number;
  maxHours: number;
  likesPerHourThreshold: number;
  highlightColor: string;
  isActive: boolean;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  frequency: 3000,
  maxHours: 3,
  likesPerHourThreshold: 12,
  highlightColor: 'lightgreen',
  isActive: false
};

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.sync.get('config');
  return result.config || DEFAULT_CONFIG;
}

export async function setConfig(config: Partial<ExtensionConfig>): Promise<void> {
  const currentConfig = await getConfig();
  const newConfig = { ...currentConfig, ...config };
  await chrome.storage.sync.set({ config: newConfig });
}

export async function resetDefaultConfig(): Promise<void> {
  await chrome.storage.sync.set({ config: DEFAULT_CONFIG });
}

export type MessageType = 
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'UPDATE_CONFIG'; config: Partial<ExtensionConfig> }
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_RESPONSE'; isActive: boolean };

export function sendMessage(message: MessageType): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(callback: (message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void | boolean): void {
  chrome.runtime.onMessage.addListener(callback);
}
