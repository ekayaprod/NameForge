
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { appState, logError } from '../js/state.js';

describe('logError', () => {
  beforeEach(() => {
    appState.recentErrors = [];
  });

  it('should add an error message to recentErrors', () => {
    const message = 'Test error';
    logError(message);
    assert.strictEqual(appState.recentErrors.length, 1);
    assert.match(appState.recentErrors[0], /Test error/);
  });

  it('should limit recentErrors to 5 items', () => {
    for (let i = 0; i < 7; i++) {
      logError(`Error ${i}`);
    }
    assert.strictEqual(appState.recentErrors.length, 5);
    // Should contain Error 2 to Error 6 (0 and 1 should be shifted out)
    assert.match(appState.recentErrors[0], /Error 2/);
    assert.match(appState.recentErrors[4], /Error 6/);
  });

  it('should initialize recentErrors if it is missing', () => {
    delete appState.recentErrors;
    logError('New error');
    assert.ok(appState.recentErrors);
    assert.strictEqual(appState.recentErrors.length, 1);
  });
});
