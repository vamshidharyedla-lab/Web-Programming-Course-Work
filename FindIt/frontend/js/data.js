// Base URL for all API requests
const API_BASE = 'http://localhost:5000/api';

// Get the saved login token from localStorage
function getToken() {
  return localStorage.getItem('lf_token') || '';
}

// Build headers including the auth token for protected requests
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

// Store handles all communication with the backend API
const Store = {

  // Fetch items from the server, optionally filtered by type, category, or search text
  async getItems(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/items?${params}`);
    if (!res.ok) throw new Error('Could not load items');
    return res.json();
  },

  // Get a single item by its ID
  async getItemById(id) {
    const res = await fetch(`${API_BASE}/items/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  // Submit a new lost or found item report
  async addItem(item) {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || 'Could not submit item');
    }
    return res.json();
  },

  // Delete an item the current user reported
  async deleteItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || 'Could not delete item');
    }
    return true;
  },

  // Update the status of an item (e.g. mark it as resolved)
  async updateItem(id, updates) {
    const res = await fetch(`${API_BASE}/items/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || 'Could not update item');
    }
    return res.json();
  },

  // Get all matches for a specific item
  async getMatchesForItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}/matches`);
    if (!res.ok) return [];
    return res.json();
  },

  // Get all matched pairs across all items
  async getAllMatches() {
    const res = await fetch(`${API_BASE}/items/matches/all`);
    if (!res.ok) return [];
    return res.json();
  },

  // Log in with email and password
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Login failed');
    localStorage.setItem('lf_token', data.token);
    localStorage.setItem('lf_user', JSON.stringify(data.user));
    return data.user;
  },

  // Create a new account
  async signup(name, email, password, dept) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, dept })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Signup failed');
    localStorage.setItem('lf_token', data.token);
    localStorage.setItem('lf_user', JSON.stringify(data.user));
    return data.user;
  },

  // Log in as the built-in demo account
  async demoLogin() {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Demo login failed');
    localStorage.setItem('lf_token', data.token);
    localStorage.setItem('lf_user', JSON.stringify(data.user));
    return data.user;
  },

  // Return the logged-in user object, or null if not logged in
  getCurrentUser() {
    const raw = localStorage.getItem('lf_user');
    return raw ? JSON.parse(raw) : null;
  },

  // Remove the saved token and user, effectively logging out
  logout() {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
  }
};
