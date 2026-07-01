import { useEffect, useMemo, useState } from 'react'
import MedicineCard from '../../components/ui/MedicineCard'
import { getMedicines } from '../../api/medicineApi'
import styles from './MedicineList.module.css'

export default function MedicineList() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortOrder, setSortOrder] = useState('default')

  useEffect(() => {
    async function fetchMedicines() {
      try {
        setLoading(true)
        setError('')

        const data = await getMedicines()
        setMedicines(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load medicines from the server.')
      } finally {
        setLoading(false)
      }
    }

    fetchMedicines()
  }, [])

  const categories = useMemo(() => {
    const uniqueCategories = medicines
      .map(medicine => medicine.category_name)
      .filter(Boolean)

    return ['All', ...new Set(uniqueCategories)]
  }, [medicines])

  const filteredMedicines = useMemo(() => {
    let result = medicines.filter(medicine => {
      const name = medicine.medicine_name || ''
      const category = medicine.category_name || ''

      const matchesSearch = name
        .toLowerCase()
        .includes(searchText.toLowerCase())

      const matchesCategory =
        selectedCategory === 'All' || category === selectedCategory

      return matchesSearch && matchesCategory
    })

    if (sortOrder === 'price-asc') {
      result = [...result].sort(
        (a, b) => Number(a.medicine_price) - Number(b.medicine_price)
      )
    }

    if (sortOrder === 'price-desc') {
      result = [...result].sort(
        (a, b) => Number(b.medicine_price) - Number(a.medicine_price)
      )
    }

    return result
  }, [medicines, searchText, selectedCategory, sortOrder])

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
          onChange={event => setSearchText(event.target.value)}
          className={styles.searchInput}
        />

        <select
          value={selectedCategory}
          onChange={event => setSelectedCategory(event.target.value)}
          className={styles.select}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={event => setSortOrder(event.target.value)}
          className={styles.select}
        >
          <option value="default">Default sorting</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
        </select>
      </section>

      <p className={styles.resultText}>
        Showing {filteredMedicines.length} medicine(s)
      </p>

      {filteredMedicines.length > 0 ? (
        <section className={styles.grid}>
          {filteredMedicines.map(medicine => (
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
    </main>
  )
}