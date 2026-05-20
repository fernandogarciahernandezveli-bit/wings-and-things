import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  X,
  Zap,
  Search,
  AlertCircle,
  Filter,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useComandaStore, useUIStore } from '@/store'
import { productsApi, comandasApi, weeksApi } from '@/lib/api'
import { Badge, Modal } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  refrescos: 'text-accent',
  aguas: 'text-info',
  cervezas: 'text-amber-400',
  licores: 'text-purple-400',
  jugos: 'text-orange-400',
  mixers: 'text-teal-400',
  otros: 'text-dark-200',
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'refrescos', label: 'Refrescos' },
  { id: 'aguas', label: 'Aguas' },
  { id: 'jugos', label: 'Jugos' },
  { id: 'cervezas', label: 'Cervezas' },
  { id: 'mixers', label: 'Mixers' },
]

export function Comandas() {
  const queryClient = useQueryClient()
  const {
    currentItems,
    inputText,
    addItem,
    removeItem,
    updateQuantity,
    clearItems,
    setInputText,
  } = useComandaStore()
  const { addNotification } = useUIStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [unrecognized, setUnrecognized] = useState<string[]>([])
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. Fetch active week
  const { data: activeWeek } = useQuery({
    queryKey: ['weeks', 'active'],
    queryFn: weeksApi.getActive
  })

  // 2. Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getAll
  })

  // 3. Mutation for creating comanda
  const createComanda = useMutation({
    mutationFn: (data: any) => comandasApi.create(data),
    onSuccess: () => {
      clearItems()
      setUnrecognized([])
      setIsConfirmModalOpen(false)
      addNotification({ type: 'success', message: 'Comanda guardada exitosamente' })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recommend'] })
      queryClient.invalidateQueries({ queryKey: ['weeks', 'details'] })
    },
    onError: (error: any) => {
      addNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error al guardar comanda' 
      })
    }
  })

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) return
    try {
      const result = await productsApi.parse(inputText)

      result.items.forEach((item: any) => {
        const product = products.find((p: Product) => p.id === item.productId)
        if (product) {
          addItem({
            productId: item.productId,
            product,
            quantity: item.quantity,
          })
        }
      })

      setUnrecognized(result.unrecognized)
      setInputText('')
      if (textareaRef.current) textareaRef.current.value = ''

      if (result.items.length > 0) {
        addNotification({
          type: 'success',
          message: `${result.items.length} producto(s) agregado(s)`,
        })
      }
      if (result.unrecognized.length > 0) {
        addNotification({
          type: 'warning',
          message: `${result.unrecognized.length} línea(s) no reconocida(s)`,
        })
      }
    } catch (err) {
      addNotification({ type: 'error', message: 'Error al procesar texto' })
    }
  }, [inputText, products, addItem, setInputText, addNotification])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleParse()
    }
  }

  const handleQuickAdd = (product: Product) => {
    addItem({
      productId: product.id,
      product,
      quantity: 1,
    })
  }

  const handleOpenConfirm = () => {
    if (currentItems.length === 0 || !activeWeek) return
    setIsConfirmModalOpen(true)
  }

  const handleSubmitComanda = () => {
    if (currentItems.length === 0 || !activeWeek || createComanda.isPending) return
    
    createComanda.mutate({
      weekId: activeWeek.id,
      date: new Date().toISOString(),
      items: currentItems.map(i => ({
        productId: i.productId,
        quantity: i.quantity
      }))
    })
  }

  const filtered = searchQuery || activeCategory !== 'all'
    ? products.filter((p: Product) => {
        const matchesSearch = !searchQuery || 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
        
        const matchesCat = activeCategory === 'all' || p.category === activeCategory
        
        return matchesSearch && matchesCat
      })
    : products.slice(0, 10) // Show top 10 if no search/filter

  const totalItems = currentItems.reduce((a, i) => a + i.quantity, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Captura de Comandas</h1>
          <p className="text-sm text-dark-200 mt-0.5">Registra comandas físicas rápidamente</p>
        </div>
        {currentItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-dark-200 text-center sm:text-left">{totalItems} piezas · {currentItems.length} productos</span>
            <div className="flex items-center gap-2">
              <button onClick={clearItems} className="btn-ghost flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm">
                <Trash2 size={14} />
                Limpiar
              </button>
              <button
                onClick={handleOpenConfirm}
                disabled={createComanda.isPending || !activeWeek}
                className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2"
              >
                {createComanda.isPending ? (
                  <div className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                ) : (
                  <><Send size={16} /> Guardar</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmar Comanda"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-dark-200">¿Deseas guardar esta comanda con {totalItems} productos?</p>
          <div className="flex gap-2">
            <button onClick={() => setIsConfirmModalOpen(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button
              onClick={handleSubmitComanda}
              disabled={createComanda.isPending}
              className="btn-primary flex-1"
            >
              {createComanda.isPending ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {!activeWeek && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
          <AlertCircle size={18} className="text-warning flex-shrink-0" />
          <p className="text-sm text-warning font-medium">No hay una semana activa. Debes iniciar una semana para guardar comandas.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Text Input */}
          <div className="card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title flex items-center gap-2">
                <Zap size={16} className="text-accent" />
                Entrada de texto
              </h2>
              <span className="text-xs text-dark-300 hidden sm:inline">Ctrl+Enter para procesar</span>
            </div>
            <textarea
              ref={textareaRef}
              className="input resize-none font-mono text-sm h-36"
              placeholder={`Escribe la comanda:\n2 coca\n3 delaware\n1 sprite`}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {unrecognized.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <AlertCircle size={14} className="text-danger mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-danger font-medium">No reconocidos:</p>
                  <p className="text-xs text-dark-200 mt-0.5">{unrecognized.join(', ')}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Procesar comanda
            </button>
          </div>

          {/* Categories Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
                  activeCategory === cat.id
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'text-dark-300 border-dark-600/50 hover:border-dark-500 hover:text-white'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Add Grid */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="section-title">Productos {activeCategory !== 'all' ? CATEGORIES.find(c => c.id === activeCategory)?.label : 'rápidos'}</h2>
              <div className="relative w-full sm:w-48">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  className="input pl-8 py-1.5 text-xs w-full"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] lg:max-h-64 overflow-y-auto pr-1">
              {filtered.map((product: Product) => (
                <button
                  key={product.id}
                  onClick={() => handleQuickAdd(product)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 hover:border-accent/30 hover:bg-accent/5 transition-all group text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{product.name}</p>
                    <p className={clsx('text-2xs uppercase font-bold tracking-tighter', CATEGORY_COLORS[product.category] || 'text-dark-400')}>
                      {product.category}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-6 sm:h-6 rounded bg-dark-600 flex items-center justify-center text-dark-200 group-hover:bg-accent group-hover:text-dark-900 transition-colors flex-shrink-0 ml-2">
                    <Plus size={14} />
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-1 sm:col-span-2 text-center py-8 text-xs text-dark-400 italic">No se encontraron productos</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Summary Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card flex-1 flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
            <div className="p-4 border-b border-dark-600/50 flex items-center justify-between bg-dark-700/30">
              <h2 className="font-display font-semibold text-white">Resumen</h2>
              <Badge variant="accent">{totalItems} uds</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {currentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-40">
                  <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center mb-3">
                    <Filter size={20} className="text-dark-300" />
                  </div>
                  <p className="text-sm text-dark-200">La comanda está vacía</p>
                  <p className="text-xs text-dark-400 mt-1">Usa la entrada de texto o busca productos para agregar</p>
                </div>
              ) : (
                currentItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 border border-dark-600/30 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-dark-300">{item.product.shortName}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-dark-600 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-dark-300 hover:text-white transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-mono font-bold text-accent">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-dark-300 hover:text-white transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="w-8 h-8 flex items-center justify-center text-dark-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {currentItems.length > 0 && (
              <div className="p-4 bg-dark-800/80 border-t border-dark-600/50">
                <button
                  onClick={handleOpenConfirm}
                  disabled={createComanda.isPending || !activeWeek}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base shadow-xl"
                >
                  {createComanda.isPending ? (
                    <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                  ) : (
                    <><Send size={18} /> Guardar comanda</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
