// Smart Order Algorithm — Prompt Maestro
// Calculates recommended purchase quantities based on historical consumption

import type { InventoryItem, OrderRecommendation, Product } from '@/types'

interface WeekHistory {
  weekId: string
  startDate: string
  items: { productId: string; consumed: number }[]
}

interface AlgorithmConfig {
  daysToOperate: number       // days from purchase to end of week (default: 6)
  safetyMultiplier: number    // safety stock multiplier (default: 1.2)
  historyWeeks: number        // how many weeks to analyze (default: 4)
  weekendBoostFactor: number  // weekend consumption boost estimate (default: 1.35)
}

const DEFAULT_CONFIG: AlgorithmConfig = {
  daysToOperate: 6,
  safetyMultiplier: 1.2,
  historyWeeks: 4,
  weekendBoostFactor: 1.35,
}

/**
 * Main algorithm: calculates recommended order quantities
 *
 * Formula:
 *   dailyAverage = weeklyAverage / 6
 *   safetyStock  = ceil(dailyAverage * safetyMultiplier)
 *   recommended  = ceil(dailyAverage * daysToOperate + safetyStock) - currentStock
 */
export function calculateOrderRecommendations(
  inventory: InventoryItem[],
  history: WeekHistory[],
  config: Partial<AlgorithmConfig> = {}
): OrderRecommendation[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  return inventory.map((item) => {
    const { product, currentStock } = item

    // Gather historical consumption for this product
    const historicalConsumed = history
      .slice(-cfg.historyWeeks)
      .map((w) => w.items.find((i) => i.productId === product.id)?.consumed ?? 0)

    const weeklyAverage =
      historicalConsumed.length > 0
        ? historicalConsumed.reduce((a, b) => a + b, 0) / historicalConsumed.length
        : item.consumed

    const dailyAverage = weeklyAverage / 6

    const safetyStock = Math.ceil(dailyAverage * cfg.safetyMultiplier)

    const grossNeed = Math.ceil(dailyAverage * cfg.daysToOperate + safetyStock)
    const recommendedOrder = Math.max(0, grossNeed - currentStock)

    // Trend analysis
    const trend = detectTrend(historicalConsumed)

    // Confidence score based on data quality
    const confidence = calculateConfidence(historicalConsumed, history.length)

    // Human-readable reason
    const reason = buildReason(product, dailyAverage, weeklyAverage, cfg.daysToOperate, recommendedOrder)

    return {
      productId: product.id,
      product,
      currentStock,
      weeklyAverage: Math.round(weeklyAverage),
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      daysToOperate: cfg.daysToOperate,
      safetyStock,
      recommendedOrder,
      trend,
      confidence,
      reason,
    }
  })
}

/**
 * Detect consumption trend across weeks
 */
function detectTrend(history: number[]): 'up' | 'stable' | 'down' {
  if (history.length < 2) return 'stable'

  const recent = history.slice(-2)
  const older = history.slice(0, -2)

  if (older.length === 0) return 'stable'

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  if (olderAvg === 0) return 'stable'

  const change = (recentAvg - olderAvg) / olderAvg
  if (change > 0.08) return 'up'
  if (change < -0.08) return 'down'
  return 'stable'
}

/**
 * Calculate confidence score (0-100) based on data quality
 */
function calculateConfidence(history: number[], totalWeeks: number): number {
  if (totalWeeks === 0) return 50

  const coverage = Math.min(1, history.length / 4)  // 4+ weeks = full coverage
  const consistency = calculateConsistency(history)
  const baseScore = 60

  return Math.round(baseScore + coverage * 20 + consistency * 20)
}

/**
 * Calculate consistency score (0-1) based on coefficient of variation
 */
function calculateConsistency(values: number[]): number {
  if (values.length < 2) return 0.5

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0

  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  const cv = Math.sqrt(variance) / mean

  // CV < 0.2 = very consistent, CV > 0.5 = inconsistent
  return Math.max(0, Math.min(1, 1 - cv * 1.5))
}

/**
 * Build human-readable recommendation reason
 */
function buildReason(
  product: Product,
  dailyAvg: number,
  weeklyAvg: number,
  days: number,
  qty: number
): string {
  if (qty === 0) {
    return `Stock suficiente para los próximos ${days} días.`
  }
  return (
    `Basado en ${Math.round(weeklyAvg)} uds/semana (${dailyAvg.toFixed(1)}/día). ` +
    `Pedido cubre ${days} días + margen de seguridad.`
  )
}

/**
 * Format algorithm explanation for display
 */
export function formatAlgorithmSteps(rec: OrderRecommendation): string[] {
  return [
    `Promedio diario: ${rec.weeklyAverage} ÷ 6 = ${rec.dailyAverage} uds/día`,
    `Necesidad bruta: ${rec.dailyAverage} × ${rec.daysToOperate} días = ${Math.ceil(rec.dailyAverage * rec.daysToOperate)} uds`,
    `Stock de seguridad: +${rec.safetyStock} uds (×1.2)`,
    `Stock actual: −${rec.currentStock} uds`,
    `→ Pedir: ${rec.recommendedOrder} uds`,
  ]
}
