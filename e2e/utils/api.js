// @ts-check
const { request } = require('@playwright/test');
const { API_URL, E2E_BYPASS_TOKEN } = require('../playwright.config');

/**
 * Lightweight API client used by setup/fixtures to seed state
 * directly through the backend (faster than driving the UI).
 */
class ApiClient {
  constructor(ctx, token = null) {
    this.ctx = ctx;
    this.token = token;
  }

  static async create(token = null) {
    const ctx = await request.newContext({ baseURL: API_URL });
    return new ApiClient(ctx, token);
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (E2E_BYPASS_TOKEN) h['x-e2e-bypass'] = E2E_BYPASS_TOKEN;
    return h;
  }

  async login(email, password) {
    const res = await this.ctx.post('/api/auth/login', {
      headers: this.headers(),
      data: { email, password },
    });
    if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
    const body = await res.json();
    this.token = body.token;
    return body;
  }

  async getAccounts() {
    const res = await this.ctx.get('/api/accounts', { headers: this.headers() });
    return (await res.json()).accounts || [];
  }

  async getProfile() {
    const res = await this.ctx.get('/api/profile', { headers: this.headers() });
    return (await res.json()).user;
  }

  async health() {
    const res = await this.ctx.get('/health');
    return res.ok();
  }

  async dispose() {
    await this.ctx.dispose();
  }
}

module.exports = { ApiClient };
