// lib/cookies.js

// Helper function to get the cookie value by name
export const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Helper functions to get and set cookies
export const setCookie = (name, value, days) => {
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
export function deleteCookie(name) {
  document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname;
}



export async function deleteAllCookies(deleteSessionStorage = true, deleteLocalStorage = true, deleteSessionInFirebase = true) {
  // Delete all cookies
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  // Optionally delete session storage
  if (deleteSessionStorage) {
    sessionStorage.clear();
  }

  // Optionally delete local storage
  if (deleteLocalStorage) {
    localStorage.clear();
  }

  // Optionally delete session in Firebase
  if (deleteSessionInFirebase) {
    try {
      await fetch('/api/firebase/1-deleteSession', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error deleting session in Firebase:', error);
    }
  }
}
