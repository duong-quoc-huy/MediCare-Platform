import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

const FOOTER_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Contact Us', to: '/contact' },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <div className={styles.logoCross}>+</div>
          <span>MediCare</span>
        </div>

        <p className={styles.tagline}>
          Bringing trusted healthcare to your home across Vietnam.
        </p>

        <div className={styles.links}>
          {FOOTER_LINKS.map(link => (
            <Link key={link.to} to={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </div>

        <p className={styles.copy}>
          © {new Date().getFullYear()} Firefly MediCare . All rights reserved.
        </p>
      </div>
    </footer>
  )
}