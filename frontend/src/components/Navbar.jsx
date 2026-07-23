import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import styles from './Navbar.module.css'

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

  const role = user?.role?.toLowerCase()
  const isPatient = role === 'patient'

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

        {(!isAuthenticated || isPatient) && (
          <Link
            to="/cart"
            className={styles.cartLink}
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingCart size={18} />
            <span>Cart</span>

            {totalItems > 0 && (
              <span className={styles.cartBadge}>
                {totalItems}
              </span>
            )}
          </Link>
        )}

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

                  {isPatient && (
                    <>
                      <Link
                        to="/payments"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setDropdownOpen(false)
                          setMenuOpen(false)
                        }}
                      >
                        Payment History
                      </Link>

                      <Link
                        to="/patient/appointments"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setDropdownOpen(false)
                          setMenuOpen(false)
                        }}
                      >
                        My Appointments
                      </Link>
                    </>
                  )}

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
            <Link
              to="/login"
              className={styles.btnOutline}
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className={styles.btnSolid}
              onClick={() => setMenuOpen(false)}
            >
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