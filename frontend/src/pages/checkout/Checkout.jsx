import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, MapPin, ShoppingBag } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { createMedicineOrder } from '../../services/orderService'
import styles from './Checkout.module.css'

export default function Checkout() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const {
    cartItems,
    totalAmount,
    totalItems,
    clearCart,
  } = useCart()

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [phone, setPhone] = useState(user?.phone_number_1 || '')
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }

    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }

    if (!deliveryAddress.trim()) {
      setError('Delivery address is required.')
      return
    }

    const orderData = {
      delivery_address: deliveryAddress.trim(),
      items: cartItems.map(item => ({
        medicine: item.medicine || item.medicine_id,
        quantity: item.quantity,
      })),
    }

    try {
      setLoading(true)

      const order = await createMedicineOrder(orderData)

      console.log('Created order response:', order)
      console.log('Order ID:', order.medicine_order_id)

      await clearCart()

      navigate(`/checkout/payment/${order.medicine_order_id}`, {
        replace: true,
      })
    } catch (err) {
      const data = err.response?.data

      if (data?.detail) {
        setError(data.detail)
      } else if (data?.items) {
        setError(Array.isArray(data.items) ? data.items.join(' ') : data.items)
      } else if (typeof data === 'object' && data !== null) {
        const firstError = Object.values(data).flat().join(' ')
        setError(firstError || 'Could not create order.')
      } else {
        setError('Could not create order. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <h1>Please login first</h1>
          <p>You need to login before checkout.</p>
          <Link to="/login" className={styles.primaryLink}>
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  if (cartItems.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <ShoppingBag size={52} />
          <h1>Your cart is empty</h1>
          <p>Add medicines before checkout.</p>
          <Link to="/medicine" className={styles.primaryLink}>
            Continue shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link to="/cart" className={styles.backLink}>
          <ArrowLeft size={18} />
          Back to cart
        </Link>

        <h1>Checkout</h1>
        <p>Enter your delivery information before payment.</p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.sectionTitle}>
              <MapPin size={20} />
              <h2>Delivery Information</h2>
            </div>

            <div className={styles.field}>
              <label>Full name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyen Van A"
              />
            </div>

            <div className={styles.field}>
              <label>Phone number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0901234567"
              />
            </div>

            <div className={styles.field}>
              <label>Delivery address</label>
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Enter your delivery address"
                rows={4}
              />
            </div>

            <div className={styles.sectionTitle}>
              <CreditCard size={20} />
              <h2>Payment Method</h2>
            </div>

            <div className={styles.paymentOption}>
              <input type="radio" checked readOnly />
              <div>
                <strong>VNPay</strong>
                <span>Medicine delivery uses VNPay payment.</span>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Creating order...' : 'Continue to payment'}
            </button>
          </form>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Order Summary</h2>

          <div className={styles.itemsList}>
            {cartItems.map(item => {
              const itemId = item.cart_item_id || item.medicine_id || item.medicine
              const price = Number(item.medicine_price || item.unit_price || 0)
              const subtotal = price * item.quantity

              return (
                <div key={itemId} className={styles.summaryItem}>
                  {item.medicine_image && (
                    <img
                      src={item.medicine_image}
                      alt={item.medicine_name}
                    />
                  )}

                  <div>
                    <h3>{item.medicine_name}</h3>
                    <p>
                      {item.quantity} × {price.toLocaleString()} VND
                    </p>
                  </div>

                  <strong>{subtotal.toLocaleString()} VND</strong>
                </div>
              )
            })}
          </div>

          <div className={styles.summaryRow}>
            <span>Total items</span>
            <strong>{totalItems}</strong>
          </div>

          <div className={styles.summaryRow}>
            <span>Total amount</span>
            <strong>{Number(totalAmount).toLocaleString()} VND</strong>
          </div>
        </aside>
      </div>
    </main>
  )
}