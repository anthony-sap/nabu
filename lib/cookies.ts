/**
 * Cookie utilities for client and server
 */

/**
 * Set a cookie on the client side
 */
export function setCookie(name: string, value: string, options?: { maxAge?: number; path?: string }) {
  if (typeof document === 'undefined') return;
  
  let cookieString = `${name}=${encodeURIComponent(value)}`;
  
  if (options?.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }
  
  if (options?.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += `; path=/`;
  }
  
  document.cookie = cookieString;
}

/**
 * Get a cookie on the client side
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()!.split(';').shift()!);
  }
  
  return null;
}

/**
 * Delete a cookie on the client side
 */
export function deleteCookie(name: string, path: string = '/') {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
}








