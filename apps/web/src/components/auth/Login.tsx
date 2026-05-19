import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, LogIn, Beer } from 'lucide-react'
import { useAuthStore } from '@/store'

import { api } from '@/lib/api'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Mínimo 4 caracteres'),
})

type FormData = z.infer<typeof schema>

const DEMO_USERS = [
  { email: 'fer@bar.com', password: '1234', name: 'Fer', role: 'admin' as const },
]

export function Login() {
  const { login } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/auth/login', data)
      const { user, token } = response.data.data
      login(user, token)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Beer size={24} className="text-dark-900" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight text-center">WINGS & THINGS</h1>
          <p className="text-dark-200 text-sm mt-1">Control de Inventario · Bar</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-lg text-white mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-dark-200 font-medium mb-1.5 block">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="fer@bar.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-xs text-dark-200 font-medium mb-1.5 block">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-300 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card p-4">
          <p className="text-xs text-dark-300 mb-2 uppercase tracking-wider font-medium">Acceso rápido</p>
          <div className="flex flex-col gap-1.5">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => { setValue('email', u.email); setValue('password', u.password) }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 transition-all text-left"
              >
                <div>
                  <p className="text-xs text-white font-medium">{u.name}</p>
                  <p className="text-2xs text-dark-300">{u.email}</p>
                </div>
                <span className="text-2xs text-dark-300 capitalize bg-dark-600 px-2 py-0.5 rounded">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
