import { useEffect, useMemo, useState } from 'react' 
import { Link } from 'react-router-dom' 
import { CalendarDays, Clock, Search, Stethoscope } from 'lucide-react' 
import { getNursePharmacyQueue } from '../../services/nurseService' 
import styles from './NursePharmacyQueue.module.css' 
 
function formatTime(time) { 
  if (!time) return '' 
  return String(time).slice(0, 5) 
} 
 
function formatMoney(value) { 
  return Number(value || 0).toLocaleString('vi-VN') 
} 
 
export default function NursePharmacyQueue() { 
  const [prescriptions, setPrescriptions] = useState([]) 
  const [search, setSearch] = useState('') 
  const [statusFilter, setStatusFilter] = useState('in_progress') 
  const [loading, setLoading] = useState(true) 
  const [error, setError] = useState('') 
  useEffect(() => { 
    async function loadQueue() { 
      try { 
        setLoading(true) 
        setError('') 
        const params = statusFilter === 'all' ? {} : { status: statusFilter } 
        const data = await getNursePharmacyQueue(params) 
        setPrescriptions(Array.isArray(data) ? data : data.results || []) 
      } catch (err) { 
        console.error(err) 
        setError(err.response?.data?.detail || 'Could not load pharmacy queue.') 
      } finally { 
        setLoading(false) 
      } 
    } 
 
    loadQueue() 
  }, [statusFilter]) 
 
  const filtered = useMemo(() => { 
    const keyword = search.trim().toLowerCase() 
    if (!keyword) return prescriptions 
 
    return prescriptions.filter(item => 
      item.patient_name?.toLowerCase().includes(keyword) || 
      item.doctor_name?.toLowerCase().includes(keyword) || 
      String(item.id).includes(keyword) 
    ) 
  }, [prescriptions, search]) 
 
  return ( 
    <main className={styles.page}> 
      <section className={styles.header}> 
        <div> 
          <p className={styles.eyebrow}>Nurse pharmacy</p> 
          <h1>Pharmacy Queue</h1> 
          <p>Prescriptions sent by doctors for clinic appointment completion.</p> 
        </div> 
 
        <Link to="/nurse/dashboard" className={styles.backButton}>Dashboard</Link> 
      </section> 
 
      {error && <div className={styles.errorBox}>{error}</div>} 
 
      <section className={styles.filterCard}> 
        <div className={styles.searchBox}> 
          <Search size={18} /> 
          <input 
            type="search" 
            placeholder="Search patient, doctor, or prescription ID..." 
            value={search} 
            onChange={event => setSearch(event.target.value)} 
          /> 
        </div> 
 
        <label className={styles.selectLabel}> 
          Status 
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}> 
            <option value="in_progress">Waiting payment</option>
            <option value="completed">Completed</option> 
            <option value="all">All</option> 
          </select> 
        </label> 
      </section> 
 
      {loading ? ( 
        <section className={styles.stateCard}><h2>Loading queue...</h2></section> 
      ) : filtered.length === 0 ? ( 
        <section className={styles.stateCard}> 
          <h2>No prescriptions found</h2> 
          <p>When a doctor sends a clinic prescription to pharmacy, it will appear here.</p> 
        </section> 
      ) : ( 
        <section className={styles.grid}> 
          {filtered.map(item => ( 
            <article key={item.id} className={styles.card}> 
              <div className={styles.cardTop}> 
                <div> 
                  <h2>{item.patient_name}</h2> 
                  <p>Prescription #{item.id}</p> 
                </div> 
                <span className={styles.statusBadge}>{item.appointment_status}</span> 
              </div> 
 
              <div className={styles.metaList}> 
                <span><Stethoscope size={16} /> Dr. {item.doctor_name}</span> 
                <span><CalendarDays size={16} /> {item.appointment_date}</span> 
                <span><Clock size={16} /> {formatTime(item.start_time)}</span> 
              </div> 
 
              <div className={styles.amountBox}> 
                <span>Amount due</span> 
                <strong>{formatMoney(item.amount_due)} VND</strong> 
              </div> 
 
              <p className={styles.diagnosis}>{item.diagnosis || 'No diagnosis summary.'}</p> 
 
              <Link to={`/nurse/pharmacy/${item.id}`} className={styles.actionButton}> 
                View prescription 
              </Link> 
            </article> 
          ))} 
        </section> 
      )} 
    </main> 
  ) 
} 