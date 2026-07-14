import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { getProfile } from '../../services/userService'
import styles from './Profile.module.css'

const NAV_ITEMS = [
  { path: '/profile', label: 'Account Overview', end: true },
  { path: '/profile/personal-info', label: 'Personal Information' },
  { path: '/profile/address-book', label: 'Address Book' },
  { path: '/profile/security', label: 'Security' },
]

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile()
        setProfile(data)
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Account Center</h1>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className={styles.content}>
          {loadingProfile ? (
            <p className={styles.muted}>Loading profile...</p>
          ) : (
            // Child route pages read/update this via useOutletContext()
            <Outlet context={{ profile, setProfile }} />
          )}
        </main>
      </div>
    </div>
  )
}