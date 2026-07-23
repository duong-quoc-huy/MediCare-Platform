import { useEffect, useState } from 'react'
import { Home, Hospital, Search } from 'lucide-react'

import DoctorCard from '../../components/ui/DoctorCard'
import { getDoctors } from '../../services/doctorService'
import styles from './DoctorList.module.css'

function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data.results || []
}

export default function DoctorList() {
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [visitType, setVisitType] = useState('')
  const [ordering, setOrdering] = useState('-rating')

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
        }

        if (search.trim()) {
          params.search = search.trim()
        }

        if (visitType) {
          params.visit_type = visitType
        }

        const data = await getDoctors(params)
        setDoctors(normalizeList(data))
      } catch (err) {
        console.error(err)
        setError('Could not load doctors.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctors()
  }, [search, visitType, ordering])

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
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.visitFilter}>
          <button
            type="button"
            className={!visitType ? styles.activeVisitFilter : ''}
            onClick={() => setVisitType('')}
          >
            All
          </button>

          <button
            type="button"
            className={visitType === 'clinic' ? styles.activeVisitFilter : ''}
            onClick={() => setVisitType('clinic')}
          >
            <Hospital size={16} />
            Clinic
          </button>

          <button
            type="button"
            className={visitType === 'home_visit' ? styles.activeVisitFilter : ''}
            onClick={() => setVisitType('home_visit')}
          >
            <Home size={16} />
            Home visit
          </button>
        </div>

        <select
          value={ordering}
          onChange={event => setOrdering(event.target.value)}
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
        <section className={styles.grid}>
          {doctors.map(doctor => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </section>
      )}
    </main>
  )
}