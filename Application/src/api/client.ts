import { APP_CONFIG } from '../shared/constants/config';
import { storage } from '../shared/services/storage/storage';
import { AppLanguage } from '../shared/types/i18n.types';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  [key: string]: any;
}

let currentApiClientLanguage: AppLanguage = 'mr';

/**
 * Updates the active language code for all outgoing API requests (Accept-Language header)
 */
export const setApiClientLanguage = (lang: AppLanguage) => {
  if (lang === 'mr' || lang === 'hi' || lang === 'en') {
    currentApiClientLanguage = lang;
  }
};

/**
 * Returns the currently configured API client language
 */
export const getApiClientLanguage = (): AppLanguage => {
  return currentApiClientLanguage;
};

/**
 * Core HTTP Request Client for ArogyaMitra Mobile Application
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isFullPath = endpoint.startsWith('http://') || endpoint.startsWith('https://');
  const url = isFullPath ? endpoint : `${APP_CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Attempt to fetch Bearer Auth Token from local storage
  let token: string | null = null;
  try {
    token = await storage.getItem<string>(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  } catch (_) {
    // Continue if token load fails
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': currentApiClientLanguage,
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set application/json if not FormData and not already specified
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  } else if (isFormData) {
    // Remove Content-Type so fetch/XMLHttpRequest calculates boundary automatically
    delete headers['Content-Type'];
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutMs = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await response.json().catch(() => ({}));

    if (!response.ok && json.success === undefined) {
      json.success = false;
    }

    return {
      statusCode: response.status,
      ...json,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    const errorMsg = isTimeout
      ? 'Connection timed out. Please verify backend server is reachable.'
      : (error?.message || 'Network request failed. Please check connection.');
    console.warn(`[ApiClient] Request failed for ${url}:`, errorMsg);
    return {
      success: false,
      statusCode: isTimeout ? 408 : 500,
      message: errorMsg,
      isNetworkError: true,
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      headers,
    });
  },

  put: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      headers,
    });
  },

  patch: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      headers,
    });
  },

  upload: <T = any>(endpoint: string, formData: FormData, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'POST', body: formData, headers }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
