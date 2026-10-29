/**
 * Base HTTP Client for API layer
 * Handles baseUrl, JSON serialization, authorization headers, and error parsing.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getAuthHeaders() {
    const token =
      localStorage.getItem('ward_arogya_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request(endpoint, options = {}, isRetry = false) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => null);

      if (
        response.status === 401 &&
        !isRetry &&
        !cleanEndpoint.includes('/auth/login') &&
        !cleanEndpoint.includes('/auth/refresh') &&
        !cleanEndpoint.includes('/auth/logout')
      ) {
        const refreshToken =
          localStorage.getItem('ward_arogya_refresh_token') ||
          localStorage.getItem('refresh_token');

        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshData = await refreshRes.json().catch(() => null);

            if (refreshRes.ok && refreshData?.data?.accessToken) {
              const newToken = refreshData.data.accessToken;
              localStorage.setItem('ward_arogya_token', newToken);
              if (refreshData.data.refreshToken) {
                localStorage.setItem('ward_arogya_refresh_token', refreshData.data.refreshToken);
              }
              return this.request(endpoint, options, true);
            }
          } catch (rErr) {
            console.warn('[ApiClient] Token renewal failed:', rErr.message);
          }
        }
      }

      if (!response.ok) {
        const error = new Error(
          data?.message || `Request failed with status ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (!error.status) {
        console.warn(`[API Network Error] ${options.method || 'GET'} ${url}:`, error.message);
      }
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
