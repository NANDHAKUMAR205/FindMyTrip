import { useEffect, useState } from 'react'
import api from '../api'
import { AuthContext } from './context'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('findmytrip_token')))
  useEffect(() => {
    if (!localStorage.getItem('findmytrip_token')) return
    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => localStorage.removeItem('findmytrip_token')).finally(() => setLoading(false))
  }, [])
  const signIn = async (path, values) => { const { data } = await api.post(path, values); localStorage.setItem('findmytrip_token', data.token); setUser(data.user); return data }
  const logout = () => { localStorage.removeItem('findmytrip_token'); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, signIn, logout, setUser }}>{children}</AuthContext.Provider>
}
