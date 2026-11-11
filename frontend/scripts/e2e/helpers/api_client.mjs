/**
 * api_client.mjs - Native Node.js ESM HTTP Client for SmartWard AI E2E Testing
 *
 * Zero external dependencies. Uses native Node.js 18+ (Node 22) fetch,
 * FormData, Blob, and AbortSignal.timeout().
 */

export const DEFAULT_TIMEOUT_MS = parseInt(process.env.SMARTWARD_API_TIMEOUT_MS || '15000', 10);

/**
 * Resolves the primary API base URL.
 * Prioritizes SMARTWARD_API_URL, then probes port 8082 (Docker container port mapping)
 * and falls back to port 8080 (standard local Spring Boot port).
 */
export function getInitialBaseUrl() {
  if (process.env.SMARTWARD_API_URL) {
    return process.env.SMARTWARD_API_URL.replace(/\/+$/, '');
  }
  // Default to localhost:8082 where Docker maps smartward-backend
  return 'http://localhost:8082';
}

export class ApiClient {
  constructor(baseUrl = getInitialBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.officerToken = null;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setOfficerToken(token) {
    this.officerToken = token;
  }

  getOfficerToken() {
    return this.officerToken;
  }

  clearOfficerToken() {
    this.officerToken = null;
  }

  /**
   * Dispatches an HTTP request with timeout protection and standard error framing.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const signal = AbortSignal.timeout(timeoutMs);

    const headers = {
      Accept: 'application/json, text/plain, */*',
      ...(options.headers || {})
    };

    // Attach Bearer token if available and not overridden
    if (this.officerToken && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${this.officerToken}`;
    }

    let body = options.body;
    // When body is a plain object and not FormData, serialize to JSON
    if (body !== undefined && body !== null && typeof body === 'object' && !(body instanceof FormData) && !Buffer.isBuffer(body)) {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = JSON.stringify(body);
    }

    // CRITICAL: When body is FormData, NEVER set Content-Type header manually;
    // let fetch generate multipart boundary automatically.
    if (body instanceof FormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }

    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        signal
      });
    } catch (err) {
      if (err.name === 'TimeoutError') {
        return {
          status: 408,
          ok: false,
          headers: new Headers(),
          data: { error: 'TIMEOUT', message: `Request to ${url} timed out after ${timeoutMs}ms` },
          error: err
        };
      }
      return {
        status: 0,
        ok: false,
        headers: new Headers(),
        data: { error: 'NETWORK_ERROR', message: `Cannot connect to ${url}: ${err.message}` },
        error: err
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let parsedBody = null;
    let buffer = null;

    if (contentType.includes('application/json')) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    } else if (
      contentType.includes('image/') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/pdf')
    ) {
      try {
        const ab = await response.arrayBuffer();
        buffer = Buffer.from(ab);
      } catch {
        buffer = null;
      }
    } else {
      try {
        parsedBody = await response.text();
      } catch {
        parsedBody = '';
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      contentType,
      data: parsedBody,
      buffer
    };
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Uploads multipart file for Zero-Trust Vault or FormPrecheck.
   * Node FormData handles standard multipart boundary.
   */
  async uploadFile(endpoint, fileBuffer, filename, extraFields = {}, options = {}) {
    const formData = new FormData();
    const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/png';
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);

    for (const [key, val] of Object.entries(extraFields)) {
      formData.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData
    });
  }
}

export const apiClient = new ApiClient();
