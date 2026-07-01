import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { label: 'Doctors',  to: '/doctors'  },
  { label: 'Services', to: '/services' },
  { label: 'Medicine', to: '/medicine' },
  { label: 'About',    to: '/about'    },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalQuantity } = useCart()

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoCross}>+</div>
        <span>MediCare</span>
      </Link>

      <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {NAV_LINKS.map(link => (
          <Link key={link.to} to={link.to} className={styles.navLink}>
            {link.label}
          </Link>
        ))}

        <Link to="/cart" className={styles.cartLink}>
          Cart
          {totalQuantity > 0 && (
            <span className={styles.cartBadge}>{totalQuantity}</span>
          )}
        </Link>

        <Link to="/login" className={styles.btnOutline}>Sign in</Link>
        <Link to="/register" className={styles.btnSolid}>Get started</Link>
      </div>

      <button
        className={styles.hamburger}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>
    </nav>
  )
}