import { Link } from 'react-router-dom'

import {
  ClipboardList,
  HeartPulse,
  PackageCheck,
  Users,
} from 'lucide-react'

import styles from './NurseDashboard.module.css'

export default function NurseDashboard() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            Nurse dashboard
          </p>

          <h1>Welcome back, Nurse</h1>

          <p>
            Manage clinic prescriptions, medicine delivery
            orders, payments, and patient support
            workflows.
          </p>
        </div>

        <Link
          to="/nurse/medicine-orders"
          className={styles.heroButton}
        >
          <PackageCheck size={18} />
          Open delivery orders
        </Link>
      </section>

      <section className={styles.grid}>
        <Link
          to="/nurse/pharmacy"
          className={styles.card}
        >
          <ClipboardList size={32} />

          <h2>Pharmacy Queue</h2>

          <p>
            View clinic prescriptions, claim pharmacy
            assignments, and confirm final payments.
          </p>
        </Link>

        <Link
          to="/nurse/medicine-orders"
          className={styles.card}
        >
          <PackageCheck size={32} />

          <h2>Medicine Delivery Orders</h2>

          <p>
            Prepare paid online medicine orders and create
            GHTK shipments for home delivery.
          </p>
        </Link>

        <div className={styles.cardMuted}>
          <Users size={32} />

          <h2>Patient Management</h2>

          <p>
            Coming next: view patients and update basic
            patient information.
          </p>
        </div>

        <div className={styles.cardMuted}>
          <HeartPulse size={32} />

          <h2>Vitals</h2>

          <p>
            Coming next: record and update patient vitals
            for in-progress checkups.
          </p>
        </div>
      </section>
    </main>
  )
}