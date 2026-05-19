import {
  LayoutDashboard,
  Package,
  ClipboardList,
  TrendingUp,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Beer,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore, useAuthStore } from '@/store'
import type { ViewMode } from '@/types'

export function Sidebar() {
  const { currentView, sidebarOpen, setView, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const menuItems = [
    { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'comandas' as ViewMode, label: 'Comandas', icon: ClipboardList },
    { id: 'inventory' as ViewMode, label: 'Inventario', icon: Package },
    { id: 'analytics' as ViewMode, label: 'Analíticas', icon: TrendingUp },
    { id: 'orders' as ViewMode, label: 'Pedido Inteligente', icon: ShoppingCart },
    { id: 'settings' as ViewMode, label: 'Configuración', icon: Settings },
  ]

  return (
    <aside
      className={clsx(
        'h-screen bg-dark-800 border-r border-dark-600/50 transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-600/50">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <Beer size={16} className="text-dark-900" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-sm text-white leading-tight">WINGS</p>
            <p className="font-display text-xs text-accent leading-tight">& THINGS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {menuItems.filter(item => !item.hidden).map((item) => {
          const Icon = item.icon
          const active = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group w-full text-left',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-dark-200 hover:text-white hover:bg-dark-700'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {active && sidebarOpen && (
                <div className="ml-auto w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-dark-600/50 px-2 py-3 flex flex-col gap-1">
          <div
            className={clsx(
              'flex items-center gap-3 px-3 py-2',
              !sidebarOpen && 'justify-center'
            )}
          >
            <div className="w-7 h-7 bg-dark-500 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-dark-100">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.name}</p>
                <p className="text-2xs text-dark-200 capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-dark-200 hover:text-danger hover:bg-danger/10 transition-all text-sm w-full',
              !sidebarOpen && 'justify-center'
            )}
            title={!sidebarOpen ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center p-2 border-t border-dark-600/50 text-dark-200 hover:text-white hover:bg-dark-700 transition-all"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  )
}
