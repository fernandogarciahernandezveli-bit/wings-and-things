import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User,
  AuthState,
  ViewMode,
  Notification,
  Week,
  Product,
  Comanda,
  ParsedItem,
} from '@/types'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthStore extends AuthState {
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
)

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIStore {
  currentView: ViewMode
  sidebarOpen: boolean
  notifications: Notification[]
  setView: (view: ViewMode) => void
  toggleSidebar: () => void
  addNotification: (notif: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  notifications: [],
  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (notif) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ notifications: [...s.notifications, { ...notif, id }] }))
    const duration = notif.duration ?? 3500
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
      }, duration)
    }
  },
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))

// ─── Comanda Store (active session) ──────────────────────────────────────────

interface ComandaStore {
  currentItems: ParsedItem[]
  inputText: string
  isCapturing: boolean
  savedComandas: Comanda[]
  addItem: (item: ParsedItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearItems: () => void
  setInputText: (text: string) => void
  setCapturing: (v: boolean) => void
  addComanda: (comanda: Comanda) => void
}

export const useComandaStore = create<ComandaStore>((set) => ({
  currentItems: [],
  inputText: '',
  isCapturing: false,
  savedComandas: [],
  addItem: (item) =>
    set((s) => {
      const existing = s.currentItems.find((i) => i.productId === item.productId)
      if (existing) {
        return {
          currentItems: s.currentItems.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        }
      }
      return { currentItems: [...s.currentItems, item] }
    }),
  removeItem: (productId) =>
    set((s) => ({ currentItems: s.currentItems.filter((i) => i.productId !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((s) => ({
      currentItems: s.currentItems.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    })),
  clearItems: () => set({ currentItems: [], inputText: '' }),
  setInputText: (text) => set({ inputText: text }),
  setCapturing: (v) => set({ isCapturing: v }),
  addComanda: (comanda) =>
    set((s) => ({ savedComandas: [comanda, ...s.savedComandas] })),
}))

// ─── Inventory Store ──────────────────────────────────────────────────────────

interface InventoryStore {
  activeWeek: Week | null
  products: Product[]
  setActiveWeek: (week: Week | null) => void
  setProducts: (products: Product[]) => void
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  activeWeek: null,
  products: [],
  setActiveWeek: (week) => set({ activeWeek: week }),
  setProducts: (products) => set({ products }),
}))
