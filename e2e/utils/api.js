// @ts-check
const { request } = require('@playwright/test');
const { API_URL, E2E_BYPASS_TOKEN } = require('../playwright.config');

/** @param {unknown} e */
const msg = (e) => (e instanceof Error ? e.message : String(e));

/**
 * Lightweight API client used by setup/fixtures to seed state
 * directly through the backend (faster than driving the UI).
 * 
 * Handles both local dev and production Kapita URLs with proper error handling.
 */
class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} ctx
   * @param {string|null} token
   */
  constructor(ctx, token = null) {
    this.ctx = ctx;
    this.token = token;
    this.disposed = false;
  }

  static async create(token = null) {
    try {
      const ctx = await request.newContext({
        baseURL: API_URL,
        ignoreHTTPSErrors: true, // For self-signed certs in dev
      });
      return new ApiClient(ctx, token);
    } catch (error) {
      console.error(`Failed to create API client for ${API_URL}:`, msg(error));
      throw error;
    }
  }

  headers() {
    /** @type {{ [key: string]: string }} */
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (E2E_BYPASS_TOKEN) h['x-e2e-bypass'] = E2E_BYPASS_TOKEN;
    return h;
  }

  /**
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    try {
      const res = await this.ctx.post('/api/auth/login', {
        headers: this.headers(),
        data: { email, password },
        timeout: 30000,
      });
      if (!res.ok()) {
        const text = await res.text();
        throw new Error(`Login failed (${res.status()}): ${text}`);
      }
      const body = await res.json();
      this.token = body.token;
      return body;
    } catch (error) {
      console.error('Login error:', msg(error));
      throw error;
    }
  }

  async getAccounts() {
    const res = await this.ctx.get('/api/accounts', { 
      headers: this.headers(),
      timeout: 30000,
    });
    if (!res.ok()) {
      throw new Error(`Get accounts failed (${res.status()})`);
    }
    return (await res.json()).accounts || [];
  }

  async getProfile() {
    const res = await this.ctx.get('/api/profile', { 
      headers: this.headers(),
      timeout: 30000,
    });
    if (!res.ok()) {
      throw new Error(`Get profile failed (${res.status()})`);
    }
    return (await res.json()).user;
  }

  async health() {
    try {
      const res = await this.ctx.get('/health', { timeout: 30000 });
      return res.ok();
    } catch {
      return false;
    }
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    
    try {
      // Give any in-flight requests time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this.ctx) {
        await this.ctx.dispose();
      }
    } catch (error) {
      console.warn('Warning during API client disposal:', msg(error));
    }
  }
}

module.exports = { ApiClient };
