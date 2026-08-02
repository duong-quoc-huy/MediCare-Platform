import {
  Bell,
  X,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import styles from './ForegroundNotification.module.css'

export default function ForegroundNotification({
  payload,
  onClose,
}) {
  const navigate = useNavigate()

  if (!payload) {
    return null
  }

  const title =
    payload.data?.title ||
    payload.notification?.title ||
    'MediCare notification'

  const message =
    payload.data?.body ||
    payload.notification?.body ||
    'You have a new MediCare update.'

  const targetUrl =
    payload.data?.url ||
    '/notifications'

  function handleOpen() {
    onClose()
    navigate(targetUrl)
  }

  return (
    <aside className={styles.banner}>
      <button
        type="button"
        className={styles.content}
        onClick={handleOpen}
      >
        <span className={styles.icon}>
          <Bell size={21} />
        </span>

        <span className={styles.text}>
          <strong>{title}</strong>
          <span>{message}</span>
        </span>
      </button>

      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </aside>
  )
}