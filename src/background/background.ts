import { getConfig, setConfig, onMessage, getUpdateState, setUpdateState, type MessageType } from '../shared/storage.ts';
import { checkForUpdates, getCurrentVersion } from '../shared/update-check.ts';

const UPDATE_CHECK_ALARM = 'update-check';
const UPDATE_CHECK_INTERVAL_HOURS = 6;

chrome.runtime.onInstalled.addListener(async () => {
  console.log('XRayFeed extension installed');
  const config = await getConfig();
  await setConfig(config);
  
  // Run update check immediately on install/update
  await performUpdateCheck();
  
  // Schedule periodic update checks
  await scheduleUpdateCheck();
});

// Handle alarm for periodic update checks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === UPDATE_CHECK_ALARM) {
    await performUpdateCheck();
  }
});

async function scheduleUpdateCheck() {
  // Clear any existing alarm
  await chrome.alarms.clear(UPDATE_CHECK_ALARM);
  
  // Create new alarm that fires every 6 hours
  chrome.alarms.create(UPDATE_CHECK_ALARM, {
    periodInMinutes: UPDATE_CHECK_INTERVAL_HOURS * 60
  });
  
  console.log(`[XRayFeed] Update check scheduled every ${UPDATE_CHECK_INTERVAL_HOURS} hours`);
}

async function performUpdateCheck() {
  console.log('[XRayFeed] Checking for updates...');
  
  const result = await checkForUpdates();
  const updateState = await getUpdateState();
  
  await setUpdateState({
    lastCheckTimestamp: Date.now(),
    latestVersion: result.latestVersion,
    latestReleaseUrl: result.latestReleaseUrl,
    updateAvailable: result.updateAvailable
  });
  
  // Update badge based on result and user preference
  await updateBadge(result.updateAvailable && updateState.showBadge);
  
  if (result.updateAvailable) {
    console.log(`[XRayFeed] Update available: ${getCurrentVersion()} → ${result.latestVersion}`);
  } else {
    console.log('[XRayFeed] Up-to-date');
  }
}

async function updateBadge(show: boolean) {
  if (show) {
    await chrome.action.setBadgeText({ text: 'U' });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF8C00' }); // Orange
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

onMessage((message: MessageType, sender, sendResponse) => {
  (async () => {
    const config = await getConfig();
    
    switch (message.type) {
      case 'START':
        await setConfig({ isActive: true });
        await notifyContentScripts({ type: 'START' });
        sendResponse({ success: true });
        break;
        
      case 'STOP':
        await setConfig({ isActive: false });
        await notifyContentScripts({ type: 'STOP' });
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_CONFIG':
        await setConfig(message.config);
        await notifyContentScripts({ type: 'UPDATE_CONFIG', config: message.config });
        sendResponse({ success: true });
        break;
        
      case 'GET_STATUS':
        sendResponse({ isActive: config.isActive });
        break;
        
      case 'SET_SHOW_BADGE':
        await setUpdateState({ showBadge: message.showBadge });
        const updateState = await getUpdateState();
        await updateBadge(message.showBadge && updateState.updateAvailable);
        sendResponse({ success: true });
        break;
    }
  })();
  
  return true;
});

async function notifyContentScripts(message: MessageType) {
  const tabs = await chrome.tabs.query({ url: 'https://x.com/*' });
  
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (error) {
        console.log('Could not send message to tab:', tab.id, error);
      }
    }
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url?.startsWith('https://x.com/')) {
    const config = await getConfig();
    const url = new URL(tab.url);
    
    if (url.pathname === '/home' && config.isActive) {
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'START' });
        } catch (error) {
          console.log('Could not send START to content script:', error);
        }
      }, 500);
    } else if (url.pathname !== '/home') {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'STOP' });
      } catch (error) {
        console.log('Could not send STOP to content script:', error);
      }
    }
  }
});
