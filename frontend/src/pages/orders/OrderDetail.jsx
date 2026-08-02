import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useParams,
} from 'react-router-dom'

import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react'

import {
  cancelOrder,
  getOrderDetail,
} from '../../services/orderService'

import styles from './OrderDetail.module.css'

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

const TIMELINE_STEPS = [
  {
    status: 'confirmed',
    label: 'Payment confirmed',
    timestamp: 'confirmed_at',
  },
  {
    status: 'preparing',
    label: 'Pharmacy preparation',
    timestamp: 'preparing_at',
  },
  {
    status: 'ready_for_pickup',
    label: 'Ready for GHTK pickup',
    timestamp: 'ready_at',
  },
  {
    status: 'dispatched',
    label: 'Picked up by GHTK',
    timestamp: 'pickup_at',
  },
  {
    status: 'delivering',
    label: 'Out for delivery',
    timestamp: 'delivering_at',
  },
  {
    status: 'delivered',
    label: 'Delivered successfully',
    timestamp: 'delivered_at',
  },
]

const STATUS_POSITION = {
  pending: -1,
  confirmed: 0,
  preparing: 1,
  ready_for_pickup: 2,
  dispatched: 3,
  delivering: 4,
  delivered: 5,
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatDateTime(value) {
  if (!value) {
    return 'Not recorded'
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

function getImageUrl(value) {
  if (!value) {
    return ''
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value
  }

  const backendUrl =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000'

  return `${backendUrl}${value}`
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const location = useLocation()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)

  const [cancelling, setCancelling] =
    useState(false)

  const [
    cancellationVisible,
    setCancellationVisible,
  ] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const paymentSucceeded =
    new URLSearchParams(location.search).get(
      'payment'
    ) === 'success'

  const loadOrder = useCallback(
    async ({
      initial = false,
      manual = false,
      showError = true,
    } = {}) => {
      try {
        if (initial) {
          setLoading(true)
        }

        if (manual) {
          setRefreshing(true)
        }

        if (showError) {
          setError('')
        }

        const data = await getOrderDetail(orderId)

        setOrder(data)

        return data
      } catch (err) {
        console.error(
          'Could not load order detail:',
          err
        )

        if (showError) {
          setError(
            err.response?.data?.detail ||
            'Could not load order details.'
          )
        }

        return null
      } finally {
        if (initial) {
          setLoading(false)
        }

        if (manual) {
          setRefreshing(false)
        }
      }
    },
    [orderId]
  )

  useEffect(() => {
    loadOrder({
      initial: true,
    })
  }, [loadOrder])

  useEffect(() => {
    if (paymentSucceeded) {
      setSuccess(
        'Payment completed successfully. Your order is now being processed.'
      )
    }
  }, [paymentSucceeded])

  async function handleCancelOrder() {
    try {
      setCancelling(true)
      setError('')
      setSuccess('')

      await cancelOrder(orderId)

      const updatedOrder = await loadOrder({
        showError: false,
      })

      if (updatedOrder) {
        setOrder(updatedOrder)
      }

      setCancellationVisible(false)

      setSuccess(
        'Your medicine order has been cancelled.'
      )
    } catch (err) {
      console.error(
        'Could not cancel order:',
        err
      )

      setError(
        err.response?.data?.detail ||
        err.response?.data?.status?.[0] ||
        'Could not cancel this order.'
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <LoaderCircle
            size={32}
            className={styles.spinner}
          />

          <h1>Loading order...</h1>
        </section>
      </main>
    )
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <Package size={42} />

          <h1>Order not found</h1>

          <p>
            {error ||
              'This medicine order could not be found.'}
          </p>

          <Link
            to="/patient/medicine-orders"
            className={styles.primaryLink}
          >
            Back to medicine orders
          </Link>
        </section>
      </main>
    )
  }

  const canCancel = [
    'pending',
    'confirmed',
  ].includes(order.status)

  const shipmentCreated =
    Boolean(order.ghtk_order_id)

  const currentTimelinePosition =
    STATUS_POSITION[order.status] ?? -1

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <Link
            to="/patient/medicine-orders"
            className={styles.backLink}
          >
            <ArrowLeft size={18} />
            Back to medicine orders
          </Link>

          <p className={styles.eyebrow}>
            Order #
            {shortOrderId(
              order.medicine_order_id
            )}
          </p>

          <h1>Medicine Order Detail</h1>

          <p>
            View your purchase, pharmacy preparation,
            shipping information, and delivery progress.
          </p>
        </div>

        <div className={styles.headerStatus}>
          <span
            className={`${styles.statusBadge} ${
              styles[
                `status_${order.status}`
              ] || ''
            }`}
          >
            {formatStatus(order.status)}
          </span>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() =>
              loadOrder({
                manual: true,
              })
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
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
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successBox}>
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <h2>Recipient Information</h2>

            <div className={styles.infoGrid}>
              <div>
                <span>
                  <UserRound size={15} />
                  Patient
                </span>

                <strong>
                  {order.patient_name}
                </strong>
              </div>

              <div>
                <span>
                  <Phone size={15} />
                  Patient phone
                </span>

                <strong>
                  {order.patient_phone_1 ||
                    'Not provided'}
                </strong>
              </div>

              <div>
                <span>
                  <UserRound size={15} />
                  Recipient
                </span>

                <strong>
                  {order.delivery_recipient_name ||
                    order.patient_name}
                </strong>
              </div>

              <div>
                <span>
                  <Phone size={15} />
                  Delivery phone
                </span>

                <strong>
                  {order.delivery_phone ||
                    'Not provided'}
                </strong>
              </div>
            </div>

            <h2>Delivery Address</h2>

            <div className={styles.addressBox}>
              <MapPin size={21} />

              <div>
                <strong>
                  {order.delivery_address ||
                    'Address unavailable'}
                </strong>

                <p>
                  {[
                    order.delivery_street_address,
                    order.delivery_ward_name,
                    order.delivery_province_name,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>

                {order.delivery_notes && (
                  <p>
                    <strong>Delivery notes:</strong>{' '}
                    {order.delivery_notes}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Purchased Medicines</h2>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {order.items?.length > 0 ? (
                    order.items.map(item => (
                      <tr
                        key={
                          item.medicine_order_item_id
                        }
                      >
                        <td>
                          <div
                            className={
                              styles.medicineCell
                            }
                          >
                            {item.medicine_image ? (
                              <img
                                src={getImageUrl(
                                  item.medicine_image
                                )}
                                alt={
                                  item.medicine_name
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles.imagePlaceholder
                                }
                              >
                                <ShoppingBag
                                  size={20}
                                />
                              </div>
                            )}

                            <strong>
                              {item.medicine_name}
                            </strong>
                          </div>
                        </td>

                        <td>{item.quantity}</td>

                        <td>
                          {formatMoney(
                            item.unit_price
                          )}{' '}
                          VND
                        </td>

                        <td>
                          {formatMoney(
                            item.sub_total
                          )}{' '}
                          VND
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        No medicine items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Delivery Timeline</h2>

            <div className={styles.timeline}>
              {TIMELINE_STEPS.map(
                (step, index) => {
                  const completed =
                    Boolean(
                      order[step.timestamp]
                    ) ||
                    currentTimelinePosition >=
                      index

                  const current =
                    order.status === step.status

                  return (
                    <div
                      key={step.status}
                      className={`${styles.timelineItem} ${
                        completed
                          ? styles.timelineCompleted
                          : ''
                      } ${
                        current
                          ? styles.timelineCurrent
                          : ''
                      }`}
                    >
                      <div
                        className={
                          styles.timelineMarker
                        }
                      >
                        {completed ? (
                          <CheckCircle2
                            size={18}
                          />
                        ) : (
                          <Clock3 size={18} />
                        )}
                      </div>

                      <div>
                        <strong>
                          {step.label}
                        </strong>

                        <span>
                          {formatDateTime(
                            order[
                              step.timestamp
                            ]
                          )}
                        </span>
                      </div>
                    </div>
                  )
                }
              )}

              {order.status ===
                'delivery_failed' && (
                <div
                  className={`${styles.timelineItem} ${styles.timelineFailed}`}
                >
                  <div
                    className={
                      styles.timelineMarker
                    }
                  >
                    <XCircle size={18} />
                  </div>

                  <div>
                    <strong>
                      Delivery failed
                    </strong>

                    <span>
                      {formatDateTime(
                        order.failed_at
                      )}
                    </span>
                  </div>
                </div>
              )}

              {order.status === 'returning' && (
                <div
                  className={`${styles.timelineItem} ${styles.timelineFailed}`}
                >
                  <div
                    className={
                      styles.timelineMarker
                    }
                  >
                    <Truck size={18} />
                  </div>

                  <div>
                    <strong>
                      Returning to pharmacy
                    </strong>

                    <span>
                      {formatDateTime(
                        order.returning_at
                      )}
                    </span>
                  </div>
                </div>
              )}

              {order.status === 'returned' && (
                <div
                  className={`${styles.timelineItem} ${styles.timelineFailed}`}
                >
                  <div
                    className={
                      styles.timelineMarker
                    }
                  >
                    <Box size={18} />
                  </div>

                  <div>
                    <strong>
                      Returned to pharmacy
                    </strong>

                    <span>
                      {formatDateTime(
                        order.returned_at
                      )}
                    </span>
                  </div>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div
                  className={`${styles.timelineItem} ${styles.timelineFailed}`}
                >
                  <div
                    className={
                      styles.timelineMarker
                    }
                  >
                    <XCircle size={18} />
                  </div>

                  <div>
                    <strong>
                      Order cancelled
                    </strong>

                    <span>
                      {formatDateTime(
                        order.cancelled_at
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2>Payment Summary</h2>

            <div className={styles.summaryList}>
              <div>
                <span>Medicine subtotal</span>

                <strong>
                  {formatMoney(
                    order.medicine_subtotal
                  )}{' '}
                  VND
                </strong>
              </div>

              <div>
                <span>Shipping fee</span>

                <strong>
                  {formatMoney(
                    order.shipping_fee
                  )}{' '}
                  VND
                </strong>
              </div>

              <div>
                <span>Shipping discount</span>

                <strong>
                  -{' '}
                  {formatMoney(
                    order.shipping_discount
                  )}{' '}
                  VND
                </strong>
              </div>

              <div>
                <span>Final shipping fee</span>

                <strong>
                  {formatMoney(
                    order.final_shipping_fee
                  )}{' '}
                  VND
                </strong>
              </div>

              <div>
                <span>Total amount</span>

                <strong>
                  {formatMoney(
                    order.total_amount
                  )}{' '}
                  VND
                </strong>
              </div>
            </div>

            {order.status === 'pending' && (
              <Link
                to={`/checkout/payment/${order.medicine_order_id}`}
                className={styles.paymentButton}
              >
                Complete payment
              </Link>
            )}
          </section>

          <section className={styles.card}>
            <h2>Package Information</h2>

            <div className={styles.packageInfo}>
              <div>
                <span>Package weight</span>

                <strong>
                  {order.package_weight_grams ||
                    0}{' '}
                  grams
                </strong>
              </div>

              <div>
                <span>Order created</span>

                <strong>
                  {formatDateTime(
                    order.created_at
                  )}
                </strong>
              </div>

              <div>
                <span>Last updated</span>

                <strong>
                  {formatDateTime(
                    order.updated_at
                  )}
                </strong>
              </div>
            </div>
          </section>

          {shipmentCreated && (
            <section className={styles.card}>
              <h2>GHTK Tracking</h2>

              <div className={styles.trackingPanel}>
                <Truck size={25} />

                <div>
                  <span>Tracking code</span>

                  <strong>
                    {order.ghtk_order_id}
                  </strong>
                </div>
              </div>

              <div className={styles.packageInfo}>
                <div>
                  <span>Delivery status</span>

                  <strong>
                    {order.ghtk_status_text ||
                      order.ghtk_status ||
                      'Waiting for update'}
                  </strong>
                </div>

                <div>
                  <span>Last synchronized</span>

                  <strong>
                    {formatDateTime(
                      order.ghtk_last_synced_at
                    )}
                  </strong>
                </div>
              </div>

              {order.ghtk_tracking_url && (
                <a
                  href={order.ghtk_tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.trackingLink}
                >
                  Open GHTK tracking
                  <ExternalLink size={16} />
                </a>
              )}
            </section>
          )}

          {canCancel && (
            <section className={styles.card}>
              <h2>Order Cancellation</h2>

              {!cancellationVisible ? (
                <div className={styles.cancelSummary}>
                  <p>
                    You may cancel this order before
                    pharmacy preparation begins.
                  </p>

                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() =>
                      setCancellationVisible(true)
                    }
                  >
                    Cancel order
                  </button>
                </div>
              ) : (
                <div
                  className={
                    styles.confirmationPanel
                  }
                >
                  <XCircle size={28} />

                  <strong>
                    Cancel this medicine order?
                  </strong>

                  <p>
                    This action cannot be undone.
                  </p>

                  <div
                    className={
                      styles.confirmationActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.keepButton
                      }
                      onClick={() =>
                        setCancellationVisible(
                          false
                        )
                      }
                      disabled={cancelling}
                    >
                      Keep order
                    </button>

                    <button
                      type="button"
                      className={
                        styles.confirmCancelButton
                      }
                      onClick={
                        handleCancelOrder
                      }
                      disabled={cancelling}
                    >
                      {cancelling
                        ? 'Cancelling...'
                        : 'Confirm cancellation'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </aside>
      </section>
    </main>
  )
}