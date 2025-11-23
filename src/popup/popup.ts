import { getConfig, setConfig, resetConfig, sendMessage, DEFAULT_CONFIG, type ExtensionConfig } from '../shared/storage.ts';

const designSystemProvider = document.getElementById('designSystemProvider') as any;
const activeToggle = document.getElementById('activeToggle') as any;
const frequencyInput = document.getElementById('frequency') as any;
const maxHoursInput = document.getElementById('maxHours') as any;
const likesPerHourInput = document.getElementById('likesPerHour') as any;
const highlightColorInput = document.getElementById('highlightColor') as any;
const saveButton = document.getElementById('saveButton') as any;
const resetButton = document.getElementById('resetButton') as HTMLElement;

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
  likesPerHourInput.value = currentConfig.likesPerHourThreshold.toString();
  highlightColorInput.value = currentConfig.highlightColor;
}

function updateSaveButton() {
  saveButton.disabled = Object.keys(pendingChanges).length === 0;
}

function trackChange(field: keyof ExtensionConfig, value: any) {
  if (currentConfig[field] !== value) {
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

likesPerHourInput.addEventListener('input', () => {
  const likesPerHourThreshold = parseInt(likesPerHourInput.value) || DEFAULT_CONFIG.likesPerHourThreshold;
  trackChange('likesPerHourThreshold', likesPerHourThreshold);
});

highlightColorInput.addEventListener('input', () => {
  const highlightColor = highlightColorInput.value || DEFAULT_CONFIG.highlightColor;
  trackChange('highlightColor', highlightColor);
});

saveButton.addEventListener('click', async () => {
  if (Object.keys(pendingChanges).length === 0) return;
  
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
  
  pendingChanges = {};
  updateSaveButton();
});

resetButton.addEventListener('click', () => {
  const wasActive = currentConfig.isActive;
  
  frequencyInput.value = DEFAULT_CONFIG.frequency.toString();
  maxHoursInput.value = DEFAULT_CONFIG.maxHours.toString();
  likesPerHourInput.value = DEFAULT_CONFIG.likesPerHourThreshold.toString();
  highlightColorInput.value = DEFAULT_CONFIG.highlightColor;
  activeToggle.checked = wasActive;
  
  pendingChanges = {
    frequency: DEFAULT_CONFIG.frequency,
    maxHours: DEFAULT_CONFIG.maxHours,
    likesPerHourThreshold: DEFAULT_CONFIG.likesPerHourThreshold,
    highlightColor: DEFAULT_CONFIG.highlightColor
  };
  
  if (currentConfig.frequency === DEFAULT_CONFIG.frequency) delete pendingChanges.frequency;
  if (currentConfig.maxHours === DEFAULT_CONFIG.maxHours) delete pendingChanges.maxHours;
  if (currentConfig.likesPerHourThreshold === DEFAULT_CONFIG.likesPerHourThreshold) delete pendingChanges.likesPerHourThreshold;
  if (currentConfig.highlightColor === DEFAULT_CONFIG.highlightColor) delete pendingChanges.highlightColor;
  
  updateSaveButton();
});

loadConfig();
