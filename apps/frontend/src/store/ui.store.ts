import { create } from 'zustand'

interface UIState {
  // Create group modal
  isCreateGroupOpen: boolean
  openCreateGroup: () => void
  closeCreateGroup: () => void

  // Photo lightbox
  lightboxGroupId: string | null
  lightboxPhotoIndex: number
  openLightbox: (groupId: string, index: number) => void
  closeLightbox: () => void

  // Global loading overlay
  isGlobalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isCreateGroupOpen: false,
  openCreateGroup: () => set({ isCreateGroupOpen: true }),
  closeCreateGroup: () => set({ isCreateGroupOpen: false }),

  lightboxGroupId: null,
  lightboxPhotoIndex: 0,
  openLightbox: (groupId, index) => set({ lightboxGroupId: groupId, lightboxPhotoIndex: index }),
  closeLightbox: () => set({ lightboxGroupId: null, lightboxPhotoIndex: 0 }),

  isGlobalLoading: false,
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}))
