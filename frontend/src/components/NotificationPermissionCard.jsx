import {
  Bell,
  BellOff,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'

import {
  getFirebaseRegistrationToken,
} from '../firebase'

import {
  registerFirebaseDevice,
} from '../services/notificationService'

import {
  useEffect,
  useState,
} from 'react'

import styles from './NotificationPermissionCard.module.css'

const TOKEN_STORAGE_KEY =
  'firebase_registration_token'

function getInitialState() {
  if (
    typeof Notification === 'undefined'
  ) {
    return 'unsupported'
  }

  const savedToken =
    localStorage.getItem(
      TOKEN_STORAGE_KEY
    )

  if (
    Notification.permission === 'granted' &&
    savedToken
  ) {
    return 'enabled'
  }

  if (
    Notification.permission === 'denied'
  ) {
    return 'denied'
  }

  return 'idle'
}

export default function NotificationPermissionCard() {
  const [state, setState] =
    useState(getInitialState)

  const [message, setMessage] =
    useState('')

  useEffect(() => {
    setState(getInitialState())
  }, [])

  async function handleEnableNotifications() {
    if (
      typeof Notification === 'undefined'
    ) {
      setState('unsupported')
      return
    }

    try {
      setState('loading')
      setMessage('')

      const permission =
        await Notification.requestPermission()

      if (permission === 'denied') {
        setState('denied')

        setMessage(
          'Notifications are blocked in your browser settings.'
        )

        return
      }

      if (permission !== 'granted') {
        setState('idle')

        setMessage(
          'Notification permission was not granted.'
        )

        return
      }

      const registrationToken =
        await getFirebaseRegistrationToken()

      await registerFirebaseDevice({
        registrationToken,
        platform: 'web',
        deviceName: navigator.userAgent
          .slice(0, 150),
      })

      localStorage.setItem(
        TOKEN_STORAGE_KEY,
        registrationToken
      )

      setState('enabled')

      setMessage(
        'This browser will now receive medicine delivery updates.'
      )
    } catch (error) {
      console.error(
        'Could not enable notifications:',
        error
      )

      setState('error')

      setMessage(
        error.response?.data?.detail ||
        error.message ||
        'Could not enable notifications.'
      )
    }
  }

  if (state === 'enabled') {
    return (
      <section
        className={`${styles.card} ${styles.enabledCard}`}
      >
        <div className={styles.icon}>
          <CheckCircle2 size={28} />
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>
            Delivery notifications
          </p>

          <h2>Notifications are enabled</h2>

          <p>
            You will receive browser alerts for
            important medicine-order and delivery
            updates.
          </p>

          {message && (
            <span className={styles.message}>
              {message}
            </span>
          )}
        </div>

        <div className={styles.statusBadge}>
          <ShieldCheck size={16} />
          Active
        </div>
      </section>
    )
  }

  if (state === 'unsupported') {
    return (
      <section
        className={`${styles.card} ${styles.warningCard}`}
      >
        <div className={styles.icon}>
          <BellOff size={28} />
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>
            Delivery notifications
          </p>

          <h2>Browser notifications unavailable</h2>

          <p>
            This browser does not support Firebase
            web push notifications.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.icon}>
        <Bell size={28} />
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>
          Stay informed
        </p>

        <h2>
          Receive medicine delivery updates
        </h2>

        <p>
          Get alerts when your package is confirmed,
          prepared, collected by GHTK, delivered, or
          returned.
        </p>

        {state === 'denied' && (
          <span
            className={styles.errorMessage}
          >
            Notifications are blocked. Open your
            browser site settings and allow
            notifications for MediCare.
          </span>
        )}

        {state === 'error' && message && (
          <span
            className={styles.errorMessage}
          >
            {message}
          </span>
        )}

        {state === 'idle' && message && (
          <span className={styles.message}>
            {message}
          </span>
        )}
      </div>

      <button
        type="button"
        className={styles.enableButton}
        onClick={handleEnableNotifications}
        disabled={
          state === 'loading' ||
          state === 'denied'
        }
      >
        {state === 'loading' ? (
          <>
            <LoaderCircle
              size={17}
              className={styles.spinner}
            />
            Enabling...
          </>
        ) : (
          <>
            <Bell size={17} />
            Enable notifications
          </>
        )}
      </button>
    </section>
  )
}