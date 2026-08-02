import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import {
  Box,
  CalendarDays,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'

import {
  getNurseMedicineOrders,
} from '../../services/orderService'

import styles from './NurseMedicineOrders.module.css'

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All active orders',
  },
  {
    value: 'confirmed',
    label: 'Payment confirmed',
  },
  {
    value: 'preparing',
    label: 'Preparing',
  },
  {
    value: 'ready_for_pickup',
    label: 'Ready for pickup',
  },
]

const STATUS_LABELS = {
  confirmed: 'Payment confirmed',
  preparing: 'Preparing package',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Picked up by GHTK',
  delivering: 'Delivering',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  returning: 'Returning',
  returned: 'Returned',
  pending: 'Pending payment',
  cancelled: 'Cancelled',
}

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatDateTime(value) {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function shortOrderId(value) {
  if (!value) {
    return 'N/A'
  }

  return String(value)
    .replaceAll('-', '')
    .slice(0, 8)
    .toUpperCase()
}

function formatStatus(value) {
  return (
    STATUS_LABELS[value] ||
    String(value || 'Unknown')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, character =>
        character.toUpperCase()
      )
  )
}

export default function NurseMedicineOrders() {
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState('all')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] = useState('')

  const loadOrders = useCallback(
    async ({
      initial = false,
      manual = false,
    } = {}) => {
      try {
        if (initial) {
          setLoading(true)
        }

        if (manual) {
          setRefreshing(true)
        }

        setError('')

        const data =
          await getNurseMedicineOrders()

        setOrders(normalizeResponse(data))
      } catch (err) {
        console.error(
          'Could not load medicine orders:',
          err
        )

        setError(
          err.response?.data?.detail ||
          'Could not load medicine delivery orders.'
        )
      } finally {
        if (initial) {
          setLoading(false)
        }

        if (manual) {
          setRefreshing(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    loadOrders({
      initial: true,
    })
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()

    return orders.filter(order => {
      const matchesStatus =
        statusFilter === 'all' ||
        order.status === statusFilter

      if (!matchesStatus) {
        return false
      }

      if (!keyword) {
        return true
      }

      const searchableValues = [
        order.medicine_order_id,
        shortOrderId(order.medicine_order_id),
        order.patient_name,
        order.delivery_recipient_name,
        order.delivery_phone,
        order.delivery_address,
        order.ghtk_order_id,
      ]

      return searchableValues.some(value =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    })
  }, [
    orders,
    search,
    statusFilter,
  ])

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        counts.all += 1

        if (
          Object.prototype.hasOwnProperty.call(
            counts,
            order.status
          )
        ) {
          counts[order.status] += 1
        }

        return counts
      },
      {
        all: 0,
        confirmed: 0,
        preparing: 0,
        ready_for_pickup: 0,
      }
    )
  }, [orders])

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Nurse delivery management
          </p>

          <h1>Medicine Delivery Orders</h1>

          <p>
            Prepare paid medicine orders and submit
            completed packages to GHTK.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() =>
              loadOrders({
                manual: true,
              })
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? styles.spinner
                  : undefined
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <Link
            to="/nurse/dashboard"
            className={styles.dashboardButton}
          >
            Dashboard
          </Link>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <section className={styles.summaryGrid}>
        <button
          type="button"
          className={`${styles.summaryCard} ${
            statusFilter === 'all'
              ? styles.summaryCardActive
              : ''
          }`}
          onClick={() =>
            setStatusFilter('all')
          }
        >
          <Box size={23} />

          <span>All orders</span>

          <strong>
            {statusCounts.all}
          </strong>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${
            statusFilter === 'confirmed'
              ? styles.summaryCardActive
              : ''
          }`}
          onClick={() =>
            setStatusFilter('confirmed')
          }
        >
          <PackageCheck size={23} />

          <span>Awaiting preparation</span>

          <strong>
            {statusCounts.confirmed}
          </strong>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${
            statusFilter === 'preparing'
              ? styles.summaryCardActive
              : ''
          }`}
          onClick={() =>
            setStatusFilter('preparing')
          }
        >
          <Box size={23} />

          <span>Being prepared</span>

          <strong>
            {statusCounts.preparing}
          </strong>
        </button>

        <button
          type="button"
          className={`${styles.summaryCard} ${
            statusFilter ===
            'ready_for_pickup'
              ? styles.summaryCardActive
              : ''
          }`}
          onClick={() =>
            setStatusFilter(
              'ready_for_pickup'
            )
          }
        >
          <Truck size={23} />

          <span>Ready for GHTK</span>

          <strong>
            {statusCounts.ready_for_pickup}
          </strong>
        </button>
      </section>

      <section className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} />

          <input
            type="search"
            placeholder="Search order, patient, phone, address, or tracking ID..."
            value={search}
            onChange={event =>
              setSearch(event.target.value)
            }
          />
        </div>

        <label className={styles.selectLabel}>
          Status

          <select
            value={statusFilter}
            onChange={event =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            {STATUS_OPTIONS.map(option => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <section className={styles.stateCard}>
          <div className={styles.loadingIcon}>
            <RefreshCw
              size={28}
              className={styles.spinner}
            />
          </div>

          <h2>Loading medicine orders...</h2>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className={styles.stateCard}>
          <Box size={38} />

          <h2>No medicine orders found</h2>

          <p>
            No order currently matches the selected
            search and status filters.
          </p>
        </section>
      ) : (
        <section className={styles.grid}>
          {filteredOrders.map(order => (
            <article
              key={order.medicine_order_id}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.orderCode}>
                    Order #
                    {shortOrderId(
                      order.medicine_order_id
                    )}
                  </p>

                  <h2>
                    {order.patient_name ||
                      order.delivery_recipient_name}
                  </h2>
                </div>

                <span
                  className={`${styles.statusBadge} ${
                    styles[
                      `status_${order.status}`
                    ] || ''
                  }`}
                >
                  {formatStatus(order.status)}
                </span>
              </div>

              <div className={styles.metaList}>
                <span>
                  <CalendarDays size={16} />

                  {formatDateTime(
                    order.created_at
                  )}
                </span>

                <span>
                  <Phone size={16} />

                  {order.delivery_phone ||
                    'No phone'}
                </span>

                <span>
                  <MapPin size={16} />

                  {order.delivery_address ||
                    'No delivery address'}
                </span>
              </div>

              <div className={styles.orderSummary}>
                <div>
                  <span>Items</span>

                  <strong>
                    {order.item_count || 0}
                  </strong>
                </div>

                <div>
                  <span>Shipping</span>

                  <strong>
                    {formatMoney(
                      order.final_shipping_fee
                    )}{' '}
                    VND
                  </strong>
                </div>

                <div>
                  <span>Total paid</span>

                  <strong>
                    {formatMoney(
                      order.total_amount
                    )}{' '}
                    VND
                  </strong>
                </div>
              </div>

              {order.ghtk_order_id && (
                <div className={styles.trackingBox}>
                  <Truck size={17} />

                  <div>
                    <span>GHTK tracking</span>

                    <strong>
                      {order.ghtk_order_id}
                    </strong>
                  </div>
                </div>
              )}

              <Link
                to={`/nurse/medicine-orders/${order.medicine_order_id}`}
                className={styles.actionButton}
              >
                View and process order
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}