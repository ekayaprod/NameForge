import { CONFIG } from './config.js';
import { debounce } from './utils.js';

export const appState = {
  version: CONFIG.APP_VERSION,
  mode: 'forge',
  harmonizerIsAllLanguages: false,
  apiKey: "",
  isLoading: false,
  error: null,
  results: [],
  renderedCount: 0,
  likedNames: [],
  selectedLanguages: ["Spanish", "Irish"],
  selectedThemes: ["Light","Balance"],
  selectedStyle: "Lyrical & Melodic",
  gender: "Unisex",
  surname: "",
  siblingNames: "",
  firstNameForMiddle: "",
  userLanguages: [],
  userBlacklist: [],
  rawApiResponse: null,
  sessionGeneratedNames: [],
  model: "models/gemini-1.5-flash",
  outputAlphabet: "English (Default)",
  generationController: null,
  recentErrors: [],
  hasSeenIntro: false,
  defaultCount: 6,
  apiTimeout: 60,
  maxOutputTokens: 1024,
};

let idleHandle = null;
let timeoutHandle = null;

export function saveState() {
  const performSave = () => {
    try {
      const stateToSave = { ...appState };
      // Don't save transient state
      ['isLoading', 'error', 'rawApiResponse', 'generationController', 'renderedCount'].forEach(key => delete stateToSave[key]);
      localStorage.setItem(`nameForgeState_v${CONFIG.APP_VERSION}`, JSON.stringify(stateToSave));
    } catch (e) { console.warn("Could not save state:", e); }
    idleHandle = null;
    timeoutHandle = null;
  };

  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    if (idleHandle) window.cancelIdleCallback(idleHandle);
    idleHandle = window.requestIdleCallback(performSave);
  } else {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(performSave, 0);
  }
}

export function loadState() {
    try {
      const saved = localStorage.getItem(`nameForgeState_v${CONFIG.APP_VERSION}`);
      if (saved) {
          const parsed = JSON.parse(saved);
          const defaults = {
              version: CONFIG.APP_VERSION,
              mode: 'forge',
              harmonizerIsAllLanguages: false,
              likedNames: [],
              userLanguages: [],
              userBlacklist: [],
              gender: "Unisex",
              outputAlphabet: "English (Default)",
              model: "models/gemini-1.5-flash",
              recentErrors: [],
              hasSeenIntro: false,
              defaultCount: 6,
              apiTimeout: 60,
              maxOutputTokens: 1024,
          };
          Object.assign(appState, defaults, parsed);
      }
    } catch (e) { console.warn("Could not load state:", e); }
}

export const debouncedSaveState = debounce(saveState, 500);

export function logError(message) {
  if (!appState.recentErrors) appState.recentErrors = [];
  appState.recentErrors.push(`${new Date().toLocaleTimeString()}: ${message}`);
  if (appState.recentErrors.length > 5) appState.recentErrors.shift();
}
