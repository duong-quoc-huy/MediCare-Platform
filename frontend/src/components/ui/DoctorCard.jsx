import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Home,
  Hospital,
  Star,
  UserRound,
  Wallet,
} from 'lucide-react'

import styles from './DoctorCard.module.css'

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

export default function DoctorCard({ doctor }) {
  const supportsClinic =
    doctor.supports_clinic ||
    doctor.available_visit_types?.includes('clinic')

  const supportsHomeVisit =
    doctor.supports_home_visit ||
    doctor.available_visit_types?.includes('home_visit')

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.avatar}>
          {doctor.full_name?.charAt(0) || 'D'}
        </div>

        <div className={styles.mainInfo}>
          <p className={styles.eyebrow}>Doctor</p>
          <h3>Dr. {doctor.full_name}</h3>
          <p className={styles.specialty}>{doctor.specialty}</p>
        </div>
      </div>

      <div className={styles.tags}>
        {supportsClinic && (
          <span className={styles.clinicTag}>
            <Hospital size={14} />
            Clinic
          </span>
        )}

        {supportsHomeVisit && (
          <span className={styles.homeVisitTag}>
            <Home size={14} />
            Home visit
          </span>
        )}

        {doctor.is_available ? (
          <span className={styles.availableTag}>
            <CheckCircle2 size={14} />
            Available
          </span>
        ) : (
          <span className={styles.unavailableTag}>Unavailable</span>
        )}
      </div>

      <div className={styles.metaGrid}>
        <div>
          <Star size={17} />
          <strong>{doctor.rating || '0.0'}</strong>
          <span>Rating</span>
        </div>

        <div>
          <UserRound size={17} />
          <strong>{doctor.experience_years || 0}</strong>
          <span>Years</span>
        </div>

        <div>
          <Wallet size={17} />
          <strong>{formatPrice(doctor.consultation_fee)}</strong>
          <span>VND</span>
        </div>
      </div>

      <Link
        to={`/doctors/${doctor.slug}`}
        className={styles.detailButton}
      >
        View detail & book
      </Link>
    </article>
  )
}