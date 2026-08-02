import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  HeartPulse,
  MapPin,
  Pill,
  ShoppingCart,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import styles from './PatientDashboard.module.css'
import NotificationPermissionCard from '../../components/NotificationPermissionCard'
const DASHBOARD_ACTIONS = [
  {
    title: 'Medicine Orders',
    description:
      'Track your medicine purchases, preparation status, and GHTK delivery progress.',
    to: '/patient/medicine-orders',
    icon: Pill,
    action: 'View orders',
  },
  {
    title: 'My Appointments',
    description:
      'Review upcoming consultations, completed appointments, and medical records.',
    to: '/patient/appointments',
    icon: CalendarDays,
    action: 'View appointments',
  },
  {
    title: 'Payment History',
    description:
      'View payment methods, transaction status, and purchased medicine details.',
    to: '/payments',
    icon: CreditCard,
    action: 'View payments',
  },
  {
    title: 'Medicine Cart',
    description:
      'Review selected medicines, update quantities, and continue to checkout.',
    to: '/cart',
    icon: ShoppingCart,
    action: 'Open cart',
  },
  {
    title: 'Find a Doctor',
    description:
      'Browse available doctors, specialties, and appointment schedules.',
    to: '/doctors',
    icon: HeartPulse,
    action: 'Browse doctors',
  },
  {
    title: 'Account Settings',
    description:
      'Manage your personal information, addresses, phone numbers, and security.',
    to: '/profile',
    icon: UserRound,
    action: 'Manage account',
  },
]

export default function PatientDashboard() {
  const { user } = useAuth()

  const patientName =
    user?.full_name ||
    user?.email?.split('@')[0] ||
    'Patient'

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            Patient portal
          </p>

          <h1>
            Welcome back, {patientName}
          </h1>

          <p className={styles.heroDescription}>
            Manage appointments, medicine orders,
            deliveries, payments, and your MediCare
            account from one secure place.
          </p>

          <div className={styles.heroActions}>
            <Link
              to="/doctors"
              className={styles.primaryButton}
            >
              <CalendarDays size={18} />
              Book an appointment
            </Link>

            <Link
              to="/patient/medicine-orders"
              className={styles.secondaryButton}
            >
              <Pill size={18} />
              Track medicine orders
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroIcon}>
            <HeartPulse size={54} />
          </div>

          <div>
            <span>Your healthcare hub</span>

            <strong>
              Convenient, organized, and secure
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.quickPanel}>
        <div className={styles.quickItem}>
          <CalendarDays size={21} />

          <div>
            <span>Appointments</span>
            <strong>Book and review visits</strong>
          </div>
        </div>

        <div className={styles.quickItem}>
          <Pill size={21} />

          <div>
            <span>Medicine delivery</span>
            <strong>Track every order stage</strong>
          </div>
        </div>

        <div className={styles.quickItem}>
          <MapPin size={21} />

          <div>
            <span>Saved addresses</span>
            <strong>Manage delivery locations</strong>
          </div>
        </div>
      </section>

      <NotificationPermissionCard />

      <section className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>
            Your services
          </p>

          <h2>What would you like to do?</h2>
        </div>
      </section>

      <section className={styles.grid}>
        {DASHBOARD_ACTIONS.map(action => {
          const Icon = action.icon

          return (
            <Link
              key={action.to}
              to={action.to}
              className={styles.card}
            >
              <div className={styles.cardIcon}>
                <Icon size={28} />
              </div>

              <div className={styles.cardContent}>
                <h3>{action.title}</h3>

                <p>{action.description}</p>
              </div>

              <div className={styles.cardAction}>
                <span>{action.action}</span>
                <ChevronRight size={17} />
              </div>
            </Link>
          )
        })}
      </section>
    </main>
  )
}