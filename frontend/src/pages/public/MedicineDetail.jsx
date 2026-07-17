import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  AlertTriangle,
} from 'lucide-react'

import { useCart } from '../../context/CartContext'
import { getMedicineById } from '../../api/medicineApi'
import styles from './MedicineDetail.module.css'

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').trim()
}

function getStockStatus(stock) {
  if (stock <= 0) {
    return {
      label: 'Out of stock',
      className: 'outOfStock',
    }
  }

  if (stock <= 5) {
    return {
      label: 'Low stock',
      className: 'lowStock',
    }
  }

  return {
    label: 'In stock',
    className: 'inStock',
  }
}

export default function MedicineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [medicine, setMedicine] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
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

  const stockStatus = useMemo(() => {
    return getStockStatus(Number(medicine?.medicine_stock || 0))
  }, [medicine])

  function increaseQuantity() {
    setQuantity(prev => {
      const stock = Number(medicine?.medicine_stock || 0)
      return Math.min(prev + 1, stock)
    })
  }

  function decreaseQuantity() {
    setQuantity(prev => Math.max(prev - 1, 1))
  }

  function handleQuantityChange(e) {
    const value = Number(e.target.value)
    const stock = Number(medicine?.medicine_stock || 0)

    if (!value || value < 1) {
      setQuantity(1)
      return
    }

    if (value > stock) {
      setQuantity(stock)
      return
    }

    setQuantity(value)
  }

  async function handleAddToCart() {
    await addToCart(medicine, quantity)
    navigate('/cart')
  }

  async function handleBuyNow() {
    await addToCart(medicine, quantity)
    navigate('/checkout')
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <p>Loading medicine detail...</p>
        </section>
      </main>
    )
  }

  if (error || !medicine) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Medicine not found</h1>
          <p>{error}</p>
          <Link to="/medicine" className={styles.backBtn}>
            Back to catalog
          </Link>
        </section>
      </main>
    )
  }

  const isUnavailable =
    Number(medicine.medicine_stock) <= 0 || !medicine.medicine_is_active

  const descriptionText =
    stripHtml(medicine.medicine_description) || 'No description available.'

  return (
    <main className={styles.page}>
      <Link to="/medicine" className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to medicine catalog
      </Link>

      <section className={styles.heroCard}>
        <div className={styles.gallery}>
          <div className={styles.mainImageBox}>
            {medicine.image_url || medicine.medicine_image ? (
              <img
                src={medicine.image_url || medicine.medicine_image}
                alt={medicine.medicine_name}
                className={styles.mainImage}
              />
            ) : (
              <span className={styles.imageFallback}>💊</span>
            )}
          </div>

          <div className={styles.thumbnailRow}>
            <button type="button" className={styles.thumbnailBtn}>
              {medicine.image_url || medicine.medicine_image ? (
                <img
                  src={medicine.image_url || medicine.medicine_image}
                  alt={medicine.medicine_name}
                />
              ) : (
                <span>💊</span>
              )}
            </button>
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.badgeRow}>
            <span className={styles.categoryBadge}>
              {medicine.category_name || 'Uncategorized'}
            </span>

            <span className={`${styles.stockBadge} ${styles[stockStatus.className]}`}>
              {stockStatus.label}
            </span>

            {medicine.medicine_requires_prescription && (
              <span className={styles.prescriptionBadge}>
                Prescription required
              </span>
            )}
          </div>

          <h1>{medicine.medicine_name}</h1>

          {medicine.generic_name && (
            <p className={styles.genericName}>
              Generic name: <strong>{medicine.generic_name}</strong>
            </p>
          )}

          {medicine.manufacturer_name && (
            <p className={styles.manufacturer}>
              Manufacturer: <strong>{medicine.manufacturer_name}</strong>
            </p>
          )}

          <div className={styles.ratingRow}>
            <span>
              <Star size={18} fill="currentColor" />
              4.8
            </span>
            <small>23 reviews</small>
          </div>

          <div className={styles.priceBox}>
            <span>Price</span>
            <strong>
              {Number(medicine.medicine_price).toLocaleString('vi-VN')} ₫
            </strong>
          </div>

          <div className={styles.quickInfoGrid}>
            <div>
              <span>Dosage</span>
              <strong>{medicine.dosage || 'Not specified'}</strong>
            </div>

            <div>
              <span>Unit type</span>
              <strong>{medicine.unit_type || 'Not specified'}</strong>
            </div>

            <div>
              <span>Package size</span>
              <strong>{medicine.package_size || 'Not specified'}</strong>
            </div>

            <div>
              <span>Stock</span>
              <strong>{medicine.medicine_stock}</strong>
            </div>
          </div>

          {medicine.medicine_requires_prescription && (
            <div className={styles.warningBox}>
              <AlertTriangle size={20} />
              <p>
                This medicine requires a prescription. The pharmacy may verify
                your prescription before delivery.
              </p>
            </div>
          )}

          <div className={styles.purchaseBox}>
            <div className={styles.quantityBox}>
              <label>Quantity</label>

              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min="1"
                  max={medicine.medicine_stock}
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={isUnavailable}
                />

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={quantity >= medicine.medicine_stock || isUnavailable}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.addBtn}
                onClick={handleAddToCart}
                disabled={isUnavailable}
              >
                <ShoppingCart size={18} />
                Add to cart
              </button>

              <button
                type="button"
                className={styles.buyBtn}
                onClick={handleBuyNow}
                disabled={isUnavailable}
              >
                Buy now
              </button>
            </div>

            {isUnavailable && (
              <p className={styles.unavailableText}>
                This medicine is currently unavailable.
              </p>
            )}
          </div>

          <div className={styles.trustGrid}>
            <div>
              <BadgeCheck size={20} />
              <span>Genuine Product</span>
            </div>

            <div>
              <ShieldCheck size={20} />
              <span>Pharmacy Verified</span>
            </div>

            <div>
              <Truck size={20} />
              <span>Same-day Delivery</span>
            </div>

            <div>
              <CheckCircle2 size={20} />
              <span>Easy Returns</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.tabsCard}>
        <div className={styles.tabHeader}>
          <button
            type="button"
            className={activeTab === 'description' ? styles.activeTab : ''}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>

          <button
            type="button"
            className={activeTab === 'usage' ? styles.activeTab : ''}
            onClick={() => setActiveTab('usage')}
          >
            Usage & Dosage
          </button>

          <button
            type="button"
            className={activeTab === 'safety' ? styles.activeTab : ''}
            onClick={() => setActiveTab('safety')}
          >
            Side Effects
          </button>

          <button
            type="button"
            className={activeTab === 'reviews' ? styles.activeTab : ''}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
          </button>
        </div>

        <div className={styles.tabBody}>
          {activeTab === 'description' && (
            <div>
              <h2>Description</h2>
              <p>{descriptionText}</p>

              <div className={styles.detailList}>
                <div>
                  <span>Active ingredients</span>
                  <strong>{medicine.active_ingredients || 'Not specified'}</strong>
                </div>

                <div>
                  <span>Storage instructions</span>
                  <strong>{medicine.storage_instructions || 'Not specified'}</strong>
                </div>

                <div>
                  <span>Expiry date</span>
                  <strong>{medicine.expiry_date || 'Not specified'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div>
              <h2>Usage & Dosage</h2>
              <p>{medicine.usage_instructions || 'No usage instructions available.'}</p>

              <div className={styles.infoNotice}>
                <Package size={20} />
                <span>
                  Always follow your doctor, pharmacist, or medicine label
                  instructions.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div>
              <h2>Side Effects & Safety</h2>
              <p>{medicine.side_effects || 'No side effects information available.'}</p>

              {medicine.medicine_requires_prescription && (
                <div className={styles.warningBox}>
                  <AlertTriangle size={20} />
                  <p>
                    This item requires prescription verification before delivery.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2>Customer Reviews</h2>

              <div className={styles.reviewPlaceholder}>
                <div>
                  <Star size={24} fill="currentColor" />
                  <strong>4.8 / 5</strong>
                  <span>Based on 23 reviews</span>
                </div>

                <p>
                  Review system will be added later with a MedicineReview table.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}