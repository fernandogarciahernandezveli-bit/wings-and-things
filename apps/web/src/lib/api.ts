import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage')
    ? JSON.parse(localStorage.getItem('auth-storage')!).state.token
    : null
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const productsApi = {
  getAll: () => api.get('/products').then(r => r.data.data),
  create: (data: any) => api.post('/products', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/products/${id}`).then(r => r.data.data),
  parse: (text: string) => api.post('/products/parse', { text }).then(r => r.data.data),
}

export const weeksApi = {
  getAll: () => api.get('/weeks').then(r => r.data.data),
  getActive: () => api.get('/weeks/active').then(r => r.data.data),
  getDetails: (id: string) => api.get(`/weeks/${id}/details`).then(r => r.data.data),
  create: (data: any) => api.post('/weeks', data).then(r => r.data.data),
  close: (id: string) => api.patch(`/weeks/${id}/close`).then(r => r.data.data),
  delete: (id: string) => api.delete(`/weeks/${id}`).then(r => r.data.data),
}

export const inventoryApi = {
  getByWeek: (weekId: string) => api.get(`/inventory/week/${weekId}`).then(r => r.data.data),
  updateInitial: (weekId: string, items: any[]) => api.post('/inventory/initial', { weekId, items }).then(r => r.data.data),
  updateFinal: (weekId: string, items: any[]) => api.post('/inventory/final', { weekId, items }).then(r => r.data.data),
  registerEntry: (data: any) => api.post('/inventory/entry', data).then(r => r.data.data),
  registerAdjustment: (data: any) => api.post('/inventory/adjustment', data).then(r => r.data.data),
  getMovements: (weekId: string) => api.get(`/inventory/movements/${weekId}`).then(r => r.data.data),
}

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data.data),
  create: (data: any) => api.post('/users', data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/users/${id}`).then(r => r.data.data),
}

export const comandasApi = {
  getByWeek: (weekId: string) => api.get(`/comandas/week/${weekId}`).then(r => r.data.data),
  create: (data: any) => api.post('/comandas', data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/comandas/${id}`).then(r => r.data.data),
}

export const analyticsApi = {
  getByWeek: (weekId: string) => api.get(`/analytics/week/${weekId}`).then(r => r.data.data),
  getHistory: () => api.get('/analytics/history').then(r => r.data.data),
}

export const ordersApi = {
  getRecommendations: (weekId: string) => api.get(`/orders/recommend/${weekId}`).then(r => r.data.data),
  confirm: (data: any) => api.post('/orders/confirm', data).then(r => r.data.data),
  getHistory: (weekId: string) => api.get(`/orders/history/${weekId}`).then(r => r.data.data),
}
