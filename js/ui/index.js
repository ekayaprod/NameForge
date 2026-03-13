/**
 * @module ui
 * This module consolidates and re-exports all essential UI state management, rendering, and layout functions.
 * It provides a central API for the application's user interface layer, enabling clean and organized imports.
 */

export { ui, setGenerateHandler } from './state.js';
export { toggleModal, updateResultsPanel, updateControls, updateHistoryModal } from './render.js';
export { initLayout } from './layout.js';
