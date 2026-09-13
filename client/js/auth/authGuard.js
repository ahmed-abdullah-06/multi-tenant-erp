import { getToken } from "../state/store.js";


/**
 * Protect a page by requiring authentication.
 */
export function requireAuthGuard() {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return false;
  }
  return true;
}