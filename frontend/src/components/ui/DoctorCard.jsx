import { Link } from 'react-router-dom'
import styles from './DoctorCard.module.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { faUserTie } from "@fortawesome/free-solid-svg-icons";
import { faMoneyBill } from "@fortawesome/free-solid-svg-icons";
const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#FAECE7', color: '#993C1D' },
]

function getInitials(name) {
  return name
    .split(' ')
    .slice(-2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

function getAvatarColor(name) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export default function DoctorCard({ doctor }) {
  const { id, full_name, specialty, rating, experience_years, consultation_fee } = doctor
  const initials = getInitials(full_name)
  const avatarColor = getAvatarColor(full_name)

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div
          className={styles.avatar}
          style={{ background: avatarColor.bg, color: avatarColor.color }}
        >
          {initials}
        </div>
        <div>
          <p className={styles.name}>Dr. {full_name}</p>
          <p className={styles.spec}>{specialty}</p>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <FontAwesomeIcon icon={faStar} /> {rating}
        </span>
        <span className={styles.metaItem}>
          <FontAwesomeIcon icon={faUserTie} /> {experience_years} yrs exp.
        </span>
        <span className={styles.metaItem}>
          <FontAwesomeIcon icon={faMoneyBill} /> {Number(consultation_fee).toLocaleString('vi-VN')} ₫
        </span>
      </div>

      <Link to={`/doctors/${id}`} className={styles.bookBtn}>
        Book appointment
      </Link>
    </div>
  )
}