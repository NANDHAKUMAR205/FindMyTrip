import { useEffect, useState } from 'react'
import api from '../api'
import { AuthContext } from './context'
import { normalizeUser } from '../stores/userPreferenceStore'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('findmytrip_token')))
  useEffect(() => {
    if (!localStorage.getItem('findmytrip_token')) return
    api.get('/auth/me').then(({ data }) => setUser(normalizeUser(data.user))).catch(() => localStorage.removeItem('findmytrip_token')).finally(() => setLoading(false))
  }, [])
  const signIn = async (path, values) => { const { data } = await api.post(path, values); localStorage.setItem('findmytrip_token', data.token); const normalized = { ...data, user: normalizeUser(data.user) }; setUser(normalized.user); return normalized }
  const logout = () => { localStorage.removeItem('findmytrip_token'); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, signIn, logout, setUser }}>{children}</AuthContext.Provider>
}
