import { Package, ClipboardList, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { StatCard, Badge } from '@/components/ui'
import { useUIStore } from '@/store'
import { useQuery } from '@tanstack/react-query'
import { weeksApi, analyticsApi, inventoryApi } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const CHART_COLORS = ['#e8a838', '#3b82f6', '#22c55e', '#ef4444', '#a855f7']

export function Dashboard() {
  const { setView } = useUIStore()

  // 1. Fetch active week
  const { data: activeWeek, isLoading: loadingWeek } = useQuery({
    queryKey: ['weeks', 'active'],
    queryFn: weeksApi.getActive
  })

  // 2. Fetch analytics
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics', activeWeek?.id],
    queryFn: () => analyticsApi.getByWeek(activeWeek!.id),
    enabled: !!activeWeek
  })

  // 3. Fetch inventory (for low stock alerts)
  const { data: inventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory', activeWeek?.id],
    queryFn: () => inventoryApi.getByWeek(activeWeek!.id),
    enabled: !!activeWeek
  })

  if (loadingWeek || loadingAnalytics || loadingInventory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!activeWeek) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-xl font-bold text-white mb-2">No hay una semana activa</h2>
        <p className="text-dark-200 mb-6">Inicia una nueva semana en configuraciones para comenzar a registrar datos.</p>
        <button onClick={() => setView('settings')} className="btn-primary mx-auto">
          Ir a Configuración
        </button>
      </div>
    )
  }

  const totalConsumed = analytics?.totalItems ?? 0
  const totalComandas = analytics?.totalComandas ?? 0
  const lowStockItems = inventory?.filter((i: any) => (i.initialStock + i.purchasedStock - i.consumed) < 10) ?? []
  
  const dailyData = analytics?.dailySales.map((d: any, i: number) => ({
    day: d.dayName.slice(0, 3),
    total: d.total,
    items: d.itemsCount,
    key: `daily-${d.dayName}-${i}`
  })) || []

  const topData = analytics?.topProducts.map((p: any, i: number) => ({
    name: p.productName.split(' ')[0],
    value: p.totalConsumed,
    color: CHART_COLORS[i % CHART_COLORS.length],
    key: `top-${p.productId}-${i}`
  })) || []

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-dark-700 border border-dark-500/60 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-dark-100 font-medium mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-dark-200 mt-0.5">
            Semana {format(new Date(activeWeek.startDate), 'dd/MM/yyyy')} – {format(new Date(activeWeek.endDate), 'dd/MM/yyyy')} · <span className="text-accent">Activa</span>
          </p>
        </div>
        <button
          onClick={() => setView('comandas')}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <ClipboardList size={16} />
          Nueva Comanda
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Consumo total"
          value={totalConsumed}
          sub="piezas"
          icon={<TrendingUp size={18} />}
          color="text-accent"
        />
        <StatCard
          label="Comandas"
          value={totalComandas}
          sub="esta semana"
          icon={<ClipboardList size={18} />}
          color="text-info"
        />
        <StatCard
          label="Productos activos"
          value={inventory?.length || 0}
          sub="en inventario"
          icon={<Package size={18} />}
          color="text-success"
        />
        <StatCard
          label="Stock bajo"
          value={lowStockItems.length}
          sub="productos"
          icon={<AlertTriangle size={18} />}
          color={lowStockItems.length > 0 ? 'text-danger' : 'text-dark-300'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Daily Sales */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Comandas por día</h2>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262f" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                <Tooltip content={customTooltip} />
                <Line type="monotone" dataKey="total" name="Comandas" stroke="#e8a838" strokeWidth={3} dot={{ fill: '#e8a838', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="items" name="Productos" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Top Products */}
        <div className="card p-5">
          <h2 className="section-title mb-5">Top 5 productos</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262f" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b6b7a' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9898a8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="value" name="Consumo" radius={[0, 4, 4, 0]}>
                  {topData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Alertas de stock</h2>
            <button onClick={() => setView('inventory')} className="flex items-center gap-1 text-xs text-accent hover:text-accent-light transition-colors">
              Ver todo <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {lowStockItems.slice(0, 5).map((item: any) => {
              const currentStock = item.initialStock + item.purchasedStock - item.consumed
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-dark-600/30 last:border-0">
                  <span className="text-sm text-white">{item.product.shortName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={currentStock < 10 ? 'danger' : 'warning'}>
                      {currentStock} uds
                    </Badge>
                  </div>
                </div>
              )
            })}
            {lowStockItems.length === 0 && (
              <p className="text-sm text-dark-300 py-4 text-center">No hay alertas de stock bajo</p>
            )}
          </div>
        </div>

        {/* Weekly Pattern Insight */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Patrón semanal</h2>
          <div className="flex flex-col gap-3">
            {dailyData.map((day: any) => {
              const max = Math.max(...dailyData.map((d: any) => d.total), 1)
              const pct = (day.total / max) * 100
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <span className="text-xs text-dark-200 w-8">{day.day}</span>
                  <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-white w-4">{day.total}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
