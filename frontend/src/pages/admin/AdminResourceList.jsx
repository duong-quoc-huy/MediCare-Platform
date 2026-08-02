import { useEffect, useState } from 'react'
import AdminPage from '../../components/admin/AdminPage'
import common from './adminCommon.module.css'

const normalize = data =>
  Array.isArray(data) ? data : data?.results || []

export default function AdminResourceList({
  eyebrow = 'Admin portal',
  title,
  subtitle,
  load,
  searchPlaceholder = 'Search',
  filters = [],
  renderCard,
}) {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      setLoading(true)
      setError('')
      const data = await load({
        search: search || undefined,
        ...filterState,
      })
      setRows(normalize(data))
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        `Could not load ${title.toLowerCase()}.`
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 250)
    return () => window.clearTimeout(timeout)
  }, [search, JSON.stringify(filterState)])

  return (
    <AdminPage>
      <header className={common.header}>
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>

      {error && <div className={common.error}>{error}</div>}

      <section className={common.toolbar}>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
        />

        {filters.map(filter => (
          <select
            key={filter.name}
            value={filterState[filter.name] || ''}
            onChange={event =>
              setFilterState(previous => ({
                ...previous,
                [filter.name]:
                  event.target.value || undefined,
              }))
            }
          >
            <option value="">{filter.allLabel}</option>
            {filter.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        <button className={common.primary} onClick={refresh}>
          Refresh
        </button>
      </section>

      {loading ? (
        <div className={common.empty}>Loading...</div>
      ) : rows.length === 0 ? (
        <div className={common.empty}>No records found.</div>
      ) : (
        <section className={common.grid}>
          {rows.map(renderCard)}
        </section>
      )}
    </AdminPage>
  )
}
