// client/js/api/apiClient.js

import { getState } from "../state/store.js";

const API_BASE_URL = "/api/v1";

async function apiClient(endpoint, options = {}) {
  const state = getState();

  const token = state.token;
  const organizationId = state.organizationId;

  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (organizationId) {
    headers.set("x-organization-id", organizationId);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  /*
   * Authentication failed — session is invalid/expired.
   */
  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Not authenticated");
  }

  let data = null;
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  /*
   * Handle all other HTTP errors, including 403 (forbidden but authenticated).
   * Let the calling page decide how to display this — e.g. permission denied UI.
   */
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export default apiClient;