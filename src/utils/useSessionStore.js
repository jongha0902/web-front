import { create } from 'zustand';

const useSessionStore = create(set => ({
  isSessionExpired: false,
  setSessionExpired: (val) => set({ isSessionExpired: val })
}));

export default useSessionStore;
