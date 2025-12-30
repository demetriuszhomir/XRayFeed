import { getConfig, setConfig, sendMessage, getUpdateState, DEFAULT_CONFIG, DEFAULT_THRESHOLDS, type ExtensionConfig, type EngagementType } from '../shared/storage.ts';
import { getCurrentVersion } from '../shared/update-check.ts';

const designSystemProvider = document.getElementById('designSystemProvider') as any;
const activeToggle = document.getElementById('activeToggle') as any;
const frequencyInput = document.getElementById('frequency') as any;
const maxHoursInput = document.getElementById('maxHours') as any;
const engagementTypeSelect = document.getElementById('engagementType') as any;
const engagementThresholdInput = document.getElementById('engagementThreshold') as any;
const thresholdHint = document.getElementById('thresholdHint') as HTMLElement;
const thresholdUnit = document.getElementById('thresholdUnit') as HTMLElement;
const highlightColorInput = document.getElementById('highlightColor') as any;
const saveButton = document.getElementById('saveButton') as any;
const resetDefaultButton = document.getElementById('resetDefaultButton') as HTMLElement;

// Footer elements
const versionText = document.getElementById('versionText') as HTMLElement;
const updateStatus = document.getElementById('updateStatus') as HTMLElement;
const showBadgeToggle = document.getElementById('showBadgeToggle') as any;

if (designSystemProvider) {
  designSystemProvider.setAttribute('accent-base-color', '#00A668');
  
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const updateTheme = () => {
    const luminance = darkModeQuery.matches ? '0.15' : '0.98';
    designSystemProvider.setAttribute('base-layer-luminance', luminance);
  };

  updateTheme();
  darkModeQuery.addEventListener('change', updateTheme);
}

let currentConfig: ExtensionConfig;
let pendingChanges: Partial<ExtensionConfig> = {};
let savedShowBadge: boolean = true;
let pendingShowBadge: boolean | null = null;

const THRESHOLD_KEYS: EngagementType[] = ['views', 'likes', 'reposts', 'replies', 'bookmarks'];

function normalizeThresholds(input: any) {
  return { ...DEFAULT_THRESHOLDS, ...(input ?? {}) };
}

function thresholdsEqual(a: any, b: any) {
  const aa = normalizeThresholds(a);
  const bb = normalizeThresholds(b);
  return THRESHOLD_KEYS.every((k) => Number(aa[k]) === Number(bb[k]));
}

async function loadConfig() {
  currentConfig = await getConfig();
  pendingChanges = {};
  updateUI();
  updateSaveButton();
}

function updateUI() {
  activeToggle.checked = currentConfig.isActive;
  frequencyInput.value = currentConfig.frequency.toString();
  maxHoursInput.value = currentConfig.maxHours.toString();
  
  const engagementType = currentConfig.engagementType || DEFAULT_CONFIG.engagementType;
  engagementTypeSelect.value = engagementType;
  engagementTypeSelect.currentValue = engagementType;
  
  const thresholds = currentConfig.engagementThresholds || DEFAULT_THRESHOLDS;
  engagementThresholdInput.value = (thresholds[engagementType] ?? DEFAULT_THRESHOLDS[engagementType]).toString();
  
  highlightColorInput.value = currentConfig.highlightColor;
  updateThresholdUI(engagementType);
}

function updateThresholdUI(engagementType: EngagementType) {
  const labels: Record<EngagementType, string> = {
    views: 'Minimum views per hour for a post to be highlighted',
    likes: 'Minimum likes per hour for a post to be highlighted',
    reposts: 'Minimum reposts per hour for a post to be highlighted',
    replies: 'Minimum replies per hour for a post to be highlighted',
    bookmarks: 'Minimum bookmarks per hour for a post to be highlighted'
  };
  
  const units: Record<EngagementType, string> = {
    views: 'views/h',
    likes: 'likes/h',
    reposts: 'reposts/h',
    replies: 'replies/h',
    bookmarks: 'bookmarks/h'
  };
  
  const steps: Record<EngagementType, number> = {
    views: 250,
    likes: 1,
    reposts: 1,
    replies: 1,
    bookmarks: 1
  };
  
  thresholdHint.textContent = labels[engagementType];
  thresholdUnit.textContent = units[engagementType];
  engagementThresholdInput.step = steps[engagementType].toString();
}

function updateSaveButton() {
  const hasConfigChanges = Object.keys(pendingChanges).length > 0;
  const hasBadgeChange = pendingShowBadge !== null;
  saveButton.disabled = !hasConfigChanges && !hasBadgeChange;
}

function trackChange(field: keyof ExtensionConfig, value: any) {
  const currentValue = currentConfig[field];
  const isEqual = field === 'engagementThresholds'
    ? thresholdsEqual(currentValue as any, value)
    : typeof value === 'object'
      ? JSON.stringify(currentValue) === JSON.stringify(value)
      : currentValue === value;
  
  if (!isEqual) {
    pendingChanges[field] = value;
  } else {
    delete pendingChanges[field];
  }
  updateSaveButton();
}

async function saveConfig(updates: Partial<ExtensionConfig>) {
  currentConfig = { ...currentConfig, ...updates };
  await setConfig(updates);
  await sendMessage({ type: 'UPDATE_CONFIG', config: updates });
}

activeToggle.addEventListener('change', () => {
  const isActive = activeToggle.checked;
  trackChange('isActive', isActive);
});

frequencyInput.addEventListener('input', () => {
  const frequency = parseInt(frequencyInput.value) || DEFAULT_CONFIG.frequency;
  trackChange('frequency', frequency);
});

