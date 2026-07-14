import { useOutletContext, Link } from 'react-router-dom'
import { GENDER_LABELS } from './profileConstants'
import styles from './Profile.module.css'

function maskEmail(email) {
  if (!email) return '-'
  const [name, domain] = email.split('@')
  if (!domain) return email
  const visible = name.slice(0, Math.min(3, name.length))
  return `${visible}****@${domain}`
}

function maskPhone(phone) {
  if (!phone) return '-'
  if (phone.length <= 5) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`
}

export default function ProfileOverview() {
  const { profile } = useOutletContext()
  const dobDisplay = profile?.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-GB')
    : '-'

  return (
    <>
      {/* ---------- Personal Information summary ---------- */}
      <section className={styles.section}>
        <div className={styles.overviewHeader}>
          <h2 className={styles.sectionTitle}>Personal Information</h2>
          <Link to="/profile/personal-info" className={styles.manageLink}>
            Manage <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.overviewRow}>
          <span className={styles.label}>Full name</span>
          <span className={styles.value}>{profile?.full_name || '-'}</span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.label}>Email Address</span>
          <span className={styles.value}>{maskEmail(profile?.email)}</span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.label}>Mobile Number</span>
          <span className={styles.value}>{maskPhone(profile?.phone_number_1)}</span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.label}>Gender</span>
          <span className={styles.value}>{GENDER_LABELS[profile?.gender] || '-'}</span>
        </div>
        <div className={styles.overviewRow}>
          <span className={styles.label}>Date of birth</span>
          <span className={styles.value}>{dobDisplay}</span>
        </div>
      </section>

      {/* ---------- Security summary ---------- */}
      <section className={styles.section}>
        <div className={styles.overviewHeader}>
          <h2 className={styles.sectionTitle}>Password and Security</h2>
          <Link to="/profile/security" className={styles.manageLink}>
            Manage <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.overviewRow}>
          <span className={styles.label}>Password</span>
          <span className={styles.value}>
            {profile?.password_updated_at
              ? `Last updated ${new Date(profile.password_updated_at).toLocaleDateString('en-GB')}`
              : 'Manage your password'}
          </span>
        </div>
      </section>
    </>
  )
}