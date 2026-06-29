import { create } from 'zustand';
import { invoke } from '../lib/ipc.js';

export const useAuth = create((set, get) => ({
  user: null,
  status: 'idle', // idle | loading | error
  error: null,

  async login(username, password) {
    set({ status: 'loading', error: null });
    const res = await invoke('auth:login', { username, password });
    if (!res.ok) {
      set({ status: 'error', error: res.reason });
      return res;
    }
    set({ user: res.user, status: 'idle', error: null });
    return res;
  },

  logout() {
    set({ user: null, status: 'idle', error: null });
  },

  setUser(partial) {
    set({ user: { ...get().user, ...partial } });
  },

  isAdmin() {
    return get().user?.role === 'admin';
  },
}));
