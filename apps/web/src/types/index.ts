// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'supervisor' | 'bartender'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
}

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'refrescos'
  | 'aguas'
  | 'cervezas'
  | 'licores'
  | 'jugos'
  | 'mixers'
  | 'otros'

export interface Product {
  id: string
  name: string
  shortName: string
  category: ProductCategory
  unit: string
  unitsPerPackage: number
  isActive: boolean
  aliases: string[]
  createdAt: string
  updatedAt: string
}

// ─── Weekly Inventory ─────────────────────────────────────────────────────────

export type WeekStatus = 'open' | 'closed'

export interface Week {
  id: string
  startDate: string
  endDate: string
  status: WeekStatus
  createdAt: string
}

export interface InventoryItem {
  id: string
  weekId: string
  productId: string
  product: Product
  initialStock: number
  purchasedStock: number
  finalStock: number | null
  consumed: number
  currentStock: number
}

// ─── Comandas ─────────────────────────────────────────────────────────────────

export interface Comanda {
  id: string
  weekId: string
  date: string
  createdBy: string
  items: ComandaItem[]
  note: string
  createdAt: string
}

export interface ComandaItem {
  id: string
  comandaId: string
  productId: string
  product: Product
  quantity: number
}

// ─── Parsed comanda from text input ──────────────────────────────────────────

export interface ParsedItem {
  productId: string
  product: Product
  quantity: number
  rawText?: string
  confidence?: number
}

export interface ParseResult {
  items: ParsedItem[]
  unrecognized: string[]
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailySales {
  date: string
  dayName: string
  items: { productId: string; productName: string; quantity: number }[]
  total: number
}

export interface ProductStats {
  productId: string
  productName: string
  category: ProductCategory
  totalConsumed: number
  dailyAverage: number
  weeklyTrend: number
  rank: number
}

export interface WeeklyReport {
  week: Week
  topProducts: ProductStats[]
  bottomProducts: ProductStats[]
  dailySales: DailySales[]
  totalItems: number
  totalComandas: number
}

// ─── Smart Orders ─────────────────────────────────────────────────────────────

export interface OrderRecommendation {
  productId: string
  product: Product
  currentStock: number
  weeklyAverage: number
  dailyAverage: number
  daysToOperate: number
  safetyStock: number
  recommendedOrder: number
  trend: 'up' | 'stable' | 'down'
  confidence: number
  reason: string
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type ViewMode = 'dashboard' | 'inventory' | 'comandas' | 'analytics' | 'orders' | 'settings'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
