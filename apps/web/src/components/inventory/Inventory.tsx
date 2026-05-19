import { useState, useMemo, useEffect } from 'react'
import { Plus, Package, Download, Edit3, AlertTriangle, History } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, ProgressBar, Modal, StatCard } from '@/components/ui'
import { useAuthStore, useUIStore } from '@/store'
import { inventoryApi, weeksApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { exportInventoryToExcel } from '@/utils/excelExport'

const CATEGORY_LABELS: Record<string, string> = {
  refrescos: 'Refrescos',
  aguas: 'Aguas',
  cervezas: 'Cervezas',
  licores: 'Licores',
  jugos: 'Jugos',
  mixers: 'Mixers',
  otros: 'Otros',
}

export function Inventory() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  
  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editField, setEditField] = useState<'initial' | 'final'>('initial')
  const [entryForm, setEntryForm] = useState({ productId: '', quantity: 0, note: '' })

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

  const activeWeek = useMemo(() => weeks.find(w => w.status === 'open'), [weeks])
  const selectedWeek = useMemo(() => weeks.find(w => w.id === (selectedWeekId || weeks[0]?.id)), [weeks, selectedWeekId])
  const isSelectedActive = selectedWeek?.id === activeWeek?.id
  const isAdmin = user?.role === 'admin'

  // 2. Fetch inventory for selected week
  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory', selectedWeek?.id],
    queryFn: () => inventoryApi.getByWeek(selectedWeek!.id),
    enabled: !!selectedWeek
  })

  // 3. Fetch movements
  const { data: movements = [] } = useQuery({
    queryKey: ['movements', selectedWeek?.id],
    queryFn: () => inventoryApi.getMovements(selectedWeek!.id),
    enabled: !!selectedWeek && isHistoryModalOpen
  })

  // 4. Mutations
  const updateInitialMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.updateInitial(data.weekId, data.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedWeek?.id] })
      addNotification({ type: 'success', message: 'Stock inicial actualizado' })
      setEditItem(null)
    }
  })

  const updateFinalMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.updateFinal(data.weekId, data.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedWeek?.id] })
      addNotification({ type: 'success', message: 'Stock final actualizado' })
      setEditItem(null)
    }
  })

  const addEntryMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.registerEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedWeek?.id] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      addNotification({ type: 'success', message: 'Entrada registrada correctamente' })
      setIsEntryModalOpen(false)
      setEntryForm({ productId: '', quantity: 0, note: '' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', message: err.response?.data?.message || 'Error al registrar entrada' })
    }
  })

  const categories = ['all', ...Array.from(new Set(inventory.map((i: any) => i.product.category)))] as string[]

  const filtered = filterCat === 'all' ? inventory : inventory.filter((i: any) => i.product.category === filterCat)

  const totalInitial = inventory.reduce((a: number, i: any) => a + i.initialStock, 0)
  const totalConsumed = inventory.reduce((a: number, i: any) => a + i.consumed, 0)
  const totalCurrent = inventory.reduce((a: number, i: any) => a + (i.initialStock + i.purchasedStock - i.consumed), 0)
  const lowStockCount = inventory.filter((i: any) => (i.initialStock + i.purchasedStock - i.consumed) < 10).length

  const openEdit = (item: any, field: 'initial' | 'final') => {
    // Rule: Active week, only initial editable. Previous weeks, initial and final editable.
    // Admin can edit both in any week. Bartender can only edit initial in active week.
    if (!isAdmin) {
      if (!isSelectedActive || field === 'final') return
    }

    setEditItem(item)
    setEditField(field)
    setEditValue(String(field === 'initial' ? item.initialStock : (item.finalStock ?? 0)))
  }

  const handleSaveEdit = () => {
    if (!editItem || !selectedWeek) return
    const val = parseInt(editValue, 10)
    if (isNaN(val) || val < 0) {
      addNotification({ type: 'error', message: 'Cantidad inválida' })
      return
    }

    if (editField === 'initial') {
      updateInitialMutation.mutate({ weekId: selectedWeek.id, items: [{ productId: editItem.productId, quantity: val }] })
    } else {
      updateFinalMutation.mutate({ weekId: selectedWeek.id, items: [{ productId: editItem.productId, quantity: val }] })
    }
  }

  const handleRegisterEntry = () => {
    if (!entryForm.productId || entryForm.quantity <= 0 || !selectedWeek) return
    addEntryMutation.mutate({
      weekId: selectedWeek.id,
      productId: entryForm.productId,
      quantity: entryForm.quantity,
      note: entryForm.note
    })
  }

  const getStockStatus = (currentStock: number) => {
    if (currentStock <= 0) return { color: 'danger' as const, label: 'Agotado' }
    if (currentStock < 10) return { color: 'danger' as const, label: 'Crítico' }
    if (currentStock < 20) return { color: 'warning' as const, label: 'Bajo' }
    return { color: 'success' as const, label: 'OK' }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Inventario</h1>
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
            {selectedWeek?.status === 'open' ? (
              <span className="text-success text-sm font-medium">Activa</span>
            ) : (
              <span className="text-dark-300 text-sm font-medium">Cerrada</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <History size={14} />
            Historial
          </button>
          <button 
            onClick={() => selectedWeek && exportInventoryToExcel(inventory, format(new Date(selectedWeek.startDate), 'dd-MM-yyyy'))}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Download size={14} />
            Excel
          </button>
          {isSelectedActive && (
            <button 
              onClick={() => {
                setEntryForm({ productId: inventory[0]?.productId || '', quantity: 0, note: '' })
                setIsEntryModalOpen(true)
              }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={14} />
              Registrar entrada
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Stock inicial" value={totalInitial} sub="piezas" icon={<Package size={18} />} color="text-dark-200" />
        <StatCard label="Consumido" value={totalConsumed} sub="piezas" color="text-accent" />
        <StatCard label="Stock actual" value={totalCurrent} sub="piezas" color="text-success" />
        <StatCard
          label="Stock bajo"
          value={lowStockCount}
          sub="productos"
          icon={<AlertTriangle size={18} />}
          color={lowStockCount > 0 ? 'text-danger' : 'text-dark-300'}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filterCat === cat
                ? 'bg-accent/15 text-accent'
                : 'text-dark-200 hover:text-white hover:bg-dark-700'
            )}
          >
            {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loadingInventory ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Producto</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Inicial</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Entradas</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Consumido</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Actual</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Final</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => {
                const currentStock = item.initialStock + item.purchasedStock - item.consumed
                const status = getStockStatus(currentStock)
                const usagePct = (item.initialStock + item.purchasedStock) > 0 
                  ? (item.consumed / (item.initialStock + item.purchasedStock)) * 100 
                  : 0

                const canEditInitial = isAdmin || isSelectedActive
                const canEditFinal = isAdmin || !isSelectedActive

                return (
                  <tr
                    key={item.id}
                    className="border-b border-dark-600/20 hover:bg-dark-700/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-white">{item.product.name}</p>
                        <p className="text-xs text-dark-300 capitalize">{item.product.category} · {item.product.unit}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        disabled={!canEditInitial}
                        onClick={() => openEdit(item, 'initial')}
                        className={clsx("group flex items-center justify-center gap-1 mx-auto", !canEditInitial && "cursor-default")}
                      >
                        <span className="text-sm font-mono text-white">{item.initialStock}</span>
                        {canEditInitial && <Edit3 size={11} className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={clsx('text-sm font-mono', item.purchasedStock > 0 ? 'text-success' : 'text-dark-300')}>
                        +{item.purchasedStock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-mono text-accent">{item.consumed}</span>
                        <div className="w-16">
                          <ProgressBar value={usagePct} max={100} color="accent" />
                        </div>
                        <span className="text-2xs text-dark-300">{Math.round(usagePct)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={clsx(
                          'text-sm font-mono font-semibold',
                          currentStock <= 0 ? 'text-danger' : currentStock < 10 ? 'text-danger' : 'text-white'
                        )}
                      >
                        {currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        disabled={!canEditFinal}
                        onClick={() => openEdit(item, 'final')}
                        className={clsx("group flex items-center justify-center gap-1 mx-auto", !canEditFinal && "cursor-default")}
                      >
                        <span className="text-sm font-mono text-dark-100">
                          {item.finalStock ?? '-'}
                        </span>
                        {canEditFinal && <Edit3 size={11} className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={status.color}>{status.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for initial/final editing */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Editar stock ${editField === 'initial' ? 'inicial' : 'final'}`}
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-300 mb-1">Producto</p>
            <p className="text-sm text-white font-medium">{editItem?.product.name}</p>
          </div>
          <div>
            <label className="text-xs text-dark-300 mb-1.5 block">Cantidad ({editItem?.product.unit})</label>
            <input
              type="number"
              className="input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setEditItem(null)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={handleSaveEdit} 
              className="btn-primary flex-1"
              disabled={updateInitialMutation.isPending || updateFinalMutation.isPending}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal for Register Entry */}
      <Modal
        open={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title="Registrar entrada de producto"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-xs text-info leading-relaxed">
              Las entradas aumentan el inventario disponible para la semana actual.
            </p>
          </div>
          <div>
            <label className="text-xs text-dark-300 mb-1.5 block">Producto</label>
            <select
              className="input"
              value={entryForm.productId}
              onChange={(e) => setEntryForm({ ...entryForm, productId: e.target.value })}
            >
              <option value="">Seleccionar producto...</option>
              {inventory.map((i: any) => (
                <option key={i.productId} value={i.productId}>
                  {i.product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-300 mb-1.5 block">Cantidad a agregar</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={entryForm.quantity || ''}
              onChange={(e) => setEntryForm({ ...entryForm, quantity: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs text-dark-300 mb-1.5 block">Nota / Motivo (Opcional)</label>
            <input
              className="input"
              placeholder="Ej: Reposición de stock"
              value={entryForm.note}
              onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setIsEntryModalOpen(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={handleRegisterEntry} 
              className="btn-primary flex-1"
              disabled={addEntryMutation.isPending || !entryForm.productId || entryForm.quantity <= 0}
            >
              Confirmar entrada
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Historial de movimientos"
        size="lg"
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {movements.length === 0 ? (
            <p className="text-center py-8 text-dark-400 italic">No hay movimientos registrados esta semana</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dark-300 border-b border-dark-600/50">
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-center py-2">Tipo</th>
                  <th className="text-center py-2">Cantidad</th>
                  <th className="text-left py-2">Nota</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => (
                  <tr key={m.id} className="border-b border-dark-600/20">
                    <td className="py-2 text-dark-200">{format(new Date(m.date), 'dd/MM HH:mm')}</td>
                    <td className="py-2 text-white font-medium">{m.product.shortName}</td>
                    <td className="py-2 text-center">
                      <Badge variant={m.type === 'entry' ? 'success' : 'warning'}>{m.type}</Badge>
                    </td>
                    <td className="py-2 text-center font-mono">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className="py-2 text-xs text-dark-300 truncate max-w-[200px]">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={() => setIsHistoryModalOpen(false)} className="btn-primary mt-4">Cerrar</button>
        </div>
      </Modal>
    </div>
  )
}
