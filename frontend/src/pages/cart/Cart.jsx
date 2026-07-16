import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import styles from './Cart.module.css'

export default function Cart() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()

  const paymentStatus = searchParams.get('payment')
  const orderId = searchParams.get('order_id')

  const {
    cartItems,
    loadingCart,
    cartError,
    totalAmount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart()

  const paymentMessage = (
    <>
      {paymentStatus === 'success' && (
        <div className={styles.successBox}>
          Payment successful. Your order has been confirmed.

          {orderId && (
            <div>
              <Link to={`/orders/${orderId}`}>
                View order detail
              </Link>
            </div>
          )}
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className={styles.errorBox}>
          Payment failed. Please try again.
        </div>
      )}
    </>
  )

  function handleGoToCheckout() {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    navigate('/checkout')
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
        {paymentMessage}

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
      {paymentMessage}

      <div className={styles.header}>
        <div>
          <Link to="/medicine" className={styles.backLink}>
            <ArrowLeft size={17} />
            Continue shopping
          </Link>

          <h1>Your Cart</h1>
          <p>Review your medicines before checkout.</p>
        </div>

        <button
          type="button"
          className={styles.clearBtn}
          onClick={clearCart}
        >
          Clear cart
        </button>
      </div>

      {cartError && (
        <div className={styles.errorBox}>
          {cartError}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.items}>
          {cartItems.map(item => {
            const itemId = item.cart_item_id || item.medicine_id || item.medicine
            const medicineId = item.medicine || item.medicine_id
            const price = Number(item.medicine_price || item.unit_price || 0)
            const subtotal = price * item.quantity

            return (
              <article className={styles.itemCard} key={itemId}>
                <img
                  src={item.medicine_image || '/placeholder-medicine.png'}
                  alt={item.medicine_name}
                  className={styles.itemImage}
                />

                <div className={styles.itemInfo}>
                  <h3>{item.medicine_name}</h3>
                  <p>{price.toLocaleString()} VND</p>
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
                      updateQuantity(
                        item.cart_item_id || medicineId,
                        Number(e.target.value)
                      )
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
            <strong>{Number(totalAmount).toLocaleString()} VND</strong>
          </div>

          <div className={styles.checkoutForm}>
            <button
              type="button"
              className={styles.checkoutBtn}
              onClick={handleGoToCheckout}
            >
              Checkout
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}