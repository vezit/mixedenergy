// lib/cookies.js
import { deleteSession } from '../lib/session';
/**
 * Helper function to get the cookie value by name
 */
export const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

/**
 * Helper function to set a cookie
 */
export const setCookie = (name: string, value: string, days?: number): boolean => {
  try {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    const secureCookie = `${name}=${value || ''}${expires}; path=/; Secure; SameSite=Strict`;
    document.cookie = secureCookie;
    return true;
  } catch (error) {
    return false;
  }
};

export function deleteCookie(name: string): void {
  document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname;
}

/**
 * Deletes all cookies and optionally clears session storage, local storage, and Firebase session
 */
export async function deleteAllCookies(
  deleteSessionStorage = true,
  deleteLocalStorage = true,
  deleteSessionInSupabase = true
): Promise<void> {
  // 1. Optionally delete session in Supabase **before** clearing cookies
  if (deleteSessionInSupabase) {
    try {
      // Instead of using fetch, just call our lib/session.ts function.
      await deleteSession();
    } catch (error) {
      console.error('Error deleting session in Supabase:', error);
    }
  }

  // 2. Delete all cookies from the browser
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  // 3. Optionally delete session storage
  if (deleteSessionStorage) {
    sessionStorage.clear();
  }

  // 4. Optionally delete local storage
  if (deleteLocalStorage) {
    localStorage.clear();
  }
}