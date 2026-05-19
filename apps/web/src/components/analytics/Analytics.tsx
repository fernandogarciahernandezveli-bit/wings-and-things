import { useState, useMemo, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Download, Calendar } from 'lucide-react'
import { clsx } from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  Radar, Legend, Cell, LineChart, Line
} from 'recharts'
import { Badge, StatCard } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, weeksApi } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { exportWeeklyAnalytics } from '@/utils/excelExport'

const COLORS = ['#e8a838', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#84cc16', '#06b6d4']

const customTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-700 border border-dark-500/60 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-dark-100 font-medium mb-1.5">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color ?? e.fill }} className="font-medium">
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  )
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState<'consumo' | 'productos' | 'tendencias'>('consumo')
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)

  // 1. Fetch weeks
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: weeksApi.getAll
  })

  // Initialize selectedWeekId from active week or first available only once
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const active = weeks.find(w => w.status === 'open')
      setSelectedWeekId(active ? active.id : weeks[0].id)
    }
  }, [weeks, selectedWeekId])

  const selectedWeek = useMemo(() => weeks.find(w => w.id === (selectedWeekId || weeks[0]?.id)), [weeks, selectedWeekId])

  // 2. Fetch analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', selectedWeek?.id],
    queryFn: () => analyticsApi.getByWeek(selectedWeek!.id),
    enabled: !!selectedWeek
  })

  const dailyData = analytics?.dailySales.map((d: any, i: number) => ({
    dia: d.dayName.slice(0, 3),
    total: d.total,
    items: d.itemsCount,
    key: `analytics-daily-${d.dayName}-${i}`
  })) || []

  const topProducts = analytics?.topProducts || []
  
  const productData = topProducts.map((p: any, i: number) => ({
    name: p.productName.split(' ')[0],
    consumo: p.totalConsumed,
    color: COLORS[i % COLORS.length],
    key: `analytics-product-${p.productId}-${i}`
  }))

  const radarData = dailyData.map((d: any) => ({
    dia: d.dia,
    consumo: d.total,
  }))

  const TABS = [
    { id: 'consumo' as const, label: 'Consumo diario' },
    { id: 'productos' as const, label: 'Por producto' },
    { id: 'tendencias' as const, label: 'Tendencias' },
  ]

  const handleExport = () => {
    if (analytics) {
      const weekLabel = format(new Date(selectedWeek!.startDate), 'dd-MM-yyyy')
      const report = {
        topProducts: analytics.topProducts.map((p: any, i: number) => ({
          rank: i + 1,
          productId: p.productId,
          productName: p.productName,
          category: '', 
          totalConsumed: p.totalConsumed,
          dailyAverage: p.totalConsumed / 7,
          weeklyTrend: 0
        })),
        dailySales: analytics.dailySales,
        totalItems: analytics.totalItems,
        totalComandas: analytics.totalComandas,
        bottomProducts: []
      }
      exportWeeklyAnalytics(report as any, activeTab, weekLabel)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analíticas</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <select
              value={selectedWeekId || ''}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="bg-transparent border-none text-sm text-dark-200 focus:ring-0 p-0 cursor-pointer hover:text-white transition-colors"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id} className="bg-dark-800">
                  Semana {format(new Date(w.startDate), 'dd/MM/yyyy')} - {format(new Date(w.endDate), 'dd/MM/yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm">
          <Download size={14} /> Exportar reporte
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total consumido" value={analytics?.totalItems || 0} sub="piezas" />
            <StatCard label="Comandas" value={analytics?.totalComandas || 0} sub="registradas" />
            <StatCard label="Día más activo" value={dailyData.sort((a: any, b: any) => b.total - a.total)[0]?.dia || '-'} sub={`${dailyData.sort((a: any, b: any) => b.total - a.total)[0]?.total || 0} comandas`} />
            <StatCard label="Producto líder" value={topProducts[0]?.productName.split(' ')[0] || '-'} sub={`${topProducts[0]?.totalConsumed || 0} piezas`} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-dark-800 border border-dark-600/50 rounded-xl p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === t.id ? 'bg-dark-600 text-white' : 'text-dark-200 hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Consumo diario */}
          {activeTab === 'consumo' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-5 col-span-2">
                <h2 className="section-title mb-5">Consumo por día</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26262f" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                    <Tooltip content={customTooltip} />
                    <Bar dataKey="total" name="Comandas" fill="#e8a838" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                    <Bar dataKey="items" name="Productos" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-5">
                <h2 className="section-title mb-5">Distribución semanal</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#26262f" />
                    <PolarAngleAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6b6b7a' }} />
                    <Radar name="Consumo" dataKey="consumo" stroke="#e8a838" fill="#e8a838" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab: Por producto */}
          {activeTab === 'productos' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <h2 className="section-title mb-5">Consumo total por producto</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productData} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26262f" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9898a8' }} axisLine={false} tickLine={false} width={64} />
                    <Tooltip content={customTooltip} />
                    <Bar dataKey="consumo" name="Consumo" radius={[0, 4, 4, 0]}>
                      {productData.map((e: any, i: number) => (
                        <Cell key={i} fill={e.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-5">
                <h2 className="section-title mb-4">Ranking de productos</h2>
                <div className="flex flex-col gap-3">
                  {topProducts.map((p: any, i: number) => {
                    const maxConsumed = topProducts[0]?.totalConsumed || 1
                    return (
                      <div key={p.productId} className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] + '25', color: COLORS[i % COLORS.length] }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-white font-medium truncate">{p.productName.split(' ')[0]}</p>
                            <span className="text-xs font-mono text-dark-100 ml-2">{p.totalConsumed} uds</span>
                          </div>
                          <div className="w-full h-1.5 bg-dark-600 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(p.totalConsumed / maxConsumed) * 100}%`, background: COLORS[i % COLORS.length] }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Tendencias */}
          {activeTab === 'tendencias' && (
            <div className="card p-5">
              <h2 className="section-title mb-5">Tendencia de consumo</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262f" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Comandas" stroke="#e8a838" strokeWidth={3} />
                  <Line type="monotone" dataKey="items" name="Productos" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
