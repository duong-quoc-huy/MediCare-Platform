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
  ShoppingBag,
  Truck,
} from 'lucide-react'

import {
  getOrders,
} from '../../services/orderService'

import styles from './PatientMedicineOrders.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All orders' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'confirmed', label: 'Payment confirmed' },
  { value: 'preparing', label: 'Preparing' },
  {
    value: 'ready_for_pickup',
    label: 'Ready for pickup',
  },
  { value: 'dispatched', label: 'Picked up' },
  { value: 'delivering', label: 'Delivering' },
  { value: 'delivered', label: 'Delivered' },
  {
    value: 'delivery_failed',
    label: 'Delivery failed',
  },
  { value: 'returning', label: 'Returning' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_LABELS = {
  pending: 'Pending payment',
  confirmed: 'Payment confirmed',
  preparing: 'Preparing package',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Picked up by GHTK',
  delivering: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  returning: 'Returning',
  returned: 'Returned',
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
  return String(value || '')
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

export default function PatientMedicineOrders() {
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

        const data = await getOrders()

        setOrders(normalizeResponse(data))
      } catch (err) {
        console.error(
          'Could not load patient orders:',
          err
        )

        setError(
          err.response?.data?.detail ||
          'Could not load your medicine orders.'
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

      return [
        order.medicine_order_id,
        shortOrderId(order.medicine_order_id),
        order.delivery_recipient_name,
        order.delivery_phone,
        order.delivery_address,
        order.ghtk_order_id,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    })
  }, [orders, search, statusFilter])

  const activeCount = useMemo(
    () =>
      orders.filter(order =>
        [
          'confirmed',
          'preparing',
          'ready_for_pickup',
          'dispatched',
          'delivering',
        ].includes(order.status)
      ).length,
    [orders]
  )

  const deliveredCount = useMemo(
    () =>
      orders.filter(
        order => order.status === 'delivered'
      ).length,
    [orders]
  )

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Patient medicine delivery
          </p>

          <h1>My Medicine Orders</h1>

          <p>
            Review purchases, monitor pharmacy preparation,
            and follow GHTK delivery progress.
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
            to="/medicine"
            className={styles.shopButton}
          >
            <ShoppingBag size={17} />
            Shop medicines
          </Link>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <Box size={24} />

          <div>
            <span>Total orders</span>
            <strong>{orders.length}</strong>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <Truck size={24} />

          <div>
            <span>Active deliveries</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <PackageCheck size={24} />

          <div>
            <span>Delivered orders</span>
            <strong>{deliveredCount}</strong>
          </div>
        </div>
      </section>

      <section className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} />

          <input
            type="search"
            placeholder="Search order, phone, address, or tracking code..."
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
          <RefreshCw
            size={30}
            className={styles.spinner}
          />

          <h2>Loading your orders...</h2>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className={styles.stateCard}>
          <ShoppingBag size={42} />

          <h2>No medicine orders found</h2>

          <p>
            Your medicine purchases and delivery progress
            will appear here.
          </p>

          <Link
            to="/medicine"
            className={styles.primaryLink}
          >
            Browse medicines
          </Link>
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
                    {order.delivery_recipient_name ||
                      'Medicine order'}
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

              <div className={styles.summaryList}>
                <div>
                  <span>Medicine items</span>
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
                  <span>Total</span>
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
                  <Truck size={18} />

                  <div>
                    <span>GHTK tracking</span>
                    <strong>
                      {order.ghtk_order_id}
                    </strong>
                  </div>
                </div>
              )}

              <Link
                to={`/orders/${order.medicine_order_id}`}
                className={styles.actionButton}
              >
                View order details
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}