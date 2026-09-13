// client/js/state/store.js

const STORAGE_KEY = "erp_session";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: null, organizationId: null };
  } catch {
    return { token: null, organizationId: null };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/**
 * Get the current application state.
 */
export function getState() {
  state = loadState();
  return { ...state };
}

/**
 * Update one or more state values.
 */
export function setState(updates) {
  Object.assign(state, updates);
  persistState();
}

/**
 * Set the authentication token.
 */
export function setToken(token) {
  state.token = token;
  persistState();
}

/**
 * Get the authentication token.
 */
export function getToken() {
  state = loadState();
  return state.token;
}

/**
 * Set the active organization.
 */
export function setOrganizationId(organizationId) {
  state.organizationId = organizationId;
  persistState();
}

/**
 * Get the active organization.
 */
export function getOrganizationId() {
  return state.organizationId;
}

/**
 * Clear authentication and organization state.
 */
export function clearState() {
  state = { token: null, organizationId: null };
  localStorage.removeItem(STORAGE_KEY);
}