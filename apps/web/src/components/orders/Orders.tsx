import { useState, useMemo, useEffect } from 'react'
import { ShoppingCart, Download, CheckSquare, Info, History, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, StatCard, Modal } from '@/components/ui'
import { useUIStore, useAuthStore } from '@/store'
import { ordersApi, weeksApi, productsApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { generateOrderPDF } from '@/utils/pdfExport'
import { exportOrderList } from '@/utils/excelExport'

export function Orders() {
  const queryClient = useQueryClient()
  const { addNotification } = useUIStore()
  const { user } = useAuthStore()
  
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [view, setView] = useState<'recommend' | 'history'>('recommend')
  
  // Confirmation modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [extraReason, setExtraReason] = useState('')

  // 1. Fetch weeks
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: weeksApi.getAll
  })

  // Initialize selectedWeekId from active week or first available only once
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const active = weeks.find((w: any) => w.status === 'open')
      setSelectedWeekId(active ? active.id : weeks[0].id)
    }
  }, [weeks, selectedWeekId])

  const selectedWeek = useMemo(() => weeks.find((w: any) => w.id === selectedWeekId), [weeks, selectedWeekId])
  const isSelectedActive = selectedWeek?.status === 'open'
  const activeWeek = useMemo(() => weeks.find((w: any) => w.status === 'open'), [weeks])

  // 2. Fetch products to get unitsPerPackage
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll
  })

  // 3. Fetch recommendations
  const { data: recommendations = [], isLoading: loadingRecs } = useQuery({
    queryKey: ['orders', 'recommend', selectedWeekId],
    queryFn: () => ordersApi.getRecommendations(selectedWeekId!),
    enabled: !!selectedWeekId
  })

  // 4. Fetch history
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['orders', 'history', selectedWeekId],
    queryFn: () => ordersApi.getHistory(selectedWeekId!),
    enabled: !!selectedWeekId && view === 'history'
  })

  // 5. Mutations
  const confirmOrder = useMutation({
    mutationFn: (data: any) => ordersApi.confirm(data),
    onSuccess: (response) => {
      addNotification({ type: 'success', message: 'Pedido confirmado exitosamente' })
      generateOrderPDF(response, user, selectedWeek)
      setOverrides({})
      setIsConfirmModalOpen(false)
      setExtraReason('')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details'] })
      refetchHistory()
    },
    onError: (error: any) => {
      console.error('Error confirming order:', error)
      addNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error al confirmar pedido' 
      })
    }
  })

  const totalToOrder = recommendations.reduce((sum: number, r: any) => {
    const qty = overrides[r.productId] ?? r.recommended
    return sum + qty
  }, 0)

  // Get unitsPerPackage for a product
  const getUnitsPerPackage = (productId: string) => {
    const product = products.find((p: any) => p.id === productId)
    return product?.unitsPerPackage || 1
  }

  // Calculate packages from units
  const calculatePackages = (units: number, productId: string) => {
    const unitsPerPackage = getUnitsPerPackage(productId)
    return Math.ceil(units / unitsPerPackage)
  }

  // Calculate units from packages
  const calculateUnits = (packages: number, productId: string) => {
    const unitsPerPackage = getUnitsPerPackage(productId)
    return packages * unitsPerPackage
  }

  const itemsToOrder = recommendations.filter((r: any) => (overrides[r.productId] ?? r.recommended) > 0).length

  const handleOverride = (id: string, val: string) => {
    const packages = parseInt(val, 10)
    if (!isNaN(packages) && packages >= 0) {
      const units = calculateUnits(packages, id)
      setOverrides((prev) => ({ ...prev, [id]: units }))
    }
  }

  const handleConfirm = () => {
    if (!selectedWeekId || totalToOrder === 0) return
    
    confirmOrder.mutate({
      weekId: selectedWeekId,
      items: recommendations.map((r: any) => ({
        productId: r.productId,
        quantity: overrides[r.productId] ?? r.recommended,
        recommended: r.recommended
      })),
      reason: extraReason || undefined
    })
  }

  const handleExportExcel = () => {
    if (!selectedWeek) return
    const weekLabel = `Semana ${format(new Date(selectedWeek.startDate), 'dd/MM/yyyy')}`
    
    const recsForExcel = recommendations.map((r: any) => ({
      productId: r.productId,
      productName: r.productName,
      currentStock: r.currentStock,
      consumed: r.consumed,
      recommended: r.recommended,
      recommendedOrder: overrides[r.productId] ?? r.recommended
    }))
    
    exportOrderList(recsForExcel, weekLabel)
  }

  if (loadingRecs && !recommendations.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Pedido inteligente</h1>
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
            <span className="text-dark-400">·</span>
            {isSelectedActive ? (
              <span className="text-success text-sm font-medium">Activa</span>
            ) : (
              <span className="text-dark-300 text-sm font-medium">Cerrada</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-dark-800 rounded-lg p-1 mr-4">
            <button
              onClick={() => setView('recommend')}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2', view === 'recommend' ? 'bg-dark-600 text-white' : 'text-dark-300 hover:text-white')}
            >
              <ShoppingCart size={14} /> Recomendación
            </button>
            <button
              onClick={() => setView('history')}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2', view === 'history' ? 'bg-dark-600 text-white' : 'text-dark-300 hover:text-white')}
            >
              <History size={14} /> Historial
            </button>
          </div>
          
          {view === 'recommend' && (
            <>
              <button onClick={handleExportExcel} className="btn-ghost flex items-center gap-2 text-sm">
                <Download size={14} /> Excel
              </button>
              {isSelectedActive && (
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={confirmOrder.isPending || totalToOrder === 0 || !selectedWeekId}
                  className="btn-primary flex items-center gap-2"
                >
                  {confirmOrder.isPending ? (
                    <div className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={16} /> 
                      Confirmar pedido
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {view === 'recommend' ? (
        <>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-info/8 border border-info/20">
            <Info size={16} className="text-info mt-0.5 flex-shrink-0" />
            <div className="text-xs text-dark-100 leading-relaxed">
              <span className="text-info font-semibold">Algoritmo predictivo</span> — Basado en consumo actual y niveles de par (50 uds). Puedes ajustar manualmente cualquier cantidad antes de confirmar.
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Productos a pedir" value={itemsToOrder} sub="referencias" icon={<ShoppingCart size={18} />} color="text-accent" />
            <StatCard label="Total piezas" value={totalToOrder} sub="unidades" />
            <StatCard label="Ajustados" value={Object.keys(overrides).length} sub="manualmente" />
            <StatCard 
              label="Estado" 
              value={selectedWeek?.status === 'open' ? 'Semana activa' : 'Semana cerrada'} 
              color={selectedWeek?.status === 'open' ? 'text-success' : 'text-dark-300'} 
            />
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-dark-600/50 flex items-center justify-between">
              <h2 className="section-title">Recomendaciones de pedido</h2>
              <span className="text-xs text-dark-300">Haz clic en la cantidad para ajustar</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-600/30">
                  {['Producto', 'Stock actual', 'Consumo', 'Recomendado', 'Paquetes', 'PEDIR (paq)'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec: any) => {
                  const qty = overrides[rec.productId] ?? rec.recommended
                  const isOverridden = overrides[rec.productId] !== undefined
                  const unitsPerPackage = getUnitsPerPackage(rec.productId)
                  const packages = calculatePackages(qty, rec.productId)

                  return (
                    <tr
                      key={rec.productId}
                      className={clsx(
                        'border-b border-dark-600/20 hover:bg-dark-700/30 transition-colors',
                        qty === 0 && 'opacity-50'
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white">{rec.productName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={clsx('text-sm font-mono', rec.currentStock < 10 ? 'text-danger' : 'text-white')}>
                          {rec.currentStock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-mono text-accent">{rec.consumed}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-mono text-dark-200">{rec.recommended} uds</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={clsx('text-sm font-mono', unitsPerPackage > 1 ? 'text-accent' : 'text-dark-300')}>
                          {packages} {unitsPerPackage > 1 ? 'paq' : ''}
                        </span>
                        {unitsPerPackage > 1 && (
                          <span className="text-xs text-dark-400 ml-1">({unitsPerPackage} uds/paq)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={packages}
                            onChange={(e) => handleOverride(rec.productId, e.target.value)}
                            className={clsx(
                              'w-20 text-center font-mono font-bold text-base rounded-lg px-2 py-1.5 border outline-none transition-all',
                              isOverridden
                                ? 'bg-accent/10 border-accent/40 text-accent'
                                : 'bg-dark-700 border-dark-500/60 text-white focus:border-accent/50'
                            )}
                          />
                          {isOverridden && (
                            <button
                              onClick={() => setOverrides((p) => { const n = { ...p }; delete n[rec.productId]; return n })}
                              className="text-xs text-dark-300 hover:text-accent transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {history.length === 0 ? (
            <div className="card p-10 text-center opacity-50">
              <History size={32} className="mx-auto mb-3 text-dark-300" />
              <p className="text-dark-200">No hay pedidos registrados en esta semana</p>
            </div>
          ) : (
            history.map((order: any) => (
              <div key={order.id} className="card p-5 flex items-center justify-between group hover:border-dark-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-accent">
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Pedido {format(new Date(order.confirmedAt), 'dd/MM/yyyy HH:mm')}</p>
                      {order.reason && <Badge variant="warning">Extraordinario</Badge>}
                    </div>
                    <p className="text-xs text-dark-300">{order.items.length} productos · {order.items.reduce((a: number, i: any) => a + i.quantity, 0)} unidades</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {order.items.slice(0, 3).map((item: any) => (
                        <span key={item.id} className="text-xs text-dark-400">
                          {item.product.shortName}: {item.packages || item.quantity} {item.packages ? 'paq' : 'uds'}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-dark-400">+{order.items.length - 3} más</span>
                      )}
                    </div>
                    {order.reason && <p className="text-xs text-dark-400 mt-1 italic">"{order.reason}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => generateOrderPDF(order, user, selectedWeek)}
                    className="btn-ghost flex items-center gap-2 text-xs"
                    title="Descargar PDF"
                  >
                    <Download size={14} /> PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmar Pedido"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-dark-200">¿Estás seguro de confirmar este pedido de {totalToOrder} piezas?</p>
          
          <div>
            <label className="text-xs text-dark-300 mb-1.5 block">Motivo / Nota (Opcional)</label>
            <textarea
              className="input h-20 resize-none text-sm"
              placeholder="Ej: Pedido extraordinario por evento..."
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={() => setIsConfirmModalOpen(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={confirmOrder.isPending}
              className="btn-primary flex-1"
            >
              {confirmOrder.isPending ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
