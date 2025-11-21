import { getConfig, setConfig, onMessage, type MessageType } from '../shared/storage.ts';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('XRayFeed extension installed');
  const config = await getConfig();
  await setConfig(config);
});

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
