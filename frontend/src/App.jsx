import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Search from './pages/Search'
import Results from './pages/Results'
import TripDetails from './pages/TripDetails'
import SavedTrips from './pages/SavedTrips'
import Profile from './pages/Profile'
import './App.css'

export default function App() {
  return <BrowserRouter><AuthProvider><Layout><Routes><Route path="/" element={<Home />} /><Route path="/register" element={<Auth mode="register" />} /><Route path="/login" element={<Auth mode="login" />} /><Route element={<ProtectedRoute />}><Route path="/search" element={<Search />} /><Route path="/results" element={<Results />} /><Route path="/trip-details" element={<TripDetails />} /><Route path="/saved" element={<SavedTrips />} /><Route path="/profile" element={<Profile />} /></Route></Routes></Layout></AuthProvider></BrowserRouter>
}
