import type {
  Product,
  Week,
  InventoryItem,
  Comanda,
  WeeklyReport,
  OrderRecommendation,
  DailySales,
} from '@/types'

// ─── Mock Products ────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Coca Cola Original',
    shortName: 'Coca',
    category: 'refrescos',
    unit: 'pieza',
    isActive: true,
    aliases: ['coca', 'cc', 'coca cola', 'coke', 'cola'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p2',
    name: 'Delaware Punch',
    shortName: 'Delaware',
    category: 'refrescos',
    unit: 'pieza',
    isActive: true,
    aliases: ['delaware', 'dela', 'punch', 'dp'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p3',
    name: 'Sprite',
    shortName: 'Sprite',
    category: 'refrescos',
    unit: 'pieza',
    isActive: true,
    aliases: ['sprite', 'spr', 'sprit'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p4',
    name: 'Agua Mineral',
    shortName: 'Mineral',
    category: 'aguas',
    unit: 'pieza',
    isActive: true,
    aliases: ['mineral', 'agua', 'water'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p5',
    name: 'Jarritos Mandarina',
    shortName: 'Jarritos',
    category: 'refrescos',
    unit: 'pieza',
    isActive: true,
    aliases: ['jarritos', 'jarrito', 'mandarina'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p6',
    name: 'Jugo de Naranja',
    shortName: 'Naranja',
    category: 'jugos',
    unit: 'pieza',
    isActive: true,
    aliases: ['naranja', 'jugo naranja', 'oj', 'orange'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p7',
    name: 'Agua de Tamarindo',
    shortName: 'Tamarindo',
    category: 'aguas',
    unit: 'litro',
    isActive: true,
    aliases: ['tamarindo', 'tama'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p8',
    name: 'Cerveza Corona',
    shortName: 'Corona',
    category: 'cervezas',
    unit: 'pieza',
    isActive: true,
    aliases: ['corona', 'cerveza', 'chela'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p9',
    name: 'Tónica',
    shortName: 'Tónica',
    category: 'mixers',
    unit: 'pieza',
    isActive: true,
    aliases: ['tonica', 'tonic', 'schweppes'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p10',
    name: 'Jugo de Mango',
    shortName: 'Mango',
    category: 'jugos',
    unit: 'pieza',
    isActive: true,
    aliases: ['mango', 'jugo mango'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
]

// ─── Mock Week ────────────────────────────────────────────────────────────────

export const MOCK_ACTIVE_WEEK: Week = {
  id: 'w1',
  startDate: '2025-01-14',
  endDate: '2025-01-19',
  status: 'open',
  createdAt: '2025-01-14',
}

// ─── Mock Inventory ───────────────────────────────────────────────────────────

export const MOCK_INVENTORY: InventoryItem[] = MOCK_PRODUCTS.map((p, i) => {
  const initials = [120, 80, 50, 40, 30, 25, 15, 48, 20, 18]
  const sold = [42, 28, 18, 12, 10, 8, 5, 16, 7, 6]
  return {
    id: `inv-${p.id}`,
    weekId: 'w1',
    productId: p.id,
    product: p,
    initialStock: initials[i],
    purchasedStock: 0,
    finalStock: null,
    consumed: sold[i],
    currentStock: initials[i] - sold[i],
  }
})

// ─── Mock Daily Sales ─────────────────────────────────────────────────────────

const DAYS = ['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DATES = ['2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19']
const SALES_PATTERN = [
  [8, 5, 3, 2, 2, 1, 0, 3, 1, 1],
  [6, 4, 2, 1, 1, 1, 1, 2, 1, 0],
  [10, 6, 4, 3, 2, 1, 1, 3, 1, 1],
  [14, 9, 5, 4, 3, 2, 1, 4, 2, 2],
  [18, 12, 7, 6, 4, 3, 2, 6, 3, 3],
  [16, 10, 6, 5, 3, 2, 1, 5, 2, 2],
]

export const MOCK_DAILY_SALES: DailySales[] = DAYS.map((dayName, di) => ({
  date: DATES[di],
  dayName,
  items: MOCK_PRODUCTS.map((p, pi) => ({
    productId: p.id,
    productName: p.shortName,
    quantity: SALES_PATTERN[di][pi],
  })),
  total: SALES_PATTERN[di].reduce((a, b) => a + b, 0),
}))

// ─── Mock Weekly Report ───────────────────────────────────────────────────────

export const MOCK_WEEKLY_REPORT: WeeklyReport = {
  week: MOCK_ACTIVE_WEEK,
  topProducts: MOCK_PRODUCTS.slice(0, 5).map((p, i) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    totalConsumed: [72, 46, 27, 21, 15][i],
    dailyAverage: [12, 7.7, 4.5, 3.5, 2.5][i],
    weeklyTrend: [8, 3, -2, 5, 12][i],
    rank: i + 1,
  })),
  bottomProducts: MOCK_PRODUCTS.slice(5).map((p, i) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    totalConsumed: [11, 5, 27, 16, 12][i],
    dailyAverage: [1.8, 0.8, 4.5, 2.7, 2][i],
    weeklyTrend: [-5, -10, 2, 0, -3][i],
    rank: i + 6,
  })),
  dailySales: MOCK_DAILY_SALES,
  totalItems: 152,
  totalComandas: 38,
}

// ─── Mock Order Recommendations ───────────────────────────────────────────────

export const MOCK_RECOMMENDATIONS: OrderRecommendation[] = MOCK_PRODUCTS.map((p, i) => {
  const consumed = [72, 46, 27, 21, 15, 11, 5, 27, 16, 12]
  const currentStock = [78, 52, 32, 28, 20, 14, 10, 32, 13, 12]
  const dailyAvg = consumed[i] / 6
  const daysToOperate = 6
  const safetyStock = Math.ceil(dailyAvg * 1.2)
  const recommended = Math.ceil(dailyAvg * daysToOperate + safetyStock - currentStock[i])
  const trends = ['up', 'up', 'stable', 'up', 'up', 'down', 'down', 'stable', 'stable', 'down'] as const

  return {
    productId: p.id,
    product: p,
    currentStock: currentStock[i],
    weeklyAverage: consumed[i],
    dailyAverage: Math.round(dailyAvg * 10) / 10,
    daysToOperate,
    safetyStock,
    recommendedOrder: Math.max(0, recommended),
    trend: trends[i],
    confidence: [92, 88, 75, 80, 70, 65, 60, 78, 72, 68][i],
    reason:
      recommended > 0
        ? `Basado en ${consumed[i]} uds/semana (${Math.round(dailyAvg * 10) / 10}/día). Viernes y sábados +35%.`
        : 'Stock suficiente para la semana.',
  }
})

// ─── Text Parser ──────────────────────────────────────────────────────────────

export function parseComandaText(
  text: string,
  products: Product[]
): { items: { productId: string; product: Product; quantity: number; rawText: string; confidence: number }[]; unrecognized: string[] } {
  const lines = text
    .toLowerCase()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const items: ReturnType<typeof parseComandaText>['items'] = []
  const unrecognized: string[] = []

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(.+)$/)
    if (!match) {
      const noNumMatch = line.match(/^([a-záéíóúñü\s]+)$/)
      if (noNumMatch) {
        const found = findProduct(noNumMatch[1].trim(), products)
        if (found) {
          items.push({ productId: found.id, product: found, quantity: 1, rawText: line, confidence: 0.9 })
        } else {
          unrecognized.push(line)
        }
      } else {
        unrecognized.push(line)
      }
      continue
    }

    const quantity = parseInt(match[1], 10)
    const term = match[2].trim()
    const found = findProduct(term, products)

    if (found) {
      const existing = items.find((i) => i.productId === found.id)
      if (existing) {
        existing.quantity += quantity
      } else {
        items.push({ productId: found.id, product: found, quantity, rawText: line, confidence: 0.95 })
      }
    } else {
      unrecognized.push(line)
    }
  }

  return { items, unrecognized }
}

function findProduct(term: string, products: Product[]): Product | null {
  const normalized = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  for (const p of products) {
    const allTerms = [
      p.name.toLowerCase(),
      p.shortName.toLowerCase(),
      ...p.aliases.map((a) => a.toLowerCase()),
    ].map((t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))

    if (allTerms.some((t) => t === normalized || t.startsWith(normalized) || normalized.startsWith(t))) {
      return p
    }
  }

  return null
}
