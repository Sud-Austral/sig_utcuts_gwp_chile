import axios from 'axios'

// En producción (Railway, mismo origen): relativa → '/api/v1'
// En desarrollo: Vite proxy redirige '/api' → 'http://localhost:8000'
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Add JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
