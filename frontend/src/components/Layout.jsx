import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
export default function Layout({ children }) {
  const { user, logout } = useAuth(); const navigate = useNavigate()
  return <><header className="topbar"><Link to="/" className="brand"><span>✦</span> FindMyTrip</Link><nav>{user ? <><NavLink to="/search">Plan a trip</NavLink><NavLink to="/deals">Price insights</NavLink><NavLink to="/alerts">Alerts</NavLink><NavLink to="/saved">Saved trips</NavLink><NavLink to="/profile">Profile</NavLink><button className="text-button" onClick={() => { logout(); navigate('/') }}>Log out</button></> : <><Link to="/deals">Price insights</Link><Link to="/login">Log in</Link><Link to="/register" className="small-cta">Get started</Link></>}</nav></header><main>{children}</main><footer>FindMyTrip <span>Discovery · affordability · confidence</span></footer></>
}
