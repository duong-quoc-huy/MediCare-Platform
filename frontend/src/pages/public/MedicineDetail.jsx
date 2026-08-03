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
  Send,
  Trash2,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { getMedicineById } from '../../api/medicineApi'
import {
  createMedicineReview,
  deleteMedicineReview,
  getMedicineReviews,
} from '../../services/reviewService'
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

function formatDate(dateString) {
  if (!dateString) return ''

  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StarRatingInput({ value, onChange }) {
  return (
    <div className={styles.starInput}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={star <= value ? styles.activeStar : ''}
        >
          <Star size={24} fill="currentColor" />
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ rating }) {
  const roundedRating = Math.round(Number(rating || 0))

  return (
    <div className={styles.starDisplay}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={16}
          fill={star <= roundedRating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  )
}

export default function MedicineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { addToCart } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [medicine, setMedicine] = useState(null)
  const [reviews, setReviews] = useState([])
  const [activeTab, setActiveTab] = useState('description')

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadMedicineDetail() {
    const data = await getMedicineById(id)
    setMedicine(data)
  }

  async function loadReviews() {
    const data = await getMedicineReviews(id)
    const list = Array.isArray(data) ? data : data.results || []
    setReviews(list)
  }

  useEffect(() => {
    async function fetchPageData() {
      try {
        setLoading(true)
        setError('')

        await Promise.all([
          loadMedicineDetail(),
          loadReviews(),
        ])
      } catch (err) {
        console.error(err)
        setError('Medicine not found or server error.')
      } finally {
        setLoading(false)
      }
    }

    fetchPageData()
  }, [id])

  const stockStatus = useMemo(() => {
    return getStockStatus(Number(medicine?.medicine_stock || 0))
  }, [medicine])

  const userReview = useMemo(() => {
    if (!user?.user_id) return null

    return reviews.find(review => review.user === user.user_id)
  }, [reviews, user])

  const averageRating = Number(medicine?.average_rating || 0)
  const reviewCount = Number(medicine?.review_count || reviews.length || 0)

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
    const success = await addToCart(medicine, quantity)

    if (success) {
      navigate('/cart')
    }
  }

  async function handleBuyNow() {
    const success = await addToCart(medicine, quantity)

    if (success) {
      navigate('/checkout')
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setReviewError('')
    setReviewSuccess('')

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please choose a rating between 1 and 5 stars.')
      return
    }

    try {
      setReviewLoading(true)

      await createMedicineReview(id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      })

      setReviewComment('')
      setReviewRating(5)
      setReviewSuccess('Thank you. Your review has been posted.')

      await Promise.all([
        loadReviews(),
        loadMedicineDetail(),
      ])
    } catch (err) {
      setReviewError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Could not submit your review.'
      )
    } finally {
      setReviewLoading(false)
    }
  }

  async function handleDeleteReview(reviewId) {
    const confirmDelete = window.confirm('Delete your review?')

    if (!confirmDelete) return

    try {
      setReviewError('')
      setReviewSuccess('')

      await deleteMedicineReview(reviewId)

      setReviewSuccess('Your review has been deleted.')

      await Promise.all([
        loadReviews(),
        loadMedicineDetail(),
      ])
    } catch (err) {
      setReviewError(
        err.response?.data?.detail ||
          'Could not delete your review.'
      )
    }
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
              {averageRating > 0 ? averageRating.toFixed(1) : 'No rating'}
            </span>
            <small>
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </small>
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
              <div className={styles.reviewHeader}>
                <div>
                  <h2>Customer Reviews</h2>
                  <p>
                    Share your experience with product condition, delivery, or packaging.
                  </p>
                </div>

                <div className={styles.reviewScoreCard}>
                  <Star size={24} fill="currentColor" />
                  <strong>
                    {averageRating > 0 ? `${averageRating.toFixed(1)} / 5` : 'No rating'}
                  </strong>
                  <span>
                    Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>

              {reviewError && (
                <div className={styles.reviewError}>
                  {reviewError}
                </div>
              )}

              {reviewSuccess && (
                <div className={styles.reviewSuccess}>
                  {reviewSuccess}
                </div>
              )}

              {!isAuthenticated && (
                <div className={styles.loginReviewBox}>
                  <p>Please login to write a review.</p>
                  <Link to="/login">Login</Link>
                </div>
              )}

              {isAuthenticated && userReview && (
                <div className={styles.ownReviewBox}>
                  <strong>You already reviewed this medicine.</strong>
                  <p>You can delete your review and submit a new one if needed.</p>
                </div>
              )}

              {isAuthenticated && !userReview && (
                <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
                  <label>Your rating</label>
                  <StarRatingInput
                    value={reviewRating}
                    onChange={setReviewRating}
                  />

                  <label>Your comment</label>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Example: Product arrived in good condition."
                    rows="4"
                  />

                  <button type="submit" disabled={reviewLoading}>
                    <Send size={17} />
                    {reviewLoading ? 'Submitting...' : 'Submit review'}
                  </button>
                </form>
              )}

              <div className={styles.reviewList}>
                {reviews.length === 0 ? (
                  <div className={styles.emptyReviews}>
                    No reviews yet. Be the first to review this medicine.
                  </div>
                ) : (
                  reviews.map(review => {
                    const isOwner = user?.user_id === review.user

                    return (
                      <article
                        key={review.medicine_review_id}
                        className={styles.reviewCard}
                      >
                        <div className={styles.reviewTop}>
                          <div>
                            <strong>{review.user_name || 'Anonymous user'}</strong>
                            <span>{formatDate(review.created_at)}</span>
                          </div>

                          <StarDisplay rating={review.rating} />
                        </div>

                        <p>
                          {review.comment || 'No comment provided.'}
                        </p>

                        {isOwner && (
                          <button
                            type="button"
                            className={styles.deleteReviewBtn}
                            onClick={() =>
                              handleDeleteReview(review.medicine_review_id)
                            }
                          >
                            <Trash2 size={15} />
                            Delete review
                          </button>
                        )}
                      </article>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}