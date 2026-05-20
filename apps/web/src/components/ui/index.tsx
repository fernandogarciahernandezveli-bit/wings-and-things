import React, { Component, ErrorInfo, ReactNode } from 'react'
import { clsx } from 'clsx'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/store'

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center card bg-dark-800 border-danger/20">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-danger" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
          <p className="text-dark-200 text-sm mb-6 max-w-md">
            Hubo un error al renderizar este componente. Por favor, intenta recargar la página o contacta al administrador.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Recargar sistema
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={clsx(
          'relative w-full bg-dark-800 border border-dark-500/60 rounded-2xl shadow-2xl animate-scale-in',
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600/50">
            <h2 className="font-display font-semibold text-base text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-dark-200 hover:text-white hover:bg-dark-600 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Notifications Toast ──────────────────────────────────────────────────────

export function NotificationToasts() {
  const { notifications, removeNotification } = useUIStore()

  if (!notifications.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {notifications.map((n) => {
        const icons = {
          success: <CheckCircle size={16} className="text-success flex-shrink-0" />,
          error: <AlertCircle size={16} className="text-danger flex-shrink-0" />,
          warning: <AlertTriangle size={16} className="text-accent flex-shrink-0" />,
          info: <Info size={16} className="text-info flex-shrink-0" />,
        }
        const borders = {
          success: 'border-success/30',
          error: 'border-danger/30',
          warning: 'border-accent/30',
          info: 'border-info/30',
        }

        return (
          <div
            key={n.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 bg-dark-700 border rounded-xl shadow-xl animate-slide-in min-w-64 max-w-80',
              borders[n.type]
            )}
          >
            {icons[n.type]}
            <span className="text-sm text-white flex-1">{n.message}</span>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-dark-200 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon && <div className="text-dark-300 mb-2">{icon}</div>}
      <h3 className="font-medium text-dark-100">{title}</h3>
      {description && <p className="text-sm text-dark-200 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div
      className={clsx(
        'border-2 border-dark-500 border-t-accent rounded-full animate-spin',
        sizes[size]
      )}
    />
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'accent' | 'success' | 'danger' | 'info' | 'gray' | 'warning'

export function Badge({ children, variant = 'gray', className }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  const variants: Record<BadgeVariant, string> = {
    accent: 'bg-accent/15 text-accent',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
    info: 'bg-info/15 text-info',
    gray: 'bg-dark-500 text-dark-100',
    warning: 'bg-amber-500/15 text-amber-400',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, color = 'accent' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  const colors: Record<string, string> = {
    accent: 'bg-accent',
    success: 'bg-success',
    danger: 'bg-danger',
    info: 'bg-info',
  }
  return (
    <div className="w-full h-1.5 bg-dark-500 rounded-full overflow-hidden">
      <div
        className={clsx('h-full rounded-full transition-all duration-500', colors[color] ?? 'bg-accent')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: number
  color?: string
}

export function StatCard({ label, value, sub, icon, trend, color }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dark-200 uppercase tracking-wider font-medium">{label}</span>
        {icon && <div className={clsx('text-dark-300', color)}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-display font-bold text-white">{value}</span>
        {sub && <span className="text-xs text-dark-200 mb-0.5">{sub}</span>}
      </div>
      {trend !== undefined && (
        <div className={clsx('text-xs font-medium', trend >= 0 ? 'text-success' : 'text-danger')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs semana anterior
        </div>
      )}
    </div>
  )
}
