'use client';

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentPhase: number | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPhase: (phase: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  currentPhase: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
}));
