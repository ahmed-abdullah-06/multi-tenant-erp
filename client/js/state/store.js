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
  if (token) {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('auth_token', token);
  }
}

/**
 * Get the authentication token.
 */
export function getToken() {
  state = loadState();
  return state.token || localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
}

/**
 * Set the active organization.
 */
export function setOrganizationId(organizationId) {
  state.organizationId = organizationId;
  persistState();
  if (organizationId) {
    localStorage.setItem('organizationId', organizationId);
  }
}

/**
 * Get the active organization.
 */
export function getOrganizationId() {
  state = loadState();
  return state.organizationId || localStorage.getItem('organizationId');
}

/**
 * Clear authentication and organization state.
 */
export function clearState() {
  state = { token: null, organizationId: null };
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('organizationId');
  localStorage.removeItem('user_data');
  localStorage.removeItem('user_access');
}

export const login = (responseData) => {
  const token = responseData.accessToken || responseData.token;
  if (token) {
    setToken(token);
  }
  if (responseData.defaultOrganizationId || responseData.organization?.id) {
    setOrganizationId(responseData.defaultOrganizationId || responseData.organization.id);
  }
  if (responseData.user) {
    localStorage.setItem('user_data', JSON.stringify(responseData.user));
  }
  if (responseData.access) {
    localStorage.setItem('user_access', JSON.stringify(responseData.access));
  }
};

export const getAccess = () => {
  try {
    const accessData = localStorage.getItem('user_access');
    if (!accessData) {
      console.warn('No user_access found in localStorage');
      return { roleName: 'Guest', permissions: [] };
    }
    const access = JSON.parse(accessData);
    return access;
  } catch (error) {
    console.error('Error parsing user_access:', error);
    return { roleName: 'Guest', permissions: [] };
  }
};

export const hasPermission = (requiredPermission) => {
  if (!requiredPermission) return true;
  const access = getAccess();
  
  // Owner/Admin role bypasses all frontend UI checks
  if (access.roleName === 'Owner' || access.roleName === 'Admin') {
    return true;
  }
  
  if (!access.permissions || !Array.isArray(access.permissions)) {
    return false;
  }

  if (access.permissions.includes('*')) {
    return true;
  }

  if (access.permissions.includes(requiredPermission)) {
    return true;
  }

  // Support inverted format e.g. 'read:accounting' vs 'accounting:read'
  const parts = requiredPermission.split(':');
  if (parts.length === 2) {
    const inverted = `${parts[1]}:${parts[0]}`;
    if (access.permissions.includes(inverted)) {
      return true;
    }
  }

  return false;
};