maxHoursInput.addEventListener('input', () => {
  const maxHours = parseFloat(maxHoursInput.value) || DEFAULT_CONFIG.maxHours;
  trackChange('maxHours', maxHours);
});

engagementTypeSelect.addEventListener('change', () => {
  const engagementType = engagementTypeSelect.value as EngagementType;
  trackChange('engagementType', engagementType);
  
  // Update UI labels
  updateThresholdUI(engagementType);
  
  // Load threshold: prioritize pending changes, then current config, then defaults
  const thresholds = pendingChanges.engagementThresholds 
    ?? currentConfig.engagementThresholds 
    ?? DEFAULT_THRESHOLDS;
  const savedThreshold = thresholds[engagementType] ?? DEFAULT_THRESHOLDS[engagementType];
  engagementThresholdInput.value = savedThreshold.toString();
});

engagementThresholdInput.addEventListener('input', () => {
  const engagementType = engagementTypeSelect.value as EngagementType;
  const threshold = parseInt(engagementThresholdInput.value) || DEFAULT_THRESHOLDS[engagementType];
  
  // Update the specific threshold - prioritize pending changes over current config
  const baseThresholds = pendingChanges.engagementThresholds 
    ?? currentConfig.engagementThresholds 
    ?? DEFAULT_THRESHOLDS;
  const newThresholds = { ...baseThresholds, [engagementType]: threshold };
  trackChange('engagementThresholds', newThresholds);
});

highlightColorInput.addEventListener('input', () => {
  const highlightColor = highlightColorInput.value || DEFAULT_CONFIG.highlightColor;
  trackChange('highlightColor', highlightColor);
});

saveButton.addEventListener('click', async () => {
  const hasConfigChanges = Object.keys(pendingChanges).length > 0;
  const hasBadgeChange = pendingShowBadge !== null;
  if (!hasConfigChanges && !hasBadgeChange) return;
  
  if (hasConfigChanges) {
    currentConfig = { ...currentConfig, ...pendingChanges };
    await setConfig(pendingChanges);
    await sendMessage({ type: 'UPDATE_CONFIG', config: pendingChanges });
    
    if ('isActive' in pendingChanges) {
      if (pendingChanges.isActive) {
        await sendMessage({ type: 'START' });
      } else {
        await sendMessage({ type: 'STOP' });
      }
    }
  }
  
  if (hasBadgeChange && pendingShowBadge !== null) {
    savedShowBadge = pendingShowBadge;
    await sendMessage({ type: 'SET_SHOW_BADGE', showBadge: pendingShowBadge });
    pendingShowBadge = null;
  }
  
  pendingChanges = {};
  updateSaveButton();
});

resetDefaultButton.addEventListener('click', () => {
  // Preserve pending isActive change before resetting
  const pendingIsActive = pendingChanges.isActive;
  
  frequencyInput.value = DEFAULT_CONFIG.frequency.toString();
  maxHoursInput.value = DEFAULT_CONFIG.maxHours.toString();
  engagementTypeSelect.value = DEFAULT_CONFIG.engagementType;
  engagementTypeSelect.currentValue = DEFAULT_CONFIG.engagementType;
  engagementThresholdInput.value = DEFAULT_THRESHOLDS[DEFAULT_CONFIG.engagementType].toString();
  highlightColorInput.value = DEFAULT_CONFIG.highlightColor;
  
  // Update UI for default engagement type
  updateThresholdUI(DEFAULT_CONFIG.engagementType);
  
  pendingChanges = {
    frequency: DEFAULT_CONFIG.frequency,
    maxHours: DEFAULT_CONFIG.maxHours,
    engagementType: DEFAULT_CONFIG.engagementType,
    engagementThresholds: { ...DEFAULT_THRESHOLDS },
    highlightColor: DEFAULT_CONFIG.highlightColor
  };
  
  // Restore pending isActive change
  if (pendingIsActive !== undefined) pendingChanges.isActive = pendingIsActive;
  
  if (currentConfig.frequency === DEFAULT_CONFIG.frequency) delete pendingChanges.frequency;
  if (currentConfig.maxHours === DEFAULT_CONFIG.maxHours) delete pendingChanges.maxHours;
  if (currentConfig.engagementType === DEFAULT_CONFIG.engagementType) delete pendingChanges.engagementType;
  if (thresholdsEqual(currentConfig.engagementThresholds as any, DEFAULT_THRESHOLDS)) delete pendingChanges.engagementThresholds;
  if (currentConfig.highlightColor === DEFAULT_CONFIG.highlightColor) delete pendingChanges.highlightColor;
  
  updateSaveButton();
});

loadConfig();
loadUpdateStatus();

async function loadUpdateStatus() {
  // Set current version
  versionText.textContent = `v${getCurrentVersion()}`;
  
  // Get update state from storage
  const updateState = await getUpdateState();
  
  // Set badge toggle state
  savedShowBadge = updateState.showBadge;
  showBadgeToggle.checked = updateState.showBadge;
  
  // Set update status
  if (updateState.updateAvailable && updateState.latestReleaseUrl) {
    updateStatus.innerHTML = `<a href="${updateState.latestReleaseUrl}" target="_blank">Update available</a>`;
  } else {
    updateStatus.textContent = 'Up-to-date';
  }
}

showBadgeToggle.addEventListener('change', () => {
  const showBadge = showBadgeToggle.checked;
  if (showBadge === savedShowBadge) {
    pendingShowBadge = null;
  } else {
    pendingShowBadge = showBadge;
  }
  updateSaveButton();
});
