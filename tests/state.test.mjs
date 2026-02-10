
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { appState, loadState, getDefaultState } from '../js/state.js';
import { CONFIG } from '../js/config.js';

describe('State Management', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;

    // Mock localStorage
    const store = {};
    global.localStorage = {
      getItem: mock.fn((key) => store[key] || null),
      setItem: mock.fn((key, value) => { store[key] = value; }),
      clear: mock.fn(() => { for (const key in store) delete store[key]; }),
    };

    // Reset appState to defaults
    Object.assign(appState, getDefaultState());
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it('should initialize appState with default values', () => {
    assert.deepStrictEqual(appState, getDefaultState());
  });

  it('should load saved state and merge with defaults', () => {
    const savedState = {
      mode: 'harmonizer',
      selectedLanguages: ['Japanese'],
    };

    global.localStorage.getItem.mock.mockImplementation(() => JSON.stringify(savedState));

    loadState();

    assert.strictEqual(appState.mode, 'harmonizer');
    assert.deepStrictEqual(appState.selectedLanguages, ['Japanese']);
    assert.strictEqual(appState.gender, getDefaultState().gender); // Should match default
  });

  it('should handle missing fields in saved state by using defaults', () => {
      // Simulate a saved state that is missing some fields
      const partialState = {
          version: CONFIG.APP_VERSION,
          mode: 'forge'
      };

      // Manually modify appState to be different from default first
      appState.gender = 'Female';

      global.localStorage.getItem.mock.mockImplementation(() => JSON.stringify(partialState));

      loadState();

      assert.strictEqual(appState.mode, 'forge'); // From saved
      assert.strictEqual(appState.gender, getDefaultState().gender); // Reset to default because missing in saved
  });

  it('should handle corrupt state gracefully', () => {
    global.localStorage.getItem.mock.mockImplementation(() => "invalid json");

    const consoleSpy = mock.method(console, 'warn', () => {});

    loadState();

    // Should not crash, appState should remain as is (defaults)
    assert.deepStrictEqual(appState, getDefaultState());
    assert.strictEqual(consoleSpy.mock.callCount(), 1);
  });

  it('should ensure getDefaultState returns fresh objects', () => {
    const state1 = getDefaultState();
    const state2 = getDefaultState();

    assert.notStrictEqual(state1.selectedLanguages, state2.selectedLanguages);

    state1.selectedLanguages.push('Latin');
    // Default is 2 languages
    assert.strictEqual(state1.selectedLanguages.length, 3);
    assert.strictEqual(state2.selectedLanguages.length, 2);
  });
});
