import styles from './DashboardPlaceholder.module.css'

export default function DashboardPlaceholder({
  eyebrow,
  title,
  subtitle,
  cards,
}) {
  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </section>

      <section className={styles.grid}>
        {cards.map(card => (
          <div key={card.title} className={styles.card}>
            <div className={styles.icon}>{card.icon}</div>
            <h2 className={styles.cardTitle}>{card.title}</h2>
            <p className={styles.cardText}>{card.text}</p>
            <span className={styles.badge}>Coming soon</span>
          </div>
        ))}
      </section>
    </main>
  )
}