import {
  Bell,
  CheckCheck,
  LoaderCircle,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService'

import styles from './NotificationBell.module.css'

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  const created = new Date(value)
  const now = new Date()

  const seconds = Math.max(
    0,
    Math.floor(
      (now.getTime() - created.getTime()) /
      1000
    )
  )

  if (seconds < 60) {
    return 'Just now'
  }

  const minutes = Math.floor(
    seconds / 60
  )

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(
    minutes / 60
  )

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(
    hours / 24
  )

  if (days < 7) {
    return `${days}d ago`
  }

  return created.toLocaleDateString(
    'en-GB'
  )
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [open, setOpen] =
    useState(false)

  const [notifications, setNotifications] =
    useState([])

  const [unreadCount, setUnreadCount] =
    useState(0)

  const [loading, setLoading] =
    useState(false)

  const loadUnreadCount = useCallback(
    async () => {
      try {
        const data =
          await getUnreadNotificationCount()

        setUnreadCount(
          Number(data.unread_count || 0)
        )
      } catch (error) {
        console.error(
          'Could not load unread notification count:',
          error
        )
      }
    },
    []
  )

  const loadRecentNotifications =
    useCallback(async () => {
      try {
        setLoading(true)

        const data =
          await getNotifications()

        setNotifications(
          normalizeResponse(data).slice(0, 5)
        )
      } catch (error) {
        console.error(
          'Could not load notifications:',
          error
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    loadUnreadCount()

    const intervalId =
      window.setInterval(
        loadUnreadCount,
        30000
      )

    function handleNotificationReceived() {
      loadUnreadCount()

      if (open) {
        loadRecentNotifications()
      }
    }

    window.addEventListener(
      'medicare:notification-received',
      handleNotificationReceived
    )

    return () => {
      window.clearInterval(intervalId)

      window.removeEventListener(
        'medicare:notification-received',
        handleNotificationReceived
      )
    }
  }, [
    loadUnreadCount,
    loadRecentNotifications,
    open,
  ])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target
        )
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  async function handleToggle() {
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen) {
      await Promise.all([
        loadRecentNotifications(),
        loadUnreadCount(),
      ])
    }
  }

  async function handleNotificationClick(
    notification
  ) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(
          notification.notification_id
        )

        setUnreadCount(current =>
          Math.max(0, current - 1)
        )
      }
    } catch (error) {
      console.error(
        'Could not mark notification as read:',
        error
      )
    }

    setOpen(false)

    navigate(
      notification.target_url ||
      '/notifications'
    )
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()

      setUnreadCount(0)

      setNotifications(current =>
        current.map(notification => ({
          ...notification,
          is_read: true,
        }))
      )
    } catch (error) {
      console.error(
        'Could not mark all notifications as read:',
        error
      )
    }
  }

  return (
    <div
      className={styles.container}
      ref={containerRef}
    >
      <button
        type="button"
        className={styles.bellButton}
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div>
              <h3>Notifications</h3>

              <span>
                {unreadCount} unread
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className={
                  styles.markAllButton
                }
              >
                <CheckCheck size={15} />
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.state}>
                <LoaderCircle
                  size={23}
                  className={styles.spinner}
                />

                <span>
                  Loading notifications...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.state}>
                <Bell size={26} />

                <span>
                  No notifications yet
                </span>
              </div>
            ) : (
              notifications.map(
                notification => (
                  <button
                    type="button"
                    key={
                      notification.notification_id
                    }
                    className={`${styles.item} ${
                      !notification.is_read
                        ? styles.unreadItem
                        : ''
                    }`}
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                  >
                    <span
                      className={
                        styles.itemIndicator
                      }
                    />

                    <span
                      className={
                        styles.itemContent
                      }
                    >
                      <strong>
                        {notification.title}
                      </strong>

                      <span>
                        {notification.message}
                      </span>

                      <small>
                        {formatRelativeTime(
                          notification.created_at
                        )}
                      </small>
                    </span>
                  </button>
                )
              )
            )}
          </div>

          <Link
            to="/notifications"
            className={styles.viewAllLink}
            onClick={() =>
              setOpen(false)
            }
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}