import { useEffect, useState } from 'react'
import { Home, Hospital, Search } from 'lucide-react'

import DoctorCard from '../../components/ui/DoctorCard'
import { getDoctors } from '../../services/doctorService'
import styles from './DoctorList.module.css'

const PAGE_SIZE = 10

function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export default function DoctorList() {
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [visitType, setVisitType] = useState('')
  const [ordering, setOrdering] = useState('-rating')

  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [next, setNext] = useState(null)
  const [previous, setPrevious] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchDoctors() {
      try {
        setLoading(true)
        setError('')

        const params = {
          is_available: 'true',
          ordering,
          page,
        }

        if (search.trim()) {
          params.search = search.trim()
        }

        if (visitType) {
          params.visit_type = visitType
        }

        const data = await getDoctors(params)
        const list = normalizeList(data)

        setDoctors(list)

        if (Array.isArray(data)) {
          setCount(data.length)
          setNext(null)
          setPrevious(null)
        } else {
          setCount(data?.count || 0)
          setNext(data?.next || null)
          setPrevious(data?.previous || null)
        }
      } catch (err) {
        console.error(err)
        setError('Could not load doctors.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctors()
  }, [search, visitType, ordering, page])

  const totalPages = Math.max(
    1,
    Math.ceil(count / PAGE_SIZE)
  )

  function changePage(nextPage) {
    setPage(nextPage)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleVisitTypeChange(value) {
    setVisitType(value)
    setPage(1)
  }

  function handleOrderingChange(event) {
    setOrdering(event.target.value)
    setPage(1)
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <p className={styles.eyebrow}>Find a doctor</p>
        <h1>Book a clinic or home-visit appointment</h1>
        <p>
          Search by doctor name or specialty, then choose the service type that
          matches your need.
        </p>
      </section>

      <section className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search doctor or specialty..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.visitFilter}>
          <button
            type="button"
            className={!visitType ? styles.activeFilter : ''}
            onClick={() => handleVisitTypeChange('')}
          >
            All
          </button>

          <button
            type="button"
            className={visitType === 'clinic' ? styles.activeFilter : ''}
            onClick={() => handleVisitTypeChange('clinic')}
          >
            <Hospital size={16} />
            Clinic
          </button>

          <button
            type="button"
            className={visitType === 'home_visit' ? styles.activeFilter : ''}
            onClick={() => handleVisitTypeChange('home_visit')}
          >
            <Home size={16} />
            Home visit
          </button>
        </div>

        <select
          value={ordering}
          onChange={handleOrderingChange}
          className={styles.sortSelect}
        >
          <option value="-rating">Highest rating</option>
          <option value="-experience_years">Most experienced</option>
          <option value="consultation_fee">Lowest fee</option>
          <option value="-consultation_fee">Highest fee</option>
          <option value="-created_at">Newest</option>
        </select>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {loading && (
        <p className={styles.empty}>Loading doctors...</p>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div className={styles.emptyBox}>
          <h2>No doctors found</h2>
          <p>
            Try another keyword or choose a different visit type.
          </p>
        </div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <>
          <section className={styles.grid}>
            {doctors.map(doctor => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
              />
            ))}
          </section>

          {count > PAGE_SIZE && (
            <div className={styles.pagination}>
              <button
                type="button"
                disabled={!previous}
                onClick={() => changePage(Math.max(page - 1, 1))}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={!next}
                onClick={() =>
                  changePage(Math.min(page + 1, totalPages))
                }
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
