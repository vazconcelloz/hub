import { QueryClient } from '@tanstack/react-query';

const isProd = import.meta.env.PROD;
const API_URL = isProd ? '/api' : 'http://localhost:3001/api';

export const queryClient = new QueryClient();

export const api = {
  // Auth methods
  auth: {
    async getUser() {
      const token = localStorage.getItem('hub_token');
      if (!token) return { data: { user: null } };
      
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Token invalido');
        const user = await res.json();
        return { data: { user } };
      } catch (err) {
        return { data: { user: null } };
      }
    },
    async getSession() {
      const { data } = await this.getUser();
      return { data: { session: data.user ? { user: data.user } : null } };
    },
    onAuthStateChange(callback: (evt: string, session: any) => void) {
      // Fake implementation for compatibility
      window.addEventListener('storage', () => {
        this.getSession().then(({ data }) => callback('SIGNED_IN', data.session));
      });
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signOut() {
      localStorage.removeItem('hub_token');
      window.location.href = '/login';
    }
  },
  
  // Custom fetch for other endpoints
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('hub_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Erro na requisição');
    }
    
    return res.json();
  }
};
