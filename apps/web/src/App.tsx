import { useAuthStore, useUIStore } from '@/store'
import { Sidebar } from '@/components/ui/Sidebar'
import { NotificationToasts, ErrorBoundary } from '@/components/ui'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Inventory } from '@/components/inventory/Inventory'
import { Comandas } from '@/components/comandas/Comandas'
import { Analytics } from '@/components/analytics/Analytics'
import { Orders } from '@/components/orders/Orders'
import { Settings } from '@/components/settings/Settings'
import { Login } from '@/components/auth/Login'
import { Menu, Beer } from 'lucide-react'

function AppContent() {
  const { currentView, toggleSidebar } = useUIStore()

  const views = {
    dashboard: <Dashboard />,
    inventory: <Inventory />,
    comandas: <Comandas />,
    analytics: <Analytics />,
    orders: <Orders />,
    settings: <Settings />,
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-dark-600/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Beer size={16} className="text-dark-900" />
          </div>
          <p className="font-display font-bold text-sm text-white tracking-tight uppercase">
            Wings <span className="text-accent">&</span> Things
          </p>
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-dark-200 hover:text-white hover:bg-dark-700 transition-all"
        >
          <Menu size={20} />
        </button>
      </header>

      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-dark-900">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>
            {views[currentView]}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { user } = useAuthStore()

  if (!user) return <Login />

  return (
    <>
      <AppContent />
      <NotificationToasts />
    </>
  )
}
