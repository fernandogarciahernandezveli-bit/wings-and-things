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

function AppContent() {
  const { currentView } = useUIStore()

  const views = {
    dashboard: <Dashboard />,
    inventory: <Inventory />,
    comandas: <Comandas />,
    analytics: <Analytics />,
    orders: <Orders />,
    settings: <Settings />,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-dark-900">
        <div className="p-6 max-w-7xl mx-auto">
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
