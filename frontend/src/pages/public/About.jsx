import { Link } from 'react-router-dom'
import styles from './About.module.css'

const stats = [
  { value: '50,000+', label: 'Patients served' },
  { value: '300+', label: 'Licensed doctors' },
  { value: '12', label: 'Cities covered' },
  { value: '4.8/5', label: 'Average rating' },
]

const values = [
  {
    icon: '🤝',
    title: 'Care first',
    text: 'Every decision we make starts with what is best for the patient — not what is fastest or cheapest for us.',
  },
  {
    icon: '🔍',
    title: 'Transparency',
    text: 'Clear pricing, clear doctor credentials, and clear answers. No hidden fees, no surprises at checkout.',
  },
  {
    icon: '⚡',
    title: 'Accessibility',
    text: 'Healthcare should not depend on how far you live from a hospital. We bring the visit to you when you need it.',
  },
  {
    icon: '🛡️',
    title: 'Trust & safety',
    text: 'Every doctor on MediCare is verified and licensed. Your health information is protected at every step.',
  },
]

const timeline = [
  {
    year: '2023',
    title: 'MediCare is founded',
    text: 'Started as a small team in Ho Chi Minh City with one goal: make quality checkups easier to reach.',
  },
  {
    year: '2024',
    title: 'Home visit checkup launches',
    text: 'Introduced doctor-to-your-door service, starting with three districts in Ho Chi Minh City.',
  },
  {
    year: '2025',
    title: 'Medicine delivery added',
    text: 'Partnered with licensed pharmacies and GHTK to deliver prescriptions straight to patients.',
  },
  {
    year: '2026',
    title: 'Expanding across Vietnam',
    text: 'Now serving 12 cities, with more specialties and doctors joining every month.',
  },
]

const team = [
  { name: 'Dr. Le Minh Khoa', role: 'Co-Founder & Chief Medical Officer', initials: 'LK' },
  { name: 'Tran Thi Bao Ngoc', role: 'Co-Founder & CEO', initials: 'TN' },
  { name: 'Pham Duc Anh', role: 'Head of Engineering', initials: 'PA' },
  { name: 'Nguyen Hoang Yen', role: 'Head of Operations', initials: 'NY' },
]

export default function About() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>About MediCare</p>
        <h1 className={styles.title}>
          Healthcare that meets you where you are.
        </h1>
        <p className={styles.subtitle}>
          We started MediCare because getting a checkup shouldn't mean
          taking half a day off work or sitting in a waiting room. Whether
          it's a clinic visit or a doctor at your door, we make quality care
          simple to reach.
        </p>
      </section>

      {/* Stats */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className={styles.section}>
        <div className={styles.missionGrid}>
          <div>
            <p className={styles.eyebrow}>Our Mission</p>
            <h2 className={styles.sectionTitleLeft}>
              Quality care shouldn't depend on how close you live to a
              hospital.
            </h2>
          </div>
          <div>
            <p className={styles.missionText}>
              Millions of people delay checkups because of distance, time,
              or simply not knowing where to start. MediCare removes those
              barriers by connecting patients with licensed doctors for
              in-clinic visits or home checkups, and by making medicine
              delivery part of the same simple flow.
            </p>
            <p className={styles.missionText}>
              We believe the best healthcare platform is the one you barely
              notice — because booking, paying, and following up all just
              work, leaving you to focus on getting better.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What We Stand For</h2>
        <div className={styles.valuesGrid}>
          {values.map((value) => (
            <div key={value.title} className={styles.valueCard}>
              <span className={styles.valueIcon} aria-hidden="true">
                {value.icon}
              </span>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.valueText}>{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Our Journey</h2>
        <div className={styles.timeline}>
          {timeline.map((item, i) => (
            <div key={item.year} className={styles.timelineItem}>
              <div className={styles.timelineMarker}>
                <span className={styles.timelineDot} />
                {i !== timeline.length - 1 && (
                  <span className={styles.timelineLine} />
                )}
              </div>
              <div className={styles.timelineContent}>
                <p className={styles.timelineYear}>{item.year}</p>
                <h3 className={styles.timelineTitle}>{item.title}</h3>
                <p className={styles.timelineText}>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Meet the Team</h2>
        <p className={styles.sectionSubtitle}>
          A small team of clinicians, engineers, and operators building
          MediCare together.
        </p>
        <div className={styles.teamGrid}>
          {team.map((person) => (
            <div key={person.name} className={styles.teamCard}>
              <div className={styles.teamAvatar}>{person.initials}</div>
              <p className={styles.teamName}>{person.name}</p>
              <p className={styles.teamRole}>{person.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className={styles.ctaBanner}>
        <h2>Want to be part of the story?</h2>
        <p>
          Book your first checkup today, or reach out if you'd like to join
          our network of doctors.
        </p>
        <div className={styles.heroActions}>
          <Link to="/register" className={styles.primaryButtonInverse}>
            Get Started
          </Link>
          <Link to="/contact" className={styles.secondaryButtonInverse}>
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}