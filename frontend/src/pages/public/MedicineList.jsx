import { useEffect, useState } from 'react'
import MedicineCard from '../../components/ui/MedicineCard'
import {
  getMedicines,
  getMedicineCategories,
} from '../../api/medicineApi'
import styles from './MedicineList.module.css'

export default function MedicineList() {
  const [medicines, setMedicines] = useState([])
  const [categories, setCategories] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [next, setNext] = useState(null)
  const [previous, setPrevious] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortOrder, setSortOrder] = useState('default')

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getMedicineCategories()
        const list = Array.isArray(data) ? data : data.results || []
        setCategories(list)
      } catch (err) {
        console.error(err)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    async function fetchMedicines() {
      try {
        setLoading(true)
        setError('')

        const orderingMap = {
          default: '',
          'price-asc': 'medicine_price',
          'price-desc': '-medicine_price',
          'name-asc': 'medicine_name',
          'name-desc': '-medicine_name',
          newest: '-created_at',
        }

        const data = await getMedicines({
          page,
          search: searchText.trim(),
          category: selectedCategory,
          ordering: orderingMap[sortOrder] || '',
        })

        setMedicines(data.results || [])
        setCount(data.count || 0)
        setNext(data.next)
        setPrevious(data.previous)
      } catch (err) {
        console.error(err)
        setError('Failed to load medicines from the server.')
      } finally {
        setLoading(false)
      }
    }

    fetchMedicines()
  }, [page, searchText, selectedCategory, sortOrder])

  function handleSearchChange(event) {
    setSearchText(event.target.value)
    setPage(1)
  }

  function handleCategoryChange(event) {
    setSelectedCategory(event.target.value)
    setPage(1)
  }

  function handleSortChange(event) {
    setSortOrder(event.target.value)
    setPage(1)
  }

  function goToPreviousPage() {
    setPage(prev => Math.max(prev - 1, 1))
  }

  function goToNextPage() {
    setPage(prev => prev + 1)
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading medicines...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>{error}</p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <p className={styles.eyebrow}>Medicine delivery</p>
        <h1 className={styles.title}>Medicine catalog</h1>
        <p className={styles.subtitle}>
          Search, filter, and sort medicines loaded from the Django API.
        </p>
      </section>

      <section className={styles.controls}>
        <input
          type="text"
          placeholder="Search medicine..."
          value={searchText}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />

        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          className={styles.select}
        >
          <option value="All">All categories</option>

          {categories.map(category => (
            <option
              key={category.category_id}
              value={category.category_id}
            >
              {category.category_name}
            </option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={handleSortChange}
          className={styles.select}
        >
          <option value="default">Default sorting</option>
          <option value="newest">Newest</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
        </select>
      </section>

      <p className={styles.resultText}>
        Showing {medicines.length} medicine(s) on page {page} · {count} total
      </p>

      {medicines.length > 0 ? (
        <section className={styles.grid}>
          {medicines.map(medicine => (
            <MedicineCard
              key={medicine.medicine_id}
              medicine={medicine}
            />
          ))}
        </section>
      ) : (
        <p className={styles.empty}>
          No medicines found. Try another keyword or category.
        </p>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={!previous || loading}
        >
          Previous
        </button>

        <span>
          Page {page}
        </span>

        <button
          type="button"
          onClick={goToNextPage}
          disabled={!next || loading}
        >
          Next
        </button>
      </div>
    </main>
  )
}