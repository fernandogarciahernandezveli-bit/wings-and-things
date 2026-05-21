import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit3, Package, Users, Calendar, AlertCircle, ChevronRight, History as HistoryIcon, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, Modal } from '@/components/ui'
import { useAuthStore, useUIStore } from '@/store'
import { productsApi, weeksApi, usersApi, comandasApi, inventoryApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product, ProductCategory, UserRole } from '@/types'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

const CATEGORIES: ProductCategory[] = ['refrescos', 'aguas', 'cervezas', 'licores', 'jugos', 'mixers', 'otros']

type SettingsTab = 'products' | 'users' | 'weeks'

export function Settings() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { addNotification } = useUIStore()
  const [tab, setTab] = useState<SettingsTab>('products')

  const isAdmin = user?.role === 'admin'
  const isBartender = user?.role === 'bartender'
  
  // Product state
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState(false)
  const [form, setForm] = useState({
    name: '', shortName: '', category: 'refrescos' as ProductCategory,
    unit: 'pieza', unitsPerPackage: 1, aliases: '', initialStock: 0
  })

  // User state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'bartender' as UserRole
  })

  // Week state
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false)
  const [newWeekDates, setNewWeekDates] = useState({
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    status: 'open' as 'open' | 'closed'
  })

  // Week Edit state
  const [selectedWeekForEdit, setSelectedWeekForEdit] = useState<string | null>(null)
  const [isWeekEditModalOpen, setIsWeekEditModalOpen] = useState(false)
  const [editTab, setEditTab] = useState<'comandas' | 'initial' | 'adjustment'>('comandas')

  // Adjustment form state
  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: '',
    newActualStock: 0,
    note: ''
  })

  // 1. Fetch data
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll
  })

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: weeksApi.getAll
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    enabled: isAdmin && tab === 'users'
  })

  // Week details for editing
  const { data: weekDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['weeks', 'details', selectedWeekForEdit],
    queryFn: () => weeksApi.getDetails(selectedWeekForEdit!),
    enabled: !!selectedWeekForEdit && isWeekEditModalOpen
  })

  // 2. Mutations
  const saveProductMutation = useMutation({
    mutationFn: (data: any) => editProduct 
      ? productsApi.update(editProduct.id, data) 
      : productsApi.create(data),
    onSuccess: () => {
      // Invalidate ALL related queries to ensure global synchronization
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['weeks'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details'] })
      
      addNotification({ type: 'success', message: 'Producto guardado correctamente' })
      setEditProduct(null)
      setNewProduct(false)
      resetForm()
    },
    onError: (err: any) => {
      addNotification({ type: 'error', message: err.response?.data?.message || 'Error al guardar producto' })
    }
  })

  const saveUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addNotification({ type: 'success', message: 'Usuario creado' })
      setIsNewUserModalOpen(false)
      setUserForm({ name: '', email: '', password: '', role: 'bartender' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', message: err.response?.data?.message || 'Error al crear usuario' })
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      addNotification({ type: 'info', message: 'Usuario eliminado' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', message: err.response?.data?.message || 'Error al eliminar usuario' })
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      // Invalidate ALL related queries to ensure global synchronization
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['weeks'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details'] })
      
      addNotification({ type: 'success', message: 'Producto desactivado' })
    }
  })

  const createWeekMutation = useMutation({
    mutationFn: (data: any) => weeksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      addNotification({ type: 'success', message: 'Nueva semana iniciada' })
      setIsNewWeekModalOpen(false)
    }
  })

  const closeWeekMutation = useMutation({
    mutationFn: (id: string) => weeksApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      addNotification({ type: 'success', message: 'Semana cerrada correctamente' })
    }
  })

  const deleteWeekMutation = useMutation({
    mutationFn: (id: string) => weeksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      addNotification({ type: 'success', message: 'Semana eliminada' })
    }
  })

  const saveInitialStockMutation = useMutation({
    mutationFn: (items: any[]) => inventoryApi.updateInitial(selectedWeekForEdit!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details', selectedWeekForEdit] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      addNotification({ type: 'success', message: 'Stock inicial actualizado' })
    }
  })

  const registerAdjustmentMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.registerAdjustment({ ...data, weekId: selectedWeekForEdit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details', selectedWeekForEdit] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      addNotification({ type: 'success', message: 'Ajuste de inventario aplicado' })
      setAdjustmentForm({ productId: '', newActualStock: 0, note: '' })
    }
  })

  const deleteComandaMutation = useMutation({
    mutationFn: (id: string) => comandasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details', selectedWeekForEdit] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      addNotification({ type: 'success', message: 'Comanda eliminada correctamente' })
    }
  })

  const resetForm = () => setForm({ name: '', shortName: '', category: 'refrescos', unit: 'pieza', unitsPerPackage: 1, aliases: '', initialStock: 0 })

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setForm({ 
      name: p.name, 
      shortName: p.shortName, 
      category: p.category, 
      unit: p.unit, 
      unitsPerPackage: (p as any).unitsPerPackage || 1,
      aliases: p.aliases.join(', '),
      initialStock: 0 // Reset for edit mode, only used if specifically changed
    })
    setNewProduct(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.shortName.trim() || !form.unit.trim()) {
      addNotification({ type: 'error', message: 'Todos los campos son obligatorios' })
      return
    }
    
    // Only send initialStock if it's a new product (editProduct is null)
    const dataToSend = editProduct 
      ? { ...form, aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean) }
      : { ...form, initialStock: form.initialStock, aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean) }
    
    saveProductMutation.mutate(dataToSend)
  }

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de desactivar este producto?')) {
      deleteProductMutation.mutate(id)
    }
  }

  const handleDeleteUser = (u: any) => {
    if (u.id === user?.id) return addNotification({ type: 'warning', message: 'No puedes eliminarte a ti mismo' })
    if (confirm(`¿Estás seguro de eliminar al usuario ${u.name}?`)) {
      deleteUserMutation.mutate(u.id)
    }
  }

  const openWeekEdit = (id: string) => {
    setSelectedWeekForEdit(id)
    setIsWeekEditModalOpen(true)
  }

  const daysInWeek = useMemo(() => {
    if (!weekDetails) return []
    return eachDayOfInterval({
      start: new Date(weekDetails.startDate),
      end: new Date(weekDetails.endDate)
    })
  }, [weekDetails])

  const TABS = [
    { id: 'products' as const, label: 'Productos', icon: Package, hidden: isBartender },
    { id: 'users' as const, label: 'Usuarios', icon: Users, hidden: isBartender },
    { id: 'weeks' as const, label: 'Semanas', icon: Calendar, hidden: isBartender },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Configuración</h1>
          <p className="text-sm text-dark-200 mt-0.5">Gestión del sistema · {user?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-dark-800 border border-dark-600/50 rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        {TABS.filter(t => !t.hidden).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap',
              tab === id ? 'bg-dark-600 text-white' : 'text-dark-200 hover:text-white'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-dark-200">{products.length} productos registrados</p>
            {isAdmin && (
              <button onClick={() => { resetForm(); setEditProduct(null); setNewProduct(true) }} className="btn-primary flex items-center justify-center gap-2 text-sm">
                <Plus size={14} /> Nuevo producto
              </button>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[800px] lg:min-w-0">
                <thead>
                  <tr className="border-b border-dark-600/50 text-left">
                    {['Nombre', 'Corto', 'Categoría', 'Unidad', 'Uds/Paquete', 'Aliases', 'Estado', ''].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-medium text-dark-200 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: Product) => (
                    <tr key={p.id} className="border-b border-dark-600/20 hover:bg-dark-700/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-white font-medium">{p.name}</td>
                      <td className="px-5 py-3 text-sm text-dark-200">{p.shortName}</td>
                      <td className="px-5 py-3">
                        <Badge variant="gray">{p.category}</Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-dark-200">{p.unit}</td>
                      <td className="px-5 py-3 text-sm text-accent font-mono">{(p as any).unitsPerPackage || 1}</td>
                      <td className="px-5 py-3 text-xs text-dark-300 max-w-xs truncate">
                        {p.aliases.join(', ')}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={p.isActive ? 'success' : 'gray'}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-dark-200 hover:text-white">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 rounded-lg text-dark-300 hover:text-danger hover:bg-danger/10 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-dark-200">{allUsers.length} usuarios registrados</p>
            {isAdmin && (
              <button onClick={() => setIsNewUserModalOpen(true)} className="btn-primary flex items-center justify-center gap-2 text-sm">
                <Plus size={14} /> Nuevo usuario
              </button>
            )}
          </div>
          <div className="card p-5">
            <div className="flex flex-col gap-3">
              {allUsers.map((u: any) => (
                <div key={u.email} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-dark-600/30 last:border-0 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-dark-600 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                      <p className="text-xs text-dark-300 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <Badge variant={u.role === 'admin' ? 'accent' : 'gray'}>{u.role}</Badge>
                    {isAdmin && u.email !== user?.email && (
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-danger/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-center py-8 text-sm text-dark-400">No hay usuarios registrados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weeks Tab */}
      {tab === 'weeks' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="section-title">Semanas registradas</h2>
            {isAdmin && (
              <button onClick={() => setIsNewWeekModalOpen(true)} className="btn-primary flex items-center justify-center gap-2 text-sm">
                <Plus size={14} /> Nueva semana
              </button>
            )}
          </div>
          <div className="card p-5 flex flex-col gap-1">
            {weeks.map((w: any) => (
              <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-dark-600/30 last:border-0 group gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {format(new Date(w.startDate), 'dd MMM yyyy')} — {format(new Date(w.endDate), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-dark-300">ID: {w.id}</p>
                  </div>
                  <Badge variant={w.status === 'open' ? 'success' : 'gray'}>
                    {w.status === 'open' ? 'Activa' : 'Cerrada'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-full sm:w-auto">
                      <button 
                        onClick={() => openWeekEdit(w.id)}
                        className="btn-ghost flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5"
                      >
                        <Edit3 size={13} />
                        Editar
                      </button>
                      
                      {w.status === 'open' ? (
                        <button 
                          onClick={() => confirm('¿Cerrar esta semana?') && closeWeekMutation.mutate(w.id)}
                          className="text-xs text-dark-300 hover:text-danger transition-colors px-2 flex-1 sm:flex-none text-center"
                        >
                          Cerrar semana
                        </button>
                      ) : (
                        <button 
                          onClick={() => confirm('¿Deseas eliminar esta semana? Esta acción es irreversible y borrará todo el historial relacionado.') && deleteWeekMutation.mutate(w.id)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-danger/10 transition-all ml-auto sm:ml-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week Edit Modal (Senior Implementation) */}
      <Modal
        open={isWeekEditModalOpen}
        onClose={() => setIsWeekEditModalOpen(false)}
        title={`Semana: ${weekDetails ? format(new Date(weekDetails.startDate), 'dd/MM') + ' - ' + format(new Date(weekDetails.endDate), 'dd/MM') : ''}`}
        size="lg"
      >
        {loadingDetails ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weekDetails && (
          <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card bg-dark-700/30 p-4 flex flex-col justify-between">
                <p className="text-[10px] text-dark-300 mb-1 uppercase font-bold tracking-wider">Estado</p>
                <Badge variant={weekDetails.status === 'open' ? 'success' : 'gray'}>
                  {weekDetails.status === 'open' ? 'Activa' : 'Cerrada'}
                </Badge>
              </div>
              <div className="card bg-dark-700/30 p-4">
                <p className="text-[10px] text-dark-300 mb-1 uppercase font-bold tracking-wider">Comandas</p>
                <p className="text-lg font-bold text-white">{weekDetails.comandas.length}</p>
              </div>
              <div className="card bg-dark-700/30 p-4">
                <p className="text-[10px] text-dark-300 mb-1 uppercase font-bold tracking-wider">Total Piezas</p>
                <p className="text-lg font-bold text-accent">
                  {weekDetails.comandas.reduce((a: number, c: any) => a + c.items.reduce((b: number, i: any) => b + i.quantity, 0), 0)}
                </p>
              </div>
              <div className="card bg-dark-700/30 p-4">
                <p className="text-[10px] text-dark-300 mb-1 uppercase font-bold tracking-wider">Productos</p>
                <p className="text-lg font-bold text-white">{weekDetails.inventoryItems.length}</p>
              </div>
            </div>

            {/* Sub-tabs for Week Editing */}
            <div className="flex items-center gap-1 bg-dark-800 border border-dark-600/50 rounded-xl p-1 w-full overflow-x-auto">
              <button
                onClick={() => setEditTab('comandas')}
                className={clsx('px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 whitespace-nowrap', editTab === 'comandas' ? 'bg-dark-600 text-white' : 'text-dark-200 hover:text-white')}
              >
                Comandas
              </button>
              <button
                onClick={() => setEditTab('initial')}
                className={clsx('px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 whitespace-nowrap', editTab === 'initial' ? 'bg-dark-600 text-white' : 'text-dark-200 hover:text-white')}
              >
                Stock Inicial
              </button>
              <button
                onClick={() => setEditTab('adjustment')}
                className={clsx('px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 whitespace-nowrap', editTab === 'adjustment' ? 'bg-dark-600 text-white' : 'text-dark-200 hover:text-white')}
              >
                Ajuste
              </button>
            </div>

            {editTab === 'comandas' && (
              <div className="flex flex-col gap-4">
                <h3 className="section-title flex items-center gap-2">
                  <HistoryIcon size={16} className="text-accent" />
                  Historial de comandas
                </h3>
                
                <div className="flex flex-col gap-6">
                  {daysInWeek.map((day) => {
                    const dayComandas = weekDetails.comandas.filter((c: any) => isSameDay(new Date(c.date), day))
                    if (dayComandas.length === 0) return null

                    return (
                      <div key={day.toISOString()} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 border-b border-dark-600/50 pb-2">
                          <div className="w-10 h-10 rounded-xl bg-dark-600 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[10px] uppercase font-bold text-dark-300 leading-none">{format(day, 'EEE', { locale: es })}</span>
                            <span className="text-sm font-bold text-white leading-none mt-0.5">{format(day, 'dd')}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white capitalize">{format(day, 'EEEE dd MMMM', { locale: es })}</h4>
                            <p className="text-xs text-dark-300">{dayComandas.length} comandas</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {dayComandas.map((comanda: any) => (
                            <div key={comanda.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 border border-dark-600/30 group hover:border-accent/30 transition-all gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Clock size={12} className="text-dark-400 flex-shrink-0" />
                                  <span className="text-xs font-mono text-dark-200">{format(new Date(comanda.date), 'HH:mm')}</span>
                                  <span className="text-dark-500">·</span>
                                  <span className="text-xs text-dark-300 truncate">Por {comanda.createdBy.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {comanda.items.map((item: any) => (
                                    <Badge key={item.id} variant="gray" className="text-[10px] py-0 px-1.5">
                                      {item.quantity}x {item.product.shortName}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => confirm('¿Deseas eliminar esta comanda? El inventario se recalculará automáticamente.') && deleteComandaMutation.mutate(comanda.id)}
                                  className="p-2 rounded-lg text-dark-400 hover:text-danger hover:bg-danger/10 transition-all"
                                  title="Eliminar comanda"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {weekDetails.comandas.length === 0 && (
                    <div className="py-10 text-center card bg-dark-700/20 border-dashed">
                      <p className="text-dark-400 text-sm">No hay comandas registradas</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editTab === 'initial' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="section-title">Stock Inicial</h3>
                  <p className="text-[10px] text-dark-300 italic">Los cambios recalcularán el stock actual automáticamente</p>
                </div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[400px]">
                      <thead>
                        <tr className="border-b border-dark-600/50 bg-dark-800/50 text-left">
                          <th className="px-5 py-3 text-xs font-medium text-dark-200 uppercase">Producto</th>
                          <th className="px-5 py-3 text-xs font-medium text-dark-200 uppercase text-center">Actual</th>
                          <th className="px-5 py-3 text-xs font-medium text-dark-200 uppercase text-right">Nuevo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekDetails.inventoryItems.map((inv: any) => (
                          <tr key={inv.id} className="border-b border-dark-600/20">
                            <td className="px-5 py-3 text-sm text-white">{inv.product.name}</td>
                            <td className="px-5 py-3 text-sm text-dark-300 font-mono text-center">{inv.initialStock}</td>
                            <td className="px-5 py-3 text-right">
                              <input
                                type="number"
                                className="input py-1 px-3 w-20 sm:w-32 h-8 text-sm text-right"
                                defaultValue={inv.initialStock}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value)
                                  if (!isNaN(val) && val !== inv.initialStock) {
                                    saveInitialStockMutation.mutate([{ productId: inv.productId, quantity: val }])
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {editTab === 'adjustment' && (
              <div className="flex flex-col gap-6">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex gap-3">
                  <AlertCircle className="text-warning shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-bold text-warning mb-1">Auditoría Física</p>
                    <p className="text-[10px] text-warning/80 leading-relaxed">
                      Usa esta herramienta cuando el stock real en el bar no coincida con el sistema. 
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Registrar Ajuste</h3>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-dark-300 mb-1.5 block">Producto</label>
                        <select
                          className="input"
                          value={adjustmentForm.productId}
                          onChange={(e) => setAdjustmentForm({ ...adjustmentForm, productId: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {weekDetails.inventoryItems.map((inv: any) => (
                            <option key={inv.id} value={inv.productId}>{inv.product.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-300 mb-1.5 block">Stock Físico Real</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="Piezas reales"
                          value={adjustmentForm.newActualStock}
                          onChange={(e) => setAdjustmentForm({ ...adjustmentForm, newActualStock: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-300 mb-1.5 block">Motivo</label>
                        <textarea
                          className="input min-h-[80px] py-2 text-sm"
                          placeholder="Ej: Diferencia en conteo físico..."
                          value={adjustmentForm.note}
                          onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!adjustmentForm.productId || adjustmentForm.note.length < 3) {
                            return addNotification({ type: 'error', message: 'Selecciona un producto y escribe un motivo válido' })
                          }
                          registerAdjustmentMutation.mutate(adjustmentForm)
                        }}
                        disabled={registerAdjustmentMutation.isPending}
                        className="btn-primary"
                      >
                        {registerAdjustmentMutation.isPending ? 'Procesando...' : 'Aplicar Ajuste'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cálculo</h3>
                    {adjustmentForm.productId ? (() => {
                      const inv = weekDetails.inventoryItems.find((i: any) => i.productId === adjustmentForm.productId)
                      const currentSystemStock = inv.initialStock + inv.purchasedStock - inv.consumed
                      const diff = adjustmentForm.newActualStock - currentSystemStock
                      
                      return (
                        <div className="card bg-dark-800 p-5 flex flex-col gap-4 border-accent/20">
                          <div className="flex justify-between items-center pb-3 border-b border-dark-600/50">
                            <span className="text-xs text-dark-200">Sistema:</span>
                            <span className="text-xs font-bold text-white">{currentSystemStock}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-dark-600/50">
                            <span className="text-xs text-dark-200">Físico:</span>
                            <span className="text-xs font-bold text-white">{adjustmentForm.newActualStock}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-dark-200">Diferencia:</span>
                            <span className={clsx('text-base font-bold', diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-white')}>
                              {diff > 0 ? `+${diff}` : diff} uds
                            </span>
                          </div>
                        </div>
                      )
                    })() : (
                      <div className="card bg-dark-800/50 p-10 flex items-center justify-center border-dashed">
                        <p className="text-xs text-dark-400">Selecciona un producto</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button onClick={() => setIsWeekEditModalOpen(false)} className="btn-primary w-full sm:w-auto px-8">
            Finalizar
          </button>
        </div>
      </Modal>

      {/* Product Modal */}
      <Modal
        open={newProduct}
        onClose={() => { setNewProduct(false); setEditProduct(null); resetForm() }}
        title={editProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-dark-300 mb-1.5 block">Nombre completo</label>
              <input
                className="input"
                placeholder="Ej: Coca Cola 355ml"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Nombre corto (para comanda)</label>
              <input
                className="input"
                placeholder="Ej: Coca"
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Categoría</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Unidad de medida</label>
              <input
                className="input"
                placeholder="pieza, caja, etc."
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Unidades por paquete</label>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="1"
                value={form.unitsPerPackage}
                onChange={(e) => setForm({ ...form, unitsPerPackage: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Stock inicial (Semana actual)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={form.initialStock}
                onChange={(e) => setForm({ ...form, initialStock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-dark-300 mb-1.5 block">Aliases (separados por coma)</label>
              <input
                className="input"
                placeholder="coke, cocacola, roja"
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setNewProduct(false); setEditProduct(null); resetForm() }} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              className="btn-primary flex-1"
              disabled={saveProductMutation.isPending}
            >
              {saveProductMutation.isPending ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Week Modal */}
      <Modal
        open={isNewWeekModalOpen}
        onClose={() => setIsNewWeekModalOpen(false)}
        title="Iniciar Nueva Semana"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-xs text-info leading-relaxed">
              Al iniciar una nueva semana, el inventario final de la semana anterior se tomará como stock inicial para ésta.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Fecha Inicio</label>
              <input
                type="date"
                className="input"
                value={newWeekDates.startDate}
                onChange={(e) => setNewWeekDates({ ...newWeekDates, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Fecha Fin</label>
              <input
                type="date"
                className="input"
                value={newWeekDates.endDate}
                onChange={(e) => setNewWeekDates({ ...newWeekDates, endDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-dark-300 mb-1.5 block">Estado inicial</label>
              <select
                className="input"
                value={newWeekDates.status}
                onChange={(e) => setNewWeekDates({ ...newWeekDates, status: e.target.value as 'open' | 'closed' })}
              >
                <option value="open">Abierta (Semana actual)</option>
                <option value="closed">Cerrada (Histórica)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setIsNewWeekModalOpen(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={() => createWeekMutation.mutate(newWeekDates)} 
              className="btn-primary flex-1"
              disabled={createWeekMutation.isPending}
            >
              Iniciar Semana
            </button>
          </div>
        </div>
      </Modal>

      {/* New User Modal */}
      <Modal
        open={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Nombre</label>
              <input
                className="input"
                placeholder="Nombre del usuario"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Email</label>
              <input
                type="email"
                className="input"
                placeholder="email@ejemplo.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-dark-300 mb-1.5 block">Rol</label>
              <select
                className="input"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
              >
                <option value="bartender">Bartender</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setIsNewUserModalOpen(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button 
              onClick={() => saveUserMutation.mutate(userForm)} 
              className="btn-primary flex-1"
              disabled={saveUserMutation.isPending}
            >
              {saveUserMutation.isPending ? 'Guardando...' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
