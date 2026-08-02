import {
  Bell,
  CheckCheck,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService'

import styles from './NotificationsPage.module.css'

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      count: data.length,
      next: null,
    }
  }

  return {
    items: Array.isArray(data?.results)
      ? data.results
      : [],

    count: Number(data?.count || 0),

    next: data?.next || null,
  }
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone:
        'Asia/Ho_Chi_Minh',
    }
  ).format(new Date(value))
}

export default function NotificationsPage() {
  const navigate = useNavigate()

  const [notifications, setNotifications] =
    useState([])

  const [filter, setFilter] =
    useState('all')

  const [page, setPage] =
    useState(1)

  const [hasNextPage, setHasNextPage] =
    useState(false)

  const [totalCount, setTotalCount] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [loadingMore, setLoadingMore] =
    useState(false)

  const [error, setError] =
    useState('')

  const loadNotifications = useCallback(
    async ({
      requestedPage = 1,
      append = false,
      manual = false,
    } = {}) => {
      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }

        setError('')

        const params = {
          page: requestedPage,
        }

        if (filter === 'unread') {
          params.unread = true
        }

        const data =
          await getNotifications(params)

        const normalized =
          normalizeResponse(data)

        setNotifications(current =>
          append
            ? [
                ...current,
                ...normalized.items,
              ]
            : normalized.items
        )

        setTotalCount(
          normalized.count
        )

        setHasNextPage(
          Boolean(normalized.next)
        )

        setPage(requestedPage)

        if (manual) {
          window.dispatchEvent(
            new CustomEvent(
              'medicare:notification-received'
            )
          )
        }
      } catch (requestError) {
        console.error(
          'Could not load notifications:',
          requestError
        )

        setError(
          requestError.response?.data?.detail ||
          'Could not load notifications.'
        )
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filter]
  )

  useEffect(() => {
    loadNotifications({
      requestedPage: 1,
    })
  }, [loadNotifications])

  async function handleOpen(
    notification
  ) {
    try {
      if (!notification.is_read) {
        const updated =
          await markNotificationRead(
            notification.notification_id
          )

        setNotifications(current =>
          current.map(item =>
            item.notification_id ===
            updated.notification_id
              ? updated
              : item
          )
        )

        window.dispatchEvent(
          new CustomEvent(
            'medicare:notification-received'
          )
        )
      }
    } catch (requestError) {
      console.error(
        'Could not mark notification as read:',
        requestError
      )
    }

    navigate(
      notification.target_url ||
      '/notifications'
    )
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()

      setNotifications(current =>
        current.map(item => ({
          ...item,
          is_read: true,
        }))
      )

      window.dispatchEvent(
        new CustomEvent(
          'medicare:notification-received'
        )
      )
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
        'Could not mark notifications as read.'
      )
    }
  }

  const unreadCount =
    notifications.filter(
      notification =>
        !notification.is_read
    ).length

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Notification center
          </p>

          <h1>Your Notifications</h1>

          <p>
            Review medicine-order and delivery
            updates from MediCare and GHTK.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() =>
              loadNotifications({
                requestedPage: 1,
                manual: true,
              })
            }
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className={
                styles.markAllButton
              }
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={17} />
              Mark all read
            </button>
          )}
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={
              filter === 'all'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() =>
              setFilter('all')
            }
          >
            All
          </button>

          <button
            type="button"
            className={
              filter === 'unread'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() =>
              setFilter('unread')
            }
          >
            Unread
          </button>
        </div>

        <span>
          {totalCount} notification
          {totalCount === 1 ? '' : 's'}
        </span>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {loading ? (
        <section className={styles.stateCard}>
          <LoaderCircle
            size={30}
            className={styles.spinner}
          />

          <h2>Loading notifications...</h2>
        </section>
      ) : notifications.length === 0 ? (
        <section className={styles.stateCard}>
          <Bell size={42} />

          <h2>No notifications found</h2>

          <p>
            New medicine-order and delivery
            updates will appear here.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.list}>
            {notifications.map(
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
                    handleOpen(notification)
                  }
                >
                  <div
                    className={
                      styles.iconBox
                    }
                  >
                    <Bell size={21} />
                  </div>

                  <div
                    className={
                      styles.content
                    }
                  >
                    <div
                      className={
                        styles.itemHeader
                      }
                    >
                      <h2>
                        {notification.title}
                      </h2>

                      {!notification.is_read && (
                        <span
                          className={
                            styles.unreadBadge
                          }
                        >
                          New
                        </span>
                      )}
                    </div>

                    <p>
                      {notification.message}
                    </p>

                    <span
                      className={
                        styles.timestamp
                      }
                    >
                      {formatDateTime(
                        notification.created_at
                      )}
                    </span>
                  </div>

                  <ChevronRight
                    size={20}
                    className={
                      styles.chevron
                    }
                  />
                </button>
              )
            )}
          </section>

          {hasNextPage && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={() =>
                loadNotifications({
                  requestedPage: page + 1,
                  append: true,
                })
              }
              disabled={loadingMore}
            >
              {loadingMore
                ? 'Loading...'
                : 'Load more notifications'}
            </button>
          )}
        </>
      )}
    </main>
  )
}