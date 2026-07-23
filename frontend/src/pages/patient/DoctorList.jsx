import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

import DoctorCard from '../../components/ui/DoctorCard'
import { getDoctors } from '../../services/doctorService'
import styles from './DoctorList.module.css'

const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: '-rating', label: 'Highest rating' },
  { value: '-experience_years', label: 'Most experienced' },
  { value: 'consultation_fee', label: 'Lowest fee' },
  { value: '-consultation_fee', label: 'Highest fee' },
]

export default function DoctorList() {
  const [doctors, setDoctors] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [ordering, setOrdering] = useState('')
  const [page, setPage] = useState(1)

  const [count, setCount] = useState(0)
  const [next, setNext] = useState(null)
  const [previous, setPrevious] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const totalPages = useMemo(() => {
    if (!count) return 1

    /*
      If your backend page size is 5, use 5 here.
      If your backend page size is 10, change this to 10.
    */
    const pageSize = 5
    return Math.max(1, Math.ceil(count / pageSize))
  }, [count])

  useEffect(() => {
    async function fetchDoctors() {
      try {
        setLoading(true)
        setError('')

        const params = {
          page,
        }

        if (search) {
          params.search = search
        }

        if (availability === 'available') {
          params.is_available = 'true'
        }

        if (availability === 'unavailable') {
          params.is_available = 'false'
        }

        if (ordering) {
          params.ordering = ordering
        }

        const data = await getDoctors(params)

        const list = Array.isArray(data) ? data : data.results || []

        setDoctors(list)
        setCount(data.count || list.length)
        setNext(data.next || null)
        setPrevious(data.previous || null)
      } catch (err) {
        console.error(err)
        setError('Could not load doctors. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctors()
  }, [page, search, availability, ordering])

  function handleSearchSubmit(event) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function handleClearFilters() {
    setSearchInput('')
    setSearch('')
    setAvailability('all')
    setOrdering('')
    setPage(1)
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Find a doctor</p>
        <h1>Choose the right doctor for your appointment</h1>
        <p>
          Browse available doctors, view their details, check schedules, and
          book an appointment with online deposit payment.
        </p>
      </section>

      <section className={styles.filterCard}>
        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <div className={styles.searchBox}>
            <Search size={19} />
            <input
              type="text"
              value={searchInput}
              placeholder="Search by doctor name or specialty..."
              onChange={event => setSearchInput(event.target.value)}
            />
          </div>

          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>
              <SlidersHorizontal size={16} />
              Availability
            </label>

            <select
              value={availability}
              onChange={event => {
                setAvailability(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All doctors</option>
              <option value="available">Available only</option>
              <option value="unavailable">Unavailable only</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort by</label>

            <select
              value={ordering}
              onChange={event => {
                setOrdering(event.target.value)
                setPage(1)
              }}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className={styles.resultHeader}>
        <div>
          <h2>Doctors</h2>
          <p>
            {count > 0
              ? `${count} doctor${count > 1 ? 's' : ''} found`
              : 'No doctors found'}
          </p>
        </div>

        {search && (
          <span className={styles.searchTag}>
            Search: {search}
          </span>
        )}
      </section>

      {loading ? (
        <section className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map(item => (
            <div key={item} className={styles.skeletonCard} />
          ))}
        </section>
      ) : error ? (
        <div className={styles.errorBox}>
          {error}
        </div>
      ) : doctors.length > 0 ? (
        <>
          <section className={styles.grid}>
            {doctors.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </section>

          <section className={styles.pagination}>
            <button
              type="button"
              disabled={!previous || page <= 1}
              onClick={() => setPage(current => Math.max(1, current - 1))}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={!next}
              onClick={() => setPage(current => current + 1)}
            >
              Next
            </button>
          </section>
        </>
      ) : (
        <section className={styles.emptyBox}>
          <h2>No doctors found</h2>
          <p>
            Try changing your search keyword, availability filter, or sorting
            option.
          </p>

          <button type="button" onClick={handleClearFilters}>
            Reset filters
          </button>
        </section>
      )}
    </main>
  )
}