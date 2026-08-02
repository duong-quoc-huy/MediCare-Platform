import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  Pill,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import styles from './AdminNav.module.css'

const LINKS = [
  ['/admin/dashboard', 'Dashboard', LayoutDashboard],
  ['/admin/users', 'Users', Users],
  ['/admin/doctors', 'Doctors', Stethoscope],
  ['/admin/medicines', 'Medicines', Pill],
  ['/admin/appointments', 'Appointments', CalendarDays],
  ['/admin/prescriptions', 'Prescriptions', ClipboardList],
  ['/admin/orders', 'Orders', Activity],
  ['/admin/payments', 'Payments', CreditCard],
  ['/admin/notifications', 'Notifications', Bell],
]

export default function AdminNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setOpen(value => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
        Admin menu
      </button>

      <aside className={`${styles.nav} ${open ? styles.open : ''}`}>
        <div className={styles.heading}>
          <span>Administration</span>
          <strong>MediCare Control Center</strong>
        </div>

        <div className={styles.links}>
          {LINKS.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  )
}
