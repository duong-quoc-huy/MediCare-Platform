import AdminNav from './AdminNav'
import styles from './AdminPage.module.css'

export default function AdminPage({ children }) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      <section className={styles.content}>
        {children}
      </section>
    </div>
  )
}
