import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { createMedicineOrder } from '../../services/orderService'
import styles from './Cart.module.css'

export default function Cart() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const {
    cartItems,
    loadingCart,
    cartError,
    totalAmount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart()

  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  async function handleCheckout(e) {
    e.preventDefault()
    setCheckoutError('')

    if (!isAuthenticated) {
      setCheckoutError('Please login before checkout.')
      navigate('/login')
      return
    }

    if (cartItems.length === 0) {
      setCheckoutError('Your cart is empty.')
      return
    }

    if (!deliveryAddress.trim()) {
      setCheckoutError('Delivery address is required.')
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
      setCheckoutLoading(true)

      const order = await createMedicineOrder(orderData)

      await clearCart()

      navigate(`/orders/${order.medicine_order_id}`, { replace: true })
    } catch (err) {
      const data = err.response?.data

      if (data?.detail) {
        setCheckoutError(data.detail)
      } else if (data?.items) {
        setCheckoutError(
          Array.isArray(data.items) ? data.items.join(' ') : data.items
        )
      } else {
        setCheckoutError('Could not create order. Please try again.')
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loadingCart) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Loading cart...</h1>
        </div>
      </main>
    )
  }

  if (cartItems.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <ShoppingBag size={56} />
          <h1>Your cart is empty</h1>
          <p>Add medicines to your cart before checkout.</p>
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
        <div>
          <Link to="/medicine" className={styles.backLink}>
            <ArrowLeft size={17} />
            Continue shopping
          </Link>

          <h1>Your Cart</h1>
          <p>Review your medicines before checkout.</p>
        </div>

        <button type="button" className={styles.clearBtn} onClick={clearCart}>
          Clear cart
        </button>
      </div>

      {(cartError || checkoutError) && (
        <div className={styles.errorBox}>
          {cartError || checkoutError}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.items}>
          {cartItems.map(item => {
            const itemId = item.cart_item_id || item.medicine_id || item.medicine
            const medicineId = item.medicine || item.medicine_id
            const subtotal = Number(item.medicine_price) * item.quantity

            return (
              <article className={styles.itemCard} key={itemId}>
                <img
                  src={item.medicine_image || '/placeholder-medicine.png'}
                  alt={item.medicine_name}
                  className={styles.itemImage}
                />

                <div className={styles.itemInfo}>
                  <h3>{item.medicine_name}</h3>
                  <p>{Number(item.medicine_price).toLocaleString()} VND</p>
                  <span>Stock: {item.medicine_stock}</span>
                </div>

                <div className={styles.quantityBox}>
                  <label>Qty</label>
                  <input
                    type="number"
                    min="1"
                    max={item.medicine_stock}
                    value={item.quantity}
                    onChange={e =>
                      updateQuantity(item.cart_item_id || medicineId, e.target.value)
                    }
                  />
                </div>

                <div className={styles.subtotal}>
                  <span>Subtotal</span>
                  <strong>{subtotal.toLocaleString()} VND</strong>
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeFromCart(item.cart_item_id || medicineId)}
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </article>
            )
          })}
        </section>

        <aside className={styles.summary}>
          <h2>Order Summary</h2>

          <div className={styles.summaryRow}>
            <span>Items</span>
            <strong>{cartItems.length}</strong>
          </div>

          <div className={styles.summaryRow}>
            <span>Total</span>
            <strong>{totalAmount.toLocaleString()} VND</strong>
          </div>

          <form onSubmit={handleCheckout} className={styles.checkoutForm}>
            <label htmlFor="deliveryAddress">Delivery address</label>
            <textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Enter your delivery address in Vietnam"
              rows={4}
              required
            />

            <button
              type="submit"
              className={styles.checkoutBtn}
              disabled={checkoutLoading}
            >
              <CreditCard size={18} />
              {checkoutLoading ? 'Creating order...' : 'Checkout'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}