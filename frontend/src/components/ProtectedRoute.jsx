import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
export default function ProtectedRoute() { const { user, loading } = useAuth(); const location = useLocation(); if (loading) return <div className="loading">Loading your workspace…</div>; return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace /> }
