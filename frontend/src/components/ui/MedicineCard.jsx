import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import styles from './MedicineCard.module.css'

export default function MedicineCard({ medicine }) {
  const { addToCart } = useCart()

  const isOutOfStock = medicine.medicine_stock <= 0

  return (
    <article className={styles.card}>
      <Link to={`/medicine/${medicine.medicine_id}`} className={styles.imageWrap}>
        {medicine.medicine_image ? (
          <img
            src={medicine.medicine_image}
            alt={medicine.medicine_name}
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>No image</div>
        )}
      </Link>

      <div className={styles.content}>
        <h3 className={styles.name}>{medicine.medicine_name}</h3>

        <p className={styles.price}>
          {Number(medicine.medicine_price).toLocaleString()} VND
        </p>

        <p className={isOutOfStock ? styles.outOfStock : styles.stock}>
          {isOutOfStock ? 'Out of stock' : `Stock: ${medicine.medicine_stock}`}
        </p>

        <div className={styles.actions}>
          <Link to={`/medicine/${medicine.medicine_id}`} className={styles.detailBtn}>
            View detail
          </Link>

          <button
            type="button"
            className={styles.cartBtn}
            onClick={() => addToCart(medicine, 1)}
            disabled={isOutOfStock}
          >
            <ShoppingCart size={17} />
            Add
          </button>
        </div>
      </div>
    </article>
  )
}