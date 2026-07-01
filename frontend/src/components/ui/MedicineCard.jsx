import { Link } from 'react-router-dom'
import styles from './MedicineCard.module.css'

export default function MedicineCard({ medicine }) {
  const {
    medicine_id,
    medicine_name,
    category_name,
    medicine_price,
    medicine_stock,
    medicine_description,
    image_url,
  } = medicine

  return (
    <div className={styles.card}>
      <div className={styles.image}>
        {image_url ? (
          <img
            src={image_url}
            alt={medicine_name}
            className={styles.productImage}
          />
        ) : (
          <span>💊</span>
        )}
      </div>

      <div className={styles.content}>
        <p className={styles.category}>
          {category_name || 'Uncategorized'}
        </p>

        <h3 className={styles.name}>{medicine_name}</h3>

        <p className={styles.description}>
          {medicine_description || 'No description available.'}
        </p>

        <div className={styles.bottom}>
          <span className={styles.price}>
            {Number(medicine_price).toLocaleString('vi-VN')} ₫
          </span>
          <span className={styles.stock}>
            Stock: {medicine_stock}
          </span>
        </div>

        <Link to={`/medicine/${medicine_id}`} className={styles.button}>
          View details
        </Link>
      </div>
    </div>
  )
}