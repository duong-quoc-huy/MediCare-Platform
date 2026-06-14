import styles from './ServiceCard.module.css'

export default function ServiceCard({ icon, title, description }) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
    </div>
  )
}