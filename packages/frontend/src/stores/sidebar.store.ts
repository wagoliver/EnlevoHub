import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  // Persisted
  isCollapsed: boolean

  // Transient
  isMobileOpen: boolean

  // Actions
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,

      toggleCollapsed: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed })),

      setMobileOpen: (open: boolean) => set({ isMobileOpen: open }),
    }),
    {
      name: 'enlevohub-sidebar',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
      }),
    }
  )
)
