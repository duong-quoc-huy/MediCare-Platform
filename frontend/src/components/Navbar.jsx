import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Navbar.module.css'
import { useCart } from '../context/CartContext'
import { ShoppingCart } from 'lucide-react'

const PUBLIC_LINKS = [
  { label: 'Doctors', to: '/doctors' },
  { label: 'Services', to: '/services' },
  { label: 'Medicine', to: '/medicine' },
  { label: 'About', to: '/about' },
]



function getDashboardPath(role) {
  const normalizedRole = role?.toLowerCase()

  if (normalizedRole === 'admin') return '/admin/dashboard'
  if (normalizedRole === 'doctor') return '/doctor/dashboard'
  if (normalizedRole === 'shipper') return '/shipper/dashboard'

  return '/patient/dashboard'
}

function getInitials(user) {
  const name = user?.full_name || user?.email || 'User'

  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Navbar() {
  const navigate = useNavigate()
  const { totalItems } = useCart()
  
  const { user, isAuthenticated, logout } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function handleLogout() {
    await logout()
    setDropdownOpen(false)
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoCross}>+</div>
        <span>MediCare</span>
      </Link>

      <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {PUBLIC_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={styles.navLink}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}


        <Link to="/cart" className={styles.cartLink}>
          <ShoppingCart size={18} />
          <span>Cart</span>

          {totalItems > 0 && (
            <span className={styles.cartBadge}>
              {totalItems}
            </span>
          )}
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath(user?.role)}
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>

            <div className={styles.userMenu}>
              <button
                type="button"
                className={styles.userButton}
                onClick={() => setDropdownOpen(prev => !prev)}
              >
                <span className={styles.avatar}>
                  {getInitials(user)}
                </span>
                <span className={styles.userName}>
                  {user?.full_name || 'Account'}
                </span>
                <span className={styles.chevron}>
                  {dropdownOpen ? '▲' : '▼'}
                </span>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    Account Management
                  </Link>

                  <Link
                    to="/placeholder-1"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    Placeholder 1
                  </Link>

                  <Link
                    to="/placeholder-2"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    Placeholder 2
                  </Link>

                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.btnOutline}>
              Sign in
            </Link>
            <Link to="/register" className={styles.btnSolid}>
              Get started
            </Link>
          </>
        )}
      </div>

      <button
        className={styles.hamburger}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  )
}