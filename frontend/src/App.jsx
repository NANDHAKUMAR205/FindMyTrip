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
import Alerts from './pages/Alerts'
import Deals from './pages/Deals'
import './App.css'
import './Product.css'

export default function App() {
  return <BrowserRouter><AuthProvider><Layout><Routes><Route path="/" element={<Home />} /><Route path="/deals" element={<Deals />} /><Route path="/register" element={<Auth mode="register" />} /><Route path="/login" element={<Auth mode="login" />} /><Route path="/search" element={<Search />} /><Route path="/results" element={<Results />} /><Route path="/trip-details" element={<TripDetails />} /><Route path="/destinations/:destinationCode" element={<TripDetails />} /><Route element={<ProtectedRoute />}><Route path="/trips/:id" element={<TripDetails />} /><Route path="/saved" element={<SavedTrips />} /><Route path="/alerts" element={<Alerts />} /><Route path="/profile" element={<Profile />} /></Route></Routes></Layout></AuthProvider></BrowserRouter>
}
