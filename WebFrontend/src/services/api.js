/**
 * Centralized API client wrapper using modern Fetch API
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('ward_arogya_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request(endpoint, options = {}, isRetry = false) {
    let url = `${this.baseUrl}${endpoint}`;
    if (options.params && typeof options.params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => null);

      // Automatic token renewal if 401 received on protected endpoint
      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/logout')
      ) {
        const refreshToken = localStorage.getItem('ward_arogya_refresh_token');
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
              // Retry original request with new access token
              return this.request(endpoint, options, true);
            } else {
              localStorage.removeItem('ward_arogya_token');
              localStorage.removeItem('ward_arogya_refresh_token');
              localStorage.removeItem('ward_arogya_user');
            }
          } catch (refreshErr) {
            console.warn('Silent token renewal failed:', refreshErr.message);
          }
        }
      }

      if (!response.ok) {
        const error = new Error(data?.message || `Request failed with status ${response.status}`);
        error.response = { status: response.status, data };
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
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

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient(BASE_URL);
export default api;
