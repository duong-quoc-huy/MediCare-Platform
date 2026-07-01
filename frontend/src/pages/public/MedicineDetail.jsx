import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useCart } from '../../context/CartContext'
import { getMedicineById } from '../../api/medicineApi'
import styles from './MedicineDetail.module.css'

export default function MedicineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [medicine, setMedicine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchMedicineDetail() {
      try {
        setLoading(true)
        setError('')

        const data = await getMedicineById(id)
        setMedicine(data)
      } catch (err) {
        console.error(err)
        setError('Medicine not found or server error.')
      } finally {
        setLoading(false)
      }
    }

    fetchMedicineDetail()
  }, [id])

  function handleAddToCart() {
    addToCart(medicine)
    navigate('/cart')
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.notFound}>Loading medicine detail...</p>
      </main>
    )
  }

  if (error || !medicine) {
    return (
      <main className={styles.page}>
        <section className={styles.notFound}>
          <h1>Medicine not found</h1>
          <p>{error}</p>
          <Link to="/medicine" className={styles.backBtn}>
            Back to catalog
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to="/medicine" className={styles.backLink}>
        ← Back to medicine catalog
      </Link>

      <section className={styles.detailCard}>
        <div className={styles.imageBox}>
          {medicine.image_url ? (
            <img
              src={medicine.image_url}
              alt={medicine.medicine_name}
              className={styles.detailImage}
            />
          ) : (
            <span>💊</span>
          )}
        </div>

        <div className={styles.info}>
          <p className={styles.category}>
            {medicine.category_name || 'Uncategorized'}
          </p>

          <h1 className={styles.name}>{medicine.medicine_name}</h1>

          {medicine.manufacturer_name && (
            <p className={styles.brand}>
              Manufacturer: {medicine.manufacturer_name}
            </p>
          )}

          <p className={styles.description}>
            {medicine.medicine_description || 'No description available.'}
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Price</span>
              <strong>
                {Number(medicine.medicine_price).toLocaleString('vi-VN')} ₫
              </strong>
            </div>

            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Stock</span>
              <strong>{medicine.medicine_stock}</strong>
            </div>

            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Prescription</span>
              <strong>
                {medicine.medicine_requires_prescription
                  ? 'Required'
                  : 'Not required'}
              </strong>
            </div>

            <div className={styles.metaBox}>
              <span className={styles.metaLabel}>Status</span>
              <strong>
                {medicine.medicine_is_active ? 'Available' : 'Unavailable'}
              </strong>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className={styles.cartBtn}
            disabled={!medicine.medicine_is_active}
          >
            Add to cart
          </button>
        </div>
      </section>
    </main>
  )
}