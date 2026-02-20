import { create } from 'zustand'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  isLoading: boolean

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  addMessage: (message: ChatMessage) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  (set) => ({
    isOpen: false,
    messages: [],
    isLoading: false,

    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open: boolean) => set({ isOpen: open }),
    addMessage: (message: ChatMessage) =>
      set((state) => ({ messages: [...state.messages, message] })),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    clearMessages: () => set({ messages: [] }),
  })
)
