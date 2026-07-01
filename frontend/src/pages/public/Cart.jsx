import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import styles from './Cart.module.css'

export default function Cart() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    totalQuantity,
    totalPrice,
  } = useCart()

  if (cartItems.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyCart}>
          <h1>Your cart is empty</h1>
          <p>Browse the medicine catalog and add items to your cart.</p>
          <Link to="/medicine" className={styles.primaryBtn}>
            Browse medicines
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <p className={styles.eyebrow}>Medicine order</p>
        <h1 className={styles.title}>Your cart</h1>
        <p className={styles.subtitle}>
          Review your selected medicines before checkout.
        </p>
      </section>

      <section className={styles.layout}>
        <div className={styles.cartList}>
          {cartItems.map(item => (
            <div key={item.medicine_id} className={styles.cartItem}>
              <div className={styles.itemImage}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.medicine_name}
                    className={styles.cartImage}
                  />
                ) : (
                  <span>💊</span>
                )}
              </div>

              <div className={styles.itemInfo}>
                <p className={styles.itemCategory}>
                  {item.category_name || 'Uncategorized'}
                </p>

                <h2 className={styles.itemName}>
                  {item.medicine_name}
                </h2>

                <p className={styles.itemPrice}>
                  {Number(item.medicine_price).toLocaleString('vi-VN')} ₫
                </p>
              </div>

              <div className={styles.quantityBox}>
                <button onClick={() => decreaseQuantity(item.medicine_id)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => increaseQuantity(item.medicine_id)}>
                  +
                </button>
              </div>

              <p className={styles.itemTotal}>
                {Number(item.medicine_price * item.quantity).toLocaleString('vi-VN')} ₫
              </p>

              <button
                onClick={() => removeFromCart(item.medicine_id)}
                className={styles.removeBtn}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <aside className={styles.summary}>
          <h2>Order summary</h2>

          <div className={styles.summaryRow}>
            <span>Total items</span>
            <strong>{totalQuantity}</strong>
          </div>

          <div className={styles.summaryRow}>
            <span>Total price</span>
            <strong>{Number(totalPrice).toLocaleString('vi-VN')} ₫</strong>
          </div>

          <button className={styles.checkoutBtn}>
            Proceed to checkout
          </button>

          <button onClick={clearCart} className={styles.clearBtn}>
            Clear cart
          </button>
        </aside>
      </section>
    </main>
  )
}