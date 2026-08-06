import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import styles from './Navbar.module.css'

const VISITOR_LINKS = [
  { label: 'Doctors', to: '/doctors' },
  { label: 'Services', to: '/services' },
  { label: 'Medicine', to: '/medicine' },
  { label: 'About', to: '/about' },
]

const PATIENT_LINKS = [
  ...VISITOR_LINKS,
  { label: 'Dashboard', to: '/patient/dashboard' },
]

const DOCTOR_LINKS = [
  { label: "Today's appointments", to: '/doctor/appointments/today' },
  { label: 'All appointments', to: '/doctor/appointments' },
  { label: 'Working schedules', to: '/doctor/schedule' },
  { label: 'Past checkups', to: '/doctor/appointments/history' },
  { label: 'Dashboard', to: '/doctor/dashboard' },
]

const NURSE_LINKS = [
  { label: 'Pharmacy queue', to: '/nurse/pharmacy' },
  { label: 'Medicine orders', to: '/nurse/medicine-orders' },
  { label: 'Dashboard', to: '/nurse/dashboard' },
]

const ADMIN_LINKS = [
  { label: 'Users', to: '/admin/users' },
  { label: 'Doctors', to: '/admin/doctors' },
  { label: 'Appointments', to: '/admin/appointments' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Dashboard', to: '/admin/dashboard' },
]

const SHIPPER_LINKS = [
  { label: 'Delivery workspace', to: '/shipper/dashboard' },
  { label: 'Dashboard', to: '/shipper/dashboard' },
]

function getLinksForRole(role, isAuthenticated) {
  if (!isAuthenticated) return VISITOR_LINKS

  switch (role) {
    case 'doctor':
      return DOCTOR_LINKS
    case 'nurse':
      return NURSE_LINKS
    case 'admin':
      return ADMIN_LINKS
    case 'shipper':
      return SHIPPER_LINKS
    case 'patient':
    default:
      return PATIENT_LINKS
  }
}

function getInitials(user) {
  const name = user?.full_name || user?.email || 'User'

  return name
    .split(' ')
    .filter(Boolean)
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
  const isShipper = role === 'shipper'
  const navigationLinks = getLinksForRole(role, isAuthenticated)

  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  function closeNavigation() {
    setMenuOpen(false)
    setDropdownOpen(false)
  }

  async function handleLogout() {
    await logout()
    closeNavigation()
    navigate('/login')
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo} onClick={closeNavigation}>
        <div className={styles.logoCross}>+</div>
        <span>MediCare</span>
      </Link>

      <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {navigationLinks.map(link => (
          <NavLink
            key={`${link.label}-${link.to}`}
            to={link.to}
            end={link.to.endsWith('/dashboard')}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`
            }
            onClick={closeNavigation}
          >
            {link.label}
          </NavLink>
        ))}

        {(!isAuthenticated || isPatient) && (
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `${styles.cartLink} ${isActive ? styles.activeNavLink : ''}`
            }
            onClick={closeNavigation}
          >
            <ShoppingCart size={18} />
            <span>Cart</span>

            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </NavLink>
        )}

        {isAuthenticated ? (
          <div className={styles.userMenu}>
            <button
              type="button"
              className={styles.userButton}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              onClick={() => setDropdownOpen(previous => !previous)}
            >
              <span className={styles.avatar}>{getInitials(user)}</span>

              <span className={styles.userName}>
                {user?.full_name || 'Account'}
              </span>

              <span className={styles.chevron}>
                {dropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown} role="menu">
                <Link
                  to="/profile"
                  className={styles.dropdownItem}
                  onClick={closeNavigation}
                >
                  Account Management
                </Link>

                {isShipper && (
                  <Link
                    to="/shipper/dashboard"
                    className={styles.dropdownItem}
                    onClick={closeNavigation}
                  >
                    Delivery Workspace
                  </Link>
                )}

                {isPatient && (
                  <>
                    <Link
                      to="/payments"
                      className={styles.dropdownItem}
                      onClick={closeNavigation}
                    >
                      Payment History
                    </Link>

                    <Link
                      to="/patient/appointments"
                      className={styles.dropdownItem}
                      onClick={closeNavigation}
                    >
                      My Appointments
                    </Link>

                    <Link
                      to="/patient/medicine-orders"
                      className={styles.dropdownItem}
                      onClick={closeNavigation}
                    >
                      Medicine Orders
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
        ) : (
          <>
            <Link
              to="/login"
              className={styles.btnOutline}
              onClick={closeNavigation}
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className={styles.btnSolid}
              onClick={closeNavigation}
            >
              Get started
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className={styles.hamburger}
        onClick={() => setMenuOpen(previous => !previous)}
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  )
}