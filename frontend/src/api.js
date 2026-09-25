import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://backend-8vohx6452-nandhakumar205s-projects.vercel.app/api',
})
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('findmytrip_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export default api
